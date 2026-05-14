require('dotenv').config();
const http     = require('http');
const app      = require('./app');
const socket   = require('./config/socket');
const { pool } = require('./config/db');
const liveData = require('./services/liveDataService');

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);
socket.init(server);

const start = async () => {
  // Cloud Run sets PORT env var — must listen on it
  server.listen(PORT, '0.0.0.0', async () => {
    console.log(`[Server] Fan Pulse API running on http://0.0.0.0:${PORT}`);
    console.log(`[Server] WebSocket ready`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Verify DB connection (non-fatal — allows health check to pass)
  try {
    await pool.query('SELECT 1');
    console.log('[DB] Connected successfully');
    // Start live cricket data polling (30s interval) only after DB is confirmed
    liveData.start(30_000);
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    console.warn('[DB] Running without database — some features disabled');
  }
};

process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down gracefully');
  liveData.stop();
  server.close(() => {
    pool.end(() => process.exit(0));
  });
});

start();
