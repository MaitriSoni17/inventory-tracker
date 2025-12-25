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
            about: req.body.about,
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

// Get Supplier Data by ID using: POST "/api/supplier/getsupplier/:id". Login required
router.post('/getsupplier/:id', fetchuser, async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id).select("-password");
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }

        res.json(supplier);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Get All Suppliers using: POST "/api/supplier/getallsuppliers". Business Owner login required
router.post('/getallsuppliers', require('../middleware/fetchbusinessowner'), async (req, res) => {
    try {
        const suppliers = await Supplier.find({ businessowner: req.businessowner._id }).select('-password');
        res.json(suppliers);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Update Supplier using: PUT "/api/supplier/updatesupplier/:id". Business Owner login required
router.put('/updatesupplier/:id', require('../middleware/fetchbusinessowner'), async (req, res) => {
    try {
        const { fname, lname, phone, nationality, country, state, city, address, about } = req.body;

        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }

        // Check if supplier belongs to this business owner
        if (supplier.businessowner.toString() !== req.businessowner._id.toString()) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Update fields
        if (fname) supplier.fname = fname;
        if (lname) supplier.lname = lname;
        if (phone) supplier.phone = phone;
        if (nationality) supplier.nationality = nationality;
        if (country) supplier.country = country;
        if (state) supplier.state = state;
        if (city) supplier.city = city;
        if (address) supplier.address = address;
        if (about) supplier.about = about;

        await supplier.save();
        res.json({ supplier, success: true });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Delete Supplier using: DELETE "/api/supplier/deletesupplier/:id". Business Owner login required
router.delete('/deletesupplier/:id', require('../middleware/fetchbusinessowner'), async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }

        // Check if supplier belongs to this business owner
        if (supplier.businessowner.toString() !== req.businessowner._id.toString()) {
            return res.status(403).json({ error: "Access denied" });
        }

        await Supplier.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Supplier deleted successfully" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Update own profile using: PUT "/api/supplier/updatesupplier". Supplier login required
router.put('/updatesupplier', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'supplier') {
            return res.status(403).json({ error: "Access denied" });
        }

        const { fname, lname, phone, email, country, state, city, pincode, address } = req.body;
        const supplier = await Supplier.findById(req.user._id);
        
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }

        // Update fields
        if (fname) supplier.fname = fname;
        if (lname) supplier.lname = lname;
        if (phone) supplier.phone = phone;
        if (email) supplier.email = email;
        if (country) supplier.country = country;
        if (state) supplier.state = state;
        if (city) supplier.city = city;
        if (pincode) supplier.pincode = pincode;
        if (address) supplier.address = address;

        await supplier.save();
        res.json({ supplier: supplier.toObject({ getters: true }), success: true });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Change password using: PUT "/api/supplier/changepassword". Supplier login required
router.put('/changepassword', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'supplier') {
            return res.status(403).json({ error: "Access denied" });
        }

        const { currentPassword, newPassword } = req.body;
        const supplier = await Supplier.findById(req.user._id);

        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, supplier.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        supplier.password = await bcrypt.hash(newPassword, salt);
        await supplier.save();

        res.json({ success: true, message: "Password changed successfully" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Deactivate account using: POST "/api/supplier/deactivate". Supplier login required
router.post('/deactivate', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'supplier') {
            return res.status(403).json({ error: "Access denied" });
        }

        const supplier = await Supplier.findById(req.user._id);
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }

        supplier.isActive = false;
        await supplier.save();

        res.json({ success: true, message: "Account deactivated successfully" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Delete own account using: DELETE "/api/supplier/deleteaccount". Supplier login required
router.delete('/deleteaccount', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'supplier') {
            return res.status(403).json({ error: "Access denied" });
        }

        const supplier = await Supplier.findById(req.user._id);
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }

        await Supplier.findByIdAndDelete(req.user._id);
        res.json({ success: true, message: "Account deleted successfully" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

module.exports = router;