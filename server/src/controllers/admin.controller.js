'use strict';

const User = require('../models/User');
const Invoice = require('../models/Invoice');
const Payout = require('../models/Payout');
const WebhookEvent = require('../models/WebhookEvent');
const PaymentLink = require('../models/PaymentLink');
const ApiError = require('../utils/apiError');
const { getIO } = require('../config/socket');

// GET /api/admin/stats
exports.getStats = async (req, res) => {
  const [
    totalUsers,
    activeUsers,
    totalInvoices,
    paidInvoices,
    totalPayouts,
    pendingPayouts,
    totalWebhooks,
  ] = await Promise.all([
    User.countDocuments({ role: 'client' }),
    User.countDocuments({ role: 'client', isActive: true }),
    Invoice.countDocuments(),
    Invoice.countDocuments({ status: 'paid' }),
    Payout.countDocuments(),
    Payout.countDocuments({ status: 'pending' }),
    WebhookEvent.countDocuments(),
  ]);

  // Revenue: sum of paid invoices
  const revenueAgg = await Invoice.aggregate([
    { $match: { status: 'paid' } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);
  const totalRevenue = revenueAgg[0]?.total || 0;

  res.json({
    success: true,
    data: {
      users: { total: totalUsers, active: activeUsers, inactive: totalUsers - activeUsers },
      invoices: { total: totalInvoices, paid: paidInvoices, unpaid: totalInvoices - paidInvoices },
      payouts: { total: totalPayouts, pending: pendingPayouts },
      webhooks: { total: totalWebhooks },
      revenue: { total: totalRevenue, currency: 'USD' },
    },
  });
};

// GET /api/admin/users
exports.getUsers = async (req, res) => {
  const { role, isActive, page = 1, limit = 20, search } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

  const total = await User.countDocuments(filter);
  res.json({ success: true, data: users, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
};

// GET /api/admin/users/:id
exports.getUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  res.json({ success: true, data: user });
};

// PATCH /api/admin/users/:id/status
exports.updateUserStatus = async (req, res) => {
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') {
    throw new ApiError(400, 'isActive must be a boolean.');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');

  // Prevent admin from deactivating themselves
  if (user._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot change your own account status.');
  }

  user.isActive = isActive;
  await user.save({ validateBeforeSave: false });

  try {
    getIO().emit('user_updated', user);
  } catch (err) { console.error('Socket emit error:', err); }

  res.json({
    success: true,
    message: `User ${isActive ? 'activated' : 'deactivated'} successfully.`,
    data: user,
  });
};

// GET /api/admin/invoices
exports.getAllInvoices = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const invoices = await Invoice.find(filter)
    .populate('userId', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

  const total = await Invoice.countDocuments(filter);
  res.json({ success: true, data: invoices, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
};

// GET /api/admin/payouts
exports.getAllPayouts = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const payouts = await Payout.find(filter)
    .populate('userId', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

  const total = await Payout.countDocuments(filter);
  res.json({ success: true, data: payouts, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
};

// PATCH /api/admin/payouts/:id/status
exports.updatePayoutStatus = async (req, res) => {
  const { status, adminNote } = req.body;
  const allowed = ['approved', 'rejected', 'processing', 'completed'];
  if (!allowed.includes(status)) {
    throw new ApiError(400, `Status must be one of: ${allowed.join(', ')}`);
  }

  const payout = await Payout.findById(req.params.id);
  if (!payout) throw new ApiError(404, 'Payout not found.');
  if (payout.status === 'completed' || payout.status === 'rejected') {
    throw new ApiError(400, 'This payout is already finalised.');
  }

  payout.status = status;
  if (adminNote) payout.adminNote = adminNote;
  payout.processedBy = req.user._id;
  payout.processedAt = new Date();
  await payout.save();

  try {
    getIO().emit('payout_updated', payout);
  } catch (err) { console.error('Socket emit error:', err); }

  res.json({ success: true, data: payout, message: `Payout ${status}.` });
};

// GET /api/admin/webhooks
exports.getAllWebhooks = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const events = await WebhookEvent.find(filter)
    .populate('userId', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

  const total = await WebhookEvent.countDocuments(filter);
  res.json({ success: true, data: events, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
};
