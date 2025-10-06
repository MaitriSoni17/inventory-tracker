const mongoose = require('mongoose');

const CustomerOrdersSchema = new Schema({
    cName: {  type: String, required: true },
    cEmail: { type: String, required: true },
    cPhone: { type: String, required: true },
    cAddress: { type: String, required: true },
    pName: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    oDate: { type: Date, required: true },
    dDate: { type: Date, required: true },
    status: { type: String },
    pAvail: { type: String },
    dStatus: { type: String },
    desc: { type: String, required: true },
});

module.exports = mongoose.model('CustomerOrdersSchema', CustomerOrdersSchema);