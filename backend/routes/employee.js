const express = require('express');
const Employee = require('../models/Employee');
const RolePermissions = require('../models/RolePermissions');
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
// Business Owner and Manager can create employees
router.post('/createemployee', fetchuser, upload.single('image'), [
    body('fname', 'Enter a valid name').isLength({ min: 3 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be at least 5 characters').isLength({ min: 5 })
], async (req, res) => {
    // Ensure only business owner and managers can create employees
    if (req.role && !['businessowner', 'manager'].includes(req.role)) {
        if (req.file) {
            deleteUploadedFile(path.join(uploadsDir, req.file.filename));
        }
        return res.status(403).json({ error: "Only Business Owner and Manager can create employees" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // console.error('Validation errors:', errors.array());
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

        // Determine the businessowner based on the requester's role
        let businessOwnerId;
        if (req.role === 'businessowner') {
            businessOwnerId = req.user._id;
        } else if (req.role === 'manager') {
            // Manager's businessowner is stored in their employee record
            businessOwnerId = req.user.businessowner;
        }

        // Validate that businessOwnerId was set
        if (!businessOwnerId) {
            if (req.file) {
                deleteUploadedFile(path.join(uploadsDir, req.file.filename));
            }
            return res.status(400).json({ error: "Unable to determine business owner for this operation" });
        }

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
            if (reportingToEmployee.businessowner.toString() !== businessOwnerId.toString()) {
                if (req.file) {
                    deleteUploadedFile(path.join(uploadsDir, req.file.filename));
                }
                return res.status(400).json({ error: "Reporting manager must belong to same business" });
            }
        }

        // Build employee data with all new fields
        // Warehouse is now REQUIRED - employee must be hired at a specific warehouse
        if (!req.body.warehouse) {
            if (req.file) {
                deleteUploadedFile(path.join(uploadsDir, req.file.filename));
            }
            return res.status(400).json({ error: "Warehouse/Hire location is required" });
        }

        const employeeData = {
            businessowner: businessOwnerId,
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
            warehouse: req.body.warehouse, // Required - must specify warehouse location
            phone: req.body.phone,
            address: req.body.address,
            image: imagePath,
            about: req.body.about,
            role: role,
            department: req.body.department || null,
            reportingTo: req.body.reportingTo || null,
            permissions: req.body.permissions || {}
        };

        // Get permissions from business owner's custom role permissions or use defaults
        let rolePermissionsDoc = await RolePermissions.findOne({ businessowner: businessOwnerId });
        let employeePermissions;
        
        if (rolePermissionsDoc && rolePermissionsDoc[role]) {
            // Use business owner's custom permissions for this role
            const customPerms = rolePermissionsDoc[role].toObject ? rolePermissionsDoc[role].toObject() : rolePermissionsDoc[role];
            // Remove mongoose internal fields
            delete customPerms._id;
            delete customPerms.$__;
            delete customPerms.$isNew;
            employeePermissions = customPerms;
        } else {
            // Fall back to default permissions from RolePermissions model
            employeePermissions = RolePermissions.getDefaultPermissions(role);
        }

        employeeData.permissions = employeePermissions;

        employee = await Employee.create(employeeData);

        // If warehouse is provided for manager, automatically update warehouse with employee reference
        if (employeeData.warehouse && role === 'manager') {
            const Warehouse = require('../models/Warehouse');
            await Warehouse.findByIdAndUpdate(
                employeeData.warehouse,
                { 
                    employee: employee._id,
                    wManager: `${employeeData.fname} ${employeeData.lname}`
                }
            );
        }

        // If reportingTo is set, update the supervisor's subordinates list
        if (employeeData.reportingTo) {
            await Employee.findByIdAndUpdate(
                employeeData.reportingTo,
                { $push: { subordinates: employee._id } }
            );
            
            // Notify the manager about new subordinate
            const employeeName = `${req.body.fname} ${req.body.lname || ''}`.trim();
            await notifyManagerAboutNewSubordinate(
                employeeData.reportingTo,
                employeeName,
                role,
                { employeeId: employee._id, email: employee.email }
            );
        }

        // Send notification to business owner
        const employeeName = `${req.body.fname} ${req.body.lname || ''}`.trim();
        try {
            await notifyBusinessOwnerAboutEmployee(
                businessOwnerId,
                employee._id,
                'created',
                employeeName,
                { employeeId: employee._id, email: employee.email, role }
            );
        } catch (notifError) {
            // console.error('Error notifying business owner:', notifError);
            // Continue anyway - don't fail the employee creation
        }
        
        // If manager role, notify all existing managers
        if (role === 'manager') {
            try {
                await notifyAllManagers(
                    businessOwnerId,
                    'created',
                    employeeName,
                    { employeeId: employee._id, email: employee.email, role: 'manager' }
                );
            } catch (notifError) {
                // console.error('Error notifying managers:', notifError);
                // Continue anyway - don't fail the employee creation
            }
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
            .populate('subordinates', 'fname lname email role')
            .populate('warehouse', 'wName wAddress _id'); // Populate warehouse for dashboard display

        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        res.json(employee);
    } catch (err) {
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Get All Employees using: POST "/api/employee/getallemployees". Permission-based filtering + warehouse filtering
router.post('/getallemployees', fetchuser, async (req, res) => {
    try {
        // Check permission to view employees (employees can always view themselves)
        if (req.role !== 'employee' && !hasPermission(req.user, 'canViewEmployees')) {
            return res.status(403).json({ error: "You do not have permission to view employees" });
        }

        // Business owner gets all employees in their business
        if (req.role === 'businessowner') {
            const employees = await Employee.find({ businessowner: req.user._id })
                .populate('reportingTo', 'fname lname role email')
                .populate('subordinates', 'fname lname role email')
                .populate('warehouse', 'wName wAddress')
                .select("-password");
            return res.json(employees);
        }
        
        // Manager gets only lower-hierarchy employees in their warehouse (excludes self and other managers)
        if (req.role === 'manager') {
            const manager = await Employee.findById(req.user._id).populate('warehouse');
            
            if (!manager || !manager.warehouse) {
                // No warehouse assigned, return empty array
                return res.json([]);
            }
            
            const warehouseId = manager.warehouse._id;
            const employees = await Employee.find({
                businessowner: req.user.businessowner,
                warehouse: warehouseId,
                _id: { $ne: req.user._id }, // Exclude self
                role: { $in: ['supervisor', 'employee'] } // Only lower hierarchy roles
            })
                .populate('reportingTo', 'fname lname role email')
                .populate('subordinates', 'fname lname role email')
                .populate('warehouse', 'wName wAddress')
                .select("-password");
            return res.json(employees);
        }
        
        // Supervisor gets only lower-hierarchy employees in their warehouse (excludes self, managers, and other supervisors)
        if (req.role === 'supervisor') {
            const supervisor = await Employee.findById(req.user._id).populate('warehouse');
            
            let warehouseId = supervisor && supervisor.warehouse ? supervisor.warehouse._id : null;
            
            let employees;
            if (warehouseId) {
                // Get only regular employees in same warehouse (lower hierarchy only)
                employees = await Employee.find({
                    businessowner: req.user.businessowner,
                    warehouse: warehouseId,
                    _id: { $ne: req.user._id }, // Exclude self
                    role: 'employee' // Only lower hierarchy role
                })
                    .populate('reportingTo', 'fname lname role email')
                    .populate('subordinates', 'fname lname role email')
                    .populate('warehouse', 'wName wAddress')
                    .select("-password");
            } else {
                // No warehouse assigned, show only direct reports (lower hierarchy)
                const subordinates = await getSubordinates(req.user._id);
                const subordinateIds = subordinates.map(sub => sub._id);
                employees = await Employee.find({
                    _id: { $in: subordinateIds },
                    businessowner: req.user.businessowner,
                    role: 'employee' // Only lower hierarchy role
                })
                    .populate('reportingTo', 'fname lname role email')
                    .populate('subordinates', 'fname lname role email')
                    .populate('warehouse', 'wName wAddress')
                    .select("-password");
            }
            
            return res.json(employees);
        }
        
        // Regular employees get only their own profile
        if (req.role === 'employee') {
            const employee = await Employee.findById(req.user._id)
                .populate('reportingTo', 'fname lname role email')
                .populate('warehouse', 'wName wAddress')
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
        // Only businessowner and manager can update employees
        if (!['businessowner', 'manager'].includes(req.role)) {
            if (req.file) {
                deleteUploadedFile(path.join(uploadsDir, req.file.filename));
            }
            return res.status(403).json({ error: "You do not have permission to update employees" });
        }

        const { fname, lname, birthDate, gender, jDate, nationality, country, state, city, hireAt, phone, address, about, role, warehouse } = req.body;

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

        // Additional check for manager - can only update direct reports
        if (req.role === 'manager') {
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
        if (warehouse) employee.warehouse = warehouse; // Update warehouse/hire location
        if (phone) employee.phone = phone;
        if (address) employee.address = address;
        if (about) employee.about = about;
        
        // Only businessowner can change role
        if (role && req.role === 'businessowner' && role !== employee.role) {
            const oldRole = employee.role;
            employee.role = role;
            
            // If employee doesn't have custom permissions, update to new role's permissions
            if (!employee.hasCustomPermissions) {
                // Get business owner's custom permissions for the new role
                let rolePermissionsDoc = await RolePermissions.findOne({ businessowner: employee.businessowner });
                let newPermissions;
                
                if (rolePermissionsDoc && rolePermissionsDoc[role]) {
                    const customPerms = rolePermissionsDoc[role].toObject ? rolePermissionsDoc[role].toObject() : rolePermissionsDoc[role];
                    newPermissions = {};
                    // Only copy actual permission fields
                    for (const key of Object.keys(customPerms)) {
                        if (key.startsWith('can')) {
                            newPermissions[key] = customPerms[key];
                        }
                    }
                } else {
                    newPermissions = RolePermissions.getDefaultPermissions(role);
                }
                
                employee.permissions = newPermissions;
            }
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
    // Only businessowner and manager can delete employees
    if (!['businessowner', 'manager'].includes(req.role)) {
        return res.status(403).json({ error: "You do not have permission to delete employees" });
    }

    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // Determine the requester's businessowner ID
        let requesterBusinessOwnerId;
        if (req.role === 'businessowner') {
            requesterBusinessOwnerId = req.user._id;
        } else {
            requesterBusinessOwnerId = req.user.businessowner;
        }

        // Check if employee belongs to this business owner
        if (employee.businessowner.toString() !== requesterBusinessOwnerId.toString()) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Additional check for manager - can only delete direct reports
        if (req.role === 'manager') {
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

        // Send notification to business owner (with error handling)
        try {
            await notifyBusinessOwnerAboutEmployee(
                employee.businessowner,
                req.params.id,
                'deleted',
                employeeName,
                { employeeId: req.params.id, deletedBy: req.role }
            );
        } catch (notifError) {
            // console.error('Error sending notification:', notifError);
            // Don't fail the deletion if notification fails
        }

        res.json({ message: "Employee deleted successfully" });
    } catch (err) {
        // console.error('Delete employee error:', err);
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
        // console.error(err);
        res.status(500).json({ success: false, error: "Internal server error occurred" });
    }
});

// Assign Warehouse to Employee - SOLVES CIRCULAR DEPENDENCY
// Use this endpoint AFTER both employee and warehouse are created
router.put('/assignwarehouse/:employeeId', fetchbusinessowner, [
    body('warehouseId', 'Enter valid Warehouse ID').exists()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { employeeId } = req.params;
        const { warehouseId } = req.body;

        // Verify employee exists and belongs to this business owner
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        if (employee.businessowner.toString() !== req.businessowner._id.toString()) {
            return res.status(403).json({ error: "You do not have permission to assign warehouse to this employee" });
        }

        // Verify warehouse exists and belongs to this business owner
        const Warehouse = require('../models/Warehouse');
        const warehouse = await Warehouse.findById(warehouseId);
        if (!warehouse) {
            return res.status(404).json({ error: "Warehouse not found" });
        }

        if (warehouse.businessowner.toString() !== req.businessowner._id.toString()) {
            return res.status(403).json({ error: "Warehouse does not belong to your business" });
        }

        // Update employee with warehouse
        employee.warehouse = warehouseId;
        await employee.save();

        res.json({
            success: true,
            message: 'Warehouse assigned to employee successfully',
            employee
        });
    } catch (err) {
        // console.error(err);
        res.status(500).json({ error: "Internal server error occurred" });
    }
});

// Get unassigned employees - helpful to see who needs warehouse assignment
router.get('/unassigned-employees', fetchbusinessowner, async (req, res) => {
    try {
        const unassignedEmployees = await Employee.find({
            businessowner: req.businessowner._id,
            warehouse: null
        }).select('fname lname email role');

        res.json({
            success: true,
            unassignedEmployees,
            count: unassignedEmployees.length
        });
    } catch (err) {
        // console.error(err);
        res.status(500).json({ error: "Internal server error occurred" });
    }
});

// Assign first warehouse to all unassigned employees (migration endpoint)
// This helps fix existing employees that don't have warehouse assigned
router.post('/assign-missing-warehouses', fetchbusinessowner, async (req, res) => {
    try {
        // Get first warehouse of the business owner
        const Warehouse = require('../models/Warehouse');
        const warehouse = await Warehouse.findOne({ employee: req.user._id })
            .sort({ createdAt: 1 });
        
        if (!warehouse) {
            return res.status(400).json({ 
                error: "No warehouse found to assign. Please create at least one warehouse first.",
                updated: 0
            });
        }

        // Find all employees without warehouse assignment
        const unassignedEmployees = await Employee.find({
            businessowner: req.businessowner._id,
            $or: [
                { warehouse: null },
                { warehouse: undefined }
            ]
        });

        // Update all unassigned employees to assigned warehouse
        let updateCount = 0;
        for (const employee of unassignedEmployees) {
            employee.warehouse = warehouse._id;
            await employee.save();
            updateCount++;
        }

        res.json({
            success: true,
            message: `Successfully assigned warehouse to ${updateCount} employees`,
            updated: updateCount,
            warehouseId: warehouse._id,
            warehouseName: warehouse.wName
        });
    } catch (err) {
        // console.error(err);
        res.status(500).json({ error: "Internal server error occurred" });
    }
});

module.exports = router;

