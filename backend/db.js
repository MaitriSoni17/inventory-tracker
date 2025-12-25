const mongoose = require('mongoose');
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-tracker';

const connectToMongo = async () => {
    try {
        await mongoose.connect(mongoURI, {
        });
    } catch (err) {
        throw err;
    }
};

module.exports = connectToMongo;

