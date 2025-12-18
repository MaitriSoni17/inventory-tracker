const mongoose = require('mongoose');
const { Schema } = mongoose;

const BusinessOwnerSchema = new Schema({
    fname: {  type: String},
    lname: { type: String},
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    date: { type: Date, default: Date.now },
    country: { type: String },
    state: { type: String },
    city: { type: String },
    pincode: { type: String },
    phone: { type: Number},
    address: { type: String},
    image: { type: String },
    role: { type: String, default: "businessowner" },
    active: { type: Boolean, default: true }
});

const BusinessOwner = mongoose.model('BusinessOwner', BusinessOwnerSchema);
// BusinessOwner.createIndexes();

module.exports = BusinessOwner;