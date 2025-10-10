const express = require('express');
const BusinessOwner = require('../models/BusinessOwner');
const Employee = require('../models/Employee');
const Supplier = require('../models/Supplier');
// const fetchuser = require('../middleware/fetchuser');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// const fetchbusinessowner = require('../middleware/fetchbusinessowner');
const { body, validationResult } = require('express-validator');

const JWT_SECRET = 'ThisisaSecretKey';


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
        res.json({ token });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});


module.exports = router;