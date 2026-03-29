const jwt = require('jsonwebtoken');
const BusinessOwner = require('../models/BusinessOwner');
const Employee = require('../models/Employee');
const Supplier = require('../models/Supplier');
const DeletionRequest = require('../models/DeletionRequest');
const JWT_SECRET = process.env.JWT_SECRET || "ThisisaSecretKey";

const isAllowedDuringDeletionGrace = (req) => {
    const normalizedPath = String(req.path || '');
    if (req.baseUrl === '/api/deletion' && req.method === 'GET' && normalizedPath === '/status') {
        return true;
    }
    if (req.baseUrl === '/api/deletion' && req.method === 'DELETE' && /^\/request\/[a-f\d]{24}$/i.test(normalizedPath)) {
        return true;
    }
    return false;
};

const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        return res.status(401).send({ error: "Please authenticate using a valid token" });
    }

    try {
        const data = jwt.verify(token, JWT_SECRET);

        if (data.role === 'businessowner') {
            const owner = await BusinessOwner.findById(data.id);
            if (!owner) {
                return res.status(401).send({ error: "Business Owner not found" });
            }
            if (owner.active === false) {
                return res.status(403).json({
                    success: false,
                    error: 'Business Owner account is deactivated',
                    code: 'ACCOUNT_DEACTIVATED'
                });
            }
            req.user = owner;
            req.role = 'businessowner';
            req.businessowner = owner._id; // Set businessowner for data isolation
        } else if (data.role === 'businessowner' ? false : data.role !== 'supplier') {
            // Any non-businessowner, non-supplier role is treated as an employee-type role
            const employee = await Employee.findById(data.id);
            if (!employee) {
                return res.status(401).send({ error: "Employee not found" });
            }
            const currentTokenVersion = Number.isInteger(employee.tokenVersion) ? employee.tokenVersion : 0;
            if (!Number.isInteger(data.tokenVersion) || data.tokenVersion !== currentTokenVersion) {
                return res.status(401).send({ error: "Session expired. Please login again." });
            }
            req.user = employee;
            req.employee = employee; // For backward compatibility
            req.businessowner = employee.businessowner; // Set businessowner for data isolation
            // Use the employee's role field to determine actual role
            req.role = employee.role || 'employee';
        } 
        else if(data.role === 'supplier') {
            const supplier = await Supplier.findById(data.id);
            if (!supplier) {
                return res.status(401).send({ error: "Supplier not found" });
            }
            const currentTokenVersion = Number.isInteger(supplier.tokenVersion) ? supplier.tokenVersion : 0;
            if (!Number.isInteger(data.tokenVersion) || data.tokenVersion !== currentTokenVersion) {
                return res.status(401).send({ error: "Session expired. Please login again." });
            }
            req.user = supplier;
            req.role = 'supplier';
            req.businessowner = supplier.businessowner; // Set businessowner for data isolation
        }
        else {
            return res.status(401).send({ error: "Invalid role" });
        }

        const isEmployeeTypeRole = req.role && req.role !== 'businessowner' && req.role !== 'supplier';
        const shouldRestrictByDeletion = req.role === 'supplier' || isEmployeeTypeRole;

        if (shouldRestrictByDeletion) {
            const activeApprovedDeletion = await DeletionRequest.findOne({
                userId: req.user._id,
                status: 'approved',
                scheduledDeletionDate: { $gt: new Date() }
            }).select('_id status scheduledDeletionDate');

            if (activeApprovedDeletion && !isAllowedDuringDeletionGrace(req)) {
                return res.status(403).json({
                    success: false,
                    error: 'Your account is scheduled for deletion. Only deletion cancellation is available during the grace period.',
                    code: 'ACCOUNT_DELETION_RESTRICTED',
                    requestId: activeApprovedDeletion._id,
                    scheduledDeletionDate: activeApprovedDeletion.scheduledDeletionDate
                });
            }
        }

        next();
    } catch (error) {
        res.status(401).send({ error: "Invalid token" });
    }
};

module.exports = fetchUser;

