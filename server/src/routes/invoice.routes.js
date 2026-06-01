'use strict';

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// All invoice routes require authentication
router.use(verifyToken);

const invoiceValidation = [
  body('clientName').trim().notEmpty().withMessage('Client name is required'),
  body('clientEmail').isEmail().withMessage('Valid client email is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('items.*.description').trim().notEmpty().withMessage('Item description is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be >= 1'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be >= 0'),
];

/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: Invoice management
 */

// List (everyone) & create (admin only)
router.get('/',    invoiceController.getInvoices);
router.post('/',   requireRole('admin'), invoiceValidation, invoiceController.createInvoice);

// Single invoice CRUD
router.get('/:id',    invoiceController.getInvoice);
router.patch('/:id',  requireRole('admin'), invoiceController.updateInvoice);
router.delete('/:id', requireRole('admin'), invoiceController.deleteInvoice);

// Req 2: Stripe Checkout — creates session and returns URL
router.post('/:id/pay', invoiceController.createCheckoutSession);

// Req 3: PDF download — streams PDF buffer with attachment header
router.get('/:id/pdf', invoiceController.downloadInvoicePdf);

module.exports = router;
