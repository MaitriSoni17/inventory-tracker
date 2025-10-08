const connectToMongo = require('./db');
connectToMongo();
const express = require('express')
const app = express()
const port = 5000

app.use(express.json());

// Available Routes

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
// app.use('/api/businessowner', require('./routes/businessowner'));
app.use('/api/employee', require('./routes/employee'));
app.use('/api/supplier', require('./routes/supplier'));
app.use('/api/customerorders', require('./routes/customerorders'));
app.use('/api/supplierorders', require('./routes/supplierorders'));
app.use('/api/warehouse', require('./routes/warehouse'));
app.use('/api/category', require('./routes/category'));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
