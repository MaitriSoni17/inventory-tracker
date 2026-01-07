const express = require('express');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser');
const ChatMessage = require('../models/ChatMessage');
const ChatPermission = require('../models/ChatPermission');
const Notification = require('../models/Notification');
const Employee = require('../models/Employee');
const BusinessOwner = require('../models/BusinessOwner');
const Supplier = require('../models/Supplier');

// Helper function to get user's full name
const getUserName = (user) => {
    return `${user.fname || ''} ${user.lname || ''}`.trim() || user.email;
};

// Helper function to capitalize role for consistent storage
const capitalizeRole = (role) => {
    if (role === 'businessowner') return 'BusinessOwner';
    if (role === 'employee' || role === 'supervisor' || role === 'manager') return 'Employee';
    if (role === 'supplier') return 'Supplier';
    return role;
};

// Helper function to get business owner ID for the current user
const getBusinessOwnerId = async (user, role) => {
    if (role === 'businessowner') {
        return user._id;
    } else if (['employee', 'supervisor', 'manager'].includes(role)) {
        return user.businessowner;
    } else if (role === 'supplier') {
        return user.businessowner;
    }
    return null;
};

// ========================
// CHAT PERMISSION ROUTES
// ========================

// Get all users available for chat permissions (BusinessOwner only)
// GET /api/chat/users
router.get('/users', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: 'Only business owners can access this' });
        }

        const businessOwnerId = req.user._id;

        // Get all employees under this business owner
        const employees = await Employee.find({ businessowner: businessOwnerId })
            .select('fname lname email role image');

        // Get all suppliers under this business owner
        const suppliers = await Supplier.find({ businessowner: businessOwnerId, isActive: true })
            .select('fname lname email role image companyName');

        // Format users for response
        const formattedUsers = [
            // Add business owner themselves
            {
                _id: req.user._id,
                name: getUserName(req.user),
                email: req.user.email,
                role: 'BusinessOwner',
                displayRole: 'Business Owner',
                image: req.user.image
            },
            // Add employees
            ...employees.map(emp => ({
                _id: emp._id,
                name: getUserName(emp),
                email: emp.email,
                role: 'Employee',
                displayRole: emp.role.charAt(0).toUpperCase() + emp.role.slice(1),
                image: emp.image
            })),
            // Add suppliers
            ...suppliers.map(sup => ({
                _id: sup._id,
                name: getUserName(sup),
                email: sup.email,
                role: 'Supplier',
                displayRole: 'Supplier',
                companyName: sup.companyName,
                image: sup.image
            }))
        ];

        res.json({ users: formattedUsers });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
});

// Get all chat permissions (BusinessOwner only)
// GET /api/chat/permissions
router.get('/permissions', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: 'Only business owners can access this' });
        }

        const permissions = await ChatPermission.find({ businessOwner: req.user._id })
            .sort({ createdAt: -1 });

        res.json({ permissions });
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({ error: 'Error fetching permissions' });
    }
});

// Create or update chat permission (BusinessOwner only)
// POST /api/chat/permissions
router.post('/permissions', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: 'Only business owners can manage permissions' });
        }

        const { userId, userRole, userName, allowedUserId, allowedUserRole, allowedUserName, isActive } = req.body;

        if (!userId || !userRole || !allowedUserId || !allowedUserRole) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if permission already exists
        let permission = await ChatPermission.findOne({
            user: userId,
            allowedUser: allowedUserId,
            businessOwner: req.user._id
        });

        if (permission) {
            // Update existing permission
            permission.isActive = isActive !== undefined ? isActive : true;
            permission.updatedAt = Date.now();
            await permission.save();
        } else {
            // Create new permission
            permission = new ChatPermission({
                user: userId,
                userRole,
                userName,
                allowedUser: allowedUserId,
                allowedUserRole,
                allowedUserName,
                businessOwner: req.user._id,
                isActive: isActive !== undefined ? isActive : true
            });
            await permission.save();
        }

        res.json({ success: true, permission });
    } catch (error) {
        console.error('Error creating/updating permission:', error);
        res.status(500).json({ error: 'Error managing permission' });
    }
});

// Batch update chat permissions (BusinessOwner only)
// POST /api/chat/permissions/batch
router.post('/permissions/batch', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: 'Only business owners can manage permissions' });
        }

        const { permissions } = req.body;

        if (!Array.isArray(permissions)) {
            return res.status(400).json({ error: 'Permissions must be an array' });
        }

        const results = [];
        for (const perm of permissions) {
            const { userId, userRole, userName, allowedUserId, allowedUserRole, allowedUserName, isActive } = perm;

            // Update or create permission
            const result = await ChatPermission.findOneAndUpdate(
                { user: userId, allowedUser: allowedUserId, businessOwner: req.user._id },
                {
                    user: userId,
                    userRole,
                    userName,
                    allowedUser: allowedUserId,
                    allowedUserRole,
                    allowedUserName,
                    businessOwner: req.user._id,
                    isActive: isActive !== undefined ? isActive : true,
                    updatedAt: Date.now()
                },
                { upsert: true, new: true }
            );
            results.push(result);
        }

        res.json({ success: true, count: results.length });
    } catch (error) {
        console.error('Error batch updating permissions:', error);
        res.status(500).json({ error: 'Error updating permissions' });
    }
});

// Delete chat permission (BusinessOwner only)
// DELETE /api/chat/permissions/:id
router.delete('/permissions/:id', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: 'Only business owners can delete permissions' });
        }

        const permission = await ChatPermission.findOneAndDelete({
            _id: req.params.id,
            businessOwner: req.user._id
        });

        if (!permission) {
            return res.status(404).json({ error: 'Permission not found' });
        }

        res.json({ success: true, message: 'Permission deleted' });
    } catch (error) {
        console.error('Error deleting permission:', error);
        res.status(500).json({ error: 'Error deleting permission' });
    }
});

// ========================
// CHAT MESSAGE ROUTES
// ========================

// Get all users the current user can chat with
// GET /api/chat/contacts
router.get('/contacts', fetchuser, async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = capitalizeRole(req.role);
        const businessOwnerId = await getBusinessOwnerId(req.user, req.role);

        if (!businessOwnerId) {
            return res.status(400).json({ error: 'Could not determine business owner' });
        }

        // Find all permissions where this user is allowed to chat
        const permissions = await ChatPermission.find({
            allowedUser: userId,
            businessOwner: businessOwnerId,
            isActive: true
        });

        // Get unique user IDs that this user can contact
        const contacts = permissions.map(perm => ({
            _id: perm.user,
            name: perm.userName,
            role: perm.userRole
        }));

        // Get unread message counts for each contact
        const contactsWithUnread = await Promise.all(
            contacts.map(async (contact) => {
                const unreadCount = await ChatMessage.countDocuments({
                    sender: contact._id,
                    recipient: userId,
                    isRead: false
                });

                // Get last message
                const lastMessage = await ChatMessage.findOne({
                    $or: [
                        { sender: userId, recipient: contact._id },
                        { sender: contact._id, recipient: userId }
                    ]
                }).sort({ createdAt: -1 });

                return {
                    ...contact,
                    unreadCount,
                    lastMessage: lastMessage ? {
                        message: lastMessage.message,
                        createdAt: lastMessage.createdAt,
                        isFromMe: lastMessage.sender.toString() === userId.toString()
                    } : null
                };
            })
        );

        // Sort by last message time
        contactsWithUnread.sort((a, b) => {
            if (!a.lastMessage && !b.lastMessage) return 0;
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
        });

        res.json({ contacts: contactsWithUnread });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ error: 'Error fetching contacts' });
    }
});

// Get conversation with a specific user
// GET /api/chat/conversation/:userId
router.get('/conversation/:userId', fetchuser, async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const otherUserId = req.params.userId;
        const businessOwnerId = await getBusinessOwnerId(req.user, req.role);

        if (!businessOwnerId) {
            return res.status(400).json({ error: 'Could not determine business owner' });
        }

        // Check if user has permission to chat with this user
        const hasPermission = await ChatPermission.findOne({
            user: otherUserId,
            allowedUser: currentUserId,
            businessOwner: businessOwnerId,
            isActive: true
        });

        if (!hasPermission) {
            return res.status(403).json({ error: 'You do not have permission to chat with this user' });
        }

        // Get messages between the two users
        const messages = await ChatMessage.find({
            $or: [
                { sender: currentUserId, recipient: otherUserId },
                { sender: otherUserId, recipient: currentUserId }
            ],
            businessOwner: businessOwnerId
        }).sort({ createdAt: 1 });

        // Mark messages from other user as read
        await ChatMessage.updateMany(
            {
                sender: otherUserId,
                recipient: currentUserId,
                isRead: false
            },
            {
                isRead: true,
                readAt: Date.now()
            }
        );

        res.json({ messages });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({ error: 'Error fetching conversation' });
    }
});

// Send a message
// POST /api/chat/send
router.post('/send', fetchuser, async (req, res) => {
    try {
        const { recipientId, message } = req.body;

        if (!recipientId || !message || !message.trim()) {
            return res.status(400).json({ error: 'Recipient and message are required' });
        }

        const senderId = req.user._id;
        const senderRole = capitalizeRole(req.role);
        const senderName = getUserName(req.user);
        const businessOwnerId = await getBusinessOwnerId(req.user, req.role);

        if (!businessOwnerId) {
            return res.status(400).json({ error: 'Could not determine business owner' });
        }

        // Check if sender has permission to chat with recipient
        const hasPermission = await ChatPermission.findOne({
            user: recipientId,
            allowedUser: senderId,
            businessOwner: businessOwnerId,
            isActive: true
        });

        if (!hasPermission) {
            return res.status(403).json({ error: 'You do not have permission to chat with this user' });
        }

        // Get recipient details
        let recipient;
        let recipientRole = hasPermission.userRole;
        if (recipientRole === 'BusinessOwner') {
            recipient = await BusinessOwner.findById(recipientId);
        } else if (recipientRole === 'Employee') {
            recipient = await Employee.findById(recipientId);
        } else if (recipientRole === 'Supplier') {
            recipient = await Supplier.findById(recipientId);
        }

        if (!recipient) {
            return res.status(404).json({ error: 'Recipient not found' });
        }

        const recipientName = getUserName(recipient);

        // Create the message
        const chatMessage = new ChatMessage({
            sender: senderId,
            senderRole,
            senderName,
            recipient: recipientId,
            recipientRole,
            recipientName,
            message: message.trim(),
            businessOwner: businessOwnerId
        });

        await chatMessage.save();

        // Create notification for recipient
        const notification = new Notification({
            recipient: recipientId,
            recipientRole,
            sender: senderId,
            senderRole,
            type: 'chat_message',
            title: 'New Message',
            message: `${senderName} sent you a message`,
            data: {
                senderId: senderId,
                senderName: senderName,
                messagePreview: message.substring(0, 50) + (message.length > 50 ? '...' : '')
            }
        });

        await notification.save();

        res.json({ success: true, message: chatMessage });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Error sending message' });
    }
});

// Get unread message count
// GET /api/chat/unreadcount
router.get('/unreadcount', fetchuser, async (req, res) => {
    try {
        const userId = req.user._id;

        const count = await ChatMessage.countDocuments({
            recipient: userId,
            isRead: false
        });

        res.json({ unreadCount: count });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Error fetching unread count' });
    }
});

// Mark messages as read
// PUT /api/chat/markread/:senderId
router.put('/markread/:senderId', fetchuser, async (req, res) => {
    try {
        const userId = req.user._id;
        const senderId = req.params.senderId;

        await ChatMessage.updateMany(
            {
                sender: senderId,
                recipient: userId,
                isRead: false
            },
            {
                isRead: true,
                readAt: Date.now()
            }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: 'Error marking messages as read' });
    }
});

// Delete a message (sender only)
// DELETE /api/chat/message/:id
router.delete('/message/:id', fetchuser, async (req, res) => {
    try {
        const userId = req.user._id;
        const messageId = req.params.id;

        const message = await ChatMessage.findOne({
            _id: messageId,
            sender: userId
        });

        if (!message) {
            return res.status(404).json({ error: 'Message not found or you cannot delete it' });
        }

        await ChatMessage.findByIdAndDelete(messageId);

        res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Error deleting message' });
    }
});

module.exports = router;
