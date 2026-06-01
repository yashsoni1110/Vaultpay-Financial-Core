'use strict';

const mongoose = require('mongoose');
const crypto = require('crypto');

const paymentLinkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Payment link title is required'],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      maxlength: 3,
    },
    slug: {
      type: String,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
    },
    timesUsed: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { transform: (_, ret) => { delete ret.__v; return ret; } },
  }
);

// Auto-generate URL slug before save
paymentLinkSchema.pre('save', function (next) {
  if (!this.isNew) return next();
  this.slug = crypto.randomBytes(8).toString('hex');
  next();
});

// Virtual: full payment URL
paymentLinkSchema.virtual('paymentUrl').get(function () {
  return `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/pay/${this.slug}`;
});

module.exports = mongoose.model('PaymentLink', paymentLinkSchema);
