'use strict';

const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

// ── Helpers ───────────────────────────────────────────────────
const COOKIE_OPTIONS = {
  httpOnly: true,          // JS cannot read — XSS protection
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days in ms
};

const sendTokens = async (user, res, statusCode = 200) => {
  const payload = { id: user._id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Store hashed refresh token in DB so we can invalidate it on logout
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

  res.status(statusCode).json({
    success: true,
    accessToken,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
  });
};

// ── POST /api/auth/register ────────────────────────────────────
exports.register = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(400, 'Validation failed', errors.array()));
  }

  const { firstName, lastName, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'An account with this email already exists.');

  const user = await User.create({
    firstName,
    lastName,
    email,
    passwordHash: password,   // pre-save hook will hash this
    role: 'client',           // registration is always client
  });

  await sendTokens(user, res, 201);
};

// ── POST /api/auth/login ───────────────────────────────────────
exports.login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(400, 'Validation failed', errors.array()));
  }

  const { email, password } = req.body;

  // Explicitly select passwordHash (excluded by default)
  const user = await User.findOne({ email }).select('+passwordHash +refreshTokenHash');

  // Use constant-time comparison even if user doesn't exist
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (!user.isActive) {
    throw new ApiError(401, 'Your account has been deactivated. Contact support.');
  }

  await sendTokens(user, res);
};

// ── POST /api/auth/refresh ─────────────────────────────────────
exports.refresh = async (req, res, next) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new ApiError(401, 'Refresh token not found.');

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token.');
  }

  const user = await User.findById(decoded.id).select('+refreshTokenHash');
  if (!user) throw new ApiError(401, 'User not found.');

  // Validate stored hash — prevents token reuse after logout
  const isValid = await user.compareRefreshToken(token);
  if (!isValid) throw new ApiError(401, 'Refresh token has been invalidated.');

  await sendTokens(user, res);
};

// ── POST /api/auth/logout ──────────────────────────────────────
exports.logout = async (req, res) => {
  // Clear the refresh token from DB
  await User.findByIdAndUpdate(req.user._id, { refreshTokenHash: null });
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict' });
  res.json({ success: true, message: 'Logged out successfully.' });
};

// ── GET /api/auth/me ───────────────────────────────────────────
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user });
};
