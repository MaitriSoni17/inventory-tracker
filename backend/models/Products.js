const mongoose = require('mongoose');

const ProductSchema = new Schema({
    name: {  type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true, unique: true },
    totalProducts: { type: Number, required: true },
    warehouse: [{ type: String }],
    brand: { type: String },
    mDate: { type: Date, required: true },
    eDate: { type: Date, required: true },
    desc: { type: String },
    image: { type: String },
});

module.exports = mongoose.model('Product', ProductSchema);