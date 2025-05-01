/**
 * PostgreSQL Configuration for PCS Draw
 * 
 * This file contains the configuration for PostgreSQL connections.
 * Different environments (development, test, production) have different configurations.
 */

// Load environment variables
require('dotenv').config();

// Default configuration
const defaultConfig = {
  host: 'localhost',
  port: 5432,
  database: 'astrowhiteboard',
  user: 'postgres',
  password: 'yourdad',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a connection to become available
  ssl: false
};

// Environment-specific configurations
const environments = {
  development: {
    ...defaultConfig,
    // Development-specific overrides
  },
  
  test: {
    ...defaultConfig,
    database: 'astrowhiteboard_test',
    // Test-specific overrides
  },
  
  production: {
    host: process.env.POSTGRES_HOST || defaultConfig.host,
    port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT) : defaultConfig.port,
    database: process.env.POSTGRES_DB || defaultConfig.database,
    user: process.env.POSTGRES_USER || defaultConfig.user,
    password: process.env.POSTGRES_PASSWORD || defaultConfig.password,
    max: process.env.POSTGRES_MAX_CLIENTS ? parseInt(process.env.POSTGRES_MAX_CLIENTS) : 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.POSTGRES_SSL === 'true' ? {
      rejectUnauthorized: process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED !== 'false',
      ca: process.env.POSTGRES_SSL_CA,
      cert: process.env.POSTGRES_SSL_CERT,
      key: process.env.POSTGRES_SSL_KEY
    } : false
  }
};

// Determine current environment
const env = process.env.NODE_ENV || 'development';

// Export configuration for current environment
module.exports = environments[env] || environments.development;

// Export all configurations for specific use cases
module.exports.all = environments;

// Helper function to create connection string
module.exports.getConnectionString = function() {
  const config = environments[env] || environments.development;
  
  // Build connection string
  let connectionString = `postgresql://${config.user}:${encodeURIComponent(config.password)}@${config.host}:${config.port}/${config.database}`;
  
  // Add SSL parameters if needed
  if (config.ssl) {
    connectionString += '?sslmode=require';
  }
  
  return connectionString;
};