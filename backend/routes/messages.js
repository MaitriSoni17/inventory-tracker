const express = require('express');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser');
const Message = require('../models/Message');
const Employee = require('../models/Employee');
const BusinessOwner = require('../models/BusinessOwner');
const Supplier = require('../models/Supplier');
const RolePermissions = require('../models/RolePermissions');
const { notifyAboutNewMessage, notifyAboutEditedMessage } = require('../utils/notificationHelper');

/**
 * Helper function to check if user has messaging permission
 */
const hasMessagingPermission = async (userId, userRole, businessOwnerId, permission) => {
    try {
        if (userRole === 'businessowner') {
            // Business owners always have messaging permissions
            return true;
        }

        if (userRole === 'supplier') {
            // Check if supplier has messaging permission
            const supplier = await Supplier.findById(userId);
            if (!supplier) return false;
            return supplier.canMessage === true;
        }

        // For employees, check role-based permissions
        const employee = await Employee.findById(userId);
        if (!employee) return false;

        // First check individual permissions if they exist
        if (employee.hasCustomPermissions) {
            return employee.permissions?.[permission] !== false;
        }

        // Otherwise check role permissions
        const rolePerms = await RolePermissions.findOne({ businessowner: businessOwnerId });
        if (!rolePerms) return true; // Allow if no role perms set up yet

        // Check built-in role permissions first
        let rolePermissions = rolePerms[employee.role];
        
        // If not a built-in role, check customRoles Map
        if (!rolePermissions && rolePerms.customRoles && rolePerms.customRoles.has(employee.role)) {
            rolePermissions = rolePerms.customRoles.get(employee.role);
        }
        
        return rolePermissions?.[permission] !== false;
    } catch (error) {
        // console.error('Error checking messaging permission:', error);
        return false;
    }
};

/**
 * Helper to populate sender details
 */
const populateSenderDetails = async (message) => {
    try {
        if (message.senderRole === 'BusinessOwner') {
            message.sender = await BusinessOwner.findById(message.sender).select('fname lname email');
        } else if (message.senderRole === 'Employee') {
            message.sender = await Employee.findById(message.sender).select('fname lname email role');
        } else if (message.senderRole === 'Supplier') {
            message.sender = await Supplier.findById(message.sender).select('fname lname email');
        }
    } catch (error) {
        // console.error('Error populating sender:', error);
    }
    return message;
};

/**
 * Helper to populate recipient details
 */
const populateRecipientDetails = async (message) => {
    try {
        if (message.recipientRole === 'BusinessOwner') {
            message.recipient = await BusinessOwner.findById(message.recipient).select('fname lname email');
        } else if (message.recipientRole === 'Employee') {
            message.recipient = await Employee.findById(message.recipient).select('fname lname email role');
        } else if (message.recipientRole === 'Supplier') {
            message.recipient = await Supplier.findById(message.recipient).select('fname lname email');
        }
    } catch (error) {
        // console.error('Error populating recipient:', error);
    }
    return message;
};

// ==================== GET ROUTES ====================

/**
 * Get messaging contacts for employees (business owner + same-warehouse colleagues)
 * GET /api/messages/contacts
 */
router.get('/contacts', fetchuser, async (req, res) => {
    try {
        // Business owners use the employee/supplier routes directly
        if (req.role === 'businessowner') {
            return res.status(400).json({ error: 'Business owners should use employee/supplier routes' });
        }

        // Suppliers can only message their BO
        if (req.role === 'supplier') {
            const supplier = await Supplier.findById(req.user._id);
            if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
            const bo = await BusinessOwner.findById(supplier.businessowner).select('fname lname email');
            return res.json({ businessOwner: bo, colleagues: [] });
        }

        // For employees/managers/supervisors
        const employee = await Employee.findById(req.user._id).populate('warehouse', '_id wName');
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        // Only include business owner if employee has send messages permission
        let bo = null;
        const canSendMessages = await hasMessagingPermission(
            req.user._id, req.role, req.businessowner, 'canSendMessages'
        );
        if (canSendMessages) {
            bo = await BusinessOwner.findById(employee.businessowner).select('fname lname email');
        }

        // Get colleagues (same warehouse) if permitted
        let colleagues = [];
        const canMsgColleagues = await hasMessagingPermission(
            req.user._id, req.role, req.businessowner, 'canMessageColleagues'
        );

        if (canMsgColleagues && employee.warehouse) {
            colleagues = await Employee.find({
                businessowner: employee.businessowner,
                warehouse: employee.warehouse._id,
                _id: { $ne: req.user._id } // Exclude self
            }).select('fname lname email role').lean();
        }

        res.json({ businessOwner: bo, colleagues });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching contacts' });
    }
});

/**
 * Get conversation with a specific user
 * GET /api/messages/conversation/:userId/:userRole
 */
router.get('/conversation/:userId/:userRole', fetchuser, async (req, res) => {
    try {
        const { userId, userRole } = req.params;
        const currentUserId = req.user._id;
        // Map all employee types (employee, manager, supervisor) to 'Employee' role
        const currentUserRole = req.role === 'businessowner' ? 'BusinessOwner' : 
                                req.role === 'supplier' ? 'Supplier' : 'Employee';

        // Check permission
        const hasPermission = await hasMessagingPermission(
            currentUserId, 
            req.role, 
            req.businessowner, 
            'canViewMessages'
        );

        if (!hasPermission) {
            return res.status(403).json({ error: 'You do not have permission to view messages' });
        }

        // Suppliers can only view conversations with their Business Owner
        if (req.role === 'supplier' && userRole !== 'BusinessOwner') {
            return res.status(403).json({ error: 'Suppliers can only communicate with their Business Owner' });
        }

        // Check if employee has permission to message suppliers
        if (req.role !== 'businessowner' && req.role !== 'supplier' && userRole === 'Supplier') {
            const canMsgSuppliers = await hasMessagingPermission(
                currentUserId, req.role, req.businessowner, 'canMessageSuppliers'
            );
            if (!canMsgSuppliers) {
                return res.status(403).json({ error: 'You do not have permission to message suppliers' });
            }
        }

        // Get messages between two users
        let messages = await Message.find({
            $or: [
                { sender: currentUserId, recipient: userId, senderRole: currentUserRole, recipientRole: userRole },
                { sender: userId, recipient: currentUserId, senderRole: userRole, recipientRole: currentUserRole }
            ],
            businessowner: req.businessowner,
            deletedBySender: false,
            deletedByRecipient: false
        })
        .populate({
            path: 'sender',
            select: 'fname lname email _id'
        })
        .populate({
            path: 'recipient',
            select: 'fname lname email _id'
        })
        .sort({ createdAt: 1 })
        .limit(50);

        // Mark messages as read
        await Message.updateMany(
            {
                recipient: currentUserId,
                sender: userId,
                isRead: false
            },
            { isRead: true, readAt: new Date() }
        );

        // Messages are already populated by .populate() above
        res.json({ success: true, messages });
    } catch (error) {
        // console.error('Error fetching conversation:', error);
        res.status(500).json({ error: 'Error fetching conversation' });
    }
});

/**
 * Get all conversations (list of users user has messaged)
 * GET /api/messages/conversations
 */
router.get('/conversations', fetchuser, async (req, res) => {
    try {
        const userId = req.user._id;
        // Map all employee types (employee, manager, supervisor) to 'Employee' role
        const userRole = req.role === 'businessowner' ? 'BusinessOwner' : 
                        req.role === 'supplier' ? 'Supplier' : 'Employee';

        // Check permission
        const hasPermission = await hasMessagingPermission(
            userId, 
            req.role, 
            req.businessowner, 
            'canViewMessages'
        );

        if (!hasPermission) {
            return res.status(403).json({ error: 'You do not have permission to view messages' });
        }

        // Get unique conversations
        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { sender: userId, senderRole: userRole },
                        { recipient: userId, recipientRole: userRole }
                    ],
                    businessowner: req.businessowner,
                    $nor: [
                        { deletedBySender: true, sender: userId },
                        { deletedByRecipient: true, recipient: userId }
                    ]
                }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ['$sender', userId] },
                            { userId: '$recipient', role: '$recipientRole' },
                            { userId: '$sender', role: '$senderRole' }
                        ]
                    },
                    lastMessage: { $last: '$content' },
                    lastMessageTime: { $last: '$createdAt' },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $eq: ['$recipient', userId] },
                                    { $eq: ['$isRead', false] }
                                ]},
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { lastMessageTime: -1 } }
        ]);

        // Populate user details
        const populatedConversations = await Promise.all(conversations.map(async (conv) => {
            let userDetails;
            if (conv._id.role === 'BusinessOwner') {
                userDetails = await BusinessOwner.findById(conv._id.userId).select('fname lname email');
            } else if (conv._id.role === 'Employee') {
                userDetails = await Employee.findById(conv._id.userId).select('fname lname email role');
            } else if (conv._id.role === 'Supplier') {
                userDetails = await Supplier.findById(conv._id.userId).select('fname lname email');
            }

            return {
                userId: conv._id.userId,
                userRole: conv._id.role,
                userDetails,
                lastMessage: conv.lastMessage,
                lastMessageTime: conv.lastMessageTime,
                unreadCount: conv.unreadCount
            };
        }));

        res.json({ success: true, conversations: populatedConversations });
    } catch (error) {
        // console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Error fetching conversations' });
    }
});

/**
 * Check if supplier has messaging permission
 * GET /api/messages/supplier/check-permission
 */
router.get('/supplier/check-permission', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'supplier') {
            return res.json({ canMessage: true }); // Non-suppliers always have messaging access
        }

        const supplier = await Supplier.findById(req.user._id);
        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        // Get the business owner details for the supplier to message
        const businessOwner = await BusinessOwner.findById(supplier.businessowner).select('fname lname email');

        res.json({ 
            canMessage: supplier.canMessage || false,
            businessOwner: businessOwner ? {
                _id: businessOwner._id,
                fname: businessOwner.fname,
                lname: businessOwner.lname,
                email: businessOwner.email
            } : null
        });
    } catch (error) {
        // console.error('Error checking messaging permission:', error);
        res.status(500).json({ error: 'Error checking messaging permission' });
    }
});

// ==================== POST ROUTES ====================

/**
 * Send a message
 * POST /api/messages/send
 */
router.post('/send', fetchuser, async (req, res) => {
    try {
        const { recipientId, recipientRole, content, attachment } = req.body;

        // Validate input
        if (!recipientId || !recipientRole || !content) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!['BusinessOwner', 'Employee', 'Supplier'].includes(recipientRole)) {
            return res.status(400).json({ error: 'Invalid recipient role' });
        }

        // Check sender permission
        const hasPermission = await hasMessagingPermission(
            req.user._id,
            req.role,
            req.businessowner,
            'canSendMessages'
        );

        if (!hasPermission) {
            return res.status(403).json({ error: 'You do not have permission to send messages' });
        }

        // Suppliers can only message their Business Owner
        if (req.role === 'supplier') {
            if (recipientRole !== 'BusinessOwner') {
                return res.status(403).json({ error: 'Suppliers can only communicate with their Business Owner' });
            }
            // Verify the recipient is this supplier's business owner
            const supplier = await Supplier.findById(req.user._id);
            if (!supplier || supplier.businessowner.toString() !== recipientId) {
                return res.status(403).json({ error: 'You can only message your own Business Owner' });
            }
        }

        // Check if employee-type role has permission to message suppliers
        if (req.role !== 'businessowner' && req.role !== 'supplier' && recipientRole === 'Supplier') {
            const canMsgSuppliers = await hasMessagingPermission(
                req.user._id, req.role, req.businessowner, 'canMessageSuppliers'
            );
            if (!canMsgSuppliers) {
                return res.status(403).json({ error: 'You do not have permission to message suppliers' });
            }
        }

        // Check if employee-type role has permission to message colleagues
        if (req.role !== 'businessowner' && req.role !== 'supplier' && recipientRole === 'Employee') {
            const canMsgColleagues = await hasMessagingPermission(
                req.user._id, req.role, req.businessowner, 'canMessageColleagues'
            );
            if (!canMsgColleagues) {
                return res.status(403).json({ error: 'You do not have permission to message colleagues' });
            }
        }

        // Validate recipient exists
        const recipientModel = recipientRole === 'BusinessOwner' ? BusinessOwner :
                               recipientRole === 'Employee' ? Employee : Supplier;
        const recipient = await recipientModel.findById(recipientId);

        if (!recipient) {
            return res.status(404).json({ error: 'Recipient not found' });
        }

        // Create message
        const message = new Message({
            sender: req.user._id,
            // Map all employee types (employee, manager, supervisor) to 'Employee' role
            senderRole: req.role === 'businessowner' ? 'BusinessOwner' : 
                       req.role === 'supplier' ? 'Supplier' : 'Employee',
            recipient: recipientId,
            recipientRole,
            content: content.trim(),
            attachment: attachment || null,
            businessowner: req.businessowner,
            isRead: false
        });

        await message.save();

        // Populate sender and recipient details
        await message.populate({
            path: 'sender',
            select: 'fname lname email _id'
        });
        await message.populate({
            path: 'recipient',
            select: 'fname lname email _id'
        });

        // Create notification for recipient
        const senderName = `${req.user.fname || ''} ${req.user.lname || ''}`.trim() || 'User';
        await notifyAboutNewMessage(
            recipientId,
            recipientRole,
            req.user._id,
            req.role === 'businessowner' ? 'BusinessOwner' : 
            req.role === 'supplier' ? 'Supplier' : 'Employee',
            senderName,
            content,
            req.businessowner
        );

        res.json({ success: true, message });
    } catch (error) {
        // console.error('Error sending message:', error);
        res.status(500).json({ error: 'Error sending message' });
    }
});

// ==================== PUT ROUTES ====================

/**
 * Edit message content
 * PUT /api/messages/:messageId
 */
router.put('/:messageId', fetchuser, async (req, res) => {
    try {
        const { content } = req.body;

        // Validate content
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Message content cannot be empty' });
        }

        const message = await Message.findById(req.params.messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Check permission
        const hasPermission = await hasMessagingPermission(
            req.user._id,
            req.role,
            req.businessowner,
            'canDeleteMessages'
        );

        if (!hasPermission) {
            return res.status(403).json({ error: 'You do not have permission to edit messages' });
        }

        // Only sender can edit the message
        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to edit this message' });
        }

        // Only allow editing if message is not deleted
        if (message.deletedBySender || message.deletedByRecipient) {
            return res.status(403).json({ error: 'Cannot edit a deleted message' });
        }

        // Check if message was sent within 10 minutes
        const currentTime = new Date();
        const messageCreatedTime = new Date(message.createdAt);
        const timeDifferenceMinutes = (currentTime - messageCreatedTime) / (1000 * 60);
        
        if (timeDifferenceMinutes > 10) {
            return res.status(403).json({ error: 'Messages can only be edited within 10 minutes of sending' });
        }

        const trimmedContent = content.trim();

        // No-op if content is unchanged; do not mark as edited
        if (message.content === trimmedContent) {
            await message.populate([
                { path: 'sender', select: 'fname lname email _id' },
                { path: 'recipient', select: 'fname lname email _id' }
            ]);
            return res.json({ success: true, message });
        }

        // Update the message and explicitly mark as edited
        message.content = trimmedContent;
        message.isEdited = true;
        message.updatedAt = new Date();
        await message.save();

        const senderName = `${req.user.fname || ''} ${req.user.lname || ''}`.trim() || 'User';
        await notifyAboutEditedMessage(
            message.recipient,
            message.recipientRole,
            message.sender,
            message.senderRole,
            senderName,
            trimmedContent,
            req.businessowner
        );

        // Populate sender and recipient details
        await message.populate([
            { path: 'sender', select: 'fname lname email _id' },
            { path: 'recipient', select: 'fname lname email _id' }
        ]);

        res.json({ success: true, message });
    } catch (error) {
        // console.error('Error editing message:', error);
        res.status(500).json({ error: 'Error editing message' });
    }
});

// ==================== DELETE ROUTES ====================

/**
 * Delete message (soft delete for sender)
 * DELETE /api/messages/:messageId
 */
router.delete('/:messageId', fetchuser, async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Check permission
        const hasPermission = await hasMessagingPermission(
            req.user._id,
            req.role,
            req.businessowner,
            'canDeleteMessages'
        );

        if (!hasPermission) {
            return res.status(403).json({ error: 'You do not have permission to delete messages' });
        }

        // Check if user is sender or recipient
        const isSender = message.sender.toString() === req.user._id.toString();
        const isRecipient = message.recipient.toString() === req.user._id.toString();

        if (!isSender && !isRecipient) {
            return res.status(403).json({ error: 'Not authorized to delete this message' });
        }

        // Business rule: sender cannot delete message after receiver has seen it.
        if (isSender && message.isRead) {
            return res.status(403).json({ error: 'Message cannot be deleted after receiver has seen it' });
        }

        if (isSender) {
            message.deletedBySender = true;
        } else {
            message.deletedByRecipient = true;
        }

        // If both deleted, remove from database
        if (message.deletedBySender && message.deletedByRecipient) {
            await Message.deleteOne({ _id: message._id });
        } else {
            await message.save();
        }

        res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
        // console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Error deleting message' });
    }
});

module.exports = router;
