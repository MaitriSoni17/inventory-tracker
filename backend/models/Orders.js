const mongoose = require('mongoose');
const { Schema } = mongoose;

const Order = new Schema({
    businessowner: { type: mongoose.Schema.Types.ObjectId, ref: 'businessowner' },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'employee' },
    customerName: { type: String, required: true },
    productName: { type: String, required: true },
    productCategory: { type: String, required: true },
    totalAmt: { type: Number, required: true },
    orderDate: { type: Date, required: true },
    deliveryDeadline: { type: Date, required: true },
    productStatus: { type: String, required: true },
    deliveryStatus: { type: String, required: true },
    pAvailability: { type: String, required: true },
    address: { type: String },
    additionalNotes: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', Order);

