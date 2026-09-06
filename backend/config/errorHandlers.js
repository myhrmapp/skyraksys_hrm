/**
 * Error Handler Configuration
 * Centralizes all error handling middleware
 * 
 * Error Handler Order:
 * 1. Error logger middleware (logs all errors)
 * 2. 404 Not Found handler (for undefined routes)
 * 3. Global error handler (processes all error types)
 */

const errorLogger = require('../middleware/errorLogger');
const { AppError } = require('../utils/errors');

/**
 * 404 Not Found Handler
 * Catches all requests that don't match any defined route
 * Must be placed after all route definitions
 * 
 * @param {Express.Request} req - Express request
 * @param {Express.Response} res - Express response
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    availableEndpoints: [
      '/api/auth/*',
      '/api/users/*',
      '/api/employees/*',
      '/api/departments/*',
      '/api/projects/*',
      '/api/tasks/*',
      '/api/timesheets/*',
      '/api/leave/*',
      '/api/payrolls/*',
      '/api/salary-structures/*',
      '/api/health'
    ]
  });
};

/**
 * Global Error Handler
 * Processes all error types and returns consistent JSON responses
 * Handles: AppError, Sequelize errors, JWT errors, Multer errors, generic errors
 * 
 * Note: Error is already logged by errorLogger middleware
 * 
 * @param {Error} error - Error object
 * @param {Express.Request} req - Express request
 * @param {Express.Response} res - Express response
 * @param {Express.NextFunction} next - Express next function
 */
const globalErrorHandler = (error, req, res, next) => {
  // Handle custom AppError instances (includes ValidationError, NotFoundError, etc.)
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.errors
    });
  }
  
  // Handle Sequelize validation errors
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.errors.map(e => ({ field: e.path, message: e.message }))
    });
  }
  
  // Handle Sequelize unique constraint errors
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry detected',
      field: error.errors?.[0]?.path || 'unknown'
    });
  }
  
  // Handle Sequelize foreign key constraint errors
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Cannot complete this operation because the record is referenced by other data. Remove related records first.',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
  
  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // Default error response
  res.status(error.status || error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

/**
 * Setup Error Handlers
 * Configures error logging and error response handlers
 * Must be called AFTER all routes are defined
 * 
 * @param {Express.Application} app - Express app instance
 */
const setupErrorHandlers = (app) => {
  // First, error logging middleware
  app.use(errorLogger);

  // Then, 404 handler for undefined routes
  app.all('*', notFoundHandler);

  // Finally, global error handler (must be last)
  app.use(globalErrorHandler);
};

module.exports = {
  setupErrorHandlers,
  notFoundHandler,
  globalErrorHandler
};
