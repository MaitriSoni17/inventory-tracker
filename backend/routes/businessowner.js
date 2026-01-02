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

const JWT_SECRET = process.env.JWT_SECRET || 'ThisisaSecretKey';

// Create a Business Owner using: POST "/api/businessowner/createbusinessowner". No login required
router.post('/createbusinessowner', [
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
            email: req.body.email,
            password: secPass,
            role: 'businessowner'
        });

        const token = jwt.sign({ id: businessowner._id, role: 'businessowner' }, JWT_SECRET);

        res.json({ success: true, authtoken: token });
    } catch (err) {
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
        if (!businessowner) {
            return res.status(404).json({ error: "Business owner not found" });
        }
        res.json(businessowner);
    } catch (err) {
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});


// Update Business Owner Data using: PUT "/api/businessowner/updatebusinessowner". Login required
router.put('/updatebusinessowner', fetchbusinessowner, [
    body('fname', 'Enter a valid name').isLength({ min: 3 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be at least 5 characters').isLength({ min: 5 }).optional({ checkFalsy: true }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { fname, lname, email, password, date, country, state, city, pincode, phone, address, image } = req.body;
    try {
        let businessowner = await BusinessOwner.findById(req.businessowner._id);
        if (!businessowner) return res.status(404).send("Not Found");
        
        const newBusinessOwner = { fname, lname, email, date, country, state, city, pincode, phone, address, image };
        
        // Only update password if it's provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const secPass = await bcrypt.hash(password, salt);
            newBusinessOwner.password = secPass;
        }
        
        businessowner = await BusinessOwner.findByIdAndUpdate(req.businessowner._id, { $set: newBusinessOwner }, { new: true });
        res.send(businessowner);
    } catch (err) {
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
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Notifications using: GET "/api/businessowner/notifications". Login required
router.get('/notifications', fetchbusinessowner, async (req, res) => {
    try {
        const userId = req.businessowner._id;
        const Product = require('../models/Products');
        const Order = require('../models/Orders');
        
        const notifications = [];
        
        // Get all products with low stock (totalProducts < reorder level or 5)
        const products = await Product.find({ businessowner: userId }).populate('employee', 'fname lname');
        products.forEach(product => {
            if (product.totalProducts < 5) {
                notifications.push({
                    id: `low_stock_${product._id}`,
                    type: 'low_stock',
                    title: 'Low Stock Alert',
                    message: `Product "${product.name}" has only ${product.totalProducts} unit${product.totalProducts !== 1 ? 's' : ''} left in stock`,
                    details: `Current Stock: ${product.totalProducts} units | Reorder Level: 5 units`,
                    timestamp: new Date(),
                    read: false,
                    priority: product.totalProducts === 0 ? 'critical' : product.totalProducts < 3 ? 'high' : 'medium',
                    productId: product._id.toString(),
                    productName: product.name,
                    icon: 'bi-exclamation-triangle-fill',
                    color: 'danger'
                });
            }
        });
        
        // Get recent orders (last 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentOrders = await Order.find({
            businessowner: userId,
            createdAt: { $gte: twentyFourHoursAgo }
        }).populate('employee', 'fname lname');
        
        recentOrders.forEach(order => {
            notifications.push({
                id: `order_${order._id}`,
                type: 'order_update',
                title: 'Order Status Changed',
                message: `Order #${order._id.toString().slice(-5).toUpperCase()} - ${order.productName} has been ${order.deliveryStatus.toLowerCase()}`,
                details: `Order Total: $${order.totalAmt} | Status: ${order.deliveryStatus}`,
                timestamp: order.createdAt,
                read: false,
                priority: order.deliveryStatus === 'Pending' ? 'high' : 'medium',
                orderId: order._id.toString(),
                employeeName: order.employee ? `${order.employee.fname} ${order.employee.lname}` : 'Unknown',
                icon: order.deliveryStatus === 'Delivered' ? 'bi-check-circle-fill' : 'bi-hourglass-split',
                color: order.deliveryStatus === 'Delivered' ? 'success' : 'warning'
            });
        });
        
        // Sort by timestamp, newest first
        notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Limit to 50 notifications
        const limitedNotifications = notifications.slice(0, 50);
        
        res.json(limitedNotifications);
    } catch (err) {
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Deactivate Account using: POST "/api/businessowner/deactivate". Login required
router.post('/deactivate', fetchbusinessowner, async (req, res) => {
    try {
        const userId = req.businessowner._id;
        await BusinessOwner.findByIdAndUpdate(userId, { active: false });
        res.json({ success: true, message: "Account deactivated successfully" });
    } catch (err) {
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Delete Account using: POST "/api/businessowner/delete". Login required
// This endpoint now redirects to the new deletion request workflow
router.post('/delete', fetchbusinessowner, async (req, res) => {
    try {
        // console.log('Delete account request received');
        // console.log('req.businessowner:', req.businessowner ? { _id: req.businessowner._id, email: req.businessowner.email } : 'null');
        
        const DeletionRequest = require('../models/DeletionRequest');
        
        // Validate businessowner is properly authenticated
        if (!req.businessowner || !req.businessowner._id) {
            console.error('No businessowner in request');
            return res.status(400).json({
                success: false,
                error: 'Invalid authentication. Please login again.'
            });
        }

        const businessOwnerId = req.businessowner._id;
        const businessOwnerEmail = req.businessowner.email;
        
        // Validate email exists
        if (!businessOwnerEmail) {
            console.error('Business owner email not found for id:', businessOwnerId);
            return res.status(400).json({
                success: false,
                error: 'Business owner email not found. Please update your profile.'
            });
        }

        // Check if there's already a pending deletion request
        const existingRequest = await DeletionRequest.findOne({
            userId: businessOwnerId,
            status: { $in: ['pending', 'approved'] }
        });

        if (existingRequest) {
            // console.log('Existing deletion request found:', existingRequest._id);
            return res.status(400).json({
                success: false,
                message: 'You already have an active deletion request. Please wait for it to be processed.'
            });
        }

        // Create deletion request for business owner
        const deletionRequest = new DeletionRequest({
            userId: businessOwnerId,
            userEmail: businessOwnerEmail,
            userRole: 'businessowner',
            reason: 'Business owner initiated account deletion'
        });

        // console.log('Saving deletion request:', {
        //     userId: deletionRequest.userId,
        //     userEmail: deletionRequest.userEmail,
        //     userRole: deletionRequest.userRole
        // });

        await deletionRequest.save();
        // console.log('Deletion request saved successfully:', deletionRequest._id);

        res.json({
            success: true,
            message: 'Your account deletion has been scheduled. You have 7 days to cancel this request.',
            requestId: deletionRequest._id
        });
    } catch (err) {
        console.error('Delete account error:', err);
        res.status(500).json({ 
            success: false,
            error: "Internal Server error occurred", 
            details: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// Cancel existing deletion request using: POST "/api/businessowner/cancel-deletion". Login required
router.post('/cancel-deletion', fetchbusinessowner, async (req, res) => {
    try {
        // console.log('Cancel deletion request received');
        
        const DeletionRequest = require('../models/DeletionRequest');
        const businessOwnerId = req.businessowner._id;

        // Find and delete the pending deletion request
        const deletionRequest = await DeletionRequest.findOneAndDelete({
            userId: businessOwnerId,
            status: { $in: ['pending', 'approved'] }
        });

        if (!deletionRequest) {
            return res.status(404).json({
                success: false,
                message: 'No active deletion request found to cancel.'
            });
        }

        // console.log('Deletion request cancelled:', deletionRequest._id);

        res.json({
            success: true,
            message: 'Your deletion request has been cancelled successfully.'
        });
    } catch (err) {
        console.error('Cancel deletion error:', err);
        res.status(500).json({ 
            success: false,
            error: "Internal Server error occurred", 
            details: err.message
        });
    }
});

// Check deletion status using: GET "/api/businessowner/deletion-status". Login required
router.get('/deletion-status', fetchbusinessowner, async (req, res) => {
    try {
        const DeletionRequest = require('../models/DeletionRequest');
        const businessOwnerId = req.businessowner._id;

        const deletionRequest = await DeletionRequest.findOne({
            userId: businessOwnerId,
            status: { $in: ['pending', 'approved'] }
        });

        if (!deletionRequest) {
            return res.json({
                success: true,
                hasActiveDeletion: false,
                message: 'No active deletion request'
            });
        }

        res.json({
            success: true,
            hasActiveDeletion: true,
            deletionRequest: {
                id: deletionRequest._id,
                status: deletionRequest.status,
                requestDate: deletionRequest.requestDate,
                scheduledDeletionDate: deletionRequest.scheduledDeletionDate
            }
        });
    } catch (err) {
        console.error('Check deletion status error:', err);
        res.status(500).json({ 
            success: false,
            error: "Internal Server error occurred"
        });
    }
});

module.exports = router;

