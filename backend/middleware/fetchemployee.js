var jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const DeletionRequest = require('../models/DeletionRequest');
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
        const currentTokenVersion = Number.isInteger(employee.tokenVersion) ? employee.tokenVersion : 0;
        if (!Number.isInteger(data.tokenVersion) || data.tokenVersion !== currentTokenVersion) {
            return res.status(401).send({ error: "Session expired. Please login again" });
        }
        req.employee = employee;
        req.user = employee; // Also set req.user for consistency with other middleware
        // Use the employee's actual role from the database
        req.role = employee.role || 'employee';

        const activeApprovedDeletion = await DeletionRequest.findOne({
            userId: employee._id,
            status: 'approved',
            scheduledDeletionDate: { $gt: new Date() }
        }).select('_id status scheduledDeletionDate');

        if (activeApprovedDeletion) {
            return res.status(403).json({
                success: false,
                error: 'Your account is scheduled for deletion. Only deletion cancellation is available during the grace period.',
                code: 'ACCOUNT_DELETION_RESTRICTED',
                requestId: activeApprovedDeletion._id,
                scheduledDeletionDate: activeApprovedDeletion.scheduledDeletionDate
            });
        }
        
        next();

    }
    catch (error) {
        res.status(401).send({ error: "Please authenticate using a valid token" })
    }
}

module.exports = fetchemployee;

