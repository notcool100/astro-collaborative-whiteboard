/**
 * PostgreSQL database configuration
 * 
 * This file handles the connection to PostgreSQL and provides
 * utility functions for database operations.
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

// PostgreSQL connection pool
let pgPool = null;

// Get PostgreSQL configuration from environment variables
const getConfig = () => {
  return {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'astrowhiteboard',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'yourdad',
    max: parseInt(process.env.POSTGRES_MAX_CLIENTS || '20'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.POSTGRES_SSL === 'true' ? {
      rejectUnauthorized: process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED !== 'false',
      ca: process.env.POSTGRES_SSL_CA,
      cert: process.env.POSTGRES_SSL_CERT,
      key: process.env.POSTGRES_SSL_KEY
    } : false
  };
};

// Connect to PostgreSQL
async function connectToDatabase() {
  try {
    if (pgPool) {
      logger.info('Using existing PostgreSQL connection pool');
      return pgPool;
    }
    
    // Create connection pool
    pgPool = new Pool(getConfig());
    
    // Handle pool errors
    pgPool.on('error', (err) => {
      logger.error('Unexpected error on idle PostgreSQL client', err);
    });
    
    // Test connection
    const result = await pgPool.query('SELECT NOW() as now');
    logger.info(`Connected to PostgreSQL successfully at ${result.rows[0].now}`);
    
    return pgPool;
  } catch (error) {
    logger.error(`PostgreSQL connection error: ${error.message}`);
    throw error;
  }
}

// Close PostgreSQL connection
async function closeConnection() {
  if (pgPool) {
    logger.info('Closing PostgreSQL connection pool');
    await pgPool.end();
    pgPool = null;
  }
  return Promise.resolve();
}

// Get the current connection pool
function getConnection() {
  return pgPool;
}

// Execute a query with parameters
async function query(text, params = []) {
  if (!pgPool) {
    throw new Error('Database connection not established');
  }
  
  try {
    const result = await pgPool.query(text, params);
    return result;
  } catch (error) {
    logger.error(`Database query error: ${error.message}`);
    throw error;
  }
}

// Execute a single-row query
async function queryOne(text, params = []) {
  const result = await query(text, params);
  return result.rows.length > 0 ? result.rows[0] : null;
}

// Execute a query and return all rows
async function queryAll(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}

// Execute a query within a transaction
async function withTransaction(callback) {
  if (!pgPool) {
    throw new Error('Database connection not established');
  }
  
  const client = await pgPool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Transaction error: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  connectToDatabase,
  closeConnection,
  getConnection,
  query,
  queryOne,
  queryAll,
  withTransaction
};