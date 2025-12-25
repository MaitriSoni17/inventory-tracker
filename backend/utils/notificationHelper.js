const Notification = require('../models/Notification');
const Employee = require('../models/Employee');
const BusinessOwner = require('../models/BusinessOwner');
const Supplier = require('../models/Supplier');

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
    const notificationData = {
      recipient: recipientId,
      recipientRole,
      sender: senderId,
      senderRole,
      type,
      title,
      message,
      data
    };
    
    const notification = new Notification(notificationData);
    const savedNotif = await notification.save();
    
    return savedNotif;
  } catch (error) {
    throw error;
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
      'BusinessOwner',
      employeeId,
      'Employee',
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
          'Employee',
          businessOwnerId,
          'BusinessOwner',
          notification.type,
          notification.title,
          notification.message,
          details
        );
      }
    }
  } catch (error) {
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
          'Employee',
          businessOwnerId,
          'BusinessOwner',
          notification.type,
          notification.title,
          notification.message,
          details
        );
      }
    }
  } catch (error) {
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
          'Employee',
          businessOwnerId,
          'BusinessOwner',
          notification.type,
          notification.title,
          notification.message,
          details
        );
      }
    }
  } catch (error) {
  }
}

/**
 * Notify business owner about product changes by employee
 */
async function notifyBusinessOwnerAboutProduct(
  businessOwnerId,
  employeeId,
  action,
  productName,
  details = {}
) {
  try {
    const notificationTypes = {
      created: {
        type: 'product_created_by_employee',
        title: 'Product Added',
        message: `An employee has added a new product "${productName}" to the inventory.`
      },
      updated: {
        type: 'product_updated_by_employee',
        title: 'Product Updated',
        message: `An employee has updated the product "${productName}".`
      },
      deleted: {
        type: 'product_deleted_by_employee',
        title: 'Product Removed',
        message: `An employee has removed the product "${productName}" from the inventory.`
      }
    };

    const notification = notificationTypes[action];
    if (notification) {
      await createNotification(
        businessOwnerId,
        'BusinessOwner',
        employeeId,
        'Employee',
        notification.type,
        notification.title,
        notification.message,
        details
      );
    }
  } catch (error) {
  }
}

/**
 * Notify business owner about their own product changes
 */
async function notifyBusinessOwnerOwnProductChanges(
  businessOwnerId,
  action,
  productName,
  details = {}
) {
  try {
    const notificationTypes = {
      created: {
        type: 'product_created',
        title: 'Product Successfully Added',
        message: `Your new product "${productName}" has been successfully added to the inventory.`
      },
      updated: {
        type: 'product_updated',
        title: 'Product Successfully Updated',
        message: `Your product "${productName}" has been successfully updated.`
      }
    };

    const notification = notificationTypes[action];
    
    if (notification) {
      await createNotification(
        businessOwnerId,
        'BusinessOwner',
        businessOwnerId,
        'BusinessOwner',
        notification.type,
        notification.title,
        notification.message,
        details
      );
    }
  } catch (error) {
    console.error('Error notifying business owner about product changes:', error);
  }
}

/**
 * Notify business owner about order changes by employee
 */
async function notifyBusinessOwnerAboutOrder(
  businessOwnerId,
  employeeId,
  action,
  orderDetails,
  details = {}
) {
  try {

    const notificationTypes = {
      created: {
        type: 'order_created_by_employee',
        title: 'Order Created',
        message: `An employee has created a new order #${orderDetails}.`
      },
      updated: {
        type: 'order_updated_by_employee',
        title: 'Order Updated',
        message: `An employee has updated order #${orderDetails}.`
      },
      deleted: {
        type: 'order_deleted_by_employee',
        title: 'Order Canceled',
        message: `An employee has canceled order #${orderDetails}.`
      }
    };

    const notification = notificationTypes[action];
    
    if (notification) {
      
      const result = await createNotification(
        businessOwnerId,
        'BusinessOwner',
        employeeId,
        'Employee',
        notification.type,
        notification.title,
        notification.message,
        details
      );
      return result;
    } else {
    }
  } catch (error) {
  }
}

/**
 * Notify business owner about category changes by employee
 */
async function notifyBusinessOwnerAboutCategory(
  businessOwnerId,
  employeeId,
  action,
  categoryName,
  details = {}
) {
  try {

    const notificationTypes = {
      created: {
        type: 'category_created_by_employee',
        title: 'Category Added',
        message: `An employee has added a new category "${categoryName}".`
      },
      updated: {
        type: 'category_updated_by_employee',
        title: 'Category Updated',
        message: `An employee has updated the category "${categoryName}".`
      },
      deleted: {
        type: 'category_deleted_by_employee',
        title: 'Category Removed',
        message: `An employee has removed the category "${categoryName}".`
      }
    };

    const notification = notificationTypes[action];
    
    if (notification) {
      
      const result = await createNotification(
        businessOwnerId,
        'BusinessOwner',
        employeeId,
        'Employee',
        notification.type,
        notification.title,
        notification.message,
        details
      );
      return result;
    } else {
    }
  } catch (error) {
  }
}

/**
 * Notify business owner about order changes by employee
 */
async function notifyBusinessOwnerAboutOrderByEmployee(
  businessOwnerId,
  employeeId,
  action,
  orderDetails,
  details = {}
) {
  try {

    const notificationTypes = {
      created: {
        type: 'order_created_by_employee',
        title: 'Order Created',
        message: `An employee has created order #${orderDetails}.`
      },
      updated: {
        type: 'order_updated_by_employee',
        title: 'Order Updated',
        message: `An employee has updated order #${orderDetails}.`
      },
      deleted: {
        type: 'order_deleted_by_employee',
        title: 'Order Canceled',
        message: `An employee has canceled order #${orderDetails}.`
      }
    };

    const notification = notificationTypes[action];
    
    if (notification) {
      
      const result = await createNotification(
        businessOwnerId,
        'BusinessOwner',
        employeeId,
        'Employee',
        notification.type,
        notification.title,
        notification.message,
        details
      );
      return result;
    } else {
    }
  } catch (error) {
  }
}

/**
 * Notify business owner about employee login
 */
async function notifyBusinessOwnerAboutEmployeeLogin(
  businessOwnerId,
  employeeId,
  employeeName,
  loginTime,
  details = {}
) {
  try {
    const notificationType = {
      type: 'employee_login',
      title: 'Employee Login',
      message: `Employee ${employeeName} logged in at ${new Date(loginTime).toLocaleString()}`
    };

    await createNotification(
      businessOwnerId,
      'BusinessOwner',
      employeeId,
      'Employee',
      notificationType.type,
      notificationType.title,
      notificationType.message,
      { ...details, loginTime }
    );
  } catch (error) {
  }
}

/**
 * Notify business owner about supplier login
 */
async function notifyBusinessOwnerAboutSupplierLogin(
  businessOwnerId,
  supplierId,
  supplierName,
  loginTime,
  details = {}
) {
  try {
    const notificationType = {
      type: 'supplier_login',
      title: 'Supplier Login',
      message: `Supplier ${supplierName} logged in at ${new Date(loginTime).toLocaleString()}`
    };

    await createNotification(
      businessOwnerId,
      'BusinessOwner',
      supplierId,
      'Supplier',
      notificationType.type,
      notificationType.title,
      notificationType.message,
      { ...details, loginTime }
    );
  } catch (error) {
  }
}

module.exports = {
  createNotification,
  notifyBusinessOwnerAboutEmployee,
  notifyEmployeesAboutProduct,
  notifyEmployeesAboutOrder,
  notifyEmployeesAboutCategory,
  notifyBusinessOwnerAboutProduct,
  notifyBusinessOwnerOwnProductChanges,
  notifyBusinessOwnerAboutOrder,
  notifyBusinessOwnerAboutCategory,
  notifyBusinessOwnerAboutOrderByEmployee,
  notifyBusinessOwnerAboutEmployeeLogin,
  notifyBusinessOwnerAboutSupplierLogin
};


