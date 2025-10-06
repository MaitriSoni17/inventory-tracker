const mongoose = require('mongoose');

const CategorySchema = new Schema({
    cName: { type: String, required: true },
    cDesc: { type: String, required: true },
});

module.exports = mongoose.model('CategorySchema', CategorySchema);