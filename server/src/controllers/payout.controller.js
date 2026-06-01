'use strict';

const { validationResult } = require('express-validator');
const Payout = require('../models/Payout');
const ApiError = require('../utils/apiError');
const { getIO } = require('../config/socket');

exports.getPayouts = async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const filter = { userId: req.user._id };
  if (status) filter.status = status;

  const payouts = await Payout.find(filter)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

  const total = await Payout.countDocuments(filter);
  res.json({ success: true, data: payouts, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
};

exports.getPayout = async (req, res) => {
  const payout = await Payout.findById(req.params.id);
  if (!payout) throw new ApiError(404, 'Payout not found.');
  if (payout.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You do not have permission to view this payout.');
  }
  res.json({ success: true, data: payout });
};

exports.requestPayout = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(400, 'Validation failed', errors.array());

  const { amount, currency, bankDetails } = req.body;

  // Check for existing pending payout
  const existing = await Payout.findOne({ userId: req.user._id, status: 'pending' });
  if (existing) {
    throw new ApiError(409, 'You already have a pending payout request. Wait for it to be processed.');
  }

  const payout = await Payout.create({
    userId: req.user._id,
    amount,
    currency,
    bankDetails,
  });

  try {
    getIO().emit('payout_created', payout);
  } catch (err) { console.error('Socket emit error:', err); }

  res.status(201).json({ success: true, data: payout });
};
