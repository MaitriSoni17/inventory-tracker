const express = require('express');
const Employee = require('../models/Employee');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetchuser = require('../middleware/fetchuser'); // unified middleware
const { body, validationResult } = require('express-validator');
const fetchbusinessowner = require('../middleware/fetchbusinessowner');
// --- Import and Configure Multer ---
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure storage (e.g., store files in an 'uploads' directory)
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Create a unique file name
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const deleteUploadedFile = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            console.log(`Successfully deleted file: ${filePath}`);
        } catch (error) {
            console.error(`Error deleting file: ${filePath}`, error);
        }
    }
};
const upload = multer({ storage: storage });
// ------------------------------------

const JWT_SECRET = process.env.JWT_SECRET || 'ThisisaSecretKey';

// Create an Employee using: POST "/api/employee/createemployee". 
// Business Owner login required.
// Add upload.single('image') as middleware before validation and handler.
router.post('/createemployee', fetchbusinessowner, upload.single('image'), [
    body('fname', 'Enter a valid name').isLength({ min: 3 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be at least 5 characters').isLength({ min: 5 })
], async (req, res) => {
    // After Multer runs, text fields are in req.body, and the file is in req.file.
    // Multer automatically handles parsing 'multipart/form-data'.

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // You might want to delete the uploaded file if validation fails here
        if (req.file) {
            deleteUploadedFile(req.file.path);
        }
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        let employee = await Employee.findOne({ email: req.body.email });
        if (employee) {
            // Delete file if user already exists
            if (req.file) {
                deleteUploadedFile(req.file.path);
            }
            return res.status(400).json({ error: "Sorry, a user with this email already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(req.body.password, salt);

        // Get the path to the uploaded file from req.file
        const imagePath = req.file ? req.file.path : undefined;

        employee = await Employee.create({
            businessowner: req.businessowner._id,
            fname: req.body.fname,
            lname: req.body.lname,
            email: req.body.email,
            password: secPass,
            birthDate: req.body.birthDate,
            gender: req.body.gender,
            ...(req.body.jDate && { jDate: req.body.jDate }),
            nationality: req.body.nationality,
            country: req.body.country,
            state: req.body.state,
            city: req.body.city,
            hireAt: req.body.hireAt,
            phone: req.body.phone,
            address: req.body.address,
            // --- Store the file path in the database ---
            image: imagePath,
            // ------------------------------------------
            about: req.body.about,
            role: req.body.role || 'employee' // Use req.body.role instead of hardcoding 'employee'
        });

        const authToken = jwt.sign({ id: employee._id, role: employee.role }, JWT_SECRET);
        res.json({ authToken, success: true });
    } catch (err) {
        console.error(err.message);
        // Delete file on internal error
        if (req.file) {
            deleteUploadedFile(req.file.path);
        }
        res.status(500).send("Internal Server error occurred");
    }
});

// Login Employee using: POST "/api/employee/loginemployee". No login required
router.post('/loginemployee', [
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password cannot be blank').exists(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        let employee = await Employee.findOne({ email });
        if (!employee) {
            return res.status(400).json({ error: "Please try to login with correct credentials" });
        }

        const passwordCompare = await bcrypt.compare(password, employee.password);
        if (!passwordCompare) {
            return res.status(400).json({ error: "Please try to login with correct credentials" });
        }

        const authToken = jwt.sign({ id: employee._id, role: 'employee' }, JWT_SECRET);
        res.json({ success: true, authtoken: authToken });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Get Employee Data using: POST "/api/employee/getemployee". Login required
router.post('/getemployee', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'employee') {
            return res.status(403).json({ error: "Access denied" });
        }

        const employee = await Employee.findById(req.user._id).select("-password");
        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        res.json(employee);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});



module.exports = router;