const mongoose = require('mongoose');
const { Schema } = mongoose;

const SalaryPayment = new Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    businessowner: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessOwner', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    paymentDate: { type: Date, required: true },
    paymentMethod: { 
        type: String, 
        enum: ['cash', 'bank_transfer', 'cheque', 'digital_wallet', 'other'],
        default: 'bank_transfer'
    },
    description: { type: String },
    paymentPeriod: { type: String }, // e.g., "January 2024", "Week 1 Jan 2024"
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'failed'],
        default: 'completed'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SalaryPayment', SalaryPayment);
