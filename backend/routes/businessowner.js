const express = require('express');
const BusinessOwner = require('../models/BusinessOwner');
const Employee = require('../models/Employee');
const Supplier = require('../models/Supplier');
const fetchuser = require('../middleware/fetchuser');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetchbusinessowner = require('../middleware/fetchbusinessowner');
const { body, validationResult } = require('express-validator');

const JWT_SECRET = 'ThisisaSecretKey';

// Create a Business Owner using: POST "/api/businessowner/createbusinessowner". No login required
router.post('/createbusinessowner', [
    body('fname', 'Enter a valid name').isLength({ min: 3 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be at least 5 characters').isLength({ min: 5 }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        let businessowner = await BusinessOwner.findOne({ email: req.body.email });
        if (businessowner) {
            return res.status(400).json({ error: "Sorry, a user with this email already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(req.body.password, salt);

        businessowner = await BusinessOwner.create({
            fname: req.body.fname,
            lname: req.body.lname,
            email: req.body.email,
            password: secPass,
            date: req.body.date,
            country: req.body.country,
            state: req.body.state,
            city: req.body.city,
            phone: req.body.phone,
            address: req.body.address,
            image: req.body.image,
            role: 'businessowner'
        });

        const token = jwt.sign({ id: businessowner._id, role: 'businessowner' }, JWT_SECRET);

        res.json({ token });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});


// Authenticate a Business Owner using: POST "/api/auth/loginbusinessowner". No login required
// router.post('/loginbusinessowner', [
//     body('email', 'Enter a valid email').isEmail(),
//     body('password', 'Password cannot be blank').exists(),
// ], async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({ errors: errors.array() });
//     }

//     const { email, password } = req.body;

//     try {
//         let businessowner = await BusinessOwner.findOne({ email });
//         if (!businessowner) {
//             return res.status(400).json({ error: "Please try to login with correct credentials" });
//         }

//         const passwordCompare = await bcrypt.compare(password, businessowner.password);
//         if (!passwordCompare) {
//             return res.status(400).json({ error: "Please try to login with correct credentials" });
//         }

//         const token = jwt.sign({ id: businessowner._id, role: 'businessowner' }, JWT_SECRET);

//         res.json({ token });
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send("Internal Server error occurred");
//     }
// });

// Get Business Owner Data using: POST "/api/businessowner/getbusinessowner". Login required
router.post('/getbusinessowner', fetchbusinessowner, async (req, res) => {
    try {
        const userId = req.businessowner._id;
        const businessowner = await BusinessOwner.findById(userId).select("-password");
        res.send(businessowner);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});


// Update Business Owner Data using: PUT "/api/businessowner/updatebusinessowner". Login required
router.put('/updatebusinessowner', fetchbusinessowner, [
    body('fname', 'Enter a valid name').isLength({ min: 3 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be at least 5 characters').isLength({ min: 5 }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { fname, lname, email, password, date, country, state, city, phone, address, image } = req.body;
    try {
        let businessowner = await BusinessOwner.findById(req.businessowner._id);
        if (!businessowner) return res.status(404).send("Not Found");
        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(password, salt);
        const newBusinessOwner = { fname, lname, email, password, date, country, state, city, phone, address, image };
        businessowner = await BusinessOwner.findByIdAndUpdate(req.businessowner._id, { $set: newBusinessOwner }, { new: true });
        res.send(businessowner);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Employee Data using: POST "/api/businessowner/getallemployees". Login required
router.post('/getallemployees', fetchbusinessowner, async (req, res) => {
    try {
        const userId = req.businessowner._id;
        const employee = await Employee.find({ businessowner: userId }).select("-password");
        res.send(employee);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Update Employee Data using: PUT "/api/auth/updateemployee". Login required
// router.put('/updateemployee/:id', fetchbusinessowner, [
//     body('fname', 'Enter a valid name').isLength({ min: 3 }),
//     body('email', 'Enter a valid email').isEmail(),
//     body('password', 'Password must be at least 5 characters').isLength({ min: 5 }),
// ], async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
//     const { fname, lname, email, password, phone, address } = req.body;
//     try {
//         let employee = await Employee.findById(req.params.id);
//         if (!employee) return res.status(404).send("Not Found");
//         const salt = await bcrypt.genSalt(10);
//         const secPass = await bcrypt.hash(password, salt);
//         const newEmployee = { fname, lname, email, password: secPass, phone, address };
//         employee = await Employee.findByIdAndUpdate(req.params.id, { $set: newEmployee }, { new: true });
//         res.send(employee);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send("Internal Server error occurred");
//     }
// });


router.put('/updateemployee/:id', fetchuser, [
    body('fname', 'Enter a valid name').isLength({ min: 3 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be at least 5 characters').isLength({ min: 5 }),
], async (req, res) => {
    if (req.user.role !== 'businessowner') {
        return res.status(401).send("Access denied");
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { fname, lname, email, birthdate, gender, jDate, nationality, country, state, city, hireAt, password, phone, address, image, about} = req.body;
    try {
        let employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).send("Not Found");
        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(password, salt);
        const newEmployee = { fname, lname, email, birthdate, gender, jDate, nationality, country, state, city, hireAt, password, phone, address, image, about};
        employee = await Employee.findByIdAndUpdate(req.params.id, { $set: newEmployee }, { new: true });
        res.send(employee);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});


// Delete Employee using: DELETE "/api/businessowner/deleteemployee". Business Owner login required
router.delete('/deleteemployee/:id', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'businessowner') {
            return res.status(403).send("Access denied");
        }
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.status(404).send("Business Owner not found");
        }
        await Employee.findByIdAndDelete(req.params.id);
        res.json({ "Success": "Employee has been deleted", employee: employee });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Supplier Data using: POST "/api/businessowner/getallsuppliers". Login required
router.post('/getallsuppliers', fetchbusinessowner, async (req, res) => {
    try {
        const userId = req.businessowner._id;
        const supplier = await Supplier.find({ businessowner: userId }).select("-password");
        res.send(supplier);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Update Supplier Data using: PUT "/api/businessowner/updatesupplier". Login required
router.put('/updatesupplier/:id', fetchbusinessowner, [
    body('fname', 'Enter a valid name').isLength({ min: 3 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be at least 5 characters').isLength({ min: 5 }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { fname, lname, email, password, gender, jDate, nationality, country, state, city, phone, address, about } = req.body;
    try {
        let supplier = await Supplier.findById(req.params.id);
        if (!supplier) return res.status(404).send("Not Found");
        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(password, salt);
        const newSupplier = { fname, lname, email, password, gender, jDate, nationality, country, state, city, phone, address, about };
        supplier = await Supplier.findByIdAndUpdate(req.params.id, { $set: newSupplier }, { new: true });
        res.send(supplier);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});


// Delete Supplier using: DELETE "/api/businessowner/deletesupplier". Business Owner login required
router.delete('/deletesupplier/:id', fetchbusinessowner, async (req, res) => {
    try {  
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).send("Supplier not found");
        }
        await Supplier.findByIdAndDelete(req.params.id);
        res.json({ "Success": "Supplier has been deleted", supplier: supplier });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

module.exports = router;