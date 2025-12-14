require('dotenv').config();
const connectToMongo = require('./db');
connectToMongo();
const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Uploads directory created:', uploadsDir);
}

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
app.use('/api/orders', require('./routes/orders'));

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
