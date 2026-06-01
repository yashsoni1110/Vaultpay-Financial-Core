'use strict';

const { validationResult } = require('express-validator');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { generateInvoicePdf } = require('../utils/pdfGenerator');
const { getIO } = require('../config/socket');

// Lazy-init Stripe so missing key only errors at call time, not on import
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new ApiError(503, 'Payment processing is not configured. Contact support.');
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
};

// GET /api/invoices
exports.getInvoices = async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const filter = { userId: req.user._id };
  if (status) filter.status = status;

  const invoices = await Invoice.find(filter)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

  const total = await Invoice.countDocuments(filter);

  res.json({
    success: true,
    data: invoices,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
  });
};

// GET /api/invoices/:id
exports.getInvoice = async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new ApiError(404, 'Invoice not found.');

  // Admins can view any invoice; clients only their own
  if (req.user.role !== 'admin' && invoice.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You do not have permission to view this invoice.');
  }

  res.json({ success: true, data: invoice });
};

// POST /api/invoices
// Admin can supply targetUserId to assign invoice to a specific client
exports.createInvoice = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(400, 'Validation failed', errors.array());

  const { clientName, clientEmail, items, currency, dueDate, notes, targetUserId } = req.body;

  // Determine who the invoice belongs to
  let ownerId = req.user._id;

  if (req.user.role === 'admin' && targetUserId) {
    // Validate that the target user exists and is a client
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) throw new ApiError(404, 'Target user not found.');
    if (targetUser.role === 'admin') throw new ApiError(400, 'Cannot assign an invoice to another admin.');
    ownerId = targetUser._id;
  }

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const invoice = await Invoice.create({
    userId: ownerId,
    clientName,
    clientEmail,
    items,
    totalAmount,
    currency,
    dueDate,
    notes,
  });

  try {
    getIO().emit('invoice_created', invoice);
  } catch (err) { console.error('Socket emit error:', err); }

  res.status(201).json({ success: true, data: invoice });
};

// PATCH /api/invoices/:id
exports.updateInvoice = async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new ApiError(404, 'Invoice not found.');
  if (req.user.role !== 'admin' && invoice.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You do not have permission to update this invoice.');
  }
  if (invoice.status === 'paid') throw new ApiError(400, 'A paid invoice cannot be modified.');

  const allowed = ['clientName', 'clientEmail', 'items', 'currency', 'dueDate', 'notes', 'status'];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) invoice[field] = req.body[field];
  });

  if (req.body.items) {
    invoice.totalAmount = req.body.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice, 0
    );
  }

  await invoice.save();

  try {
    getIO().emit('invoice_updated', invoice);
  } catch (err) { console.error('Socket emit error:', err); }

  res.json({ success: true, data: invoice });
};

// DELETE /api/invoices/:id
exports.deleteInvoice = async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new ApiError(404, 'Invoice not found.');
  if (req.user.role !== 'admin' && invoice.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You do not have permission to delete this invoice.');
  }
  if (invoice.status === 'paid') throw new ApiError(400, 'A paid invoice cannot be deleted.');

  await invoice.deleteOne();

  try {
    getIO().emit('invoice_deleted', invoice._id);
  } catch (err) { console.error('Socket emit error:', err); }

  res.json({ success: true, message: 'Invoice deleted.' });
};

// POST /api/invoices/:id/pay
exports.createCheckoutSession = async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new ApiError(404, 'Invoice not found.');

  if (invoice.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You do not have permission to pay this invoice.');
  }

  if (invoice.status === 'paid') {
    throw new ApiError(400, 'This invoice has already been paid.');
  }

  if (invoice.status === 'cancelled') {
    throw new ApiError(400, 'This invoice has been cancelled and cannot be paid.');
  }

  const stripe = getStripe();
  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

  const idempotencyKey = `pay_invoice_${invoice._id}_${req.user._id}`;

  const session = await stripe.checkout.sessions.create(
    {
      payment_method_types: ['card'],
      line_items: invoice.items.map((item) => ({
        price_data: {
          currency: invoice.currency.toLowerCase(),
          product_data: { name: item.description },
          unit_amount: Math.round(item.unitPrice * 100), // Stripe uses cents
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `${clientOrigin}/invoices/${invoice._id}?payment=success`,
      cancel_url:  `${clientOrigin}/invoices/${invoice._id}?payment=cancelled`,
      metadata: {
        invoiceId:  invoice._id.toString(),
        userId:     req.user._id.toString(),
        invoiceNum: invoice.invoiceNumber,
      },
      customer_email: invoice.clientEmail,
    },
    { idempotencyKey }
  );

  // Mark invoice as "sent" if it was still a draft
  if (invoice.status === 'draft') {
    invoice.status = 'sent';
    await invoice.save();
  }

  res.json({ success: true, data: { checkoutUrl: session.url, sessionId: session.id } });
};

// GET /api/invoices/:id/pdf
exports.downloadInvoicePdf = async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new ApiError(404, 'Invoice not found.');

  // Admins can download any invoice PDF; clients only their own
  if (req.user.role !== 'admin' && invoice.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You do not have permission to download this invoice.');
  }

  const pdfBuffer = await generateInvoicePdf(invoice);

  const fileName = `invoice-${invoice.invoiceNumber}.pdf`;

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${fileName}"`,
    'Content-Length': pdfBuffer.length,
    'Cache-Control': 'no-store',
  });

  res.send(pdfBuffer);
};
