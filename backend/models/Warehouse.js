const mongoose = require('mongoose');
const { Schema } = mongoose;

const Warehouse = new Schema({
    businessowner: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessOwner', required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    wName: { type: String, required: true },
    wManager: { type: String, required: true },
    wAddress: { type: String, required: true },
    wContact: { type: Number, required: true },
    wEmail: { type: String, required: true, unique: true },
    city: { type: String },
    state: { type: String },
    country: { type: String },
});

module.exports = mongoose.model('Warehouse', Warehouse);