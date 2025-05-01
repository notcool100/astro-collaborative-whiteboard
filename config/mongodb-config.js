/**
 * MongoDB Configuration for PCS Draw
 * 
 * This file contains the configuration for MongoDB connections.
 * Different environments (development, test, production) have different configurations.
 */

// Load environment variables
require('dotenv').config();

// Default configuration
const defaultConfig = {
  uri: 'mongodb://localhost:27017/pcsdraw',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
    poolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4 // Use IPv4, skip trying IPv6
  }
};

// Environment-specific configurations
const environments = {
  development: {
    uri: process.env.MONGODB_URI || defaultConfig.uri,
    options: {
      ...defaultConfig.options,
      // Development-specific overrides
    }
  },
  
  test: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/pcsdraw_test',
    options: {
      ...defaultConfig.options,
      // Test-specific overrides
    }
  },
  
  production: {
    uri: process.env.MONGODB_URI || defaultConfig.uri,
    options: {
      ...defaultConfig.options,
      poolSize: process.env.MONGODB_POOL_SIZE ? parseInt(process.env.MONGODB_POOL_SIZE) : 50,
      ssl: process.env.MONGODB_SSL === 'true',
      sslValidate: process.env.MONGODB_SSL_VALIDATE === 'true',
      sslCA: process.env.MONGODB_SSL_CA,
      sslCert: process.env.MONGODB_SSL_CERT,
      sslKey: process.env.MONGODB_SSL_KEY,
      readPreference: process.env.MONGODB_READ_PREFERENCE || 'primary',
      retryWrites: true,
      w: 'majority',
      wtimeout: 10000
    }
  }
};

// Determine current environment
const env = process.env.NODE_ENV || 'development';

// Export configuration for current environment
module.exports = environments[env] || environments.development;

// Export all configurations for specific use cases
module.exports.all = environments;

// Helper function to create MongoDB connection string with options
module.exports.getConnectionString = function() {
  const config = environments[env] || environments.development;
  
  // If URI already includes options, return as is
  if (config.uri.includes('?')) {
    return config.uri;
  }
  
  // Convert options to query string
  const optionsArray = [];
  
  if (config.options.ssl) {
    optionsArray.push('ssl=true');
  }
  
  if (config.options.readPreference) {
    optionsArray.push(`readPreference=${config.options.readPreference}`);
  }
  
  if (config.options.retryWrites) {
    optionsArray.push('retryWrites=true');
  }
  
  if (config.options.w) {
    optionsArray.push(`w=${config.options.w}`);
  }
  
  // Add query string to URI if options exist
  return optionsArray.length > 0
    ? `${config.uri}?${optionsArray.join('&')}`
    : config.uri;
};