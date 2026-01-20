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
 * Get employees by role hierarchy
 * @param {String} businessOwnerId - Business owner ID
 * @param {String} role - Role filter (optional): 'employee', 'supervisor', 'manager', or null for all
 */
async function getEmployeesByRole(businessOwnerId, role = null) {
  try {
    const query = { businessowner: businessOwnerId };
    if (role) {
      query.role = role;
    }
    return await Employee.find(query).select('_id fname lname role email');
  } catch (error) {
    console.error('Error getting employees by role:', error);
    return [];
  }
}

/**
 * Get manager's subordinates (supervisors and employees)
 */
async function getManagerSubordinates(managerId) {
  try {
    return await Employee.find({ reportingTo: managerId }).select('_id fname lname role email');
  } catch (error) {
    console.error('Error getting manager subordinates:', error);
    return [];
  }
}

/**
 * Get supervisor's subordinates (employees only)
 */
async function getSupervisorSubordinates(supervisorId) {
  try {
    return await Employee.find({ reportingTo: supervisorId, role: 'employee' }).select('_id fname lname email');
  } catch (error) {
    console.error('Error getting supervisor subordinates:', error);
    return [];
  }
}

/**
 * Notify specific role employees about changes
 */
async function notifyEmployeesByRole(
  businessOwnerId,
  role,
  senderId,
  senderRole,
  type,
  title,
  message,
  details = {}
) {
  try {
    const employees = await getEmployeesByRole(businessOwnerId, role);
    
    for (const employee of employees) {
      await createNotification(
        employee._id,
        'Employee',
        senderId,
        senderRole,
        type,
        title,
        message,
        details
      );
    }
  } catch (error) {
    console.error('Error notifying employees by role:', error);
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

/**
 * HIERARCHY-BASED NOTIFICATION FUNCTIONS (Employee, Supervisor, Manager)
 */

/**
 * Notify manager about employee product changes
 */
async function notifyManagerAboutEmployeeProduct(
  managerId,
  employeeId,
  employeeName,
  action,
  productName,
  details = {}
) {
  try {
    const notificationTypes = {
      created: {
        type: 'product_created_by_employee',
        title: 'Product Added by Team Member',
        message: `${employeeName} has added a new product "${productName}" to the inventory.`
      },
      updated: {
        type: 'product_updated_by_employee',
        title: 'Product Updated',
        message: `${employeeName} has updated the product "${productName}".`
      },
      deleted: {
        type: 'product_deleted_by_employee',
        title: 'Product Removed',
        message: `${employeeName} has removed the product "${productName}" from the inventory.`
      }
    };

    const notification = notificationTypes[action];
    if (notification) {
      await createNotification(
        managerId,
        'Employee',
        employeeId,
        'Employee',
        notification.type,
        notification.title,
        notification.message,
        { ...details, employeeName }
      );
    }
  } catch (error) {
    console.error('Error notifying manager about employee product:', error);
  }
}

/**
 * Notify supervisor about employee product changes
 */
async function notifySupervisorAboutEmployeeProduct(
  supervisorId,
  employeeId,
  employeeName,
  action,
  productName,
  details = {}
) {
  try {
    const notificationTypes = {
      created: {
        type: 'product_created_by_employee',
        title: 'Product Added by Team Member',
        message: `${employeeName} has added a new product "${productName}".`
      },
      updated: {
        type: 'product_updated_by_employee',
        title: 'Product Updated by Team Member',
        message: `${employeeName} has updated the product "${productName}".`
      },
      deleted: {
        type: 'product_deleted_by_employee',
        title: 'Product Removed by Team Member',
        message: `${employeeName} has removed the product "${productName}".`
      }
    };

    const notification = notificationTypes[action];
    if (notification) {
      await createNotification(
        supervisorId,
        'Employee',
        employeeId,
        'Employee',
        notification.type,
        notification.title,
        notification.message,
        { ...details, employeeName }
      );
    }
  } catch (error) {
    console.error('Error notifying supervisor about employee product:', error);
  }
}

/**
 * Notify all subordinates by role (for managers and supervisors)
 */
async function notifySubordinatesAboutProduct(
  senderId,
  senderRole,
  action,
  productName,
  details = {}
) {
  try {
    // Get the sender's role to determine subordinates
    const sender = await Employee.findById(senderId);
    if (!sender) return;

    let subordinates = [];

    if (sender.role === 'manager') {
      // Manager can notify supervisors and employees
      subordinates = await getManagerSubordinates(senderId);
    } else if (sender.role === 'supervisor') {
      // Supervisor can notify employees under them
      subordinates = await getSupervisorSubordinates(senderId);
    }

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
      for (const subordinate of subordinates) {
        await createNotification(
          subordinate._id,
          'Employee',
          senderId,
          'Employee',
          notification.type,
          notification.title,
          notification.message,
          details
        );
      }
    }
  } catch (error) {
    console.error('Error notifying subordinates about product:', error);
  }
}

/**
 * Notify subordinates about order changes
 */
async function notifySubordinatesAboutOrder(
  senderId,
  senderRole,
  action,
  orderDetails,
  details = {}
) {
  try {
    const sender = await Employee.findById(senderId);
    if (!sender) return;

    let subordinates = [];

    if (sender.role === 'manager') {
      subordinates = await getManagerSubordinates(senderId);
    } else if (sender.role === 'supervisor') {
      subordinates = await getSupervisorSubordinates(senderId);
    }

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
      for (const subordinate of subordinates) {
        await createNotification(
          subordinate._id,
          'Employee',
          senderId,
          'Employee',
          notification.type,
          notification.title,
          notification.message,
          details
        );
      }
    }
  } catch (error) {
    console.error('Error notifying subordinates about order:', error);
  }
}

/**
 * Notify employee's reporting manager about changes
 */
async function notifyReportingManager(
  employeeId,
  action,
  itemName,
  itemType,
  details = {}
) {
  try {
    const employee = await Employee.findById(employeeId);
    if (!employee || !employee.reportingTo) return;

    const manager = await Employee.findById(employee.reportingTo);
    if (!manager) return;

    const notificationTypes = {
      product_created: {
        type: 'product_created_by_employee',
        title: 'Product Created',
        message: `${employee.fname} ${employee.lname} has created product "${itemName}".`
      },
      product_updated: {
        type: 'product_updated_by_employee',
        title: 'Product Updated',
        message: `${employee.fname} ${employee.lname} has updated product "${itemName}".`
      },
      product_deleted: {
        type: 'product_deleted_by_employee',
        title: 'Product Deleted',
        message: `${employee.fname} ${employee.lname} has deleted product "${itemName}".`
      },
      order_created: {
        type: 'order_created_by_employee',
        title: 'Order Created',
        message: `${employee.fname} ${employee.lname} has created order #${itemName}.`
      },
      order_updated: {
        type: 'order_updated_by_employee',
        title: 'Order Updated',
        message: `${employee.fname} ${employee.lname} has updated order #${itemName}.`
      },
      order_deleted: {
        type: 'order_deleted_by_employee',
        title: 'Order Deleted',
        message: `${employee.fname} ${employee.lname} has deleted order #${itemName}.`
      }
    };

    const notification = notificationTypes[action];
    if (notification) {
      await createNotification(
        employee.reportingTo,
        'Employee',
        employeeId,
        'Employee',
        notification.type,
        notification.title,
        notification.message,
        details
      );
    }
  } catch (error) {
    console.error('Error notifying reporting manager:', error);
  }
}

/**
 * Notify all managers about employee-related changes
 */
async function notifyAllManagers(
  businessOwnerId,
  action,
  employeeName,
  details = {}
) {
  try {
    const managers = await getEmployeesByRole(businessOwnerId, 'manager');

    for (const manager of managers) {
      const notificationTypes = {
        created: {
          type: 'employee_created',
          title: 'New Team Member Added',
          message: `A new employee ${employeeName} has been added to your organization.`
        },
        updated: {
          type: 'employee_updated',
          title: 'Employee Updated',
          message: `Employee ${employeeName}'s profile has been updated.`
        },
        deleted: {
          type: 'employee_deleted',
          title: 'Employee Removed',
          message: `Employee ${employeeName} has been removed from your organization.`
        }
      };

      const notification = notificationTypes[action];
      if (notification) {
        await createNotification(
          manager._id,
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
    console.error('Error notifying all managers:', error);
  }
}

/**
 * Notify manager when a new employee is added under them
 */
async function notifyManagerAboutNewSubordinate(
  managerId,
  employeeName,
  employeeRole,
  details = {}
) {
  try {
    const notificationType = {
      type: 'employee_created',
      title: `New ${employeeRole} Added Under You`,
      message: `${employeeName} has been added as a ${employeeRole} under your supervision.`
    };

    await createNotification(
      managerId,
      'Employee',
      managerId,
      'Employee',
      notificationType.type,
      notificationType.title,
      notificationType.message,
      details
    );
  } catch (error) {
    console.error('Error notifying manager about new subordinate:', error);
  }
}

/**
 * Notify employee when their role is changed
 */
async function notifyEmployeeAboutRoleChange(
  employeeId,
  oldRole,
  newRole,
  businessOwnerId,
  details = {}
) {
  try {
    const notificationType = {
      type: 'employee_role_updated',
      title: 'Your Role Has Been Updated',
      message: `Your role has been changed from ${oldRole} to ${newRole}.`
    };

    await createNotification(
      employeeId,
      'Employee',
      businessOwnerId,
      'BusinessOwner',
      notificationType.type,
      notificationType.title,
      notificationType.message,
      details
    );
  } catch (error) {
    console.error('Error notifying employee about role change:', error);
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
  notifyBusinessOwnerAboutSupplierLogin,
  getEmployeesByRole,
  getManagerSubordinates,
  getSupervisorSubordinates,
  notifyEmployeesByRole,
  notifyManagerAboutEmployeeProduct,
  notifySupervisorAboutEmployeeProduct,
  notifySubordinatesAboutProduct,
  notifySubordinatesAboutOrder,
  notifyReportingManager,
  notifyAllManagers,
  notifyManagerAboutNewSubordinate,
  notifyEmployeeAboutRoleChange,
  notifyAboutNewMessage
};

/**
 * Notify user about new message
 * @param {String} recipientId - ID of recipient
 * @param {String} recipientRole - Role of recipient
 * @param {String} senderId - ID of sender
 * @param {String} senderRole - Role of sender
 * @param {String} senderName - Name of sender
 * @param {String} messagePreview - Message preview text
 * @param {Object} businessOwnerId - Business owner ID
 */
async function notifyAboutNewMessage(
  recipientId,
  recipientRole,
  senderId,
  senderRole,
  senderName,
  messagePreview,
  businessOwnerId
) {
  try {
    const notification = new Notification({
      recipient: recipientId,
      recipientRole,
      sender: senderId,
      senderRole,
      type: 'message',
      title: `New message from ${senderName}`,
      message: messagePreview.substring(0, 100),
      data: {
        senderId,
        messagePreview,
        businessOwnerId
      }
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating message notification:', error);
    // Don't throw - notifications shouldn't block message sending
    return null;
  }
}



