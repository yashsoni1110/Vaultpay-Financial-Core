'use strict';

const mongoose = require('mongoose');

// Cache connection across serverless invocations (Vercel reuses warm containers)
let cached = global._mongoConn;
if (!cached) cached = global._mongoConn = { conn: null, promise: null };

const connectDB = async () => {
  // If already connected, reuse the connection immediately
  if (cached.conn) return cached.conn;

  // If a connection is in progress, wait for it
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    }).then((m) => {
      console.log(`✅ MongoDB connected: ${m.connection.host}`);
      return m;
    }).catch((err) => {
      cached.promise = null; // reset so next call retries
      console.error(`❌ MongoDB connection failed: ${err.message}`);
      throw err;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;
