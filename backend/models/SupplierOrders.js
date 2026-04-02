const mongoose = require('mongoose');
const { Schema } = mongoose;

const SupplierOrders = new Schema({
    businessowner: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessOwner' },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null },
    pName: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    ounits: { type: Number, required: true },
    oDate: { type: Date, required: true },
    dDate: { type: Date, required: true },
    status: { type: String },
    paymentStatus: { type: String, default: 'Pending' },
    pAvail: { type: String },
    dStatus: { type: String },
    desc: { type: String },
});

// Performance indexes for chatbot and common queries
SupplierOrders.index({ businessowner: 1 });
SupplierOrders.index({ supplier: 1 });
SupplierOrders.index({ supplier: 1, status: 1 });
SupplierOrders.index({ businessowner: 1, status: 1 });
SupplierOrders.index({ status: 1 });
SupplierOrders.index({ oDate: -1 });

module.exports = mongoose.model('SupplierOrders', SupplierOrders);

