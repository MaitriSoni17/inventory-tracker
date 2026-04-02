const mongoose = require('mongoose');
const { Schema } = mongoose;

// Schema for individual product items in an order
const OrderProductSchema = new Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true }, // Store name for quick access
    category: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
}, { _id: false });

const CustomerOrders = new Schema({
    businessowner: { type: mongoose.Schema.Types.ObjectId, ref: 'businessowner' },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'employee' },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null },
    cName: { type: String, required: true },
    cEmail: { type: String, required: true },
    cPhone: { type: Number, required: true },
    cAddress: { type: String, required: true },
    // Support for multiple products
    products: [OrderProductSchema],
    // Legacy single product fields (kept for backward compatibility)
    pName: { type: String },
    category: { type: String },
    ounits: { type: Number },
    // Order totals
    amount: { type: Number, required: true }, // Total order amount
    oDate: { type: Date, required: true },
    dDate: { type: Date, required: true },
    status: { type: String },
    pAvail: { type: String },
    dStatus: { type: String },
    desc: { type: String },
    isPending: { type: Boolean, default: false },
    pendingReason: { type: String, default: '' },
});

// Performance indexes for chatbot and common queries
CustomerOrders.index({ businessowner: 1 });
CustomerOrders.index({ businessowner: 1, status: 1 });
CustomerOrders.index({ businessowner: 1, oDate: -1 });
CustomerOrders.index({ employee: 1 });
CustomerOrders.index({ status: 1 });
CustomerOrders.index({ dDate: 1 });

module.exports = mongoose.model('CustomerOrders', CustomerOrders);

