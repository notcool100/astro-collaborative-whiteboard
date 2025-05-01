/**
 * Workspace Service
 * 
 * This file provides services for workspace-related operations.
 */

const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Create a new workspace
 * @param {Object} workspaceData - Workspace data
 * @returns {Promise<Object>} Created workspace
 */
async function createWorkspace(workspaceData) {
  const { name, description, ownerId, settings } = workspaceData;
  
  // Insert workspace into database
  const query = `
    INSERT INTO workspaces (name, description, owner_id, settings)
    VALUES ($1, $2, $3, $4)
    RETURNING id, uuid, name, description, owner_id, settings, created_at, updated_at
  `;
  
  try {
    const result = await db.queryOne(query, [
      name, 
      description || '', 
      ownerId,
      settings ? JSON.stringify(settings) : null
    ]);
    
    return result;
  } catch (error) {
    logger.error(`Error creating workspace: ${error.message}`);
    throw error;
  }
}

/**
 * Find workspace by ID
 * @param {number} id - Workspace ID
 * @returns {Promise<Object|null>} Workspace object or null
 */
async function findWorkspaceById(id) {
  const query = `
    SELECT w.id, w.uuid, w.name, w.description, w.owner_id, u.name as owner_name, 
           w.settings, w.created_at, w.updated_at
    FROM workspaces w
    JOIN users u ON w.owner_id = u.id
    WHERE w.id = $1
  `;
  
  return db.queryOne(query, [id]);
}

/**
 * Find workspace by UUID
 * @param {string} uuid - Workspace UUID
 * @returns {Promise<Object|null>} Workspace object or null
 */
async function findWorkspaceByUuid(uuid) {
  const query = `
    SELECT w.id, w.uuid, w.name, w.description, w.owner_id, u.name as owner_name, 
           w.settings, w.created_at, w.updated_at
    FROM workspaces w
    JOIN users u ON w.owner_id = u.id
    WHERE w.uuid = $1
  `;
  
  return db.queryOne(query, [uuid]);
}

/**
 * Get workspaces for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} List of workspaces
 */
async function getUserWorkspaces(userId) {
  const query = `
    SELECT w.id, w.uuid, w.name, w.description, w.owner_id, u.name as owner_name, 
           w.settings, w.created_at, w.updated_at,
           CASE WHEN w.owner_id = $1 THEN 'owner' ELSE wm.role END as user_role
    FROM workspaces w
    JOIN users u ON w.owner_id = u.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
    WHERE w.owner_id = $1 OR wm.user_id = $1
    ORDER BY w.updated_at DESC
  `;
  
  return db.queryAll(query, [userId]);
}

/**
 * Update workspace
 * @param {number} id - Workspace ID
 * @param {Object} workspaceData - Workspace data to update
 * @returns {Promise<Object>} Updated workspace
 */
async function updateWorkspace(id, workspaceData) {
  const { name, description, settings } = workspaceData;
  
  // Build query dynamically based on provided fields
  let updateFields = [];
  let params = [];
  let paramIndex = 1;
  
  if (name !== undefined) {
    updateFields.push(`name = $${paramIndex}`);
    params.push(name);
    paramIndex++;
  }
  
  if (description !== undefined) {
    updateFields.push(`description = $${paramIndex}`);
    params.push(description);
    paramIndex++;
  }
  
  if (settings !== undefined) {
    updateFields.push(`settings = settings || $${paramIndex}::jsonb`);
    params.push(JSON.stringify(settings));
    paramIndex++;
  }
  
  // Add workspace ID as the last parameter
  params.push(id);
  
  // If no fields to update, return the current workspace
  if (updateFields.length === 0) {
    return findWorkspaceById(id);
  }
  
  const query = `
    UPDATE workspaces
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, uuid, name, description, owner_id, settings, created_at, updated_at
  `;
  
  return db.queryOne(query, params);
}

/**
 * Delete workspace
 * @param {number} id - Workspace ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteWorkspace(id) {
  // Use a transaction to delete workspace and related data
  return db.withTransaction(async (client) => {
    // Delete workspace members
    await client.query('DELETE FROM workspace_members WHERE workspace_id = $1', [id]);
    
    // Delete workspace
    const result = await client.query('DELETE FROM workspaces WHERE id = $1', [id]);
    
    return result.rowCount > 0;
  });
}

/**
 * Add member to workspace
 * @param {number} workspaceId - Workspace ID
 * @param {number} userId - User ID
 * @param {string} role - Member role (viewer, editor, admin)
 * @returns {Promise<Object>} Created member
 */
async function addWorkspaceMember(workspaceId, userId, role = 'viewer') {
  const query = `
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (workspace_id, user_id) 
    DO UPDATE SET role = $3
    RETURNING id, workspace_id, user_id, role, joined_at
  `;
  
  return db.queryOne(query, [workspaceId, userId, role]);
}

/**
 * Update member role
 * @param {number} workspaceId - Workspace ID
 * @param {number} userId - User ID
 * @param {string} role - New role
 * @returns {Promise<Object>} Updated member
 */
async function updateMemberRole(workspaceId, userId, role) {
  const query = `
    UPDATE workspace_members
    SET role = $3
    WHERE workspace_id = $1 AND user_id = $2
    RETURNING id, workspace_id, user_id, role, joined_at
  `;
  
  return db.queryOne(query, [workspaceId, userId, role]);
}

/**
 * Remove member from workspace
 * @param {number} workspaceId - Workspace ID
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
async function removeWorkspaceMember(workspaceId, userId) {
  const query = `
    DELETE FROM workspace_members
    WHERE workspace_id = $1 AND user_id = $2
  `;
  
  const result = await db.query(query, [workspaceId, userId]);
  return result.rowCount > 0;
}

/**
 * Get workspace members
 * @param {number} workspaceId - Workspace ID
 * @returns {Promise<Array>} List of members
 */
async function getWorkspaceMembers(workspaceId) {
  const query = `
    SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.joined_at,
           u.name, u.email, u.avatar, u.last_active
    FROM workspace_members wm
    JOIN users u ON wm.user_id = u.id
    WHERE wm.workspace_id = $1
    ORDER BY wm.role, u.name
  `;
  
  return db.queryAll(query, [workspaceId]);
}

/**
 * Check if user is a member of workspace
 * @param {number} workspaceId - Workspace ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} Membership info or null
 */
async function checkWorkspaceMembership(workspaceId, userId) {
  // First check if user is the owner
  const workspaceQuery = `
    SELECT 'owner' as role
    FROM workspaces
    WHERE id = $1 AND owner_id = $2
  `;
  
  const ownerResult = await db.queryOne(workspaceQuery, [workspaceId, userId]);
  
  if (ownerResult) {
    return { role: 'owner', isOwner: true };
  }
  
  // Then check if user is a member
  const memberQuery = `
    SELECT role
    FROM workspace_members
    WHERE workspace_id = $1 AND user_id = $2
  `;
  
  const memberResult = await db.queryOne(memberQuery, [workspaceId, userId]);
  
  if (memberResult) {
    return { role: memberResult.role, isOwner: false };
  }
  
  return null;
}

module.exports = {
  createWorkspace,
  findWorkspaceById,
  findWorkspaceByUuid,
  getUserWorkspaces,
  updateWorkspace,
  deleteWorkspace,
  addWorkspaceMember,
  updateMemberRole,
  removeWorkspaceMember,
  getWorkspaceMembers,
  checkWorkspaceMembership
};