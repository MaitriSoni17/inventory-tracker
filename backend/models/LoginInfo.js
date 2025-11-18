const mongoose = require('mongoose');
const { Schema } = mongoose;
const LoginInfo = new Schema({
    email: { type: String, required: true },
    date: { type: Date, default: Date.now },
    role: { type: String }
});

const LoginDesc = mongoose.model('LoginInfo', LoginInfo);

module.exports = LoginDesc;