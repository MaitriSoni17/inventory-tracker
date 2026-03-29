const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  recipientRole: {
    type: String,
    enum: ['BusinessOwner', 'Employee', 'Supplier'],
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  senderRole: {
    type: String,
    enum: ['BusinessOwner', 'Employee', 'Supplier'],
    required: true
  },
  type: {
    type: String,
    enum: [
      'employee_created',
      'employee_updated',
      'employee_deleted',
      'employee_deactivated',
      'employee_password_changed',
      'employee_login',
      'employee_deletion_requested',
      'employee_deletion_approved',
      'employee_deletion_rejected',
      'employee_deletion_cancellation_requested',
      'employee_deletion_cancellation_approved',
      'employee_deletion_cancellation_rejected',
      'employee_role_updated',
      'product_created',
      'product_updated',
      'product_deleted',
      'product_created_by_employee',
      'product_updated_by_employee',
      'product_deleted_by_employee',
      'order_created',
      'order_updated',
      'order_deleted',
      'order_created_by_employee',
      'order_updated_by_employee',
      'order_deleted_by_employee',
      'category_created',
      'category_updated',
      'category_deleted',
      'category_created_by_employee',
      'category_updated_by_employee',
      'category_deleted_by_employee',
      'supplier_order_created',
      'supplier_order_updated',
      'supplier_order_deleted',
      'supplier_order_created_by_employee',
      'supplier_order_updated_by_employee',
      'supplier_order_deleted_by_employee',
      'supplier_order_status_updated',
      'supplier_order_payment_status_updated',
      'supplier_deletion_requested',
      'supplier_deletion_approved',
      'supplier_deletion_rejected',
      'supplier_deletion_cancellation_requested',
      'supplier_deletion_cancellation_approved',
      'supplier_deletion_cancellation_rejected',
      'supplier_deactivated',
      'supplier_password_changed',
      'supplier_login',
      'chat_message',
      'chat_permission_granted',
      'chat_permission_revoked',
      'message',
      'message_edited',
      'salary_due_alert',
      'supplier_order_delivery_alert',
      'product_low_stock_alert',
      'customer_order_delivery_alert',
      'supplier_order_supply_alert'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-delete notifications after 30 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('Notification', NotificationSchema);


