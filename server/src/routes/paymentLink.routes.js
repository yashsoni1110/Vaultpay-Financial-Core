'use strict';

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const plController = require('../controllers/paymentLink.controller');
const { verifyToken } = require('../middleware/auth');

// Public: payment page by slug
router.get('/pay/:slug', plController.getPaymentLinkBySlug);

// All other routes require auth
router.use(verifyToken);

router.get('/', plController.getPaymentLinks);
router.post('/', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be > 0'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
], plController.createPaymentLink);
router.get('/:id', plController.getPaymentLink);
router.patch('/:id/deactivate', plController.deactivatePaymentLink);

module.exports = router;
