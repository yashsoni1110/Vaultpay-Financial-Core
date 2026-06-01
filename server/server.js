'use strict';

require('dotenv').config();
require('express-async-errors');

const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const socketConfig = require('./src/config/socket');
socketConfig.init(server);

(async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`\n🚀 VaultPay API running on http://localhost:${PORT}`);
    console.log(`🔌 Socket.IO enabled`);
    console.log(`📖 Swagger docs  → http://localhost:${PORT}/api/docs`);
    console.log(`🌍 Environment   → ${process.env.NODE_ENV}\n`);
  });
})();
