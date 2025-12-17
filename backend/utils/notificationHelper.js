const Notification = require('../models/Notification');
const Employee = require('../models/Employee');
const BusinessOwner = require('../models/BusinessOwner');

/**
 * Create and save a notification
 * @param {String} recipientId - ID of the recipient
 * @param {String} recipientRole - Role of recipient ('businessowner' or 'employee')
 * @param {String} senderId - ID of the sender
 * @param {String} senderRole - Role of sender ('businessowner' or 'employee')
 * @param {String} type - Type of notification
 * @param {String} title - Notification title
 * @param {String} message - Notification message
 * @param {Object} data - Additional data (optional)
 */
async function createNotification(
  recipientId,
  recipientRole,
  senderId,
  senderRole,
  type,
  title,
  message,
  data = {}
) {
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
    console.log(`Notification created: ${type} for ${recipientRole}`);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

/**
 * Notify business owner about employee changes
 */
async function notifyBusinessOwnerAboutEmployee(
  businessOwnerId,
  employeeId,
  action,
  employeeName,
  details = {}
) {
  const notificationTypes = {
    created: {
      type: 'employee_created',
      title: 'New Employee Added',
      message: `Employee ${employeeName} has been added to your team.`
    },
    updated: {
      type: 'employee_updated',
      title: 'Employee Profile Updated',
      message: `Employee ${employeeName}'s profile has been updated.`
    },
    deleted: {
      type: 'employee_deleted',
      title: 'Employee Removed',
      message: `Employee ${employeeName} has been removed from your team.`
    },
    deactivated: {
      type: 'employee_deactivated',
      title: 'Employee Deactivated',
      message: `Employee ${employeeName}'s account has been deactivated.`
    }
  };

  const notification = notificationTypes[action];
  if (notification) {
    await createNotification(
      businessOwnerId,
      'businessowner',
      employeeId,
      'employee',
      notification.type,
      notification.title,
      notification.message,
      details
    );
  }
}

/**
 * Notify employees about product changes
 */
async function notifyEmployeesAboutProduct(
  businessOwnerId,
  action,
  productName,
  details = {}
) {
  try {
    const employees = await Employee.find({ businessowner: businessOwnerId });

    for (const employee of employees) {
      const notificationTypes = {
        created: {
          type: 'product_created',
          title: 'New Product Added',
          message: `A new product "${productName}" has been added to the inventory.`
        },
        updated: {
          type: 'product_updated',
          title: 'Product Updated',
          message: `Product "${productName}" has been updated.`
        },
        deleted: {
          type: 'product_deleted',
          title: 'Product Removed',
          message: `Product "${productName}" has been removed from the inventory.`
        }
      };

      const notification = notificationTypes[action];
      if (notification) {
        await createNotification(
          employee._id,
          'employee',
          businessOwnerId,
          'businessowner',
          notification.type,
          notification.title,
          notification.message,
          details
        );
      }
    }
  } catch (error) {
    console.error('Error notifying employees about product changes:', error);
  }
}

/**
 * Notify employees about order changes
 */
async function notifyEmployeesAboutOrder(
  businessOwnerId,
  action,
  orderDetails,
  details = {}
) {
  try {
    const employees = await Employee.find({ businessowner: businessOwnerId });

    for (const employee of employees) {
      const notificationTypes = {
        created: {
          type: 'order_created',
          title: 'New Order Created',
          message: `A new order #${orderDetails} has been created.`
        },
        updated: {
          type: 'order_updated',
          title: 'Order Updated',
          message: `Order #${orderDetails} has been updated.`
        },
        deleted: {
          type: 'order_deleted',
          title: 'Order Canceled',
          message: `Order #${orderDetails} has been canceled.`
        }
      };

      const notification = notificationTypes[action];
      if (notification) {
        await createNotification(
          employee._id,
          'employee',
          businessOwnerId,
          'businessowner',
          notification.type,
          notification.title,
          notification.message,
          details
        );
      }
    }
  } catch (error) {
    console.error('Error notifying employees about order changes:', error);
  }
}

/**
 * Notify employees about category changes
 */
async function notifyEmployeesAboutCategory(
  businessOwnerId,
  action,
  categoryName,
  details = {}
) {
  try {
    const employees = await Employee.find({ businessowner: businessOwnerId });

    for (const employee of employees) {
      const notificationTypes = {
        created: {
          type: 'category_created',
          title: 'New Category Added',
          message: `A new category "${categoryName}" has been added.`
        },
        updated: {
          type: 'category_updated',
          title: 'Category Updated',
          message: `Category "${categoryName}" has been updated.`
        },
        deleted: {
          type: 'category_deleted',
          title: 'Category Removed',
          message: `Category "${categoryName}" has been removed.`
        }
      };

      const notification = notificationTypes[action];
      if (notification) {
        await createNotification(
          employee._id,
          'employee',
          businessOwnerId,
          'businessowner',
          notification.type,
          notification.title,
          notification.message,
          details
        );
      }
    }
  } catch (error) {
    console.error('Error notifying employees about category changes:', error);
  }
}

module.exports = {
  createNotification,
  notifyBusinessOwnerAboutEmployee,
  notifyEmployeesAboutProduct,
  notifyEmployeesAboutOrder,
  notifyEmployeesAboutCategory
};
