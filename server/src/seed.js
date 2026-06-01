'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Invoice = require('./models/Invoice');
const PaymentLink = require('./models/PaymentLink');
const Payout = require('./models/Payout');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Invoice.deleteMany({}),
      PaymentLink.deleteMany({}),
      Payout.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // Create Admin
    const admin = await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@vaultpay.io',
      passwordHash: 'Admin@1234',
      role: 'admin',
    });
    console.log(`👑 Admin created: admin@vaultpay.io / Admin@1234`);

    // Create Client
    const client = await User.create({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'client@vaultpay.io',
      passwordHash: 'Client@1234',
      role: 'client',
    });
    console.log(`👤 Client created: client@vaultpay.io / Client@1234`);

    // Create demo invoices
    await Invoice.create([
      {
        userId: client._id,
        clientName: 'Acme Corp',
        clientEmail: 'billing@acme.com',
        items: [
          { description: 'Web Development Services', quantity: 1, unitPrice: 2500 },
          { description: 'Hosting Setup', quantity: 1, unitPrice: 150 },
        ],
        totalAmount: 2650,
        currency: 'USD',
        status: 'paid',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        userId: client._id,
        clientName: 'TechStart Ltd',
        clientEmail: 'accounts@techstart.io',
        items: [
          { description: 'API Integration', quantity: 3, unitPrice: 800 },
        ],
        totalAmount: 2400,
        currency: 'USD',
        status: 'sent',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    ]);
    console.log('📄 Demo invoices created');

    // Create demo payment link
    await PaymentLink.create({
      userId: client._id,
      title: 'Consulting Session',
      description: '1-hour technical consulting',
      amount: 150,
      currency: 'USD',
    });
    console.log('🔗 Demo payment link created');

    // Create demo payout
    await Payout.create({
      userId: client._id,
      amount: 2500,
      currency: 'USD',
      bankDetails: {
        bankName: 'Chase Bank',
        accountName: 'Jane Doe',
        accountNumber: '****1234',
        routingNumber: '021000021',
      },
      status: 'pending',
    });
    console.log('💸 Demo payout created');

    console.log('\n✅ Seeding complete!\n');
    console.log('┌─────────────────────────────────────────┐');
    console.log('│  Admin:   admin@vaultpay.io / Admin@1234 │');
    console.log('│  Client:  client@vaultpay.io / Client@1234 │');
    console.log('└─────────────────────────────────────────┘\n');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seed();
