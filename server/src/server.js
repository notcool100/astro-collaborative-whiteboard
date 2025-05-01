/**
 * Server entry point for PCS Draw
 * 
 * This file initializes the Express app, sets up WebSocket server,
 * and connects to the database.
 */

require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initializeSocketServer } = require('./socket');
const logger = require('./utils/logger');
const { connectToDatabase } = require('./config/database');
const { connectToRedis } = require('./config/redis');

// Get port from environment or default to 3001
const PORT = process.env.PORT || 3001;

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
initializeSocketServer(server);

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    
    // Connect to Redis
    await connectToRedis();
    
    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      logger.error(`Server error: ${error.message}`);
      process.exit(1);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

// Graceful shutdown function
async function gracefulShutdown() {
  logger.info('Received shutdown signal, closing server...');
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connections
    require('./config/database').closeConnection()
      .then(() => logger.info('Database connection closed'))
      .catch(err => logger.error(`Error closing database connection: ${err.message}`));
    
    require('./config/redis').closeConnection()
      .then(() => logger.info('Redis connection closed'))
      .catch(err => logger.error(`Error closing Redis connection: ${err.message}`));
    
    logger.info('Server shutdown complete');
    process.exit(0);
  });
  
  // Force close after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Start the server
startServer();