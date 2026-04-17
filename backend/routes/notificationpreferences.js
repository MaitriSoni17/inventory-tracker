const express = require('express');
const router = express.Router();
const NotificationPreference = require('../models/NotificationPreference');
const fetchUser = require('../middleware/fetchuser');

/**
 * Get role variants for notification preference queries.
 * Maps any role to its possible stored variants (lowercase + capitalized).
 * Custom roles (non-BO, non-supplier) are treated as 'Employee' type.
 */
function getRoleVariants(userRole) {
    const variants = [userRole];
    const roleMap = { 'businessowner': 'BusinessOwner', 'employee': 'Employee', 'supplier': 'Supplier', 'manager': 'Employee', 'supervisor': 'Employee' };
    if (roleMap[userRole]) {
        variants.push(roleMap[userRole]);
    } else if (userRole !== 'businessowner' && userRole !== 'supplier') {
        // Custom role — treat as Employee
        variants.push('Employee');
    }
    return variants;
}

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
    const roleVariants = getRoleVariants(userRole);

    let preferences = await NotificationPreference.findOne({
      user: userId,
      role: { $in: roleVariants }
    });

    // Create default preferences if not found
    if (!preferences) {
      preferences = new NotificationPreference({
        user: userId,
        role: userRole,
        emailNotifications: true,
        orderAlerts: true,
        deliveryAlerts: true,
        lowStockAlerts: true,
        weeklyReport: false,
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
    const roleVariants = getRoleVariants(userRole);

    const {
      emailNotifications,
      orderAlerts,
      deliveryAlerts,
      lowStockAlerts,
      weeklyReport,
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
      if (emailNotifications !== undefined) preferences.emailNotifications = emailNotifications;
      if (orderAlerts !== undefined) preferences.orderAlerts = orderAlerts;
      if (deliveryAlerts !== undefined) preferences.deliveryAlerts = deliveryAlerts;
      if (lowStockAlerts !== undefined) preferences.lowStockAlerts = lowStockAlerts;
      if (weeklyReport !== undefined) preferences.weeklyReport = weeklyReport;

      // Keep legacy and generic low-stock flags aligned.
      if (lowStockAlerts !== undefined && productLowStockAlert === undefined) {
        preferences.productLowStockAlert = lowStockAlerts;
      }
      if (productLowStockAlert !== undefined && lowStockAlerts === undefined) {
        preferences.lowStockAlerts = productLowStockAlert;
      }

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
        emailNotifications: emailNotifications !== undefined ? emailNotifications : true,
        orderAlerts: orderAlerts !== undefined ? orderAlerts : true,
        deliveryAlerts: deliveryAlerts !== undefined ? deliveryAlerts : true,
        lowStockAlerts: lowStockAlerts !== undefined ? lowStockAlerts : true,
        weeklyReport: weeklyReport !== undefined ? weeklyReport : false,
        salarydueAlert: salarydueAlert !== undefined ? salarydueAlert : true,
        salaryDueDaysThreshold: salaryDueDaysThreshold || 3,
        supplierOrderDeliveryAlert: supplierOrderDeliveryAlert !== undefined ? supplierOrderDeliveryAlert : true,
        supplierOrderDeliveryDaysThreshold: supplierOrderDeliveryDaysThreshold || 2,
        productLowStockAlert: productLowStockAlert !== undefined
          ? productLowStockAlert
          : (lowStockAlerts !== undefined ? lowStockAlerts : true),
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

module.exports = router;
