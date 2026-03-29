import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env') });

// Free a port if it's already in use (Windows)
function freePort(port) {
  try {
    const result = execSync(
      `netstat -ano | findstr ":${port} " | findstr "LISTENING"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    const lines = result.trim().split('\n');
    for (const line of lines) {
      const pid = line.trim().split(/\s+/).pop();
      if (pid && /^\d+$/.test(pid) && pid !== '0') {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        console.log(`[server] Freed port ${port} (killed PID ${pid})`);
      }
    }
  } catch {
    // Port not in use – that's fine
  }
}

import { logger } from './src/config/logger.js';
import { setupSocket } from './src/config/socket.js';
import { networkInterfaces } from 'os';

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Get local IP address
function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Connect to MongoDB Atlas then start server
const startServer = async () => {
  // Dynamic imports run AFTER dotenv.config() — env vars are guaranteed to be set
  const { default: app } = await import('./src/app.js');
  const { connectDB } = await import('./src/config/database.js');
  try {
    await connectDB();

    // Kill any stale process holding the port before we try to bind
    freePort(PORT);

    const localIP = getLocalIP();

    const server = app.listen(PORT, HOST, () => {
      logger.info(`VidAI Server running in ${process.env.NODE_ENV} mode on ${HOST}:${PORT}`);
      logger.info(`API available at http://localhost:${PORT}/api/v1`);

      const publicUrl = process.env.PUBLIC_URL;
      if (publicUrl) {
        logger.info(`Mobile app can connect at ${publicUrl}/api/v1`);
      } else {
        logger.info(`Mobile app can connect at http://${localIP}:${PORT}/api/v1`);
      }

      logger.info(`Health check at http://localhost:${PORT}/api/v1/health`);
    });

    // Initialize Socket.io for real-time chat
    setupSocket(server);
    logger.info('Socket.io initialized for real-time messaging');

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is still in use after kill attempt. Try running: taskkill /F /PID $(netstat -ano | findstr ":${PORT}")`);
      } else {
        logger.error('Server error:', err.message);
      }
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', err.message);
  process.exit(1);
});

startServer();
