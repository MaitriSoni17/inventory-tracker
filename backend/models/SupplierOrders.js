const mongoose = require('mongoose');
const { Schema } = mongoose;

const SupplierOrders = new Schema({
    businessowner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pName: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    ounits: { type: Number, required: true },
    oDate: { type: Date, required: true },
    dDate: { type: Date, required: true },
    status: { type: String },
    pAvail: { type: String },
    dStatus: { type: String },
    desc: { type: String },
});

module.exports = mongoose.model('SupplierOrders', SupplierOrders);