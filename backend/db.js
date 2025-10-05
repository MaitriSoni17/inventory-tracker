const mongoose = require('mongoose');
const mongoURI = 'mongodb://localhost:27017/inventory_db';

const connectToMongo = async () => {
    try {
        await mongoose.connect(mongoURI, {
        });
        console.log('Connected to Mongo Successfully');
    } catch (err) {
        console.error('Failed to connect to Mongo:', err.message || err);
        throw err;
    }
};

module.exports = connectToMongo;