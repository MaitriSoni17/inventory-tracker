var jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const JWT_SECRET = process.env.JWT_SECRET || "ThisisaSecretKey";

const fetchemployee = async (req, res, next) => {
    // Get the user from the jwt token and add id to req object
    const token = req.header('auth-token');
    if (!token) {
        return res.status(401).send({ error: "Please authenticate using a valid token" })
    }
    try {
        const data = jwt.verify(token, JWT_SECRET);
        const employee = await Employee.findById(data.id); // fetch full employee object
        if (!employee) {
            return res.status(401).send({ error: "Employee not found" });
        }
        req.employee = employee;
        req.user = employee; // Also set req.user for consistency with other middleware
        // Use the employee's actual role from the database
        req.role = employee.role || 'employee';
        
        next();

    }
    catch (error) {
        res.status(401).send({ error: "Please authenticate using a valid token" })
    }
}

module.exports = fetchemployee;

