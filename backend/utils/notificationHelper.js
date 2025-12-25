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
    console.log(`\n  [createNotification] CREATING NOTIFICATION`);
    console.log(`    recipient: ${recipientId} (role: ${recipientRole})`);
    console.log(`    sender: ${senderId} (role: ${senderRole})`);
    console.log(`    type: ${type}`);
    console.log(`    title: ${title}`);
    
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

    console.log(`    Full data object:`, JSON.stringify(notificationData, null, 2));
    
    const notification = new Notification(notificationData);
    
    console.log(`    Notification instance created, attempting to save...`);
    const savedNotif = await notification.save();
    
    console.log(`  ✓✓✓ NOTIFICATION SAVED TO DB ✓✓✓`);
    console.log(`    Saved ID: ${savedNotif._id}`);
    console.log(`    Saved recipient: ${savedNotif.recipient}`);
    console.log(`    Saved recipientRole: ${savedNotif.recipientRole}`);
    
    return savedNotif;
  } catch (error) {
    console.error(`  ✗✗✗ ERROR CREATING NOTIFICATION ✗✗✗`);
    console.error(`    Error message: ${error.message}`);
    console.error(`    Error code: ${error.code}`);
    if (error.errors) {
      console.error(`    Validation errors:`, error.errors);
    }
    console.error(`    Full error:`, error);
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
    console.log(`\n→ notifyEmployeesAboutOrder called`);
    console.log(`  businessOwnerId: ${businessOwnerId}`);
    console.log(`  action: ${action}`);

    const employees = await Employee.find({ businessowner: businessOwnerId });
    console.log(`  Found ${employees.length} employees to notify`);

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
        console.log(`  Notifying employee ${employee._id}...`);
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
    console.log(`✓ All employee notifications sent\n`);
  } catch (error) {
    console.error('✗ Error notifying employees about order changes:', error.message);
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
    console.error('Error notifying employees about category changes:', error);
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
    console.error('Error notifying business owner about product changes:', error);
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
    console.log(`\n→ notifyBusinessOwnerOwnProductChanges called:`, {
      businessOwnerId,
      action,
      productName
    });

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
    console.log(`  Notification config found:`, notification ? 'Yes' : 'No (action: ' + action + ')');
    
    if (notification) {
      console.log(`  Sending notification to business owner...`);
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
      console.log(`✓ Business owner notification sent successfully\n`);
    }
  } catch (error) {
    console.error('✗ Error notifying business owner about own product changes:', error.message);
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
    console.log(`\n→→→ notifyBusinessOwnerAboutOrder CALLED ←←←`);
    console.log(`  businessOwnerId: ${businessOwnerId} (type: ${typeof businessOwnerId})`);
    console.log(`  employeeId: ${employeeId} (type: ${typeof employeeId})`);
    console.log(`  action: ${action}`);
    console.log(`  orderDetails: ${orderDetails}`);

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
    console.log(`  Notification type found: ${notification ? 'Yes' : 'No'}`);
    
    if (notification) {
      console.log(`  About to call createNotification with:`);
      console.log(`    - recipient: ${businessOwnerId}`);
      console.log(`    - recipientRole: 'businessowner'`);
      console.log(`    - sender: ${employeeId}`);
      console.log(`    - senderRole: 'employee'`);
      console.log(`    - type: ${notification.type}`);
      
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
      console.log(`✓✓✓ Order notification creation completed ✓✓✓\n`);
      return result;
    } else {
      console.log(`  ⚠️  No notification type found for action: ${action}\n`);
    }
  } catch (error) {
    console.error('✗ Error notifying business owner about order changes:', error.message);
    console.error('  Stack:', error.stack);
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
  notifyBusinessOwnerAboutOrder
};
