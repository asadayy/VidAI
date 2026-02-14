import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import { connectDB } from './src/config/database.js';
import { logger } from './src/config/logger.js';

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas then start server
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      logger.info(`VidAI Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      logger.info(`API available at http://localhost:${PORT}/api/v1`);
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
