const express = require('express');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser');
const Notification = require('../models/Notification');
const Employee = require('../models/Employee');
const BusinessOwner = require('../models/BusinessOwner');
const Supplier = require('../models/Supplier');

// Helper function to populate sender based on role
async function populateSenderData(notifications) {
  for (let notification of notifications) {
    if (notification.senderRole === 'BusinessOwner') {
      notification.sender = await BusinessOwner.findById(notification.sender).select('fname lname email');
    } else if (notification.senderRole === 'Employee') {
      notification.sender = await Employee.findById(notification.sender).select('fname lname email');
    } else if (notification.senderRole === 'Supplier') {
      notification.sender = await Supplier.findById(notification.sender).select('fname lname email phone');
    }
  }
  return notifications;
}

// Get all notifications for current user
// GET /api/notifications/getnotifications
router.get('/getnotifications', fetchuser, async (req, res) => {
  try {
    const userId = req.user._id;
    // Map lowercase role to capitalized role for notification query
    const capitalizedRole = req.role === 'businessowner' ? 'BusinessOwner' : 
                            ['employee', 'manager', 'supervisor'].includes(req.role) ? 'Employee' :
                            req.role === 'supplier' ? 'Supplier' : req.role;

    let notifications = await Notification.find({
      recipient: userId,
      recipientRole: capitalizedRole
    })
      .sort({ createdAt: -1 })
      .limit(50);

    // Populate sender data based on role
    notifications = await populateSenderData(notifications);


    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Error fetching notifications' });
  }
});

// Get unread notification count
// GET /api/notifications/unreadcount
router.get('/unreadcount', fetchuser, async (req, res) => {
  try {
    const userId = req.user._id;
    // Map lowercase role to capitalized role
    const capitalizedRole = req.role === 'businessowner' ? 'BusinessOwner' : 
                            ['employee', 'manager', 'supervisor'].includes(req.role) ? 'Employee' :
                            req.role === 'supplier' ? 'Supplier' : req.role;

    const count = await Notification.countDocuments({
      recipient: userId,
      recipientRole: capitalizedRole,
      isRead: false
    });

    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Error fetching unread count' });
  }
});

// Mark notification as read
// PUT /api/notifications/markasread/:id
router.put('/markasread/:id', fetchuser, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user._id;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.recipient.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    notification.isRead = true;
    await notification.save();

    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Error marking notification as read' });
  }
});

// Mark all notifications as read
// PUT /api/notifications/markallasread
router.put('/markallasread', fetchuser, async (req, res) => {
  try {
    const userId = req.user._id;
    // Map lowercase role to capitalized role
    const capitalizedRole = req.role === 'businessowner' ? 'BusinessOwner' : 
                            ['employee', 'manager', 'supervisor'].includes(req.role) ? 'Employee' :
                            req.role === 'supplier' ? 'Supplier' : req.role;

    await Notification.updateMany(
      {
        recipient: userId,
        recipientRole: capitalizedRole,
        isRead: false
      },
      { isRead: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Error marking all notifications as read' });
  }
});

// Delete a notification
// DELETE /api/notifications/deletenotification/:id
router.delete('/deletenotification/:id', fetchuser, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user._id;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.recipient.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Notification.deleteOne({ _id: notificationId });

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Error deleting notification' });
  }
});

// Delete all notifications for current user
// DELETE /api/notifications/deleteallnotifications
router.delete('/deleteallnotifications', fetchuser, async (req, res) => {
  try {
    const userId = req.user._id;
    // Map lowercase role to capitalized role
    const capitalizedRole = req.role === 'businessowner' ? 'BusinessOwner' : 
                            ['employee', 'manager', 'supervisor'].includes(req.role) ? 'Employee' :
                            req.role === 'supplier' ? 'Supplier' : req.role;

    await Notification.deleteMany({
      recipient: userId,
      recipientRole: capitalizedRole
    });

    res.json({ message: 'All notifications deleted successfully' });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ error: 'Error deleting all notifications' });
  }
});

// DEBUG: Get all notifications in database
// GET /api/notifications/debug/allnotifications
router.get('/debug/allnotifications', async (req, res) => {
  try {
    let allNotifications = await Notification.find({});

    // Populate sender data
    allNotifications = await populateSenderData(allNotifications);

    res.json({
      totalCount: allNotifications.length,
      notifications: allNotifications
    });
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Get current user info
// GET /api/notifications/debug/userinfo
router.get('/debug/userinfo', fetchuser, async (req, res) => {
  try {
    res.json({
      userId: req.user._id,
      userRole: req.role,
      user: req.user
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


