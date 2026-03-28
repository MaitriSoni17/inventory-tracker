const express = require('express');
const router = express.Router();
const DeletionRequest = require('../models/DeletionRequest');
const Employee = require('../models/Employee');
const Supplier = require('../models/Supplier');
const Notification = require('../models/Notification');
const fetchuser = require('../middleware/fetchuser');

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
        // req.role may contain custom employee roles; map them to canonical account type.
        const canonicalRole = userRole === 'businessowner' || userRole === 'supplier' ? userRole : 'employee';
        const userId = req.user._id;

        // Get user creator (Business Owner) for employees and suppliers
        let creatorId = null;
        let userData = null;
        if (canonicalRole === 'employee') {
            const employee = await Employee.findById(userId);
            userData = employee;
            creatorId = employee?.businessowner;
        } else if (canonicalRole === 'supplier') {
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
            userRole: canonicalRole,
            creatorId: creatorId,
            reason: reason || 'No reason provided'
        });

        await deletionRequest.save();

        // Send notification to Business Owner if employee/supplier
        if (creatorId && (canonicalRole === 'employee' || canonicalRole === 'supplier')) {
            const notificationType = canonicalRole === 'employee' ? 'employee_deletion_requested' : 'supplier_deletion_requested';
            const userDisplayName = userData?.fname ? `${userData.fname} ${userData.lname || ''}`.trim() : req.user.email;
            const roleLabel = canonicalRole === 'employee' ? 'Employee' : 'Supplier';

            await createNotification(
                creatorId,
                'BusinessOwner',
                userId,
                canonicalRole.charAt(0).toUpperCase() + canonicalRole.slice(1),
                notificationType,
                `${roleLabel} Account Deletion Request`,
                `${userDisplayName} has requested to delete their ${canonicalRole} account. Action required: Approve or Reject within 7 days.`,
                {
                    deletionRequestId: deletionRequest._id,
                    userRole: canonicalRole,
                    userName: userDisplayName,
                    userEmail: req.user.email,
                    reason: reason || 'No reason provided'
                }
            );
        }

        res.json({
            success: true,
            message: canonicalRole === 'businessowner'
                ? 'Your account deletion has been scheduled. You have 7 days to cancel this request. After that, all your business data will be permanently deleted.'
                : 'Your account deletion request has been sent to your ' + (canonicalRole === 'employee' ? 'manager/Business Owner' : 'Business Owner') + ' for approval.',
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

        const canCancelPending = deletionRequest.status === 'pending';
        const canCancelApprovedWithinGrace =
            deletionRequest.status === 'approved' &&
            deletionRequest.scheduledDeletionDate &&
            new Date(deletionRequest.scheduledDeletionDate) > new Date();

        if (!canCancelPending && !canCancelApprovedWithinGrace) {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel a ' + deletionRequest.status + ' deletion request'
            });
        }

        const isEmployeeTypeRole = req.role && req.role !== 'businessowner' && req.role !== 'supplier';
        const requiresOwnerApproval = req.role === 'supplier' || isEmployeeTypeRole;

        if (requiresOwnerApproval) {
            if (deletionRequest.cancellationRequested && deletionRequest.cancellationStatus === 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'A cancellation approval request is already pending with your Business Owner.'
                });
            }

            deletionRequest.cancellationRequested = true;
            deletionRequest.cancellationStatus = 'pending';
            deletionRequest.cancellationRequestDate = new Date();
            await deletionRequest.save();

            const notificationType = deletionRequest.userRole === 'employee'
                ? 'employee_deletion_cancellation_requested'
                : 'supplier_deletion_cancellation_requested';
            const roleLabel = deletionRequest.userRole === 'employee' ? 'Employee' : 'Supplier';

            await createNotification(
                deletionRequest.creatorId,
                'BusinessOwner',
                req.user._id,
                deletionRequest.userRole.charAt(0).toUpperCase() + deletionRequest.userRole.slice(1),
                notificationType,
                `${roleLabel} Deletion Cancellation Request`,
                `${req.user.email} requested to cancel their account deletion request. Please approve or reject this cancellation request.`,
                {
                    deletionRequestId: deletionRequest._id,
                    userRole: deletionRequest.userRole,
                    userEmail: deletionRequest.userEmail,
                    originalDeletionStatus: deletionRequest.status,
                    scheduledDeletionDate: deletionRequest.scheduledDeletionDate
                }
            );

            return res.json({
                success: true,
                message: 'Cancellation request sent to your Business Owner. Access will be restored only after owner approval.'
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
            $or: [
                { status: 'pending' },
                { cancellationRequested: true, cancellationStatus: 'pending' }
            ]
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

        if (deletionRequest.cancellationRequested && deletionRequest.cancellationStatus === 'pending') {
            deletionRequest.status = 'cancelled';
            deletionRequest.cancellationRequested = false;
            deletionRequest.cancellationStatus = 'approved';
            deletionRequest.cancellationApprovalDate = new Date();
            deletionRequest.scheduledDeletionDate = null;
            await deletionRequest.save();

            const notificationType = deletionRequest.userRole === 'employee'
                ? 'employee_deletion_cancellation_approved'
                : 'supplier_deletion_cancellation_approved';
            await createNotification(
                deletionRequest.userId,
                deletionRequest.userRole.charAt(0).toUpperCase() + deletionRequest.userRole.slice(1),
                req.user._id,
                'BusinessOwner',
                notificationType,
                'Deletion Cancellation Approved',
                'Your Business Owner approved your cancellation request. Your account access has been restored.',
                {
                    deletionRequestId: deletionRequest._id
                }
            );

            return res.json({
                success: true,
                message: 'Cancellation approved. User account access has been restored.'
            });
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

        if (deletionRequest.cancellationRequested && deletionRequest.cancellationStatus === 'pending') {
            deletionRequest.cancellationRequested = false;
            deletionRequest.cancellationStatus = 'rejected';
            deletionRequest.cancellationRejectionDate = new Date();
            deletionRequest.cancellationRejectionReason = rejectionReason || 'No reason provided';
            await deletionRequest.save();

            const notificationType = deletionRequest.userRole === 'employee'
                ? 'employee_deletion_cancellation_rejected'
                : 'supplier_deletion_cancellation_rejected';
            await createNotification(
                deletionRequest.userId,
                deletionRequest.userRole.charAt(0).toUpperCase() + deletionRequest.userRole.slice(1),
                req.user._id,
                'BusinessOwner',
                notificationType,
                'Deletion Cancellation Rejected',
                `Your cancellation request was rejected by your Business Owner. Reason: ${rejectionReason || 'No reason provided'}`,
                {
                    deletionRequestId: deletionRequest._id,
                    rejectionReason: rejectionReason || 'No reason provided'
                }
            );

            return res.json({
                success: true,
                message: 'Cancellation request rejected. Deletion process remains active.'
            });
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
                _id: deletionRequest._id,
                status: deletionRequest.status,
                cancellationRequested: deletionRequest.cancellationRequested,
                cancellationStatus: deletionRequest.cancellationStatus,
                cancellationRequestDate: deletionRequest.cancellationRequestDate,
                cancellationApprovalDate: deletionRequest.cancellationApprovalDate,
                cancellationRejectionDate: deletionRequest.cancellationRejectionDate,
                cancellationRejectionReason: deletionRequest.cancellationRejectionReason,
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

module.exports = router;
