const mongoose = require('mongoose');

const WarehouseSchema = new Schema({
    wName: { type: String, required: true },
    wManager: { type: String, required: true },
    wAddress: { type: String, required: true },
    wContact: { type: Number, required: true },
    wEmail: { type: String, required: true, unique: true },
    city: { type: String },
    state: { type: String },
    country: { type: String },
});

module.exports = mongoose.model('WarehouseSchema', WarehouseSchema);