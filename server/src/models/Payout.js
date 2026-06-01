'use strict';

const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payout amount is required'],
      min: [1, 'Minimum payout amount is 1'],
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      maxlength: 3,
    },
    bankDetails: {
      bankName: { type: String, required: true, trim: true },
      accountName: { type: String, required: true, trim: true },
      accountNumber: { type: String, required: true, trim: true },
      routingNumber: { type: String, trim: true },
      iban: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'processing', 'completed'],
      default: 'pending',
    },
    adminNote: {
      type: String,
      maxlength: 500,
    },
    processedAt: {
      type: Date,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { transform: (_, ret) => { delete ret.__v; return ret; } },
  }
);

module.exports = mongoose.model('Payout', payoutSchema);
