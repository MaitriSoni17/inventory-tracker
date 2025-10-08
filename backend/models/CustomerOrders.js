const mongoose = require('mongoose');
const { Schema } = mongoose;

const CustomerOrders = new Schema({
    businessowner: { type: mongoose.Schema.Types.ObjectId, ref: 'businessowner' },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'employee' },
    cName: {  type: String, required: true },
    cEmail: { type: String, required: true },
    cPhone: { type: Number, required: true },
    cAddress: { type: String, required: true },
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

module.exports = mongoose.model('CustomerOrders', CustomerOrders);