const mongoose = require('mongoose');
const { Schema } = mongoose;

const Supplier = new Schema({
    businessowner: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessOwner' },
    fname: {  type: String, required: true },
    lname: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    nationality: { type: String },
    country: { type: String },
    state: { type: String },
    city: { type: String },
    pincode: { type: String },
    jDate: {type: Date, default: Date.now},
    phone: { type: String },
    address: { type: String },
    about: { type: String },
    companyName: { type: String },
    companyPhone: { type: String },
    companyEmail: { type: String },
    companyAddress: { type: String },
    companyCountry: { type: String },
    companyState: { type: String },
    companyCity: { type: String },
    companyPincode: { type: String },
    companyLogo: { type: String },
    image: { type: String },
    isActive: { type: Boolean, default: true },
    role: { type: String, default: 'supplier' },
    lastLogin: { type: Date }
});

module.exports = mongoose.model('Supplier', Supplier);

