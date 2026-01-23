/**
 * Notification Helper Utilities
 * Handles creation and management of business notifications
 */

// Alert Types and Descriptions
export const NOTIFICATION_TYPES = {
  SALARY_DUE: {
    type: 'salary_due_alert',
    title: 'Salary Due Alert',
    icon: 'fas fa-money-bill',
    color: '#28a745'
  },
  SUPPLIER_ORDER_DELIVERY: {
    type: 'supplier_order_delivery_alert',
    title: 'Supplier Order Delivery Alert',
    icon: 'fas fa-truck',
    color: '#fd7e14'
  },
  PRODUCT_LOW_STOCK: {
    type: 'product_low_stock_alert',
    title: 'Low Stock Alert',
    icon: 'fas fa-warehouse',
    color: '#ffc107'
  },
  CUSTOMER_ORDER_DELIVERY: {
    type: 'customer_order_delivery_alert',
    title: 'Customer Order Delivery Alert',
    icon: 'fas fa-shopping-cart',
    color: '#17a2b8'
  },
  SUPPLIER_ORDER_SUPPLY: {
    type: 'supplier_order_supply_alert',
    title: 'Supplier Order Supply Alert',
    icon: 'fas fa-industry',
    color: '#6f42c1'
  }
};

/**
 * Create salary due notification
 * @param {Object} businessOwner - Business owner object
 * @param {Object} employee - Employee object with salary data
 * @param {Number} daysUntilDue - Days until salary is due
 * @returns {Object} Notification object for API
 */
export const createSalaryDueNotification = (businessOwner, employee, daysUntilDue) => {
  return {
    recipient: businessOwner._id,
    recipientRole: 'BusinessOwner',
    sender: businessOwner._id,
    senderRole: 'BusinessOwner',
    type: NOTIFICATION_TYPES.SALARY_DUE.type,
    title: NOTIFICATION_TYPES.SALARY_DUE.title,
    message: `Salary for ${employee.fname} ${employee.lname || ''} is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}. Amount: ₹${employee.salary?.toLocaleString('en-IN') || '0'}`,
    data: {
      employeeId: employee._id,
      employeeName: `${employee.fname} ${employee.lname || ''}`,
      salary: employee.salary,
      daysUntilDue: daysUntilDue
    }
  };
};

/**
 * Create supplier order delivery notification
 * @param {Object} businessOwner - Business owner object
 * @param {Object} supplierOrder - Supplier order object
 * @param {Number} daysUntilDelivery - Days until delivery
 * @returns {Object} Notification object for API
 */
export const createSupplierOrderDeliveryNotification = (businessOwner, supplierOrder, daysUntilDelivery) => {
  return {
    recipient: businessOwner._id,
    recipientRole: 'BusinessOwner',
    sender: businessOwner._id,
    senderRole: 'BusinessOwner',
    type: NOTIFICATION_TYPES.SUPPLIER_ORDER_DELIVERY.type,
    title: NOTIFICATION_TYPES.SUPPLIER_ORDER_DELIVERY.title,
    message: `Supplier order for ${supplierOrder.pName || 'Product'} will be delivered in ${daysUntilDelivery} day${daysUntilDelivery !== 1 ? 's' : ''}. Order Amount: ₹${supplierOrder.amount?.toLocaleString('en-IN') || '0'}`,
    data: {
      orderId: supplierOrder._id,
      productName: supplierOrder.pName,
      amount: supplierOrder.amount,
      daysUntilDelivery: daysUntilDelivery,
      deliveryDate: supplierOrder.dDate
    }
  };
};

/**
 * Create low stock notification
 * @param {Object} businessOwner - Business owner object
 * @param {Object} product - Product object
 * @param {Number} currentStock - Current stock level
 * @returns {Object} Notification object for API
 */
export const createLowStockNotification = (businessOwner, product, currentStock) => {
  return {
    recipient: businessOwner._id,
    recipientRole: 'BusinessOwner',
    sender: businessOwner._id,
    senderRole: 'BusinessOwner',
    type: NOTIFICATION_TYPES.PRODUCT_LOW_STOCK.type,
    title: NOTIFICATION_TYPES.PRODUCT_LOW_STOCK.title,
    message: `Stock for product "${product.name || 'Unknown'}" is running low. Current stock: ${currentStock} units.`,
    data: {
      productId: product._id,
      productName: product.name,
      currentStock: currentStock,
      price: product.price
    }
  };
};

/**
 * Create customer order delivery notification
 * @param {Object} businessOwner - Business owner object
 * @param {Object} order - Customer order object
 * @param {Number} daysUntilDelivery - Days until delivery
 * @returns {Object} Notification object for API
 */
export const createCustomerOrderDeliveryNotification = (businessOwner, order, daysUntilDelivery) => {
  return {
    recipient: businessOwner._id,
    recipientRole: 'BusinessOwner',
    sender: businessOwner._id,
    senderRole: 'BusinessOwner',
    type: NOTIFICATION_TYPES.CUSTOMER_ORDER_DELIVERY.type,
    title: NOTIFICATION_TYPES.CUSTOMER_ORDER_DELIVERY.title,
    message: `Customer order for ${order.pName || 'Product'} needs to be sent/delivered in ${daysUntilDelivery} day${daysUntilDelivery !== 1 ? 's' : ''}. Order Amount: ₹${order.amount?.toLocaleString('en-IN') || '0'}`,
    data: {
      orderId: order._id,
      productName: order.pName,
      amount: order.amount,
      daysUntilDelivery: daysUntilDelivery,
      deliveryDate: order.dDate,
      customerName: order.cName
    }
  };
};

/**
 * Create supplier order supply notification
 * @param {Object} supplier - Supplier object
 * @param {Object} supplierOrder - Supplier order object
 * @param {Number} daysUntilDue - Days until order is due
 * @returns {Object} Notification object for API
 */
export const createSupplierOrderSupplyNotification = (supplier, supplierOrder, daysUntilDue) => {
  return {
    recipient: supplier._id,
    recipientRole: 'Supplier',
    sender: supplier._id,
    senderRole: 'Supplier',
    type: NOTIFICATION_TYPES.SUPPLIER_ORDER_SUPPLY.type,
    title: NOTIFICATION_TYPES.SUPPLIER_ORDER_SUPPLY.title,
    message: `You have a pending order for ${supplierOrder.pName || 'Product'} that needs to be supplied in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}. Order Quantity: ${supplierOrder.ounits || 0} units. Amount: ₹${supplierOrder.amount?.toLocaleString('en-IN') || '0'}`,
    data: {
      orderId: supplierOrder._id,
      productName: supplierOrder.pName,
      quantity: supplierOrder.ounits,
      amount: supplierOrder.amount,
      daysUntilDue: daysUntilDue,
      orderDate: supplierOrder.oDate,
      deliveryDate: supplierOrder.dDate
    }
  };
};

/**
 * Check if notification should be sent based on preferences
 * @param {String} notificationType - Type of notification
 * @param {Object} preferences - User's notification preferences
 * @returns {Boolean} Whether to send notification
 */
export const shouldSendNotification = (notificationType, preferences) => {
  if (!preferences) return true;

  switch (notificationType) {
    case NOTIFICATION_TYPES.SALARY_DUE.type:
      return preferences.salarydueAlert !== false;
    case NOTIFICATION_TYPES.SUPPLIER_ORDER_DELIVERY.type:
      return preferences.supplierOrderDeliveryAlert !== false;
    case NOTIFICATION_TYPES.PRODUCT_LOW_STOCK.type:
      return preferences.productLowStockAlert !== false;
    case NOTIFICATION_TYPES.CUSTOMER_ORDER_DELIVERY.type:
      return preferences.customerOrderDeliveryAlert !== false;
    case NOTIFICATION_TYPES.SUPPLIER_ORDER_SUPPLY.type:
      return preferences.supplierOrderSupplyAlert !== false;
    default:
      return true;
  }
};

/**
 * Get threshold for a notification type
 * @param {String} notificationType - Type of notification
 * @param {Object} preferences - User's notification preferences
 * @returns {Number} Threshold value
 */
export const getNotificationThreshold = (notificationType, preferences) => {
  if (!preferences) return 0;

  switch (notificationType) {
    case NOTIFICATION_TYPES.SALARY_DUE.type:
      return preferences.salaryDueDaysThreshold || 3;
    case NOTIFICATION_TYPES.SUPPLIER_ORDER_DELIVERY.type:
      return preferences.supplierOrderDeliveryDaysThreshold || 2;
    case NOTIFICATION_TYPES.PRODUCT_LOW_STOCK.type:
      return preferences.productLowStockThreshold || 10;
    case NOTIFICATION_TYPES.CUSTOMER_ORDER_DELIVERY.type:
      return preferences.customerOrderDeliveryDaysThreshold || 1;
    case NOTIFICATION_TYPES.SUPPLIER_ORDER_SUPPLY.type:
      return preferences.supplierOrderSupplyDaysThreshold || 2;
    default:
      return 0;
  }
};

/**
 * Calculate days until date
 * @param {String|Date} targetDate - Target date
 * @returns {Number} Days until target date
 */
export const daysUntilDate = (targetDate) => {
  if (!targetDate) return -1;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  
  const timeDiff = target - today;
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  return daysDiff;
};

/**
 * Format notification message for display
 * @param {Object} notification - Notification object
 * @returns {String} Formatted message
 */
export const formatNotificationMessage = (notification) => {
  const timeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return {
    title: notification.title,
    message: notification.message,
    time: timeAgo(notification.createdAt),
    type: notification.type,
    isRead: notification.isRead
  };
};

/**
 * Group notifications by type
 * @param {Array} notifications - Array of notifications
 * @returns {Object} Grouped notifications
 */
export const groupNotificationsByType = (notifications) => {
  return notifications.reduce((acc, notification) => {
    const type = notification.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(notification);
    return acc;
  }, {});
};

export default {
  NOTIFICATION_TYPES,
  createSalaryDueNotification,
  createSupplierOrderDeliveryNotification,
  createLowStockNotification,
  createCustomerOrderDeliveryNotification,
  createSupplierOrderSupplyNotification,
  shouldSendNotification,
  getNotificationThreshold,
  daysUntilDate,
  formatNotificationMessage,
  groupNotificationsByType
};
