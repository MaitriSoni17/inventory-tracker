const express = require('express');
const Supplier = require('../models/Supplier');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetchuser = require('../middleware/fetchuser'); // unified middleware
const { body, validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET || 'ThisisaSecretKey';

// Create an Supplier using: POST "/api/supplier/createsupplier". Business Owner login required
const fetchbusinessowner = require('../middleware/fetchbusinessowner');

router.post('/createsupplier', fetchbusinessowner, [
    body('fname', 'Enter a valid name').isLength({ min: 3 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be at least 5 characters').isLength({ min: 5 }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        let supplier = await Supplier.findOne({ email: req.body.email });
        if (supplier) {
            return res.status(400).json({ error: "Sorry, a user with this email already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(req.body.password, salt);

        supplier = await Supplier.create({
            businessowner: req.businessowner._id,
            fname: req.body.fname,
            lname: req.body.lname,
            email: req.body.email,
            password: secPass,
            ...(req.body.jDate && { jDate: req.body.jDate }),
            nationality: req.body.nationality,
            country: req.body.country,
            state: req.body.state,
            city: req.body.city,
            phone: req.body.phone,
            address: req.body.address,
            role: 'supplier'
        });

        const authToken = jwt.sign({ id: supplier._id, role: 'supplier' }, JWT_SECRET);
        res.json({ authToken, success: true });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Login Supplier using: POST "/api/supplier/loginsupplier". No login required
router.post('/loginsupplier', [
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password cannot be blank').exists(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        let supplier = await Supplier.findOne({ email });
        if (!supplier) {
            return res.status(400).json({ error: "Please try to login with correct credentials" });
        }

        const passwordCompare = await bcrypt.compare(password, supplier.password);
        if (!passwordCompare) {
            return res.status(400).json({ error: "Please try to login with correct credentials" });
        }

        const authToken = jwt.sign({ id: supplier._id, role: 'supplier' }, JWT_SECRET);
        res.json({ success: true, authtoken: authToken });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Get Supplier Data using: POST "/api/supplier/getsupplier". Login required
router.post('/getsupplier', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'supplier') {
            return res.status(403).json({ error: "Access denied" });
        }

        const supplier = await Supplier.findById(req.user._id).select("-password");
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }

        res.json(supplier);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

module.exports = router;