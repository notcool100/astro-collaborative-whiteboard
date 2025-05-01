/**
 * Redis Utilities for PCS Draw
 * 
 * This file provides utility functions for working with Redis in the PCS Draw application.
 * It includes functions for caching, real-time presence, and pub/sub messaging.
 */

const redis = require('redis');
const { promisify } = require('util');
const config = require('../config/redis-config');

// Create Redis client
const redisClient = redis.createClient({
  host: config.host,
  port: config.port,
  password: config.password,
  db: config.db,
  retry_strategy: function(options) {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      // End reconnecting on a specific error
      return new Error('The server refused the connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      // End reconnecting after a specific timeout
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      // End reconnecting with built in error
      return undefined;
    }
    // Reconnect after
    return Math.min(options.attempt * 100, 3000);
  }
});

// Create separate client for pub/sub (to avoid blocking)
const redisPubSub = redis.createClient({
  host: config.host,
  port: config.port,
  password: config.password,
  db: config.db
});

// Promisify Redis commands
const getAsync = promisify(redisClient.get).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);
const delAsync = promisify(redisClient.del).bind(redisClient);
const hgetAsync = promisify(redisClient.hget).bind(redisClient);
const hsetAsync = promisify(redisClient.hset).bind(redisClient);
const hgetallAsync = promisify(redisClient.hgetall).bind(redisClient);
const hmsetAsync = promisify(redisClient.hmset).bind(redisClient);
const expireAsync = promisify(redisClient.expire).bind(redisClient);
const ttlAsync = promisify(redisClient.ttl).bind(redisClient);
const saddAsync = promisify(redisClient.sadd).bind(redisClient);
const smembersAsync = promisify(redisClient.smembers).bind(redisClient);
const sremAsync = promisify(redisClient.srem).bind(redisClient);
const zaddAsync = promisify(redisClient.zadd).bind(redisClient);
const zrangeAsync = promisify(redisClient.zrange).bind(redisClient);
const zremAsync = promisify(redisClient.zrem).bind(redisClient);
const keysAsync = promisify(redisClient.keys).bind(redisClient);
const incrAsync = promisify(redisClient.incr).bind(redisClient);
const existsAsync = promisify(redisClient.exists).bind(redisClient);

// Handle Redis errors
redisClient.on('error', (err) => {
  console.error('Redis Error:', err);
});

redisPubSub.on('error', (err) => {
  console.error('Redis PubSub Error:', err);
});

/**
 * Cache Management Functions
 */

/**
 * Set a value in the cache with expiration
 * @param {string} key - Cache key
 * @param {any} value - Value to cache (will be JSON stringified)
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<string>} - Redis response
 */
const setCacheValue = async (key, value, ttl = 300) => {
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  const result = await setAsync(key, stringValue, 'EX', ttl);
  return result;
};

/**
 * Get a value from the cache
 * @param {string} key - Cache key
 * @returns {Promise<any>} - Parsed value or null if not found
 */
const getCacheValue = async (key) => {
  const value = await getAsync(key);
  if (!value) return null;
  
  try {
    return JSON.parse(value);
  } catch (e) {
    return value; // Return as is if not JSON
  }
};

/**
 * Delete a value from the cache
 * @param {string} key - Cache key
 * @returns {Promise<number>} - Number of keys removed
 */
const deleteCacheValue = async (key) => {
  return await delAsync(key);
};

/**
 * Delete multiple cache keys matching a pattern
 * @param {string} pattern - Key pattern to match
 * @returns {Promise<number>} - Number of keys removed
 */
const deleteCachePattern = async (pattern) => {
  const keys = await keysAsync(pattern);
  if (keys.length === 0) return 0;
  
  return await delAsync(keys);
};

/**
 * Session Management Functions
 */

/**
 * Store user session
 * @param {string} sessionId - Session ID
 * @param {object} sessionData - Session data
 * @param {number} ttl - Time to live in seconds (default: 24 hours)
 * @returns {Promise<string>} - Redis response
 */
const storeSession = async (sessionId, sessionData, ttl = 86400) => {
  const key = `session:${sessionId}`;
  return await setCacheValue(key, sessionData, ttl);
};

/**
 * Get user session
 * @param {string} sessionId - Session ID
 * @returns {Promise<object|null>} - Session data or null if not found
 */
const getSession = async (sessionId) => {
  const key = `session:${sessionId}`;
  return await getCacheValue(key);
};

/**
 * Delete user session
 * @param {string} sessionId - Session ID
 * @returns {Promise<number>} - 1 if session was deleted, 0 otherwise
 */
const deleteSession = async (sessionId) => {
  const key = `session:${sessionId}`;
  return await deleteCacheValue(key);
};

/**
 * Real-time Presence Functions
 */

/**
 * Add user to whiteboard's active users
 * @param {string} whiteboardId - Whiteboard ID
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Redis response
 */
const addUserToWhiteboard = async (whiteboardId, userId) => {
  const key = `whiteboard:${whiteboardId}:users`;
  const result = await saddAsync(key, userId);
  await expireAsync(key, 86400); // 24 hours TTL
  return result;
};

/**
 * Get all active users on a whiteboard
 * @param {string} whiteboardId - Whiteboard ID
 * @returns {Promise<string[]>} - Array of user IDs
 */
const getWhiteboardUsers = async (whiteboardId) => {
  const key = `whiteboard:${whiteboardId}:users`;
  return await smembersAsync(key);
};

/**
 * Remove user from whiteboard's active users
 * @param {string} whiteboardId - Whiteboard ID
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Redis response
 */
const removeUserFromWhiteboard = async (whiteboardId, userId) => {
  const key = `whiteboard:${whiteboardId}:users`;
  return await sremAsync(key, userId);
};

/**
 * Update user cursor position
 * @param {string} whiteboardId - Whiteboard ID
 * @param {string} userId - User ID
 * @param {object} position - Cursor position {x, y}
 * @returns {Promise<number>} - Redis response
 */
const updateCursorPosition = async (whiteboardId, userId, position) => {
  const key = `whiteboard:${whiteboardId}:cursors`;
  const value = JSON.stringify({
    ...position,
    timestamp: Date.now()
  });
  
  const result = await hsetAsync(key, userId, value);
  await expireAsync(key, 30); // 30 seconds TTL
  return result;
};

/**
 * Get all cursor positions for a whiteboard
 * @param {string} whiteboardId - Whiteboard ID
 * @returns {Promise<object>} - Map of user IDs to cursor positions
 */
const getCursorPositions = async (whiteboardId) => {
  const key = `whiteboard:${whiteboardId}:cursors`;
  const cursors = await hgetallAsync(key);
  
  if (!cursors) return {};
  
  // Parse cursor positions
  const result = {};
  for (const [userId, positionStr] of Object.entries(cursors)) {
    try {
      result[userId] = JSON.parse(positionStr);
    } catch (e) {
      console.error(`Error parsing cursor position for user ${userId}:`, e);
    }
  }
  
  return result;
};

/**
 * Rate Limiting Functions
 */

/**
 * Increment rate limit counter
 * @param {string} userId - User ID
 * @param {string} action - Action being rate limited
 * @param {number} limit - Maximum allowed requests
 * @param {number} windowSeconds - Time window in seconds
 * @returns {Promise<boolean>} - True if under limit, false if exceeded
 */
const checkRateLimit = async (userId, action, limit, windowSeconds = 60) => {
  const key = `ratelimit:${userId}:${action}`;
  
  // Check if key exists
  const exists = await existsAsync(key);
  
  if (!exists) {
    // First request in window
    await setAsync(key, 1, 'EX', windowSeconds);
    return true;
  }
  
  // Increment counter
  const count = await incrAsync(key);
  
  // Ensure TTL is set
  const ttl = await ttlAsync(key);
  if (ttl === -1) {
    await expireAsync(key, windowSeconds);
  }
  
  // Check if over limit
  return count <= limit;
};

/**
 * Pub/Sub Functions
 */

/**
 * Subscribe to a channel
 * @param {string} channel - Channel name
 * @param {function} callback - Callback function(message, channel)
 */
const subscribe = (channel, callback) => {
  redisPubSub.subscribe(channel);
  redisPubSub.on('message', (ch, message) => {
    if (ch === channel) {
      try {
        const parsedMessage = JSON.parse(message);
        callback(parsedMessage, ch);
      } catch (e) {
        callback(message, ch);
      }
    }
  });
};

/**
 * Publish a message to a channel
 * @param {string} channel - Channel name
 * @param {any} message - Message to publish (will be JSON stringified)
 * @returns {Promise<number>} - Number of clients that received the message
 */
const publish = (channel, message) => {
  const messageString = typeof message === 'string' ? message : JSON.stringify(message);
  return new Promise((resolve, reject) => {
    redisPubSub.publish(channel, messageString, (err, reply) => {
      if (err) reject(err);
      else resolve(reply);
    });
  });
};

/**
 * Whiteboard Caching Functions
 */

/**
 * Cache whiteboard data
 * @param {string} whiteboardId - Whiteboard ID
 * @param {object} data - Whiteboard data
 * @param {number} ttl - Time to live in seconds (default: 5 minutes)
 * @returns {Promise<string>} - Redis response
 */
const cacheWhiteboardData = async (whiteboardId, data, ttl = 300) => {
  const key = `whiteboard:${whiteboardId}:data`;
  return await setCacheValue(key, data, ttl);
};

/**
 * Get cached whiteboard data
 * @param {string} whiteboardId - Whiteboard ID
 * @returns {Promise<object|null>} - Whiteboard data or null if not cached
 */
const getCachedWhiteboardData = async (whiteboardId) => {
  const key = `whiteboard:${whiteboardId}:data`;
  return await getCacheValue(key);
};

/**
 * Invalidate whiteboard cache
 * @param {string} whiteboardId - Whiteboard ID
 * @returns {Promise<number>} - Number of keys removed
 */
const invalidateWhiteboardCache = async (whiteboardId) => {
  return await deleteCachePattern(`whiteboard:${whiteboardId}:*`);
};

/**
 * Cache whiteboard elements
 * @param {string} whiteboardId - Whiteboard ID
 * @param {array} elements - Array of whiteboard elements
 * @param {number} ttl - Time to live in seconds (default: 5 minutes)
 * @returns {Promise<string>} - Redis response
 */
const cacheWhiteboardElements = async (whiteboardId, elements, ttl = 300) => {
  const key = `whiteboard:${whiteboardId}:elements`;
  return await setCacheValue(key, elements, ttl);
};

/**
 * Get cached whiteboard elements
 * @param {string} whiteboardId - Whiteboard ID
 * @returns {Promise<array|null>} - Array of elements or null if not cached
 */
const getCachedWhiteboardElements = async (whiteboardId) => {
  const key = `whiteboard:${whiteboardId}:elements`;
  return await getCacheValue(key);
};

/**
 * User Activity Tracking
 */

/**
 * Track user activity
 * @param {string} userId - User ID
 * @param {string} action - Action performed
 * @returns {Promise<number>} - Redis response
 */
const trackUserActivity = async (userId, action) => {
  const key = `user:${userId}:activity`;
  const score = Date.now();
  const value = `${action}:${score}`;
  
  // Add to sorted set
  await zaddAsync(key, score, value);
  
  // Keep only last 100 activities
  const count = await zrangeAsync(key, 0, -1, 'WITHSCORES');
  if (count.length > 200) { // 100 items with scores = 200 entries
    const oldestItems = await zrangeAsync(key, 0, 49); // Get oldest 50 items
    if (oldestItems.length > 0) {
      await zremAsync(key, ...oldestItems);
    }
  }
  
  // Update last active timestamp
  await setAsync(`user:${userId}:lastActive`, Date.now().toString());
  
  return 1;
};

/**
 * Get user's recent activity
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of activities to return
 * @returns {Promise<array>} - Array of recent activities
 */
const getUserRecentActivity = async (userId, limit = 20) => {
  const key = `user:${userId}:activity`;
  const activities = await zrangeAsync(key, -limit, -1, 'WITHSCORES');
  
  // Parse activities
  const result = [];
  for (let i = 0; i < activities.length; i += 2) {
    const [actionType, timestamp] = activities[i].split(':');
    result.push({
      action: actionType,
      timestamp: parseInt(activities[i+1])
    });
  }
  
  return result;
};

/**
 * Get user's last active timestamp
 * @param {string} userId - User ID
 * @returns {Promise<number|null>} - Timestamp or null if not found
 */
const getUserLastActive = async (userId) => {
  const timestamp = await getAsync(`user:${userId}:lastActive`);
  return timestamp ? parseInt(timestamp) : null;
};

// Export Redis clients and utility functions
module.exports = {
  redisClient,
  redisPubSub,
  
  // Cache functions
  setCacheValue,
  getCacheValue,
  deleteCacheValue,
  deleteCachePattern,
  
  // Session functions
  storeSession,
  getSession,
  deleteSession,
  
  // Presence functions
  addUserToWhiteboard,
  getWhiteboardUsers,
  removeUserFromWhiteboard,
  updateCursorPosition,
  getCursorPositions,
  
  // Rate limiting
  checkRateLimit,
  
  // Pub/Sub
  subscribe,
  publish,
  
  // Whiteboard caching
  cacheWhiteboardData,
  getCachedWhiteboardData,
  invalidateWhiteboardCache,
  cacheWhiteboardElements,
  getCachedWhiteboardElements,
  
  // Activity tracking
  trackUserActivity,
  getUserRecentActivity,
  getUserLastActive
};