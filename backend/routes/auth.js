const express = require('express');
const BusinessOwner = require('../models/BusinessOwner');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { body, validationResult } = require('express-validator');

const JWT_SECRET = 'ThisisaSecretKey';

// Create a Business Owner using: POST "/api/auth/createbusinessowner". No login required

router.post('/createbusinessowner', [
    body('fname', 'Enter a valid name').isLength({ min: 3 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be atleast 5 characters').isLength({ min: 5 }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        let businessowner = await BusinessOwner.findOne({ email: req.body.email });
        if (businessowner) {
            return res.status(400).json({ error: "Sorry a user with this email already exists" });
        }
        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(req.body.password, salt);
        businessowner = await BusinessOwner.create({
            fname: req.body.fname,
            lname: req.body.lname,
            email: req.body.email,
            password: secPass,
            phone: req.body.phone,
            address: req.body.address
        })
        const authToken = jwt.sign({ businessowner: { id: businessowner.id } }, JWT_SECRET);
        // console.log(authToken);
        res.json({authToken});
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});


// Authenticate a Business Owner using: POST "/api/auth/login". No login required

router.post('/loginbusinessowner', [
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password cannot be blank').exists(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    try {
        let businessowner = await BusinessOwner.findOne({ email });
        if (!businessowner) {
            return res.status(400).json({ error: "Please try to login with correct credentials" });
        }
        const passwordCompare = await bcrypt.compare(password, businessowner.password);
        if (!passwordCompare) {
            return res.status(400).json({ error: "Please try to login with correct credentials" });
        }
        const authToken = jwt.sign({ businessowner: { id: businessowner.id } }, JWT_SECRET);
        res.json({ authToken });
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

module.exports = router;