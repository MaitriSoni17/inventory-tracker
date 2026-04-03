const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Validate environment variables before anything else
const { validateEnv } = require('./config/envValidation');
validateEnv();

const connectToMongo = require('./db');
connectToMongo();
const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const fs = require('fs');
const multer = require('multer');
const { startDeletionProcessor } = require('./utils/deletionProcessor');
const { logger, requestLogger } = require('./config/logger');
const { securityHeaders, corsConfig, generalLimiter, authLimiter } = require('./config/security');
const { errorHandler, asyncHandler } = require('./config/errorHandler');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ============= MIDDLEWARE SETUP =============

// Security headers first
securityHeaders(app);

// CORS - after security headers
app.use(corsConfig());

// Request logging
app.use(requestLogger);

// Rate limiting - general limit for all routes
app.use(generalLimiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// ============= API ROUTES =============
// Auth routes have stricter rate limiting
app.use('/api/auth', authLimiter, require('./routes/auth'));

// Main API routes
app.use('/api/products', require('./routes/products'));
app.use('/api/businessowner', require('./routes/businessowner'));
app.use('/api/employee', require('./routes/employee'));
app.use('/api/supplier', require('./routes/supplier'));
app.use('/api/customerorders', require('./routes/customerorders'));
app.use('/api/supplierorders', require('./routes/supplierorders'));
app.use('/api/warehouse', require('./routes/warehouse'));
app.use('/api/category', require('./routes/category'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/notificationpreferences', require('./routes/notificationpreferences'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/deletion', require('./routes/deletion'));
app.use('/api/permissions', require('./routes/permissions'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/salary', require('./routes/salary'));
app.use('/api/salarypayment', require('./routes/salarypayment'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ============= ERROR HANDLER =============
// Global error handler - must be last
app.use(errorHandler);

// Export upload middleware for routes
app.upload = upload;
module.exports = upload;

// ============= SERVER STARTUP =============
const server = app.listen(port, () => {
  logger.info(`🚀 Server running on port ${port} in ${process.env.NODE_ENV} mode`);
});

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

startDeletionProcessor();


