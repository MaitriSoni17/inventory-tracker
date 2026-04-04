const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const packageJson = require('./package.json');

const { requestLogger } = require('./config/logger');
const { securityHeaders, corsConfig, generalLimiter, authLimiter } = require('./config/security');
const { errorHandler } = require('./config/errorHandler');

const app = express();

// Ensure runtime directories exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

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
app.use('/api/auditlogs', require('./routes/auditlogs'));
app.use('/api/ai', require('./routes/ai'));

// Health check endpoint
app.get('/health', (req, res) => {
  const memory = process.memoryUsage();
  const readiness = mongoose.connection.readyState === 1 ? 'ready' : 'not_ready';

  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'inventory-backend',
    version: packageJson.version,
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
    readiness,
    checks: {
      database: {
        state: mongoose.connection.readyState,
        status: readiness
      },
      memory: {
        rssMb: Math.round((memory.rss / (1024 * 1024)) * 100) / 100,
        heapUsedMb: Math.round((memory.heapUsed / (1024 * 1024)) * 100) / 100,
        heapTotalMb: Math.round((memory.heapTotal / (1024 * 1024)) * 100) / 100
      }
    }
  });
});

// Readiness endpoint for orchestration and monitoring
app.get('/health/readiness', (req, res) => {
  if (mongoose.connection.readyState === 1) {
    return res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  }

  return res.status(503).json({
    status: 'not_ready',
    timestamp: new Date().toISOString(),
    databaseState: mongoose.connection.readyState
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler - must be last
app.use(errorHandler);

module.exports = app;
