const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationPreferenceSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  role: {
    type: String,
    enum: ['BusinessOwner', 'Employee', 'Supplier', 'businessowner', 'employee', 'supplier', 'manager', 'supervisor'],
    required: true
  },
  // Salary Notifications (Business Owner)
  salarydueAlert: {
    type: Boolean,
    default: true,
    description: 'Alert when salary is due'
  },
  salaryDueDaysThreshold: {
    type: Number,
    default: 3,
    description: 'Alert X days before salary due'
  },
  // Supplier Order Notifications (Business Owner)
  supplierOrderDeliveryAlert: {
    type: Boolean,
    default: true,
    description: 'Alert when supplier orders are near delivery'
  },
  supplierOrderDeliveryDaysThreshold: {
    type: Number,
    default: 2,
    description: 'Alert X days before delivery date'
  },
  // Product Stock Notifications (Business Owner & Employee)
  productLowStockAlert: {
    type: Boolean,
    default: true,
    description: 'Alert when product stock is low'
  },
  productLowStockThreshold: {
    type: Number,
    default: 10,
    description: 'Alert when stock is below this number'
  },
  // Customer Order Notifications (Business Owner & Employee)
  customerOrderDeliveryAlert: {
    type: Boolean,
    default: true,
    description: 'Alert when customer orders are near delivery'
  },
  customerOrderDeliveryDaysThreshold: {
    type: Number,
    default: 1,
    description: 'Alert X days before delivery date'
  },
  // Supplier Order Supply Notifications (Supplier)
  supplierOrderSupplyAlert: {
    type: Boolean,
    default: true,
    description: 'Alert when supplier order is due to supply'
  },
  supplierOrderSupplyDaysThreshold: {
    type: Number,
    default: 2,
    description: 'Alert X days before order due date'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('NotificationPreference', NotificationPreferenceSchema);
