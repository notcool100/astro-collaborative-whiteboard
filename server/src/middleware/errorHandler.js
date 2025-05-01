/**
 * Error handler middleware
 * 
 * This middleware handles errors in a consistent way across the application.
 */

const logger = require('../utils/logger');

// Custom error class for API errors
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
function errorHandler(err, req, res, next) {
  // Default status code and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = err.errors || err.message;
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Unauthorized: Invalid or expired token';
  } else if (err.name === 'MongoError' && err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate key error';
    details = err.keyValue;
  }
  
  // Log the error (but not for 401/403 errors which are common)
  if (statusCode >= 500 || (statusCode !== 401 && statusCode !== 403)) {
    logger.error(`${statusCode} - ${message}`, {
      path: req.path,
      method: req.method,
      error: err.stack,
      requestId: req.id
    });
  }
  
  // Send error response
  res.status(statusCode).json({
    error: {
      status: statusCode,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    }
  });
}

module.exports = {
  errorHandler,
  ApiError
};