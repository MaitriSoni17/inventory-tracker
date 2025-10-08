const mongoose = require('mongoose');
const { Schema } = mongoose;

const Category = new Schema({
    businessowner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cName: { type: String, required: true },
    cDesc: { type: String, required: true },
});

module.exports = mongoose.model('Category', Category);