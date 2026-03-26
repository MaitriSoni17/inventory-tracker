const mongoose = require('mongoose');
const { Schema } = mongoose;

const Warehouse = new Schema({
    businessowner: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessOwner', required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    wName: { type: String, required: true },
    wManager: { type: String },
    wAddress: { type: String, required: true },
    // Store as string to preserve international prefixes like +91
    wContact: { type: String, required: true },
    wEmail: { type: String, required: true, unique: true },
    city: { type: String },
    state: { type: String },
    country: { type: String },
});

module.exports = mongoose.model('Warehouse', Warehouse);

