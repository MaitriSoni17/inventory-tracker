const express = require('express');
const BusinessOwner = require('../models/BusinessOwner');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetchbusinessowner = require('../middleware/fetchbusinessowner');
const { body, validationResult } = require('express-validator');

const isValidPhoneNumber = (value) => /^\d{10}$/.test(String(value || '').replace(/\D/g, ''));

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
    body('phone').optional({ checkFalsy: true }).custom((value) => {
        if (!isValidPhoneNumber(value)) {
            throw new Error('Enter a valid 10-digit phone number');
        }
        return true;
    }),
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
            // console.error('No businessowner in request');
            return res.status(400).json({
                success: false,
                error: 'Invalid authentication. Please login again.'
            });
        }

        const businessOwnerId = req.businessowner._id;
        const businessOwnerEmail = req.businessowner.email;
        
        // Validate email exists
        if (!businessOwnerEmail) {
            // console.error('Business owner email not found for id:', businessOwnerId);
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
        // console.error('Delete account error:', err);
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
        // console.error('Cancel deletion error:', err);
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
        // console.error('Check deletion status error:', err);
        res.status(500).json({ 
            success: false,
            error: "Internal Server error occurred"
        });
    }
});

module.exports = router;

