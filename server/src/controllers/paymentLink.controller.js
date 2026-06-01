'use strict';

const { validationResult } = require('express-validator');
const PaymentLink = require('../models/PaymentLink');
const ApiError = require('../utils/apiError');
const { getIO } = require('../config/socket');

const ownershipCheck = (link, userId) => {
  if (link.userId.toString() !== userId.toString()) {
    throw new ApiError(403, 'You do not have permission to access this payment link.');
  }
};

exports.getPaymentLinks = async (req, res) => {
  const { page = 1, limit = 10, isActive } = req.query;
  const filter = { userId: req.user._id };
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const links = await PaymentLink.find(filter)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

  const total = await PaymentLink.countDocuments(filter);
  res.json({ success: true, data: links, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
};

exports.getPaymentLink = async (req, res) => {
  const link = await PaymentLink.findById(req.params.id);
  if (!link) throw new ApiError(404, 'Payment link not found.');
  ownershipCheck(link, req.user._id);
  res.json({ success: true, data: link });
};

exports.getPaymentLinkBySlug = async (req, res) => {
  // Public endpoint — used for the payment page (no auth needed)
  const link = await PaymentLink.findOne({ slug: req.params.slug, isActive: true });
  if (!link) throw new ApiError(404, 'Payment link not found or has been deactivated.');
  if (link.expiresAt && link.expiresAt < new Date()) {
    throw new ApiError(410, 'This payment link has expired.');
  }
  // Only expose safe fields
  res.json({
    success: true,
    data: {
      title: link.title,
      description: link.description,
      amount: link.amount,
      currency: link.currency,
    },
  });
};

exports.createPaymentLink = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(400, 'Validation failed', errors.array());

  const { title, description, amount, currency, expiresAt } = req.body;
  const link = await PaymentLink.create({
    userId: req.user._id,
    title,
    description,
    amount,
    currency,
    expiresAt,
  });

  try {
    getIO().emit('paymentLink_created', link);
  } catch (err) { console.error('Socket emit error:', err); }

  res.status(201).json({ success: true, data: link });
};

exports.deactivatePaymentLink = async (req, res) => {
  const link = await PaymentLink.findById(req.params.id);
  if (!link) throw new ApiError(404, 'Payment link not found.');
  ownershipCheck(link, req.user._id);
  link.isActive = false;
  await link.save();

  try {
    getIO().emit('paymentLink_updated', link);
  } catch (err) { console.error('Socket emit error:', err); }

  res.json({ success: true, data: link, message: 'Payment link deactivated.' });
};
