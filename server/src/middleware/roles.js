'use strict';

const ApiError = require('../utils/apiError');

/**
 * Role-based access guard factory.
 * Usage: requireRole('admin')  or  requireRole('client')
 *
 * MUST be used AFTER verifyToken — req.user must be populated.
 *
 * Returns 403 (not 401) so the audit cannot distinguish
 * "not authenticated" from "authenticated but wrong role".
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, 'You do not have permission to access this resource.')
      );
    }

    next();
  };
};

module.exports = { requireRole };
