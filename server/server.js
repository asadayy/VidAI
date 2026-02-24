import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import { connectDB } from './src/config/database.js';
import { logger } from './src/config/logger.js';
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
  try {
    await connectDB();

    const localIP = getLocalIP();

    app.listen(PORT, HOST, () => {
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
