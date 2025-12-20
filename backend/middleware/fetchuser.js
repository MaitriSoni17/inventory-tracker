const jwt = require('jsonwebtoken');
const BusinessOwner = require('../models/BusinessOwner');
const Employee = require('../models/Employee');
const Supplier = require('../models/Supplier');
const JWT_SECRET = process.env.JWT_SECRET || "ThisisaSecretKey";

const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        console.error('No auth-token header found in request');
        return res.status(401).send({ error: "Please authenticate using a valid token" });
    }

    try {
        const data = jwt.verify(token, JWT_SECRET);
        console.log('Token verified successfully. User ID:', data.id, 'Role:', data.role);

        if (data.role === 'businessowner') {
            const owner = await BusinessOwner.findById(data.id);
            if (!owner) {
                console.error('Business Owner not found with ID:', data.id);
                return res.status(401).send({ error: "Business Owner not found" });
            }
            req.user = owner;
            req.role = 'businessowner';
        } else if (data.role === 'employee') {
            const employee = await Employee.findById(data.id);
            if (!employee) {
                console.error('Employee not found with ID:', data.id);
                return res.status(401).send({ error: "Employee not found" });
            }
            req.user = employee;
            req.role = 'employee';
        } 
        else if(data.role === 'supplier') {
            const supplier = await Supplier.findById(data.id);
            if (!supplier) {
                console.error('Supplier not found with ID:', data.id);
                return res.status(401).send({ error: "Supplier not found" });
            }
            req.user = supplier;
            req.role = 'supplier';
        }
        else {
            console.error('Invalid role in token:', data.role);
            return res.status(401).send({ error: "Invalid role" });
        }

        next();
    } catch (error) {
        console.error('Token verification error:', error.message);
        res.status(401).send({ error: "Invalid token" });
    }
};

module.exports = fetchUser;