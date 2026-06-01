'use strict';

/**
 * Standardised API error class.
 * Attach a statusCode and let the global error handler format the response.
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;

    // Capture stack in dev
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
