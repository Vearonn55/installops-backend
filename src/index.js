import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app.js';
import dbCheck from './utils/dbCheck.js'; // make sure this file exists

const PORT = process.env.PORT || 8000;
const server = http.createServer(app);

server.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  try {
    await dbCheck(); // run DB sanity check at startup
  } catch (err) {
    console.error('DB check failed:', err.message);
  }
});
