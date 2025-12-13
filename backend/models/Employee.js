const mongoose = require('mongoose');
const { Schema } = mongoose;

const Employee = new Schema({
    businessowner: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessOwner' },
    fname: {  type: String, required: true },
    lname: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    birthDate: { type: Date },
    gender: {type: String },
    jDate: { type: Date, default: Date.now },
    nationality: { type: String },
    country: { type: String },
    state: { type: String },
    city: { type: String },
    hireAt: { type: String },
    phone: { type: Number },
    address: { type: String },
    image: { type: String },
    about: { type: String },
    role: { type: String, default: "employee" }
});

module.exports = mongoose.model('Employee', Employee);