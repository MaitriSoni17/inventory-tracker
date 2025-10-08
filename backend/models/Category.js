const mongoose = require('mongoose');

const Category = new Schema({
    cName: { type: String, required: true },
    cDesc: { type: String, required: true },
});

module.exports = mongoose.model('CategorySchema', Category);