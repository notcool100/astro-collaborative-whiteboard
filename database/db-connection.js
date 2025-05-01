/**
 * Database Connection Utility for PCS Draw
 * 
 * This file provides utilities for connecting to MongoDB and Redis.
 * It handles connection setup, error handling, and graceful shutdown.
 */

const mongoose = require('mongoose');
const redis = require('redis');
const { promisify } = require('util');
const mongoConfig = require('../config/mongodb-config');
const redisConfig = require('../config/redis-config');

// Track connection status
let isConnected = false;
let redisClient = null;
let redisPubSub = null;

/**
 * Connect to MongoDB
 * @returns {Promise<mongoose.Connection>} Mongoose connection
 */
async function connectToMongoDB() {
  if (isConnected) {
    console.log('Using existing MongoDB connection');
    return mongoose.connection;
  }
  
  console.log('Creating new MongoDB connection...');
  
  try {
    // Configure mongoose
    mongoose.set('debug', process.env.NODE_ENV === 'development');
    
    // Connect to MongoDB
    await mongoose.connect(mongoConfig.uri, mongoConfig.options);
    
    isConnected = true;
    console.log('MongoDB connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      isConnected = false;
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      isConnected = false;
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
      isConnected = true;
    });
    
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    throw error;
  }
}

/**
 * Connect to Redis
 * @returns {Object} Redis clients (regular and pubsub)
 */
function connectToRedis() {
  if (redisClient && redisClient.connected) {
    console.log('Using existing Redis connection');
    return { redisClient, redisPubSub };
  }
  
  console.log('Creating new Redis connection...');
  
  // Create Redis client
  redisClient = redis.createClient({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db,
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
  redisPubSub = redis.createClient({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db
  });
  
  // Handle Redis errors
  redisClient.on('error', (err) => {
    console.error('Redis Error:', err);
  });
  
  redisClient.on('connect', () => {
    console.log('Redis connected successfully');
  });
  
  redisPubSub.on('error', (err) => {
    console.error('Redis PubSub Error:', err);
  });
  
  // Promisify Redis commands
  redisClient.getAsync = promisify(redisClient.get).bind(redisClient);
  redisClient.setAsync = promisify(redisClient.set).bind(redisClient);
  redisClient.delAsync = promisify(redisClient.del).bind(redisClient);
  redisClient.hgetAsync = promisify(redisClient.hget).bind(redisClient);
  redisClient.hsetAsync = promisify(redisClient.hset).bind(redisClient);
  redisClient.hgetallAsync = promisify(redisClient.hgetall).bind(redisClient);
  redisClient.hmsetAsync = promisify(redisClient.hmset).bind(redisClient);
  redisClient.expireAsync = promisify(redisClient.expire).bind(redisClient);
  redisClient.ttlAsync = promisify(redisClient.ttl).bind(redisClient);
  redisClient.saddAsync = promisify(redisClient.sadd).bind(redisClient);
  redisClient.smembersAsync = promisify(redisClient.smembers).bind(redisClient);
  redisClient.sremAsync = promisify(redisClient.srem).bind(redisClient);
  redisClient.zaddAsync = promisify(redisClient.zadd).bind(redisClient);
  redisClient.zrangeAsync = promisify(redisClient.zrange).bind(redisClient);
  redisClient.zremAsync = promisify(redisClient.zrem).bind(redisClient);
  redisClient.keysAsync = promisify(redisClient.keys).bind(redisClient);
  
  return { redisClient, redisPubSub };
}

/**
 * Close database connections
 * @returns {Promise<void>}
 */
async function closeConnections() {
  console.log('Closing database connections...');
  
  // Close MongoDB connection
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
  
  // Close Redis connections
  if (redisClient && redisClient.connected) {
    redisClient.quit();
    console.log('Redis connection closed');
  }
  
  if (redisPubSub && redisPubSub.connected) {
    redisPubSub.quit();
    console.log('Redis PubSub connection closed');
  }
}

/**
 * Setup graceful shutdown
 */
function setupGracefulShutdown() {
  // Handle process termination
  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await closeConnections();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await closeConnections();
    process.exit(0);
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);
    await closeConnections();
    process.exit(1);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason);
    await closeConnections();
    process.exit(1);
  });
}

// Export database connection utilities
module.exports = {
  connectToMongoDB,
  connectToRedis,
  closeConnections,
  setupGracefulShutdown,
  getMongooseConnection: () => mongoose.connection,
  getRedisClient: () => redisClient,
  getRedisPubSub: () => redisPubSub
};