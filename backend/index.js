require('dotenv').config();
const connectToMongo = require('./db');
connectToMongo();
const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
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

const cors = require('cors');
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));
app.use('/api/auth', require('./routes/auth'));
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

// Global error handler middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Export upload middleware for routes
app.upload = upload;
module.exports = upload;

app.listen(port, () => {
})


