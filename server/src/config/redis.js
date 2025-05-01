/**
 * Redis configuration
 * 
 * This file handles the connection to Redis and provides
 * utility functions for Redis operations.
 */

const { createClient } = require('redis');
const logger = require('../utils/logger');

// Redis clients
let redisClient = null;
let redisPubSub = null;
let redisEnabled = true;

// Mock Redis client for development without Redis
const mockRedisClient = {
  get: async () => null,
  set: async () => 'OK',
  del: async () => 1,
  exists: async () => 0,
  expire: async () => 1,
  publish: async () => 0,
  subscribe: async () => {},
  isOpen: true
};

// Connect to Redis
async function connectToRedis() {
  try {
    // Check if Redis is disabled
    if (process.env.REDIS_ENABLED === 'false') {
      redisEnabled = false;
      logger.warn('Redis is disabled. Using mock Redis client.');
      redisClient = mockRedisClient;
      redisPubSub = mockRedisClient;
      return { redisClient, redisPubSub };
    }
    
    if (redisClient && redisClient.isOpen) {
      logger.info('Using existing Redis connection');
      return { redisClient, redisPubSub };
    }
    
    const { 
      REDIS_HOST, 
      REDIS_PORT, 
      REDIS_PASSWORD,
      REDIS_DB,
      REDIS_TLS,
      REDIS_URI
    } = process.env;

    // Create Redis client configuration
    const config = {
      url: REDIS_URI || `redis://${REDIS_HOST || 'localhost'}:${REDIS_PORT || 6379}`,
      password: REDIS_PASSWORD || undefined,
      database: parseInt(REDIS_DB || '0'),
      socket: {
        tls: REDIS_TLS === 'true'
      }
    };
    
    // Create main Redis client
    redisClient = createClient(config);

    // Create separate client for pub/sub (to avoid blocking)
    redisPubSub = createClient(config);
    
    // Set up event handlers for main client
    redisClient.on('error', (err) => {
      logger.error(`Redis error: ${err.message}`);
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis reconnecting...');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });
    
    // Set up event handlers for pub/sub client
    redisPubSub.on('error', (err) => {
      logger.error(`Redis PubSub error: ${err.message}`);
    });

    try {
      // Connect to Redis
      await redisClient.connect();
      await redisPubSub.connect();
      
      logger.info('Connected to Redis successfully');
    } catch (error) {
      logger.error(`Failed to connect to Redis: ${error.message}`);
      logger.warn('Falling back to mock Redis client');
      redisEnabled = false;
      redisClient = mockRedisClient;
      redisPubSub = mockRedisClient;
    }
    
    return { redisClient, redisPubSub };
  } catch (error) {
    logger.error(`Redis connection error: ${error.message}`);
    logger.warn('Falling back to mock Redis client');
    redisEnabled = false;
    redisClient = mockRedisClient;
    redisPubSub = mockRedisClient;
    return { redisClient, redisPubSub };
  }
}

// Close Redis connection
async function closeConnection() {
  if (!redisEnabled) {
    return Promise.resolve();
  }
  
  let promises = [];
  
  if (redisClient && redisClient.isOpen) {
    promises.push(redisClient.quit());
    logger.info('Closing Redis client connection');
  }
  
  if (redisPubSub && redisPubSub.isOpen) {
    promises.push(redisPubSub.quit());
    logger.info('Closing Redis PubSub connection');
  }
  
  if (promises.length > 0) {
    await Promise.all(promises);
  }
  
  return Promise.resolve();
}

// Get Redis client
function getClient() {
  if (!redisEnabled) {
    return mockRedisClient;
  }
  
  if (!redisClient || !redisClient.isOpen) {
    logger.warn('Redis client not connected, using mock client');
    return mockRedisClient;
  }
  
  return redisClient;
}

// Get Redis PubSub client
function getPubSubClient() {
  if (!redisEnabled) {
    return mockRedisClient;
  }
  
  if (!redisPubSub || !redisPubSub.isOpen) {
    logger.warn('Redis PubSub client not connected, using mock client');
    return mockRedisClient;
  }
  
  return redisPubSub;
}

module.exports = {
  connectToRedis,
  closeConnection,
  getClient,
  getPubSubClient
};