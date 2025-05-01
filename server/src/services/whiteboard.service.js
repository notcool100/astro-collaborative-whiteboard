/**
 * Whiteboard Service
 * 
 * This file provides services for whiteboard-related operations.
 */

const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Create a new whiteboard
 * @param {Object} whiteboardData - Whiteboard data
 * @returns {Promise<Object>} Created whiteboard
 */
async function createWhiteboard(whiteboardData) {
  const { 
    name, 
    workspaceId, 
    createdBy, 
    createdByName,
    createdByAvatar,
    thumbnail, 
    tags 
  } = whiteboardData;
  
  // Insert whiteboard into database
  const query = `
    INSERT INTO whiteboards (
      name, workspace_id, created_by, created_by_name, 
      created_by_avatar, thumbnail, tags
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, uuid, name, workspace_id, thumbnail, 
              current_version, element_count, tags, created_by, 
              created_by_name, created_at, updated_at
  `;
  
  try {
    const result = await db.queryOne(query, [
      name, 
      workspaceId, 
      createdBy,
      createdByName,
      createdByAvatar,
      thumbnail || null,
      tags || null
    ]);
    
    // Create initial version
    await createWhiteboardVersion({
      whiteboardId: result.id,
      version: 1,
      data: { elements: [] },
      createdBy
    });
    
    return result;
  } catch (error) {
    logger.error(`Error creating whiteboard: ${error.message}`);
    throw error;
  }
}

/**
 * Find whiteboard by ID
 * @param {number} id - Whiteboard ID
 * @returns {Promise<Object|null>} Whiteboard object or null
 */
async function findWhiteboardById(id) {
  const query = `
    SELECT w.id, w.uuid, w.name, w.workspace_id, w.thumbnail, 
           w.current_version, w.element_count, w.tags, 
           w.encryption_metadata, w.is_archived,
           w.created_by, w.created_by_name, w.created_by_avatar,
           w.last_edited_by, u.name as last_edited_by_name,
           w.created_at, w.updated_at,
           ws.name as workspace_name
    FROM whiteboards w
    JOIN workspaces ws ON w.workspace_id = ws.id
    LEFT JOIN users u ON w.last_edited_by = u.id
    WHERE w.id = $1
  `;
  
  return db.queryOne(query, [id]);
}

/**
 * Find whiteboard by UUID
 * @param {string} uuid - Whiteboard UUID
 * @returns {Promise<Object|null>} Whiteboard object or null
 */
async function findWhiteboardByUuid(uuid) {
  const query = `
    SELECT w.id, w.uuid, w.name, w.workspace_id, w.thumbnail, 
           w.current_version, w.element_count, w.tags, 
           w.encryption_metadata, w.is_archived,
           w.created_by, w.created_by_name, w.created_by_avatar,
           w.last_edited_by, u.name as last_edited_by_name,
           w.created_at, w.updated_at,
           ws.name as workspace_name
    FROM whiteboards w
    JOIN workspaces ws ON w.workspace_id = ws.id
    LEFT JOIN users u ON w.last_edited_by = u.id
    WHERE w.uuid = $1
  `;
  
  return db.queryOne(query, [uuid]);
}

/**
 * Get whiteboards for a workspace
 * @param {number} workspaceId - Workspace ID
 * @param {boolean} includeArchived - Whether to include archived whiteboards
 * @returns {Promise<Array>} List of whiteboards
 */
async function getWorkspaceWhiteboards(workspaceId, includeArchived = false) {
  let query = `
    SELECT w.id, w.uuid, w.name, w.workspace_id, w.thumbnail, 
           w.current_version, w.element_count, w.tags, 
           w.is_archived, w.created_by, w.created_by_name,
           w.created_at, w.updated_at
    FROM whiteboards w
    WHERE w.workspace_id = $1
  `;
  
  if (!includeArchived) {
    query += ' AND w.is_archived = FALSE';
  }
  
  query += ' ORDER BY w.updated_at DESC';
  
  return db.queryAll(query, [workspaceId]);
}

/**
 * Update whiteboard
 * @param {number} id - Whiteboard ID
 * @param {Object} whiteboardData - Whiteboard data to update
 * @returns {Promise<Object>} Updated whiteboard
 */
async function updateWhiteboard(id, whiteboardData) {
  const { name, thumbnail, tags, isArchived } = whiteboardData;
  
  // Build query dynamically based on provided fields
  let updateFields = [];
  let params = [];
  let paramIndex = 1;
  
  if (name !== undefined) {
    updateFields.push(`name = $${paramIndex}`);
    params.push(name);
    paramIndex++;
  }
  
  if (thumbnail !== undefined) {
    updateFields.push(`thumbnail = $${paramIndex}`);
    params.push(thumbnail);
    paramIndex++;
  }
  
  if (tags !== undefined) {
    updateFields.push(`tags = $${paramIndex}`);
    params.push(tags);
    paramIndex++;
  }
  
  if (isArchived !== undefined) {
    updateFields.push(`is_archived = $${paramIndex}`);
    params.push(isArchived);
    paramIndex++;
  }
  
  // Add whiteboard ID as the last parameter
  params.push(id);
  
  // If no fields to update, return the current whiteboard
  if (updateFields.length === 0) {
    return findWhiteboardById(id);
  }
  
  const query = `
    UPDATE whiteboards
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, uuid, name, workspace_id, thumbnail, 
              current_version, element_count, tags, is_archived,
              created_by, created_by_name, created_at, updated_at
  `;
  
  return db.queryOne(query, params);
}

/**
 * Delete whiteboard
 * @param {number} id - Whiteboard ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteWhiteboard(id) {
  // Use a transaction to delete whiteboard and related data
  return db.withTransaction(async (client) => {
    // Delete whiteboard elements
    await client.query('DELETE FROM whiteboard_elements WHERE whiteboard_id = $1', [id]);
    
    // Delete whiteboard versions
    await client.query('DELETE FROM whiteboard_versions WHERE whiteboard_id = $1', [id]);
    
    // Delete collaboration sessions
    await client.query('DELETE FROM collaboration_sessions WHERE whiteboard_id = $1', [id]);
    
    // Delete whiteboard
    const result = await client.query('DELETE FROM whiteboards WHERE id = $1', [id]);
    
    return result.rowCount > 0;
  });
}

/**
 * Create a new whiteboard version
 * @param {Object} versionData - Version data
 * @returns {Promise<Object>} Created version
 */
async function createWhiteboardVersion(versionData) {
  const { whiteboardId, version, data, delta, thumbnail, createdBy, metadata } = versionData;
  
  // Insert version into database
  const query = `
    INSERT INTO whiteboard_versions (
      whiteboard_id, version, data, delta, thumbnail, created_by, metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, whiteboard_id, version, thumbnail, created_by, created_at
  `;
  
  try {
    const result = await db.queryOne(query, [
      whiteboardId,
      version,
      JSON.stringify(data),
      delta ? JSON.stringify(delta) : null,
      thumbnail || null,
      createdBy,
      metadata ? JSON.stringify(metadata) : '{}'
    ]);
    
    return result;
  } catch (error) {
    logger.error(`Error creating whiteboard version: ${error.message}`);
    throw error;
  }
}

/**
 * Get whiteboard versions
 * @param {number} whiteboardId - Whiteboard ID
 * @param {number} limit - Maximum number of versions to return
 * @param {number} offset - Number of versions to skip
 * @returns {Promise<Array>} List of versions
 */
async function getWhiteboardVersions(whiteboardId, limit = 10, offset = 0) {
  const query = `
    SELECT v.id, v.whiteboard_id, v.version, v.thumbnail, 
           v.created_by, u.name as created_by_name,
           v.created_at, v.metadata
    FROM whiteboard_versions v
    LEFT JOIN users u ON v.created_by = u.id
    WHERE v.whiteboard_id = $1
    ORDER BY v.version DESC
    LIMIT $2 OFFSET $3
  `;
  
  return db.queryAll(query, [whiteboardId, limit, offset]);
}

/**
 * Get specific whiteboard version
 * @param {number} whiteboardId - Whiteboard ID
 * @param {number} version - Version number
 * @returns {Promise<Object|null>} Version object or null
 */
async function getWhiteboardVersion(whiteboardId, version) {
  const query = `
    SELECT v.id, v.whiteboard_id, v.version, v.data, v.delta,
           v.thumbnail, v.created_by, u.name as created_by_name,
           v.created_at, v.metadata
    FROM whiteboard_versions v
    LEFT JOIN users u ON v.created_by = u.id
    WHERE v.whiteboard_id = $1 AND v.version = $2
  `;
  
  return db.queryOne(query, [whiteboardId, version]);
}

/**
 * Get latest whiteboard version
 * @param {number} whiteboardId - Whiteboard ID
 * @returns {Promise<Object|null>} Version object or null
 */
async function getLatestWhiteboardVersion(whiteboardId) {
  const query = `
    SELECT v.id, v.whiteboard_id, v.version, v.data, v.delta,
           v.thumbnail, v.created_by, u.name as created_by_name,
           v.created_at, v.metadata
    FROM whiteboard_versions v
    LEFT JOIN users u ON v.created_by = u.id
    WHERE v.whiteboard_id = $1
    ORDER BY v.version DESC
    LIMIT 1
  `;
  
  return db.queryOne(query, [whiteboardId]);
}

/**
 * Create or update whiteboard element
 * @param {Object} elementData - Element data
 * @returns {Promise<Object>} Created or updated element
 */
async function createOrUpdateElement(elementData) {
  const { 
    whiteboardId, 
    versionId, 
    elementId, 
    type, 
    properties, 
    zIndex, 
    createdBy, 
    updatedBy 
  } = elementData;
  
  // Check if element exists
  const existingElement = await db.queryOne(
    'SELECT id FROM whiteboard_elements WHERE whiteboard_id = $1 AND element_id = $2',
    [whiteboardId, elementId]
  );
  
  if (existingElement) {
    // Update existing element
    const updateQuery = `
      UPDATE whiteboard_elements
      SET version_id = $3,
          type = $4,
          properties = $5,
          z_index = $6,
          updated_by = $7,
          is_deleted = FALSE,
          updated_at = NOW()
      WHERE whiteboard_id = $1 AND element_id = $2
      RETURNING id, whiteboard_id, element_id, type, properties, z_index, 
                is_deleted, created_by, updated_by, created_at, updated_at
    `;
    
    return db.queryOne(updateQuery, [
      whiteboardId,
      elementId,
      versionId,
      type,
      JSON.stringify(properties),
      zIndex || 0,
      updatedBy || createdBy
    ]);
  } else {
    // Create new element
    const insertQuery = `
      INSERT INTO whiteboard_elements (
        whiteboard_id, version_id, element_id, type, properties, z_index, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, whiteboard_id, element_id, type, properties, z_index, 
                is_deleted, created_by, updated_by, created_at, updated_at
    `;
    
    return db.queryOne(insertQuery, [
      whiteboardId,
      versionId,
      elementId,
      type,
      JSON.stringify(properties),
      zIndex || 0,
      createdBy
    ]);
  }
}

/**
 * Delete whiteboard element
 * @param {number} whiteboardId - Whiteboard ID
 * @param {string} elementId - Element ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} Deleted element or null
 */
async function deleteElement(whiteboardId, elementId, userId) {
  const query = `
    UPDATE whiteboard_elements
    SET is_deleted = TRUE, updated_by = $3, updated_at = NOW()
    WHERE whiteboard_id = $1 AND element_id = $2
    RETURNING id, whiteboard_id, element_id, type, properties, z_index, 
              is_deleted, created_by, updated_by, created_at, updated_at
  `;
  
  return db.queryOne(query, [whiteboardId, elementId, userId]);
}

/**
 * Get whiteboard elements
 * @param {number} whiteboardId - Whiteboard ID
 * @param {boolean} includeDeleted - Whether to include deleted elements
 * @returns {Promise<Array>} List of elements
 */
async function getWhiteboardElements(whiteboardId, includeDeleted = false) {
  let query = `
    SELECT id, whiteboard_id, version_id, element_id, type, properties, z_index, 
           is_deleted, created_by, updated_by, created_at, updated_at
    FROM whiteboard_elements
    WHERE whiteboard_id = $1
  `;
  
  if (!includeDeleted) {
    query += ' AND is_deleted = FALSE';
  }
  
  query += ' ORDER BY z_index ASC';
  
  return db.queryAll(query, [whiteboardId]);
}

/**
 * Create or update collaboration session
 * @param {number} whiteboardId - Whiteboard ID
 * @param {Array} activeUsers - List of active users
 * @returns {Promise<Object>} Created or updated session
 */
async function updateCollaborationSession(whiteboardId, activeUsers) {
  // Check if session exists
  const existingSession = await db.queryOne(
    'SELECT id FROM collaboration_sessions WHERE whiteboard_id = $1',
    [whiteboardId]
  );
  
  if (existingSession) {
    // Update existing session
    const updateQuery = `
      UPDATE collaboration_sessions
      SET active_users = $2, last_activity = NOW()
      WHERE whiteboard_id = $1
      RETURNING id, whiteboard_id, active_users, started_at, last_activity
    `;
    
    return db.queryOne(updateQuery, [whiteboardId, JSON.stringify(activeUsers)]);
  } else {
    // Create new session
    const insertQuery = `
      INSERT INTO collaboration_sessions (whiteboard_id, active_users)
      VALUES ($1, $2)
      RETURNING id, whiteboard_id, active_users, started_at, last_activity
    `;
    
    return db.queryOne(insertQuery, [whiteboardId, JSON.stringify(activeUsers)]);
  }
}

/**
 * Get collaboration session
 * @param {number} whiteboardId - Whiteboard ID
 * @returns {Promise<Object|null>} Session object or null
 */
async function getCollaborationSession(whiteboardId) {
  const query = `
    SELECT id, whiteboard_id, active_users, started_at, last_activity
    FROM collaboration_sessions
    WHERE whiteboard_id = $1
  `;
  
  return db.queryOne(query, [whiteboardId]);
}

/**
 * Clean up inactive collaboration sessions
 * @param {number} maxInactiveTime - Maximum inactive time in milliseconds
 * @returns {Promise<number>} Number of deleted sessions
 */
async function cleanupInactiveSessions(maxInactiveTime = 24 * 60 * 60 * 1000) {
  const query = `
    DELETE FROM collaboration_sessions
    WHERE last_activity < NOW() - INTERVAL '${maxInactiveTime / 1000} seconds'
    OR (active_users::jsonb @> '[]'::jsonb OR active_users IS NULL)
    RETURNING id
  `;
  
  const result = await db.query(query);
  return result.rowCount;
}

module.exports = {
  createWhiteboard,
  findWhiteboardById,
  findWhiteboardByUuid,
  getWorkspaceWhiteboards,
  updateWhiteboard,
  deleteWhiteboard,
  createWhiteboardVersion,
  getWhiteboardVersions,
  getWhiteboardVersion,
  getLatestWhiteboardVersion,
  createOrUpdateElement,
  deleteElement,
  getWhiteboardElements,
  updateCollaborationSession,
  getCollaborationSession,
  cleanupInactiveSessions
};