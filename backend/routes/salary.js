const express = require('express');
const Employee = require('../models/Employee');
const BusinessOwner = require('../models/BusinessOwner');
const fetchuser = require('../middleware/fetchuser');
const fetchbusinessowner = require('../middleware/fetchbusinessowner');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Get all employee salaries for business owner
// GET "/api/salary/getallsalaries". Business Owner only
router.post('/getallsalaries', fetchuser, async (req, res) => {
    try {
        // Only business owner can view all salaries
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: "Only Business Owner can view employee salaries" });
        }

        const employees = await Employee.find(
            { businessowner: req.user._id },
            'fname lname email role warehouse salary hireAt'
        ).populate('warehouse', 'wName').sort({ fname: 1 });

        // Format salary data for response
        const salaryData = employees.map(emp => ({
            _id: emp._id,
            fullName: `${emp.fname} ${emp.lname || ''}`.trim(),
            email: emp.email,
            role: emp.role,
            warehouse: emp.warehouse ? emp.warehouse.wName : 'Not Assigned',
            hireDate: emp.hireAt,
            baseSalary: emp.salary?.baseSalary || 0,
            currency: emp.salary?.currency || 'INR',
            paymentFrequency: emp.salary?.paymentFrequency || 'monthly',
            lastUpdated: emp.salary?.lastUpdated
        }));

        res.json(salaryData);
    } catch (error) {
        // console.error('Error fetching salaries:', error);
        res.status(500).json({ error: "Server error while fetching salaries" });
    }
});

// Get salary details for a specific employee
// GET "/api/salary/getsalary/:employeeId". Business Owner only
router.get('/getsalary/:employeeId', fetchuser, async (req, res) => {
    try {
        // Only business owner can view employee salaries
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: "Only Business Owner can view employee salaries" });
        }

        const employee = await Employee.findById(req.params.employeeId)
            .select('fname lname email role department salary hireAt');

        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // Verify the employee belongs to the business owner
        if (employee.businessowner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: "Unauthorized access to employee salary" });
        }

        const salaryData = {
            _id: employee._id,
            fullName: `${employee.fname} ${employee.lname || ''}`.trim(),
            email: employee.email,
            role: employee.role,
            department: employee.department || 'N/A',
            hireDate: employee.hireAt,
            baseSalary: employee.salary?.baseSalary || 0,
            currency: employee.salary?.currency || 'INR',
            paymentFrequency: employee.salary?.paymentFrequency || 'monthly',
            lastUpdated: employee.salary?.lastUpdated
        };

        res.json(salaryData);
    } catch (error) {
        // console.error('Error fetching employee salary:', error);
        res.status(500).json({ error: "Server error while fetching employee salary" });
    }
});

// Assign or update salary for an employee
// POST "/api/salary/assignsalary/:employeeId". Business Owner only
router.post('/assignsalary/:employeeId', 
    fetchuser,
    [
        body('baseSalary', 'Salary must be a valid number').isFloat({ min: 0 }),
        body('currency', 'Currency is required').trim().notEmpty(),
        body('paymentFrequency', 'Payment frequency is required').isIn(['monthly', 'weekly', 'daily'])
    ],
    async (req, res) => {
        try {
            // Only business owner can assign salaries
            if (req.role !== 'businessowner') {
                return res.status(403).json({ error: "Only Business Owner can assign salaries" });
            }

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const employee = await Employee.findById(req.params.employeeId);

            if (!employee) {
                return res.status(404).json({ error: "Employee not found" });
            }

            // Verify the employee belongs to the business owner
            if (employee.businessowner.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: "Unauthorized access to employee salary" });
            }

            const { baseSalary, currency, paymentFrequency } = req.body;

            // Update salary information
            employee.salary = {
                baseSalary: parseFloat(baseSalary),
                currency,
                paymentFrequency,
                lastUpdated: new Date(),
                updatedBy: req.user._id
            };

            await employee.save();

            res.json({
                success: true,
                message: `Salary assigned successfully to ${employee.fname} ${employee.lname || ''}`,
                salary: employee.salary
            });
        } catch (error) {
            // console.error('Error assigning salary:', error);
            res.status(500).json({ error: "Server error while assigning salary" });
        }
    }
);

// Update salary for an employee
// PUT "/api/salary/updatesalary/:employeeId". Business Owner only
router.put('/updatesalary/:employeeId',
    fetchuser,
    [
        body('baseSalary', 'Salary must be a valid number').isFloat({ min: 0 }),
        body('currency', 'Currency is required').trim().notEmpty(),
        body('paymentFrequency', 'Payment frequency is required').isIn(['monthly', 'weekly', 'daily'])
    ],
    async (req, res) => {
        try {
            // Only business owner can update salaries
            if (req.role !== 'businessowner') {
                return res.status(403).json({ error: "Only Business Owner can update salaries" });
            }

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const employee = await Employee.findById(req.params.employeeId);

            if (!employee) {
                return res.status(404).json({ error: "Employee not found" });
            }

            // Verify the employee belongs to the business owner
            if (employee.businessowner.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: "Unauthorized access to employee salary" });
            }

            const { baseSalary, currency, paymentFrequency } = req.body;

            // Update salary information
            employee.salary = {
                baseSalary: parseFloat(baseSalary),
                currency,
                paymentFrequency,
                lastUpdated: new Date(),
                updatedBy: req.user._id
            };

            await employee.save();

            res.json({
                success: true,
                message: `Salary updated successfully for ${employee.fname} ${employee.lname || ''}`,
                salary: employee.salary
            });
        } catch (error) {
            // console.error('Error updating salary:', error);
            res.status(500).json({ error: "Server error while updating salary" });
        }
    }
);

// Delete/Remove salary for an employee
// DELETE "/api/salary/deletesalary/:employeeId". Business Owner only
router.delete('/deletesalary/:employeeId', fetchuser, async (req, res) => {
    try {
        // Only business owner can delete salaries
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: "Only Business Owner can delete employee salaries" });
        }

        const employee = await Employee.findById(req.params.employeeId);

        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // Verify the employee belongs to the business owner
        if (employee.businessowner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: "Unauthorized access to employee salary" });
        }

        // Reset salary to default
        employee.salary = {
            baseSalary: 0,
            currency: 'INR',
            paymentFrequency: 'monthly',
            lastUpdated: new Date(),
            updatedBy: req.user._id
        };

        await employee.save();

        res.json({
            success: true,
            message: `Salary removed for ${employee.fname} ${employee.lname || ''}`
        });
    } catch (error) {
        // console.error('Error deleting salary:', error);
        res.status(500).json({ error: "Server error while deleting salary" });
    }
});

module.exports = router;
