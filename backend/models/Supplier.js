const mongoose = require('mongoose');

const SupplierSchema = new Schema({
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
    phone: { type: String, required: true },
    address: { type: String, required: true },
    about: { type: String },
});

module.exports = mongoose.model('SupplierSchema', SupplierSchema);