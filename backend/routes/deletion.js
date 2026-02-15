const express = require('express');
const router = express.Router();
const DeletionRequest = require('../models/DeletionRequest');
const Employee = require('../models/Employee');
const Supplier = require('../models/Supplier');
const BusinessOwner = require('../models/BusinessOwner');
const Notification = require('../models/Notification');
const fetchuser = require('../middleware/fetchuser');
const { cascadeDeleteBusinessOwner } = require('../utils/cascadeDelete');

// Helper function to create notification
const createNotification = async (recipientId, recipientRole, senderId, senderRole, type, title, message, data = {}) => {
    try {
        const notification = new Notification({
            recipient: recipientId,
            recipientRole: recipientRole,
            sender: senderId,
            senderRole: senderRole,
            type: type,
            title: title,
            message: message,
            data: data
        });
        await notification.save();
        return notification;
    } catch (err) {
        // console.error('Error creating notification:', err);
    }
};

// 1. CREATE DELETION REQUEST
// POST "/api/deletion/request" - Employee/Supplier requests account deletion (requires reason)
router.post('/request', fetchuser, async (req, res) => {
    try {
        const { reason } = req.body;
        const userRole = req.role;
        const userId = req.user._id;

        // Get user creator (Business Owner) for employees and suppliers
        let creatorId = null;
        let userData = null;
        if (userRole === 'employee') {
            const employee = await Employee.findById(userId);
            userData = employee;
            creatorId = employee?.businessowner;
        } else if (userRole === 'supplier') {
            const supplier = await Supplier.findById(userId);
            userData = supplier;
            creatorId = supplier?.businessowner;
        }

        // Check if there's already a pending deletion request
        const existingRequest = await DeletionRequest.findOne({
            userId: userId,
            status: { $in: ['pending', 'approved'] }
        });

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                message: 'You already have an active deletion request. Please wait for it to be processed.'
            });
        }

        // Create deletion request
        const deletionRequest = new DeletionRequest({
            userId: userId,
            userEmail: req.user.email,
            userRole: userRole,
            creatorId: creatorId,
            reason: reason || 'No reason provided'
        });

        await deletionRequest.save();

        // Send notification to Business Owner if employee/supplier
        if (creatorId && (userRole === 'employee' || userRole === 'supplier')) {
            const notificationType = userRole === 'employee' ? 'employee_deletion_requested' : 'supplier_deletion_requested';
            const userDisplayName = userData?.fname ? `${userData.fname} ${userData.lname || ''}`.trim() : req.user.email;
            const roleLabel = userRole === 'employee' ? 'Employee' : 'Supplier';

            await createNotification(
                creatorId,
                'BusinessOwner',
                userId,
                userRole.charAt(0).toUpperCase() + userRole.slice(1),
                notificationType,
                `${roleLabel} Account Deletion Request`,
                `${userDisplayName} has requested to delete their ${userRole} account. Action required: Approve or Reject within 7 days.`,
                {
                    deletionRequestId: deletionRequest._id,
                    userRole: userRole,
                    userName: userDisplayName,
                    userEmail: req.user.email,
                    reason: reason || 'No reason provided'
                }
            );
        }

        res.json({
            success: true,
            message: userRole === 'businessowner'
                ? 'Your account deletion has been scheduled. You have 7 days to cancel this request. After that, all your business data will be permanently deleted.'
                : 'Your account deletion request has been sent to your ' + (userRole === 'employee' ? 'manager/Business Owner' : 'Business Owner') + ' for approval.',
            requestId: deletionRequest._id
        });
    } catch (err) {
        // console.error(err);
        res.status(500).json({ success: false, error: "Internal server error occurred" });
    }
});

// 2. CANCEL DELETION REQUEST
// DELETE "/api/deletion/request/:requestId" - Cancel own deletion request
router.delete('/request/:requestId', fetchuser, async (req, res) => {
    try {
        const deletionRequest = await DeletionRequest.findById(req.params.requestId);

        if (!deletionRequest) {
            return res.status(404).json({ success: false, error: "Deletion request not found" });
        }

        // Verify ownership
        if (deletionRequest.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, error: "Access denied" });
        }

        if (deletionRequest.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel a ' + deletionRequest.status + ' deletion request'
            });
        }

        deletionRequest.status = 'cancelled';
        await deletionRequest.save();

        res.json({
            success: true,
            message: 'Account deletion request cancelled successfully'
        });
    } catch (err) {
        // console.error(err);
        res.status(500).json({ success: false, error: "Internal server error occurred" });
    }
});

// 3. GET DELETION REQUESTS FOR BUSINESS OWNER
// GET "/api/deletion/pending-requests" - Business Owner views pending deletion requests from their employees/suppliers
router.get('/pending-requests', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'businessowner') {
            return res.status(403).json({ success: false, error: "Only business owners can view pending deletion requests" });
        }

        const businessOwnerId = req.user._id;

        const pendingRequests = await DeletionRequest.find({
            creatorId: businessOwnerId,
            status: 'pending'
        }).populate('userId', 'email fname lname');

        res.json({
            success: true,
            requests: pendingRequests
        });
    } catch (err) {
        // console.error(err);
        res.status(500).json({ success: false, error: "Internal server error occurred" });
    }
});

// 4. APPROVE DELETION REQUEST
// PUT "/api/deletion/approve/:requestId" - Business Owner approves deletion request
router.put('/approve/:requestId', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'businessowner') {
            return res.status(403).json({ success: false, error: "Only business owners can approve deletion requests" });
        }

        const deletionRequest = await DeletionRequest.findById(req.params.requestId);

        if (!deletionRequest) {
            return res.status(404).json({ success: false, error: "Deletion request not found" });
        }

        // Verify the business owner owns this deletion request
        if (deletionRequest.creatorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, error: "Access denied" });
        }

        if (deletionRequest.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Can only approve pending deletion requests'
            });
        }

        // Set scheduled deletion date based on role
        const scheduledDate = new Date();
        if (deletionRequest.userRole === 'businessowner') {
            // Business Owner: 7-day grace period
            scheduledDate.setDate(scheduledDate.getDate() + 7);
        } else {
            // Employee/Supplier: 72-hour grace period
            scheduledDate.setHours(scheduledDate.getHours() + 72);
        }

        deletionRequest.status = 'approved';
        deletionRequest.approvalDate = new Date();
        deletionRequest.scheduledDeletionDate = scheduledDate;
        await deletionRequest.save();

        // Send notification to user about approval
        const notificationType = deletionRequest.userRole === 'employee' ? 'employee_deletion_approved' : 'supplier_deletion_approved';
        const gracePeriodMessage = deletionRequest.userRole === 'businessowner'
            ? `Your account deletion request has been approved. Your account and all associated business data will be permanently deleted on ${scheduledDate.toLocaleDateString()}. You have 7 days to cancel this request.`
            : `Your account deletion request has been approved. Your account will be permanently deleted on ${scheduledDate.toLocaleDateString()}. You have 72 hours to cancel this request.`;

        await createNotification(
            deletionRequest.userId,
            deletionRequest.userRole.charAt(0).toUpperCase() + deletionRequest.userRole.slice(1),
            req.user._id,
            'BusinessOwner',
            notificationType,
            'Account Deletion Approved',
            gracePeriodMessage,
            {
                deletionRequestId: deletionRequest._id,
                scheduledDeletionDate: scheduledDate
            }
        );

        res.json({
            success: true,
            message: 'Deletion request approved. Account will be deleted in 72 hours.',
            scheduledDeletionDate: scheduledDate
        });
    } catch (err) {
        // console.error(err);
        res.status(500).json({ success: false, error: "Internal server error occurred" });
    }
});

// 5. REJECT DELETION REQUEST
// PUT "/api/deletion/reject/:requestId" - Business Owner rejects deletion request
router.put('/reject/:requestId', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'businessowner') {
            return res.status(403).json({ success: false, error: "Only business owners can reject deletion requests" });
        }

        const { rejectionReason } = req.body;
        const deletionRequest = await DeletionRequest.findById(req.params.requestId);

        if (!deletionRequest) {
            return res.status(404).json({ success: false, error: "Deletion request not found" });
        }

        // Verify the business owner owns this deletion request
        if (deletionRequest.creatorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, error: "Access denied" });
        }

        if (deletionRequest.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Can only reject pending deletion requests'
            });
        }

        deletionRequest.status = 'rejected';
        deletionRequest.rejectionReason = rejectionReason || 'No reason provided';
        await deletionRequest.save();

        // Send notification to user about rejection
        const notificationType = deletionRequest.userRole === 'employee' ? 'employee_deletion_rejected' : 'supplier_deletion_rejected';
        await createNotification(
            deletionRequest.userId,
            deletionRequest.userRole.charAt(0).toUpperCase() + deletionRequest.userRole.slice(1),
            req.user._id,
            'BusinessOwner',
            notificationType,
            'Account Deletion Request Rejected',
            `Your account deletion request has been rejected. Reason: ${rejectionReason || 'No reason provided'}`,
            {
                deletionRequestId: deletionRequest._id,
                rejectionReason: rejectionReason || 'No reason provided'
            }
        );

        res.json({
            success: true,
            message: 'Deletion request rejected successfully'
        });
    } catch (err) {
        // console.error(err);
        res.status(500).json({ success: false, error: "Internal server error occurred" });
    }
});

// 6. GET USER'S DELETION REQUEST STATUS
// GET "/api/deletion/status" - Check status of own deletion request
router.get('/status', fetchuser, async (req, res) => {
    try {
        const deletionRequest = await DeletionRequest.findOne({
            userId: req.user._id,
            status: { $in: ['pending', 'approved'] }
        });

        if (!deletionRequest) {
            return res.json({
                success: true,
                hasRequest: false
            });
        }

        res.json({
            success: true,
            hasRequest: true,
            requestData: {
                status: deletionRequest.status,
                requestDate: deletionRequest.requestDate,
                scheduledDeletionDate: deletionRequest.scheduledDeletionDate,
                approvalDate: deletionRequest.approvalDate,
                reason: deletionRequest.reason
            }
        });
    } catch (err) {
        // console.error(err);
        res.status(500).json({ success: false, error: "Internal server error occurred" });
    }
});

// 7. EXECUTE DELETION (called by cron job or admin)
// DELETE "/api/deletion/execute/:requestId" - Remove user's connectivity to business owner (data preserved)
router.delete('/execute/:requestId', async (req, res) => {
    try {
        const deletionRequest = await DeletionRequest.findById(req.params.requestId);

        if (!deletionRequest) {
            return res.status(404).json({ success: false, error: "Deletion request not found" });
        }

        if (deletionRequest.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Only approved deletion requests can be executed'
            });
        }

        const now = new Date();
        if (now < deletionRequest.scheduledDeletionDate) {
            return res.status(400).json({
                success: false,
                message: 'Deletion is not yet scheduled. Please wait until ' + deletionRequest.scheduledDeletionDate
            });
        }

        let deletionSummary = null;

        // Remove user's connectivity to business owner based on role
        if (deletionRequest.userRole === 'employee') {
            // Remove employee's business owner reference
            await Employee.findByIdAndUpdate(
                deletionRequest.userId,
                { businessowner: null },
                { new: true }
            );
        } else if (deletionRequest.userRole === 'supplier') {
            // Remove supplier's business owner reference
            await Supplier.findByIdAndUpdate(
                deletionRequest.userId,
                { businessowner: null },
                { new: true }
            );
        } else if (deletionRequest.userRole === 'businessowner') {
            // For business owner deletion, cascade delete all associated data
            try {
                deletionSummary = await cascadeDeleteBusinessOwner(deletionRequest.userId);
                
                // After cascade delete, delete the business owner account
                await BusinessOwner.findByIdAndDelete(deletionRequest.userId);
            } catch (err) {
                // console.error('Error in cascade deletion:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Error during cascade deletion: ' + err.message
                });
            }
        }

        // Send completion notification
        if (deletionRequest.userRole !== 'businessowner' && deletionRequest.creatorId) {
            const roleLabel = deletionRequest.userRole === 'employee' ? 'Employee' : 'Supplier';
            await createNotification(
                deletionRequest.creatorId,
                'BusinessOwner',
                deletionRequest.userId,
                deletionRequest.userRole.charAt(0).toUpperCase() + deletionRequest.userRole.slice(1),
                'account_deleted',
                `${roleLabel} Account Disconnected`,
                `The ${deletionRequest.userRole} account (${deletionRequest.userEmail}) has been disconnected from your business. Their data has been preserved and archived.`,
                {
                    deletionRequestId: deletionRequest._id,
                    deletedEmail: deletionRequest.userEmail,
                    userRole: deletionRequest.userRole,
                    reason: 'Account connectivity removed per user request'
                }
            );
        }

        // Mark deletion request as completed
        deletionRequest.status = 'completed';
        await deletionRequest.save();

        const responseMessage = deletionRequest.userRole === 'businessowner'
            ? 'Business Owner account and all associated data have been permanently deleted.'
            : 'Account connectivity removed successfully. User data has been preserved and archived.';

        const response = {
            success: true,
            message: responseMessage
        };

        if (deletionSummary) {
            response.deletionSummary = deletionSummary;
        }

        res.json(response);
    } catch (err) {
        // console.error(err);
        res.status(500).json({ success: false, error: "Internal server error occurred" });
    }
});

module.exports = router;
