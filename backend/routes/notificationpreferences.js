const express = require('express');
const router = express.Router();
const NotificationPreference = require('../models/NotificationPreference');
const fetchUser = require('../middleware/fetchuser');
const fetchBusinessOwner = require('../middleware/fetchbusinessowner');
const fetchEmployee = require('../middleware/fetchemployee');

/**
 * Get current user's notification preferences
 * GET /api/notificationpreferences
 * @requires auth-token
 */
router.get('/', fetchUser, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.role;

    // Also check for legacy capitalized role values
    const roleVariants = [userRole];
    const roleMap = { 'businessowner': 'BusinessOwner', 'employee': 'Employee', 'supplier': 'Supplier' };
    if (roleMap[userRole]) roleVariants.push(roleMap[userRole]);

    let preferences = await NotificationPreference.findOne({
      user: userId,
      role: { $in: roleVariants }
    });

    // Create default preferences if not found
    if (!preferences) {
      preferences = new NotificationPreference({
        user: userId,
        role: userRole,
        salarydueAlert: true,
        salaryDueDaysThreshold: 3,
        supplierOrderDeliveryAlert: true,
        supplierOrderDeliveryDaysThreshold: 2,
        productLowStockAlert: true,
        productLowStockThreshold: 10,
        customerOrderDeliveryAlert: true,
        customerOrderDeliveryDaysThreshold: 1,
        supplierOrderSupplyAlert: true,
        supplierOrderSupplyDaysThreshold: 2
      });
      await preferences.save();
    }

    res.json(preferences);
  } catch (error) {
    // console.error('Error fetching notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification preferences',
      error: error.message
    });
  }
});

/**
 * Get notification preferences for specific user (admin only)
 * GET /api/notificationpreferences/:userId
 * @requires auth-token (business owner)
 */
router.get('/:userId', fetchBusinessOwner, async (req, res) => {
  try {
    const userId = req.params.userId;
    const userRole = req.body.role || 'Employee';

    const preferences = await NotificationPreference.findOne({
      user: userId,
      role: userRole
    });

    if (!preferences) {
      return res.status(404).json({
        success: false,
        message: 'Notification preferences not found'
      });
    }

    res.json(preferences);
  } catch (error) {
    // console.error('Error fetching notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification preferences',
      error: error.message
    });
  }
});

/**
 * Create or update notification preferences for current user
 * POST /api/notificationpreferences
 * @requires auth-token
 * @body notification preference settings
 */
router.post('/', fetchUser, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.role;

    // Also check for legacy capitalized role values
    const roleVariants = [userRole];
    const roleMap = { 'businessowner': 'BusinessOwner', 'employee': 'Employee', 'supplier': 'Supplier' };
    if (roleMap[userRole]) roleVariants.push(roleMap[userRole]);

    const {
      salarydueAlert,
      salaryDueDaysThreshold,
      supplierOrderDeliveryAlert,
      supplierOrderDeliveryDaysThreshold,
      productLowStockAlert,
      productLowStockThreshold,
      customerOrderDeliveryAlert,
      customerOrderDeliveryDaysThreshold,
      supplierOrderSupplyAlert,
      supplierOrderSupplyDaysThreshold
    } = req.body;

    // Validate thresholds
    if (salaryDueDaysThreshold && salaryDueDaysThreshold < 0) {
      return res.status(400).json({
        success: false,
        message: 'Salary due days threshold cannot be negative'
      });
    }

    if (supplierOrderDeliveryDaysThreshold && supplierOrderDeliveryDaysThreshold < 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier order delivery days threshold cannot be negative'
      });
    }

    if (productLowStockThreshold && productLowStockThreshold < 0) {
      return res.status(400).json({
        success: false,
        message: 'Product low stock threshold cannot be negative'
      });
    }

    if (customerOrderDeliveryDaysThreshold && customerOrderDeliveryDaysThreshold < 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer order delivery days threshold cannot be negative'
      });
    }

    if (supplierOrderSupplyDaysThreshold && supplierOrderSupplyDaysThreshold < 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier order supply days threshold cannot be negative'
      });
    }

    // Find or create preferences
    let preferences = await NotificationPreference.findOne({
      user: userId,
      role: { $in: roleVariants }
    });

    if (preferences) {
      // Update existing preferences
      if (salarydueAlert !== undefined) preferences.salarydueAlert = salarydueAlert;
      if (salaryDueDaysThreshold !== undefined) preferences.salaryDueDaysThreshold = salaryDueDaysThreshold;
      
      if (supplierOrderDeliveryAlert !== undefined) preferences.supplierOrderDeliveryAlert = supplierOrderDeliveryAlert;
      if (supplierOrderDeliveryDaysThreshold !== undefined) preferences.supplierOrderDeliveryDaysThreshold = supplierOrderDeliveryDaysThreshold;
      
      if (productLowStockAlert !== undefined) preferences.productLowStockAlert = productLowStockAlert;
      if (productLowStockThreshold !== undefined) preferences.productLowStockThreshold = productLowStockThreshold;
      
      if (customerOrderDeliveryAlert !== undefined) preferences.customerOrderDeliveryAlert = customerOrderDeliveryAlert;
      if (customerOrderDeliveryDaysThreshold !== undefined) preferences.customerOrderDeliveryDaysThreshold = customerOrderDeliveryDaysThreshold;
      
      if (supplierOrderSupplyAlert !== undefined) preferences.supplierOrderSupplyAlert = supplierOrderSupplyAlert;
      if (supplierOrderSupplyDaysThreshold !== undefined) preferences.supplierOrderSupplyDaysThreshold = supplierOrderSupplyDaysThreshold;

      await preferences.save();
    } else {
      // Create new preferences
      preferences = new NotificationPreference({
        user: userId,
        role: userRole,
        salarydueAlert: salarydueAlert !== undefined ? salarydueAlert : true,
        salaryDueDaysThreshold: salaryDueDaysThreshold || 3,
        supplierOrderDeliveryAlert: supplierOrderDeliveryAlert !== undefined ? supplierOrderDeliveryAlert : true,
        supplierOrderDeliveryDaysThreshold: supplierOrderDeliveryDaysThreshold || 2,
        productLowStockAlert: productLowStockAlert !== undefined ? productLowStockAlert : true,
        productLowStockThreshold: productLowStockThreshold || 10,
        customerOrderDeliveryAlert: customerOrderDeliveryAlert !== undefined ? customerOrderDeliveryAlert : true,
        customerOrderDeliveryDaysThreshold: customerOrderDeliveryDaysThreshold || 1,
        supplierOrderSupplyAlert: supplierOrderSupplyAlert !== undefined ? supplierOrderSupplyAlert : true,
        supplierOrderSupplyDaysThreshold: supplierOrderSupplyDaysThreshold || 2
      });
      await preferences.save();
    }

    res.json({
      success: true,
      message: 'Notification preferences saved successfully',
      preferences: preferences
    });
  } catch (error) {
    // console.error('Error saving notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving notification preferences',
      error: error.message
    });
  }
});

/**
 * Update notification preferences for current user
 * PUT /api/notificationpreferences
 * @requires auth-token
 * @body notification preference settings
 */
router.put('/', fetchUser, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.role;

    // Also check for legacy capitalized role values
    const roleVariants = [userRole];
    const roleMap = { 'businessowner': 'BusinessOwner', 'employee': 'Employee', 'supplier': 'Supplier' };
    if (roleMap[userRole]) roleVariants.push(roleMap[userRole]);

    const {
      salarydueAlert,
      salaryDueDaysThreshold,
      supplierOrderDeliveryAlert,
      supplierOrderDeliveryDaysThreshold,
      productLowStockAlert,
      productLowStockThreshold,
      customerOrderDeliveryAlert,
      customerOrderDeliveryDaysThreshold,
      supplierOrderSupplyAlert,
      supplierOrderSupplyDaysThreshold
    } = req.body;

    // Validate thresholds
    if (salaryDueDaysThreshold !== undefined && salaryDueDaysThreshold < 0) {
      return res.status(400).json({
        success: false,
        message: 'Salary due days threshold cannot be negative'
      });
    }

    if (supplierOrderDeliveryDaysThreshold !== undefined && supplierOrderDeliveryDaysThreshold < 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier order delivery days threshold cannot be negative'
      });
    }

    if (productLowStockThreshold !== undefined && productLowStockThreshold < 0) {
      return res.status(400).json({
        success: false,
        message: 'Product low stock threshold cannot be negative'
      });
    }

    if (customerOrderDeliveryDaysThreshold !== undefined && customerOrderDeliveryDaysThreshold < 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer order delivery days threshold cannot be negative'
      });
    }

    if (supplierOrderSupplyDaysThreshold !== undefined && supplierOrderSupplyDaysThreshold < 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier order supply days threshold cannot be negative'
      });
    }

    // Find and update preferences
    let preferences = await NotificationPreference.findOne({
      user: userId,
      role: { $in: roleVariants }
    });

    if (!preferences) {
      return res.status(404).json({
        success: false,
        message: 'Notification preferences not found'
      });
    }

    // Update only provided fields
    if (salarydueAlert !== undefined) preferences.salarydueAlert = salarydueAlert;
    if (salaryDueDaysThreshold !== undefined) preferences.salaryDueDaysThreshold = salaryDueDaysThreshold;
    
    if (supplierOrderDeliveryAlert !== undefined) preferences.supplierOrderDeliveryAlert = supplierOrderDeliveryAlert;
    if (supplierOrderDeliveryDaysThreshold !== undefined) preferences.supplierOrderDeliveryDaysThreshold = supplierOrderDeliveryDaysThreshold;
    
    if (productLowStockAlert !== undefined) preferences.productLowStockAlert = productLowStockAlert;
    if (productLowStockThreshold !== undefined) preferences.productLowStockThreshold = productLowStockThreshold;
    
    if (customerOrderDeliveryAlert !== undefined) preferences.customerOrderDeliveryAlert = customerOrderDeliveryAlert;
    if (customerOrderDeliveryDaysThreshold !== undefined) preferences.customerOrderDeliveryDaysThreshold = customerOrderDeliveryDaysThreshold;
    
    if (supplierOrderSupplyAlert !== undefined) preferences.supplierOrderSupplyAlert = supplierOrderSupplyAlert;
    if (supplierOrderSupplyDaysThreshold !== undefined) preferences.supplierOrderSupplyDaysThreshold = supplierOrderSupplyDaysThreshold;

    await preferences.save();

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: preferences
    });
  } catch (error) {
    // console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification preferences',
      error: error.message
    });
  }
});

/**
 * Reset notification preferences to defaults for current user
 * DELETE /api/notificationpreferences
 * @requires auth-token
 */
router.delete('/', fetchUser, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.role;

    // Also check for legacy capitalized role values
    const roleVariants = [userRole];
    const roleMap = { 'businessowner': 'BusinessOwner', 'employee': 'Employee', 'supplier': 'Supplier' };
    if (roleMap[userRole]) roleVariants.push(roleMap[userRole]);

    const preferences = await NotificationPreference.findOne({
      user: userId,
      role: { $in: roleVariants }
    });

    if (!preferences) {
      return res.status(404).json({
        success: false,
        message: 'Notification preferences not found'
      });
    }

    // Reset to defaults
    preferences.salarydueAlert = true;
    preferences.salaryDueDaysThreshold = 3;
    preferences.supplierOrderDeliveryAlert = true;
    preferences.supplierOrderDeliveryDaysThreshold = 2;
    preferences.productLowStockAlert = true;
    preferences.productLowStockThreshold = 10;
    preferences.customerOrderDeliveryAlert = true;
    preferences.customerOrderDeliveryDaysThreshold = 1;
    preferences.supplierOrderSupplyAlert = true;
    preferences.supplierOrderSupplyDaysThreshold = 2;

    await preferences.save();

    res.json({
      success: true,
      message: 'Notification preferences reset to defaults',
      preferences: preferences
    });
  } catch (error) {
    // console.error('Error resetting notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting notification preferences',
      error: error.message
    });
  }
});

module.exports = router;
