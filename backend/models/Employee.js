const mongoose = require('mongoose');
const { Schema } = mongoose;

const Employee = new Schema({
    businessowner: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessOwner' },
    fname: {  type: String, required: true },
    lname: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    birthDate: { type: String },
    gender: {type: String },
    jDate: { type: String },
    nationality: { type: String },
    country: { type: String },
    state: { type: String },
    city: { type: String },
    hireAt: { type: String },
    phone: { type: String },
    address: { type: String },
    image: { type: String },
    about: { type: String },
    role: { type: String, default: "employee" },
    lastLogin: { type: Date },
    preferences: {
        emailNotifications: { type: Boolean, default: true },
        orderAlerts: { type: Boolean, default: true },
        lowStockAlerts: { type: Boolean, default: true },
        weeklyReport: { type: Boolean, default: false }
    }
});

module.exports = mongoose.model('Employee', Employee);