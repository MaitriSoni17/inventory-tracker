const mongoose = require('mongoose');

const BusinessOwnerSchema = new Schema({
    fname: {  type: String, required: true },
    lname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    date: { type: Date, default: Date.now },
    country: { type: String },
    state: { type: String },
    city: { type: String },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    image: { type: String },
});

module.exports = mongoose.model('BusinessOwner', BusinessOwnerSchema);