/**
 * Database Connection Utility for PCS Draw
 * 
 * This file provides utilities for connecting to PostgreSQL and Redis.
 * It handles connection setup, error handling, and graceful shutdown.
 */

const { Pool } = require('pg');
const redis = require('redis');
const { promisify } = require('util');
const pgConfig = require('../config/postgresql-config');
const redisConfig = require('../config/redis-config');

// Database connection pools
let pgPool = null;
let redisClient = null;
let redisPubSub = null;

/**
 * Connect to PostgreSQL
 * @returns {Pool} PostgreSQL connection pool
 */
function connectToPostgreSQL() {
  if (pgPool) {
    console.log('Using existing PostgreSQL connection pool');
    return pgPool;
  }
  
  console.log('Creating new PostgreSQL connection pool...');
  
  // Create connection pool
  pgPool = new Pool(pgConfig);
  
  // Handle pool errors
  pgPool.on('error', (err, client) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });
  
  // Test connection
  pgPool.query('SELECT NOW()')
    .then(() => console.log('PostgreSQL connected successfully'))
    .catch(err => console.error('PostgreSQL connection error:', err));
  
  return pgPool;
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
  
  // Close PostgreSQL connection pool
  if (pgPool) {
    await pgPool.end();
    console.log('PostgreSQL connection pool closed');
    pgPool = null;
  }
  
  // Close Redis connections
  if (redisClient && redisClient.connected) {
    redisClient.quit();
    console.log('Redis connection closed');
    redisClient = null;
  }
  
  if (redisPubSub && redisPubSub.connected) {
    redisPubSub.quit();
    console.log('Redis PubSub connection closed');
    redisPubSub = null;
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
  connectToPostgreSQL,
  connectToRedis,
  closeConnections,
  setupGracefulShutdown,
  getPostgreSQLPool: () => pgPool,
  getRedisClient: () => redisClient,
  getRedisPubSub: () => redisPubSub
};