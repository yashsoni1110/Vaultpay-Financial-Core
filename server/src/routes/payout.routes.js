'use strict';

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const payoutController = require('../controllers/payout.controller');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', payoutController.getPayouts);
router.post('/', [
  body('amount').isFloat({ min: 1 }).withMessage('Payout amount must be >= 1'),
  body('bankDetails.bankName').trim().notEmpty().withMessage('Bank name is required'),
  body('bankDetails.accountName').trim().notEmpty().withMessage('Account name is required'),
  body('bankDetails.accountNumber').trim().notEmpty().withMessage('Account number is required'),
], payoutController.requestPayout);
router.get('/:id', payoutController.getPayout);

module.exports = router;
