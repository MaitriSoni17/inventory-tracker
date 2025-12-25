const express = require('express');
const Employee = require('../models/Employee');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetchuser = require('../middleware/fetchuser'); // unified middleware
const fetchemployee = require('../middleware/fetchemployee');
const { body, validationResult } = require('express-validator');
const fetchbusinessowner = require('../middleware/fetchbusinessowner');
const { notifyBusinessOwnerAboutEmployee } = require('../utils/notificationHelper');
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

        } catch (error) {

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
            deleteUploadedFile(path.join(uploadsDir, req.file.filename));
        }
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        let employee = await Employee.findOne({ email: req.body.email });
        if (employee) {
            // Delete file if user already exists
            if (req.file) {
                deleteUploadedFile(path.join(uploadsDir, req.file.filename));
            }
            return res.status(400).json({ error: "Sorry, a user with this email already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(req.body.password, salt);

        // Get only the filename from the uploaded file
        const imagePath = req.file ? req.file.filename : undefined;

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

        // Send notification to business owner
        const employeeName = `${req.body.fname} ${req.body.lname || ''}`.trim();
        await notifyBusinessOwnerAboutEmployee(
            req.businessowner._id,
            employee._id,
            'created',
            employeeName,
            { employeeId: employee._id, email: employee.email }
        );

        const authToken = jwt.sign({ id: employee._id, role: employee.role }, JWT_SECRET);
        res.json({ authToken, success: true });
    } catch (err) {



        // Delete file on internal error
        if (req.file) {
            deleteUploadedFile(path.join(uploadsDir, req.file.filename));
        }
        res.status(500).json({ error: "Internal Server error occurred", details: err.message });
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

        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Get All Employees using: POST "/api/employee/getallemployees". Business Owner login required
router.post('/getallemployees', fetchbusinessowner, async (req, res) => {
    try {
        const employees = await Employee.find({ businessowner: req.businessowner._id }).select("-password");
        res.json(employees);
    } catch (err) {

        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Update Employee Profile (Self-Update) using: PUT "/api/employee/updateemployee". Employee login required
router.put('/updateemployee', fetchemployee, upload.single('image'), async (req, res) => {
    try {
        const { fname, lname, phone, country, state, city, address } = req.body;

        const employee = req.employee;
        
        // Update allowed fields for employee self-update (no password update allowed)
        if (fname) employee.fname = fname;
        if (lname) employee.lname = lname;
        if (phone) employee.phone = phone;
        if (country) employee.country = country;
        if (state) employee.state = state;
        if (city) employee.city = city;
        if (address) employee.address = address;

        // Handle image upload
        if (req.file) {
            // Delete old image if exists
            if (employee.image) {
                deleteUploadedFile(path.join(uploadsDir, employee.image));
            }
            employee.image = req.file.filename;
        }

        await employee.save();
        
        // Send notification to business owner
        const employeeName = `${employee.fname} ${employee.lname || ''}`.trim();
        await notifyBusinessOwnerAboutEmployee(
            employee.businessowner,
            employee._id,
            'updated',
            employeeName,
            { employeeId: employee._id, email: employee.email }
        );
        
        res.json({ success: true, message: "Profile updated successfully" });
    } catch (err) {

        if (req.file) {
            deleteUploadedFile(req.file.path);
        }
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Update Employee using: PUT "/api/employee/updateemployee/:id". Business Owner login required
router.put('/updateemployee/:id', fetchbusinessowner, upload.single('image'), async (req, res) => {
    try {
        const { fname, lname, birthDate, gender, jDate, nationality, country, state, city, hireAt, phone, address, about, role } = req.body;

        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            // Delete file if employee not found
            if (req.file) {
                deleteUploadedFile(req.file.path);
            }
            return res.status(404).json({ error: "Employee not found" });
        }

        // Check if employee belongs to this business owner
        if (employee.businessowner.toString() !== req.businessowner._id.toString()) {
            // Delete file if access denied
            if (req.file) {
                deleteUploadedFile(req.file.path);
            }
            return res.status(403).json({ error: "Access denied" });
        }

        // Update fields
        if (fname) employee.fname = fname;
        if (lname) employee.lname = lname;
        if (birthDate) employee.birthDate = birthDate;
        if (gender) employee.gender = gender;
        if (jDate) employee.jDate = jDate;
        if (nationality) employee.nationality = nationality;
        if (country) employee.country = country;
        if (state) employee.state = state;
        if (city) employee.city = city;
        if (hireAt) employee.hireAt = hireAt;
        if (phone) employee.phone = phone;
        if (address) employee.address = address;
        if (about) employee.about = about;
        if (role) employee.role = role;

        // Handle image upload
        if (req.file) {
            // Delete old image if exists
            if (employee.image) {
                deleteUploadedFile(path.join(uploadsDir, employee.image));
            }
            employee.image = req.file.filename;
        }

        await employee.save();

        // Send notification to business owner
        const employeeName = `${employee.fname} ${employee.lname || ''}`.trim();
        await notifyBusinessOwnerAboutEmployee(
            req.businessowner._id,
            employee._id,
            'updated',
            employeeName,
            { employeeId: employee._id }
        );

        res.json({ employee, success: true });
    } catch (err) {

        // Delete file on error
        if (req.file) {
            deleteUploadedFile(path.join(uploadsDir, req.file.filename));
        }
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Change Employee Password using: PUT "/api/employee/changepassword/:id". Business Owner login required
router.put('/changepassword/:id', fetchbusinessowner, [
    body('oldPassword', 'Old password is required').exists(),
    body('newPassword', 'New password must be at least 5 characters').isLength({ min: 5 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // Check if employee belongs to this business owner
        if (employee.businessowner.toString() !== req.businessowner._id.toString()) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Verify old password
        const passwordCompare = await bcrypt.compare(req.body.oldPassword, employee.password);
        if (!passwordCompare) {
            return res.status(400).json({ error: "Current password is incorrect" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const newSecPass = await bcrypt.hash(req.body.newPassword, salt);

        // Update password
        employee.password = newSecPass;
        await employee.save();

        res.json({ success: true, message: "Password changed successfully" });
    } catch (err) {

        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Delete Employee using: DELETE "/api/employee/deleteemployee/:id". Business Owner login required
router.delete('/deleteemployee/:id', fetchbusinessowner, async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // Check if employee belongs to this business owner
        if (employee.businessowner.toString() !== req.businessowner._id.toString()) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Delete uploaded image if exists
        if (employee.image) {
            deleteUploadedFile(employee.image);
        }

        const employeeName = `${employee.fname} ${employee.lname || ''}`.trim();

        await Employee.findByIdAndDelete(req.params.id);

        // Send notification to business owner
        await notifyBusinessOwnerAboutEmployee(
            req.businessowner._id,
            req.params.id,
            'deleted',
            employeeName,
            { employeeId: req.params.id }
        );

        res.json({ message: "Employee deleted successfully" });
    } catch (err) {

        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Get employee preferences
router.post('/getpreferences', fetchemployee, async (req, res) => {
    try {
        const employee = await Employee.findById(req.employee._id);
        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }
        
        const preferences = employee.preferences || {
            emailNotifications: true,
            orderAlerts: true,
            lowStockAlerts: true,
            weeklyReport: false
        };
        
        res.json(preferences);
    } catch (err) {

        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Update employee preferences
router.put('/updatepreferences', fetchemployee, async (req, res) => {
    try {
        const { emailNotifications, orderAlerts, lowStockAlerts, weeklyReport } = req.body;
        
        const employee = await Employee.findByIdAndUpdate(
            req.employee._id,
            {
                preferences: {
                    emailNotifications: emailNotifications !== false,
                    orderAlerts: orderAlerts !== false,
                    lowStockAlerts: lowStockAlerts !== false,
                    weeklyReport: weeklyReport === true
                }
            },
            { new: true }
        );
        
        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }
        
        res.json({ message: "Preferences updated successfully", preferences: employee.preferences });
    } catch (err) {

        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

module.exports = router;

