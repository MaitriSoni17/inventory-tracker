const express = require('express');
const BusinessOwner = require('../models/BusinessOwner');
const Employee = require('../models/Employee');
const Supplier = require('../models/Supplier');
const LoginInfo = require('../models/LoginInfo')
// const fetchuser = require('../middleware/fetchuser');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// const fetchbusinessowner = require('../middleware/fetchbusinessowner');
const { body, validationResult } = require('express-validator');
const { notifyBusinessOwnerAboutEmployeeLogin, notifyBusinessOwnerAboutSupplierLogin } = require('../utils/notificationHelper');

const JWT_SECRET = process.env.JWT_SECRET || 'ThisisaSecretKey';


// Login for any user (Business Owner, Employee, Supplier) using: POST "/api/auth/login". No login required

router.post('/login', [
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password cannot be blank').exists(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
        let user = await BusinessOwner.findOne({ email });
        let role = 'businessowner';

        if (!user) {
            user = await Employee.findOne({ email });
            role = 'employee';
        }

        if (!user) {
            user = await Supplier.findOne({ email });
            role = 'supplier';
        }

        if (!user) return res.status(400).json({ error: "Please try to login with correct credentials" });

        const passwordCompare = await bcrypt.compare(password, user.password);
        if (!passwordCompare) return res.status(400).json({ error: "Please try to login with correct credentials" });

        const token = jwt.sign({ id: user._id, role }, JWT_SECRET);
        const loginTime = new Date();

        // Update lastLogin timestamp
        if (role === 'employee') {
            await Employee.findByIdAndUpdate(user._id, { lastLogin: loginTime });
            // Notify business owner about employee login
            await notifyBusinessOwnerAboutEmployeeLogin(
                user.businessowner,
                user._id,
                `${user.fname} ${user.lname || ''}`,
                loginTime,
                { userId: user._id }
            );
        } else if (role === 'supplier') {
            await Supplier.findByIdAndUpdate(user._id, { lastLogin: loginTime });
            // Notify business owner about supplier login
            await notifyBusinessOwnerAboutSupplierLogin(
                user.businessowner,
                user._id,
                user.fname,
                loginTime,
                { supplierId: user._id }
            );
        }

        await LoginInfo.create(
            {
                email,
                role
            }
        )

        res.json({ success: true, authtoken: token, role: role, userId: user._id.toString() });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});


module.exports = router;