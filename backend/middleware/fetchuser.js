const jwt = require('jsonwebtoken');
const BusinessOwner = require('../models/BusinessOwner');
const Employee = require('../models/Employee');
const Supplier = require('../models/Supplier');
const JWT_SECRET = "ThisisaSecretKey";

const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        return res.status(401).send({ error: "Please authenticate using a valid token" });
    }

    try {
        const data = jwt.verify(token, JWT_SECRET);

        if (data.role === 'businessowner') {
            const owner = await BusinessOwner.findById(data.id);
            if (!owner) return res.status(401).send({ error: "Business Owner not found" });
            req.user = owner;
            req.role = 'businessowner';
        } else if (data.role === 'employee') {
            const employee = await Employee.findById(data.id);
            if (!employee) return res.status(401).send({ error: "Employee not found" });
            req.user = employee;
            req.role = 'employee';
        } 
        else if(data.role === 'supplier') {
            const supplier = await Supplier.findById(data.id);
            if (!supplier) return res.status(401).send({ error: "Supplier not found" });
            req.user = supplier;
            req.role = 'supplier';
        }
        else {
            return res.status(401).send({ error: "Invalid role" });
        }

        next();
    } catch (error) {
        res.status(401).send({ error: "Invalid token" });
    }
};

module.exports = fetchUser;