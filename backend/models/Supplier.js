const mongoose = require('mongoose');
const { Schema } = mongoose;

const Supplier = new Schema({
    businessowner: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessOwner' },
    fname: {  type: String, required: true },
    lname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gender: {type: String, enum: ['Male', 'Female', 'Other']},
    jDate: { type: Date, default: Date.now },
    nationality: { type: String },
    country: { type: String },
    state: { type: String },
    city: { type: String },
    phone: { type: Number, required: true },
    address: { type: String, required: true },
    about: { type: String },
    role: { type: String, default: 'supplier' }
});

module.exports = mongoose.model('Supplier', Supplier);