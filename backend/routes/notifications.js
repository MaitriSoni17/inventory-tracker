const express = require('express');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser');
const Notification = require('../models/Notification');
const Employee = require('../models/Employee');
const BusinessOwner = require('../models/BusinessOwner');

// Get all notifications for current user
// GET /api/notifications/getnotifications
router.get('/getnotifications', fetchuser, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const notifications = await Notification.find({
      recipient: userId,
      recipientRole: userRole
    })
      .populate('sender', 'fname lname email')
      .sort({ createdAt: -1 })
      .limit(50);

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
    const userId = req.user.id;
    const userRole = req.user.role;

    const count = await Notification.countDocuments({
      recipient: userId,
      recipientRole: userRole,
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
    const userId = req.user.id;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.recipient.toString() !== userId) {
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
    const userId = req.user.id;
    const userRole = req.user.role;

    await Notification.updateMany(
      {
        recipient: userId,
        recipientRole: userRole,
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
    const userId = req.user.id;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.recipient.toString() !== userId) {
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
    const userId = req.user.id;
    const userRole = req.user.role;

    await Notification.deleteMany({
      recipient: userId,
      recipientRole: userRole
    });

    res.json({ message: 'All notifications deleted successfully' });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ error: 'Error deleting all notifications' });
  }
});

module.exports = router;
