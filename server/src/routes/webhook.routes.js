'use strict';

const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const { verifyToken } = require('../middleware/auth');

// POST /api/webhooks — raw body parser already applied in app.js for this path
router.post('/', webhookController.receiveWebhook);

// GET /api/webhooks — authenticated, client-scoped
router.get('/', verifyToken, webhookController.getWebhookEvents);

module.exports = router;
