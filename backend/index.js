const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { validateEnv } = require('./config/envValidation');
const connectToMongo = require('./db');
const { logger } = require('./config/logger');
const { startDeletionProcessor } = require('./utils/deletionProcessor');
const app = require('./app');

validateEnv();
connectToMongo();

const port = process.env.PORT || 5000;

const server = app.listen(port, () => {
  logger.info(`Server running on port ${port} in ${process.env.NODE_ENV} mode`);
});

startDeletionProcessor();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection', { error: err });
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});


