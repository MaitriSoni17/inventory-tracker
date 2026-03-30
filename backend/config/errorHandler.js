const { logger } = require('./logger');

// Standardized API response wrapper
function successResponse(data, message = 'Success', statusCode = 200) {
  return {
    success: true,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

function errorResponse(error, statusCode = 500) {
  return {
    success: false,
    statusCode,
    message: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  };
}

// Custom error class for API errors
class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

// Global error handler middleware - catches all errors
function errorHandler(err, req, res, next) {
  // Default to 500 if no status specified
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error with request context
  logger.error('API Error', {
    requestId: req.id,
    statusCode,
    message,
    path: req.path,
    method: req.method,
    stack: err.stack,
    body: req.body,
    query: req.query
  });

  // Don't expose internal error details in production
  const responseMessage = process.env.NODE_ENV === 'production' && statusCode === 500 
    ? 'Internal Server Error' 
    : message;

  res.status(statusCode).json(errorResponse(
    new Error(responseMessage),
    statusCode
  ));
}

// Async route wrapper to catch async errors
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Validation error handler for express-validator
function validationErrorHandler(errors) {
  if (!errors.isEmpty()) {
    const messages = errors.array().map(e => ({
      field: e.param,
      message: e.msg
    }));
    throw new AppError(
      `Validation failed: ${messages.map(m => m.message).join(', ')}`,
      400,
      'VALIDATION_ERROR'
    );
  }
}

module.exports = {
  AppError,
  successResponse,
  errorResponse,
  errorHandler,
  asyncHandler,
  validationErrorHandler,
  logger
};
