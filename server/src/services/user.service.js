/**
 * User Service
 * 
 * This file provides services for user-related operations.
 */

const bcrypt = require('bcryptjs');
const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user
 */
async function createUser(userData) {
  const { email, password, name, avatar } = userData;
  
  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  // Insert user into database
  const query = `
    INSERT INTO users (email, password, name, avatar)
    VALUES ($1, $2, $3, $4)
    RETURNING id, uuid, email, name, avatar, preferences, created_at
  `;
  
  try {
    const result = await db.queryOne(query, [email, hashedPassword, name, avatar || null]);
    return result;
  } catch (error) {
    logger.error(`Error creating user: ${error.message}`);
    
    // Check for duplicate email
    if (error.code === '23505' && error.constraint === 'users_email_key') {
      throw new Error('User with this email already exists');
    }
    
    throw error;
  }
}

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null
 */
async function findUserByEmail(email) {
  const query = `
    SELECT id, uuid, email, password, name, avatar, preferences, last_active, created_at, updated_at
    FROM users
    WHERE email = $1 AND is_deleted = FALSE
  `;
  
  return db.queryOne(query, [email]);
}

/**
 * Find user by ID
 * @param {number} id - User ID
 * @returns {Promise<Object|null>} User object or null
 */
async function findUserById(id) {
  const query = `
    SELECT id, uuid, email, name, avatar, preferences, last_active, created_at, updated_at
    FROM users
    WHERE id = $1 AND is_deleted = FALSE
  `;
  
  return db.queryOne(query, [id]);
}

/**
 * Find user by UUID
 * @param {string} uuid - User UUID
 * @returns {Promise<Object|null>} User object or null
 */
async function findUserByUuid(uuid) {
  const query = `
    SELECT id, uuid, email, name, avatar, preferences, last_active, created_at, updated_at
    FROM users
    WHERE uuid = $1 AND is_deleted = FALSE
  `;
  
  return db.queryOne(query, [uuid]);
}

/**
 * Update user profile
 * @param {number} id - User ID
 * @param {Object} userData - User data to update
 * @returns {Promise<Object>} Updated user
 */
async function updateUser(id, userData) {
  const { name, avatar, preferences } = userData;
  
  // Build query dynamically based on provided fields
  let updateFields = [];
  let params = [];
  let paramIndex = 1;
  
  if (name !== undefined) {
    updateFields.push(`name = $${paramIndex}`);
    params.push(name);
    paramIndex++;
  }
  
  if (avatar !== undefined) {
    updateFields.push(`avatar = $${paramIndex}`);
    params.push(avatar);
    paramIndex++;
  }
  
  if (preferences !== undefined) {
    updateFields.push(`preferences = preferences || $${paramIndex}::jsonb`);
    params.push(JSON.stringify(preferences));
    paramIndex++;
  }
  
  // Add user ID as the last parameter
  params.push(id);
  
  // If no fields to update, return the current user
  if (updateFields.length === 0) {
    return findUserById(id);
  }
  
  const query = `
    UPDATE users
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex} AND is_deleted = FALSE
    RETURNING id, uuid, email, name, avatar, preferences, last_active, created_at, updated_at
  `;
  
  return db.queryOne(query, params);
}

/**
 * Update user password
 * @param {number} id - User ID
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} Success status
 */
async function updatePassword(id, newPassword) {
  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);
  
  const query = `
    UPDATE users
    SET password = $1
    WHERE id = $2 AND is_deleted = FALSE
  `;
  
  const result = await db.query(query, [hashedPassword, id]);
  return result.rowCount > 0;
}

/**
 * Update last active timestamp
 * @param {number} id - User ID
 * @returns {Promise<boolean>} Success status
 */
async function updateLastActive(id) {
  const query = `
    UPDATE users
    SET last_active = NOW()
    WHERE id = $1 AND is_deleted = FALSE
  `;
  
  const result = await db.query(query, [id]);
  return result.rowCount > 0;
}

/**
 * Compare password with stored hash
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} True if password matches
 */
async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Soft delete a user
 * @param {number} id - User ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteUser(id) {
  const query = `
    UPDATE users
    SET is_deleted = TRUE
    WHERE id = $1
  `;
  
  const result = await db.query(query, [id]);
  return result.rowCount > 0;
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByUuid,
  updateUser,
  updatePassword,
  updateLastActive,
  comparePassword,
  deleteUser
};