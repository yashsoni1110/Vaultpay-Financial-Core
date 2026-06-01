const app = require('../src/app');
const connectDB = require('../src/config/db');

// Ensure DB is connected before handling requests
let dbInitialized = false;

module.exports = async (req, res) => {
  if (!dbInitialized) {
    await connectDB();
    dbInitialized = true;
  }
  return app(req, res);
};
