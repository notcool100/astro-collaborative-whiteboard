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

// Connect to Redis
async function connectToRedis() {
  try {
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

    // Connect to Redis
    await redisClient.connect();
    await redisPubSub.connect();
    
    logger.info('Connected to Redis successfully');
    
    return { redisClient, redisPubSub };
  } catch (error) {
    logger.error(`Redis connection error: ${error.message}`);
    throw error;
  }
}

// Close Redis connection
async function closeConnection() {
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
  if (!redisClient || !redisClient.isOpen) {
    throw new Error('Redis client not connected');
  }
  return redisClient;
}

// Get Redis PubSub client
function getPubSubClient() {
  if (!redisPubSub || !redisPubSub.isOpen) {
    throw new Error('Redis PubSub client not connected');
  }
  return redisPubSub;
}

module.exports = {
  connectToRedis,
  closeConnection,
  getClient,
  getPubSubClient
};