const express = require('express');
const Employee = require('../models/Employee');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetchuser = require('../middleware/fetchuser'); // unified middleware
const fetchemployee = require('../middleware/fetchemployee');
const { body, validationResult } = require('express-validator');
const fetchbusinessowner = require('../middleware/fetchbusinessowner');
const { 
  notifyBusinessOwnerAboutEmployee,
  notifyAllManagers,
  notifyManagerAboutNewSubordinate,
  notifyEmployeeAboutRoleChange
} = require('../utils/notificationHelper');
const { requireEmployeeManagement, hasPermission, getSubordinates, getAllTeamMembers } = require('../middleware/roleBasedAccess');
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
// Only Business Owner can create employees
router.post('/createemployee', fetchbusinessowner, upload.single('image'), [
    body('fname', 'Enter a valid name').isLength({ min: 3 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be at least 5 characters').isLength({ min: 5 })
], async (req, res) => {
    // Ensure only business owner can create employees
    if (req.role && req.role !== 'businessowner') {
        if (req.file) {
            deleteUploadedFile(path.join(uploadsDir, req.file.filename));
        }
        return res.status(403).json({ error: "Only Business Owner can create employees" });
    }

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

        // Validate role - only allow valid roles
        const validRoles = ['employee', 'supervisor', 'manager'];
        const role = validRoles.includes(req.body.role) ? req.body.role : 'employee';

        // Validate reportingTo if provided - must be a manager or supervisor
        let reportingToEmployee = null;
        if (req.body.reportingTo) {
            reportingToEmployee = await Employee.findById(req.body.reportingTo);
            if (!reportingToEmployee) {
                if (req.file) {
                    deleteUploadedFile(path.join(uploadsDir, req.file.filename));
                }
                return res.status(400).json({ error: "Reporting manager not found" });
            }
            // Ensure the reporting manager is a supervisor or manager
            if (!['supervisor', 'manager'].includes(reportingToEmployee.role)) {
                if (req.file) {
                    deleteUploadedFile(path.join(uploadsDir, req.file.filename));
                }
                return res.status(400).json({ error: "Employee can only report to a Manager or Supervisor" });
            }
            // Ensure the reporting manager belongs to same business owner
            if (reportingToEmployee.businessowner.toString() !== req.businessowner._id.toString()) {
                if (req.file) {
                    deleteUploadedFile(path.join(uploadsDir, req.file.filename));
                }
                return res.status(400).json({ error: "Reporting manager must belong to same business" });
            }
        }

        // Build employee data with all new fields
        const employeeData = {
            businessowner: req.businessowner._id,
            fname: req.body.fname,
            lname: req.body.lname,
            email: req.body.email,
            password: secPass,
            birthDate: req.body.birthDate,
            gender: req.body.gender,
            jDate: req.body.jDate,
            nationality: req.body.nationality,
            country: req.body.country,
            state: req.body.state,
            city: req.body.city,
            hireAt: req.body.hireAt,
            warehouse: req.body.hireAt, // Map hireAt to warehouse field
            phone: req.body.phone,
            address: req.body.address,
            image: imagePath,
            about: req.body.about,
            role: role,
            department: req.body.department || null,
            reportingTo: req.body.reportingTo || null,
            permissions: req.body.permissions || {}
        };

        // Set default permissions based on role
        const defaultPermissions = {
            employee: {
                canCreateProducts: true,
                canDeleteProducts: false,
                canCreateWarehouse: false,
                canDeleteWarehouse: false,
                canCreateCategory: false,
                canDeleteCategory: false,
                canDeleteOrders: false,
                canManageEmployees: false,
                canViewAnalytics: false,
                canExportReports: false,
                canEditOthersWork: false,
                canSendNotifications: false,
                canApproveOrders: false
            },
            supervisor: {
                canCreateProducts: true,
                canDeleteProducts: true,
                canCreateWarehouse: false,
                canDeleteWarehouse: false,
                canCreateCategory: true,
                canDeleteCategory: false,
                canDeleteOrders: true,
                canManageEmployees: false,
                canViewAnalytics: true,
                canExportReports: false,
                canEditOthersWork: true,
                canSendNotifications: false,
                canApproveOrders: false
            },
            manager: {
                canCreateProducts: true,
                canDeleteProducts: true,
                canCreateWarehouse: true,
                canDeleteWarehouse: true,
                canCreateCategory: true,
                canDeleteCategory: false,
                canDeleteOrders: true,
                canManageEmployees: true,
                canViewAnalytics: true,
                canExportReports: true,
                canEditOthersWork: true,
                canSendNotifications: true,
                canApproveOrders: true
            }
        };

        employeeData.permissions = defaultPermissions[role];

        employee = await Employee.create(employeeData);

        // If reportingTo is set, update the supervisor's subordinates list
        if (employeeData.reportingTo) {
            await Employee.findByIdAndUpdate(
                employeeData.reportingTo,
                { $push: { subordinates: employee._id } }
            );
            
            // Notify the manager about new subordinate
            await notifyManagerAboutNewSubordinate(
                employeeData.reportingTo,
                employeeName,
                role,
                { employeeId: employee._id, email: employee.email }
            );
        }

        // Send notification to business owner
        const employeeName = `${req.body.fname} ${req.body.lname || ''}`.trim();
        await notifyBusinessOwnerAboutEmployee(
            req.businessowner._id,
            employee._id,
            'created',
            employeeName,
            { employeeId: employee._id, email: employee.email, role }
        );
        
        // If manager role, notify all existing managers
        if (role === 'manager') {
            await notifyAllManagers(
                req.businessowner._id,
                'created',
                employeeName,
                { employeeId: employee._id, email: employee.email, role: 'manager' }
            );
        }

        const authToken = jwt.sign({ id: employee._id, role: employee.role }, JWT_SECRET);
        res.json({ authToken, success: true, employee: { _id: employee._id, role: employee.role, fname: employee.fname, email: employee.email } });
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

        // Use the employee's actual role (employee, supervisor, or manager)
        const authToken = jwt.sign({ id: employee._id, role: employee.role }, JWT_SECRET);
        res.json({ success: true, authtoken: authToken, role: employee.role });
    } catch (err) {
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Get Employee Data using: POST "/api/employee/getemployee". Login required
router.post('/getemployee', fetchuser, async (req, res) => {
    try {
        // Allow employees, supervisors, and managers to get their own data
        if (!['employee', 'supervisor', 'manager'].includes(req.role)) {
            return res.status(403).json({ error: "Access denied" });
        }

        const employee = await Employee.findById(req.user._id)
            .select("-password")
            .populate('reportingTo', 'fname lname email role')
            .populate('subordinates', 'fname lname email role');

        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        res.json(employee);
    } catch (err) {
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Get All Employees using: POST "/api/employee/getallemployees". Role-based filtering
router.post('/getallemployees', fetchuser, async (req, res) => {
    try {
        // Business owner gets all employees in their business
        if (req.role === 'businessowner') {
            const employees = await Employee.find({ businessowner: req.user._id })
                .populate('reportingTo', 'fname lname role email')
                .populate('subordinates', 'fname lname role email')
                .select("-password");
            return res.json(employees);
        }
        
        // Manager gets all employees in the business + their team members
        if (req.role === 'manager') {
            const employees = await Employee.find({ businessowner: req.user.businessowner })
                .populate('reportingTo', 'fname lname role email')
                .populate('subordinates', 'fname lname role email')
                .select("-password");
            return res.json(employees);
        }
        
        // Supervisor gets direct reports and their own profile
        if (req.role === 'supervisor') {
            const subordinates = await getSubordinates(req.user._id, false); // non-recursive - direct reports only
            const subordinateIds = subordinates.map(sub => sub._id);
            subordinateIds.push(req.user._id); // Include self
            
            const employees = await Employee.find({ 
                _id: { $in: subordinateIds },
                businessowner: req.user.businessowner 
            })
                .populate('reportingTo', 'fname lname role email')
                .populate('subordinates', 'fname lname role email')
                .select("-password");
            return res.json(employees);
        }
        
        // Regular employees get only their own profile
        if (req.role === 'employee') {
            const employee = await Employee.findById(req.user._id)
                .populate('reportingTo', 'fname lname role email')
                .select("-password");
            return res.json([employee]);
        }
        
        return res.status(403).json({ error: "You do not have permission to view employees" });
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

// Update Employee using: PUT "/api/employee/updateemployee/:id". Role-based access control
router.put('/updateemployee/:id', fetchuser, upload.single('image'), async (req, res) => {
    try {
        // Only businessowner, manager, and supervisor can update other employees
        if (!['businessowner', 'manager', 'supervisor'].includes(req.role)) {
            if (req.file) {
                deleteUploadedFile(path.join(uploadsDir, req.file.filename));
            }
            return res.status(403).json({ error: "You do not have permission to update employees" });
        }

        const { fname, lname, birthDate, gender, jDate, nationality, country, state, city, hireAt, phone, address, about, role } = req.body;

        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            if (req.file) {
                deleteUploadedFile(path.join(uploadsDir, req.file.filename));
            }
            return res.status(404).json({ error: "Employee not found" });
        }

        // Check if employee belongs to this business owner
        if (employee.businessowner.toString() !== req.user.businessowner.toString() && req.role !== 'businessowner') {
            if (req.file) {
                deleteUploadedFile(path.join(uploadsDir, req.file.filename));
            }
            return res.status(403).json({ error: "Access denied" });
        }

        // Additional check for manager and supervisor - can only update direct reports
        if (['manager', 'supervisor'].includes(req.role)) {
            // Check if the employee to update is a subordinate or themselves
            const isSubordinate = employee.reportingTo && employee.reportingTo.toString() === req.user._id.toString();
            const isSelf = employee._id.toString() === req.user._id.toString();
            
            if (!isSubordinate && !isSelf) {
                if (req.file) {
                    deleteUploadedFile(path.join(uploadsDir, req.file.filename));
                }
                return res.status(403).json({ error: "You can only update your direct reports or your own profile" });
            }
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
        
        // Only businessowner can change role
        if (role && req.role === 'businessowner') {
            employee.role = role;
        }

        // Handle image upload
        if (req.file) {
            // Delete old image if exists
            if (employee.image) {
                deleteUploadedFile(path.join(uploadsDir, employee.image));
            }
            employee.image = req.file.filename;
        }

        await employee.save();

        // Send notification
        const employeeName = `${employee.fname} ${employee.lname || ''}`.trim();
        await notifyBusinessOwnerAboutEmployee(
            employee.businessowner,
            employee._id,
            'updated',
            employeeName,
            { employeeId: employee._id, updatedBy: req.role }
        );

        res.json({ employee, success: true });
    } catch (err) {
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

// Delete Employee using: DELETE "/api/employee/deleteemployee/:id". Role-based access control
router.delete('/deleteemployee/:id', fetchuser, async (req, res) => {
    // Only businessowner, manager, and supervisor can delete employees
    if (!['businessowner', 'manager', 'supervisor'].includes(req.role)) {
        return res.status(403).json({ error: "You do not have permission to delete employees" });
    }

    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // Check if employee belongs to this business owner
        if (employee.businessowner.toString() !== req.user.businessowner.toString() && req.role !== 'businessowner') {
            return res.status(403).json({ error: "Access denied" });
        }

        // Additional check for manager and supervisor - can only delete direct reports
        if (['manager', 'supervisor'].includes(req.role)) {
            // Check if the employee to delete is a subordinate
            const isSubordinate = employee.reportingTo && employee.reportingTo.toString() === req.user._id.toString();
            
            if (!isSubordinate) {
                return res.status(403).json({ error: "You can only delete your direct reports" });
            }
        }

        // Delete uploaded image if exists
        if (employee.image) {
            deleteUploadedFile(path.join(uploadsDir, employee.image));
        }

        const employeeName = `${employee.fname} ${employee.lname || ''}`.trim();

        // Remove this employee from their supervisor's subordinates list
        if (employee.reportingTo) {
            await Employee.findByIdAndUpdate(
                employee.reportingTo,
                { $pull: { subordinates: employee._id } }
            );
        }

        await Employee.findByIdAndDelete(req.params.id);

        // Send notification to business owner
        await notifyBusinessOwnerAboutEmployee(
            employee.businessowner,
            req.params.id,
            'deleted',
            employeeName,
            { employeeId: req.params.id, deletedBy: req.role }
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

// Employee self-deletion: DELETE "/api/employee/deleteaccount". Employee login required
// This endpoint now uses the new deletion request workflow
router.delete('/deleteaccount', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'employee') {
            return res.status(403).json({ success: false, error: "Access denied" });
        }

        // Redirect to the new deletion request system
        const DeletionRequest = require('../models/DeletionRequest');
        const employeeId = req.user._id;

        // Check if there's already a pending deletion request
        const existingRequest = await DeletionRequest.findOne({
            userId: employeeId,
            status: { $in: ['pending', 'approved'] }
        });

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                message: 'You already have an active deletion request. Please wait for it to be processed.'
            });
        }

        // Create deletion request for employee
        const employee = await Employee.findById(employeeId);
        const deletionRequest = new DeletionRequest({
            userId: employeeId,
            userEmail: employee.email,
            userRole: 'employee',
            creatorId: employee.businessowner,
            reason: 'Employee initiated account deletion'
        });

        await deletionRequest.save();

        res.json({
            success: true,
            message: 'Your account deletion request has been sent to your Business Owner for approval.',
            requestId: deletionRequest._id
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Internal server error occurred" });
    }
});

module.exports = router;

