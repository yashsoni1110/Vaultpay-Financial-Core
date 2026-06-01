'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const ApiError = require('../utils/apiError');
const User = require('../models/User');

/**
 * Middleware: Verify Bearer JWT access token.
 * Attaches `req.user` (lean DB record) on success.
 * Returns 401 on any failure — do NOT return 403 here so the
 * role guard can emit the correct 403 for authenticated but
 * unauthorised requests.
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Access token required.');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token); // throws on invalid/expired

    // Fetch fresh user record — catches deactivated accounts mid-session
    const user = await User.findById(decoded.id).select('-passwordHash -refreshTokenHash').lean();

    if (!user) {
      throw new ApiError(401, 'User not found.');
    }

    if (!user.isActive) {
      throw new ApiError(401, 'Your account has been deactivated. Contact support.');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { verifyToken };
