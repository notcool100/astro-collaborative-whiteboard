/**
 * Redis Configuration for PCS Draw
 * 
 * This file contains the configuration for Redis connections.
 * Different environments (development, test, production) have different configurations.
 */

// Load environment variables
require('dotenv').config();

// Default configuration
const defaultConfig = {
  host: 'localhost',
  port: 6379,
  password: null,
  db: 0,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3
};

// Environment-specific configurations
const environments = {
  development: {
    ...defaultConfig,
    // Development-specific overrides
  },
  
  test: {
    ...defaultConfig,
    db: 1, // Use a different database for testing
  },
  
  production: {
    host: process.env.REDIS_HOST || defaultConfig.host,
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : defaultConfig.port,
    password: process.env.REDIS_PASSWORD || defaultConfig.password,
    db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : defaultConfig.db,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    enableReadyCheck: true,
    maxRetriesPerRequest: 5,
    retryStrategy: function(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  }
};

// Determine current environment
const env = process.env.NODE_ENV || 'development';

// Export configuration for current environment
module.exports = environments[env] || environments.development;

// Export all configurations for specific use cases
module.exports.all = environments;