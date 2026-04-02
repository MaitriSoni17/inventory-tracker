const mongoose = require('mongoose');
const { Schema } = mongoose;

const Product = new Schema({
    businessowner: { type: mongoose.Schema.Types.ObjectId, ref: 'businessowner' },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'employee' },
    name: {  type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    totalProducts: { type: Number, required: true },
    warehouse: [{ type: String }],
    brand: { type: String },
    mDate: { type: Date, required: true },
    eDate: { type: Date, required: true },
    desc: { type: String },
    image: { type: String },
    images: [{ type: String }],
});

// Performance indexes for chatbot and common queries
Product.index({ businessowner: 1 });
Product.index({ businessowner: 1, totalProducts: 1 });
Product.index({ businessowner: 1, category: 1 });
Product.index({ totalProducts: 1 });

module.exports = mongoose.model('Product', Product);

