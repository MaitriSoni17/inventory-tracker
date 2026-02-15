const Employee = require('../models/Employee');
const {
  notifyReportingManager,
  notifySubordinatesAboutProduct,
  notifySubordinatesAboutOrder,
  notifyManagerAboutNewSubordinate
} = require('../utils/notificationHelper');

/**
 * Middleware to handle hierarchical notifications based on employee role
 */
const hierarchyNotifications = {
  /**
   * When a product is created/updated by an employee, notify:
   * - Supervisor (if exists)
   * - Manager (if exists)
   * - Business Owner
   */
  notifyAboutProductChange: async (employeeId, action, productName, details = {}) => {
    try {
      const employee = await Employee.findById(employeeId).populate('reportingTo');
      if (!employee) return;

      // Notify reporting manager if exists
      if (employee.reportingTo) {
        await notifyReportingManager(employeeId, `product_${action}`, productName, 'product', details);
      }

      // Notify business owner
      const {
        notifyBusinessOwnerAboutProduct
      } = require('../utils/notificationHelper');
      
      await notifyBusinessOwnerAboutProduct(
        employee.businessowner,
        employeeId,
        action,
        productName,
        details
      );
    } catch (error) {
      // console.error('Error in hierarchyNotifications.notifyAboutProductChange:', error);
    }
  },

  /**
   * When a manager/supervisor creates a product, notify their subordinates
   */
  notifySubordinatesAboutProductChange: async (employeeId, action, productName, details = {}) => {
    try {
      await notifySubordinatesAboutProduct(employeeId, 'employee', action, productName, details);
    } catch (error) {
      // console.error('Error in hierarchyNotifications.notifySubordinatesAboutProductChange:', error);
    }
  },

  /**
   * When an order is created/updated by an employee, notify hierarchy
   */
  notifyAboutOrderChange: async (employeeId, action, orderDetails, details = {}) => {
    try {
      const employee = await Employee.findById(employeeId).populate('reportingTo');
      if (!employee) return;

      // Notify reporting manager if exists
      if (employee.reportingTo) {
        await notifyReportingManager(employeeId, `order_${action}`, orderDetails, 'order', details);
      }

      // Notify business owner
      const {
        notifyBusinessOwnerAboutOrder
      } = require('../utils/notificationHelper');
      
      await notifyBusinessOwnerAboutOrder(
        employee.businessowner,
        employeeId,
        action,
        orderDetails,
        details
      );
    } catch (error) {
      // console.error('Error in hierarchyNotifications.notifyAboutOrderChange:', error);
    }
  },

  /**
   * When a manager/supervisor creates an order, notify their subordinates
   */
  notifySubordinatesAboutOrderChange: async (employeeId, action, orderDetails, details = {}) => {
    try {
      await notifySubordinatesAboutOrder(employeeId, 'employee', action, orderDetails, details);
    } catch (error) {
      // console.error('Error in hierarchyNotifications.notifySubordinatesAboutOrderChange:', error);
    }
  },

  /**
   * When a new subordinate is added to a manager
   */
  notifyManagerAboutNewEmployee: async (managerId, employeeName, employeeRole, details = {}) => {
    try {
      await notifyManagerAboutNewSubordinate(managerId, employeeName, employeeRole, details);
    } catch (error) {
      // console.error('Error in hierarchyNotifications.notifyManagerAboutNewEmployee:', error);
    }
  }
};

module.exports = hierarchyNotifications;
