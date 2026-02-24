const express = require('express');
const Employee = require('../models/Employee');
const SalaryPayment = require('../models/SalaryPayment');
const fetchuser = require('../middleware/fetchuser');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Get all salary payments for an employee
// GET "/api/salarypayment/getpayments/:employeeId". Business Owner only
router.get('/getpayments/:employeeId', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: "Only Business Owner can view salary payments" });
        }

        const employee = await Employee.findById(req.params.employeeId);
        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        if (employee.businessowner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: "Unauthorized access" });
        }

        const payments = await SalaryPayment.find({ 
            employee: req.params.employeeId,
            businessowner: req.user._id
        }).sort({ paymentDate: -1 });

        res.json(payments);
    } catch (error) {
        // console.error('Error fetching salary payments:', error);
        res.status(500).json({ error: "Server error while fetching salary payments" });
    }
});

// Get total paid salary for an employee
// GET "/api/salarypayment/totalpaid/:employeeId". Business Owner only
router.get('/totalpaid/:employeeId', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: "Only Business Owner can view salary payments" });
        }

        const employee = await Employee.findById(req.params.employeeId);
        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        if (employee.businessowner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: "Unauthorized access" });
        }

        const result = await SalaryPayment.aggregate([
            { 
                $match: { 
                    employee: new (require('mongoose')).Types.ObjectId(req.params.employeeId),
                    businessowner: new (require('mongoose')).Types.ObjectId(req.user._id),
                    status: 'completed'
                }
            },
            { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
        ]);

        const totalPaid = result.length > 0 ? result[0].totalAmount : 0;

        res.json({ totalPaid, currency: 'INR' });
    } catch (error) {
        // console.error('Error calculating total paid salary:', error);
        res.status(500).json({ error: "Server error while calculating total paid salary" });
    }
});

// Record a salary payment
// POST "/api/salarypayment/recordpayment". Business Owner only
router.post('/recordpayment',
    fetchuser,
    [
        body('employeeId', 'Employee ID is required').notEmpty(),
        body('amount', 'Amount must be a valid number').isFloat({ min: 0 }),
        body('paymentDate', 'Payment date is required').notEmpty(),
        body('paymentMethod', 'Invalid payment method').isIn(['cash', 'bank_transfer', 'cheque', 'digital_wallet', 'other'])
    ],
    async (req, res) => {
        try {
            if (req.role !== 'businessowner') {
                return res.status(403).json({ error: "Only Business Owner can record salary payments" });
            }

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const employee = await Employee.findById(req.body.employeeId);
            if (!employee) {
                return res.status(404).json({ error: "Employee not found" });
            }

            if (employee.businessowner.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: "Unauthorized access" });
            }

            const { amount, paymentDate, paymentMethod, description, paymentPeriod } = req.body;

            const payment = new SalaryPayment({
                employee: req.body.employeeId,
                businessowner: req.user._id,
                amount: parseFloat(amount),
                currency: 'INR',
                paymentDate: new Date(paymentDate),
                paymentMethod,
                description,
                paymentPeriod,
                status: 'completed'
            });

            await payment.save();

            res.json({
                success: true,
                message: `Salary payment recorded successfully for ${employee.fname} ${employee.lname || ''}`,
                payment
            });
        } catch (error) {
            // console.error('Error recording salary payment:', error);
            res.status(500).json({ error: "Server error while recording salary payment" });
        }
    }
);

module.exports = router;
