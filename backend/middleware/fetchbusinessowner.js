const jwt = require('jsonwebtoken');
const BusinessOwner = require('../models/BusinessOwner');
const JWT_SECRET = "ThisisaSecretKey";

const fetchbusinessowner = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        return res.status(401).send({ error: "Please authenticate using a valid token" });
    }

    try {
        const data = jwt.verify(token, JWT_SECRET);
        const businessowner = await BusinessOwner.findById(data.id);
        if (!businessowner) {
            return res.status(401).send({ error: "Business owner not found" });
        }
        req.businessowner = businessowner;
        next();
    } catch (error) {
        res.status(401).send({ error: "Invalid token" });
    }
};

module.exports = fetchbusinessowner;