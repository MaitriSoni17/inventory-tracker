const express = require('express');
const BusinessOwner = require('../models/BusinessOwner');
const Employee = require('../models/Employee');
const Supplier = require('../models/Supplier');
const Notification = require('../models/Notification');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetchbusinessowner = require('../middleware/fetchbusinessowner');
const { body, validationResult } = require('express-validator');
const { getBusinessOwnerDeletionImpact } = require('../utils/cascadeDelete');

const isValidPhoneNumber = (value) => {
  if (!value) return false;
  const cleanValue = String(value).replace(/[^\d+]/g, '');

  // India: +91 followed by 10 digits, first digit 6,7,8,9
  const indiaRegex = /^\+91[6789]\d{9}$/;

  // USA/Canada: +1 followed by 10 digits, area code not starting with 0 or 1
  const usCanadaRegex = /^\+1[2-9]\d{2}\d{6}$/;

  // UK: +44 followed by 10-11 digits
  // Mobile: +447 followed by 9 digits (11 total)
  // Landline: +44 followed by 10 digits
  const ukMobileRegex = /^\+447\d{9}$/;
  const ukLandlineRegex = /^\+44\d{10}$/;

  // China: +86 followed by 11 digits, mobile starts with 1
  const chinaMobileRegex = /^\+861\d{10}$/;

  // Germany: +49 followed by 10-11 digits
  // Mobile: +49 followed by 10-11 digits starting with 15,16,17
  const germanyMobileRegex = /^\+49(15|16|17)\d{8,9}$/;
  const germanyLandlineRegex = /^\+49\d{10,11}$/;

  // Australia: +61 followed by 9 digits, mobile starts with 4
  const australiaMobileRegex = /^\+614\d{8}$/;
  const australiaLandlineRegex = /^\+61\d{9}$/;

  // Plain 10-digit Indian number (legacy support)
  const plainIndianRegex = /^[6789]\d{9}$/;

  return indiaRegex.test(cleanValue) ||
         usCanadaRegex.test(cleanValue) ||
         ukMobileRegex.test(cleanValue) ||
         ukLandlineRegex.test(cleanValue) ||
         chinaMobileRegex.test(cleanValue) ||
         germanyMobileRegex.test(cleanValue) ||
         germanyLandlineRegex.test(cleanValue) ||
         australiaMobileRegex.test(cleanValue) ||
         australiaLandlineRegex.test(cleanValue) ||
         plainIndianRegex.test(cleanValue);
};

const JWT_SECRET = process.env.JWT_SECRET || 'ThisisaSecretKey';

const createNotification = async (recipientId, recipientRole, senderId, senderRole, type, title, message, data = {}) => {
    try {
        const notification = new Notification({
            recipient: recipientId,
            recipientRole,
            sender: senderId,
            senderRole,
            type,
            title,
            message,
            data
        });
        await notification.save();
        return notification;
    } catch (err) {
        return null;
    }
};

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
router.post('/deactivate', fetchbusinessowner, [
    body('currentPassword', 'Current password is required').isString().notEmpty(),
    body('confirmationText', 'Please type DEACTIVATE MY ACCOUNT exactly').equals('DEACTIVATE MY ACCOUNT')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: errors.array()[0].msg
        });
    }

    try {
        const userId = req.businessowner._id;
        const { currentPassword } = req.body;

        if (req.businessowner.active === false) {
            return res.status(400).json({ success: false, error: 'Account is already deactivated' });
        }

        const passwordMatch = await bcrypt.compare(currentPassword, req.businessowner.password);
        if (!passwordMatch) {
            return res.status(400).json({ success: false, error: 'Current password is incorrect' });
        }

        await BusinessOwner.findByIdAndUpdate(userId, { active: false });

        res.json({
            success: true,
            message: 'Account deactivated successfully. Please login again to reactivate your account.',
            requiresRelogin: true
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Internal Server error occurred' });
    }
});

// Delete Account using: POST "/api/businessowner/delete". Login required
// This endpoint now redirects to the new deletion request workflow
router.post('/delete', fetchbusinessowner, async (req, res) => {
    try {
        const {
            currentPassword,
            confirmationText,
            reason,
            acknowledgeCascade,
            acknowledgeNoRecovery,
            expectedEmail
        } = req.body || {};

        const DeletionRequest = require('../models/DeletionRequest');

        // Validate businessowner is properly authenticated
        if (!req.businessowner || !req.businessowner._id) {
            return res.status(400).json({
                success: false,
                error: 'Invalid authentication. Please login again.'
            });
        }

        const businessOwnerId = req.businessowner._id;
        const businessOwnerEmail = req.businessowner.email;

        if (!currentPassword || typeof currentPassword !== 'string') {
            return res.status(400).json({ success: false, error: 'Current password is required to continue.' });
        }

        const passwordMatch = await bcrypt.compare(currentPassword, req.businessowner.password);
        if (!passwordMatch) {
            return res.status(400).json({ success: false, error: 'Current password is incorrect.' });
        }

        if (confirmationText !== 'DELETE MY ACCOUNT') {
            return res.status(400).json({ success: false, error: 'Please type DELETE MY ACCOUNT exactly to confirm deletion.' });
        }

        if (!reason || String(reason).trim().length < 15) {
            return res.status(400).json({ success: false, error: 'Please provide a deletion reason with at least 15 characters.' });
        }

        if (!acknowledgeCascade || !acknowledgeNoRecovery) {
            return res.status(400).json({ success: false, error: 'Please acknowledge all deletion warnings before continuing.' });
        }

        if (expectedEmail && String(expectedEmail).trim().toLowerCase() !== String(businessOwnerEmail).trim().toLowerCase()) {
            return res.status(400).json({ success: false, error: 'Email confirmation does not match your account email.' });
        }
        
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
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + 7);

        const deletionRequest = new DeletionRequest({
            userId: businessOwnerId,
            userEmail: businessOwnerEmail,
            userRole: 'businessowner',
            status: 'approved',
            approvalDate: new Date(),
            scheduledDeletionDate: scheduledDate,
            reason: String(reason).trim()
        });

        await deletionRequest.save();

        // Notify all linked employees and suppliers that owner deletion was initiated.
        const [employees, suppliers] = await Promise.all([
            Employee.find({ businessowner: businessOwnerId }).select('_id email'),
            Supplier.find({ businessowner: businessOwnerId }).select('_id email')
        ]);

        const notificationTasks = [
            ...employees.map((employee) => createNotification(
                employee._id,
                'Employee',
                businessOwnerId,
                'BusinessOwner',
                'message',
                'Business Owner Deletion Scheduled',
                'Business Owner account deletion has been scheduled in 7 days. Please complete pending work and coordinate any required handover.',
                {
                    deletionRequestId: deletionRequest._id,
                    scheduledDeletionDate: scheduledDate,
                    ownerEmail: businessOwnerEmail,
                    recipientRole: 'employee'
                }
            )),
            ...suppliers.map((supplier) => createNotification(
                supplier._id,
                'Supplier',
                businessOwnerId,
                'BusinessOwner',
                'message',
                'Business Owner Deletion Scheduled',
                'Business Owner account deletion has been scheduled in 7 days. Please review open supplier orders and complete pending coordination.',
                {
                    deletionRequestId: deletionRequest._id,
                    scheduledDeletionDate: scheduledDate,
                    ownerEmail: businessOwnerEmail,
                    recipientRole: 'supplier'
                }
            ))
        ];

        const createdNotifications = await Promise.all(notificationTasks);
        const notificationsSent = createdNotifications.filter(Boolean).length;

        deletionRequest.notificationsSent = notificationsSent;
        await deletionRequest.save();

        res.json({
            success: true,
            message: 'Your account deletion has been scheduled and will execute in 7 days unless you cancel it before then.',
            requestId: deletionRequest._id,
            scheduledDeletionDate: scheduledDate,
            notificationsSent
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            error: "Internal Server error occurred", 
            details: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// Get deletion impact summary using: GET "/api/businessowner/deletion-impact". Login required
router.get('/deletion-impact', fetchbusinessowner, async (req, res) => {
    try {
        const impact = await getBusinessOwnerDeletionImpact(req.businessowner._id);
        res.json({ success: true, impact });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to calculate deletion impact.' });
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
            return res.json({
                success: false,
                message: 'No active deletion request found to cancel.'
            });
        }

        // Notify all linked employees and suppliers that owner deletion was cancelled.
        const [employees, suppliers] = await Promise.all([
            Employee.find({ businessowner: businessOwnerId }).select('_id email'),
            Supplier.find({ businessowner: businessOwnerId }).select('_id email')
        ]);

        const notificationTasks = [
            ...employees.map((employee) => createNotification(
                employee._id,
                'Employee',
                businessOwnerId,
                'BusinessOwner',
                'message',
                'Business Owner Deletion Cancelled',
                'Business Owner has cancelled the account deletion request. Business operations will continue as normal.',
                {
                    deletionRequestId: deletionRequest._id,
                    ownerEmail: req.businessowner.email,
                    recipientRole: 'employee'
                }
            )),
            ...suppliers.map((supplier) => createNotification(
                supplier._id,
                'Supplier',
                businessOwnerId,
                'BusinessOwner',
                'message',
                'Business Owner Deletion Cancelled',
                'Business Owner has cancelled the account deletion request. Business operations will continue as normal.',
                {
                    deletionRequestId: deletionRequest._id,
                    ownerEmail: req.businessowner.email,
                    recipientRole: 'supplier'
                }
            ))
        ];

        const createdNotifications = await Promise.all(notificationTasks);
        const notificationsSent = createdNotifications.filter(Boolean).length;

        // console.log('Deletion request cancelled:', deletionRequest._id);

        res.json({
            success: true,
            message: 'Your deletion request has been cancelled successfully.',
            notificationsSent
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

