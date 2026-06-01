'use strict';

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

/**
 * 🔒 DOUBLE GUARD: Every admin route requires BOTH:
 *   1. verifyToken  — valid JWT access token
 *   2. requireRole('admin') — user must have role 'admin'
 *
 * A client with a valid token will receive 403 Forbidden.
 * An unauthenticated request will receive 401 Unauthorized.
 * These are applied as router-level middleware so NO route can bypass them.
 */
router.use(verifyToken);
router.use(requireRole('admin'));

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only endpoints — requires role=admin
 */

// Platform stats
router.get('/stats', adminController.getStats);

// User management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUser);
router.patch('/users/:id/status', adminController.updateUserStatus);

// Invoice oversight
router.get('/invoices', adminController.getAllInvoices);

// Payout oversight & approval
router.get('/payouts', adminController.getAllPayouts);
router.patch('/payouts/:id/status', adminController.updatePayoutStatus);

// Webhook event log
router.get('/webhooks', adminController.getAllWebhooks);

module.exports = router;
