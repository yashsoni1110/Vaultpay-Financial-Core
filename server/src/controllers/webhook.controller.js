'use strict';

const crypto = require('crypto');
const WebhookEvent = require('../models/WebhookEvent');
const Invoice = require('../models/Invoice');
const ApiError = require('../utils/apiError');
const { getIO } = require('../config/socket');

/**
 * POST /api/webhooks
 *
 * Handles TWO types of inbound webhooks:
 *
 * 1. Stripe events (checkout.session.completed, etc.)
 *    → Verified via Stripe's own `stripe-signature` header + STRIPE_WEBHOOK_SECRET
 *    → On checkout.session.completed: marks the invoice as "paid"
 *
 * 2. Custom VaultPay events from other integrations
 *    → Verified via HMAC-SHA256 on `x-vaultpay-signature` header
 *
 * Body must be raw buffer (configured in app.js for this path).
 */
exports.receiveWebhook = async (req, res) => {
  const rawBody       = req.rawBody || req.body;   // raw Buffer from express.json verify
  const stripeHeader  = req.headers['stripe-signature'];
  const vaultHeader   = req.headers['x-vaultpay-signature'];

  let signatureValid = false;
  let parsedPayload  = {};
  let eventType      = 'payment.success';
  let targetUserId   = null;
  let isStripeEvent  = false;

  /* 1. Try Stripe webhook verification */
  if (stripeHeader && process.env.STRIPE_WEBHOOK_SECRET) {
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      console.log('[Webhook Debug] isBuffer:', Buffer.isBuffer(rawBody), 'typeof:', typeof rawBody);
      const stripeEvent = stripe.webhooks.constructEvent(
        rawBody,
        stripeHeader,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      isStripeEvent  = true;
      signatureValid = true;
      parsedPayload  = stripeEvent;
      eventType      = stripeEvent.type; // e.g. 'checkout.session.completed'

      /* Handle checkout.session.completed */
      if (stripeEvent.type === 'checkout.session.completed') {
        const session   = stripeEvent.data.object;
        const invoiceId = session.metadata?.invoiceId;

        if (invoiceId) {
          const updated = await Invoice.findByIdAndUpdate(
            invoiceId,
            {
              status: 'paid',
              stripeSessionId: session.id,
            },
            { new: true }
          );

          if (updated) {
            targetUserId = updated.userId;
            try {
              getIO().emit('invoice_updated', updated);
            } catch (err) { console.error('Socket emit error:', err); }
          }
        }
      }

    } catch (stripeErr) {
      // Log the exact error to the database so we can inspect it!
      await WebhookEvent.create({
        eventType: 'stripe_signature_failed',
        processingError: stripeErr.message + ' | isBuffer: ' + Buffer.isBuffer(rawBody) + ' | typeof: ' + typeof rawBody,
        status: 'failed',
      });
      console.error('[Webhook] Invalid Stripe signature:', stripeErr.message);
      return res.status(400).json({ success: false, message: 'Invalid Stripe signature.' });
    }
  }

  /* 2. Fall back to custom VaultPay HMAC verification */
  if (!isStripeEvent) {
    try {
      parsedPayload = req.body; // already parsed by express.json
      eventType     = parsedPayload?.eventType || 'payment.success';
      targetUserId  = parsedPayload?.userId    || null;
    } catch {
      parsedPayload = {};
    }

    if (vaultHeader && rawBody && process.env.WEBHOOK_SECRET) {
      const expected = 'sha256=' +
        crypto
          .createHmac('sha256', process.env.WEBHOOK_SECRET)
          .update(rawBody)
          .digest('hex');

      try {
        signatureValid = crypto.timingSafeEqual(
          Buffer.from(vaultHeader),
          Buffer.from(expected)
        );
      } catch {
        signatureValid = false;
      }
    }
  }

  /* 3. Persist the event record */
  const webevent = await WebhookEvent.create({
    userId:         targetUserId,
    eventType:      eventType,
    payload:        parsedPayload,
    signature:      stripeHeader || vaultHeader || null,
    signatureValid,
    status:         signatureValid ? 'processed' : 'failed',
    processingError: signatureValid ? null : 'Invalid signature',
  });

  try {
    getIO().emit('webhook_received', webevent);
  } catch (err) { console.error('Socket emit error:', err); }

  // Always acknowledge — never reveal signature validation result to caller
  res.status(200).json({ success: true, received: true });
};

/**
 * GET /api/webhooks
 * Client views their own webhook events.
 */
exports.getWebhookEvents = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const filter = { userId: req.user._id };

  const events = await WebhookEvent.find(filter)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

  const total = await WebhookEvent.countDocuments(filter);
  res.json({
    success: true,
    data: events,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
  });
};
