const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: function() {
      return this.recipientRole === 'businessowner' ? 'BusinessOwner' : 'Employee';
    },
    required: true
  },
  recipientRole: {
    type: String,
    enum: ['businessowner', 'employee'],
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: function() {
      return this.senderRole === 'businessowner' ? 'BusinessOwner' : 'Employee';
    },
    required: true
  },
  senderRole: {
    type: String,
    enum: ['businessowner', 'employee'],
    required: true
  },
  type: {
    type: String,
    enum: [
      'employee_created',
      'employee_updated',
      'employee_deleted',
      'employee_deactivated',
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
      'supplier_order_created',
      'supplier_order_updated',
      'supplier_order_deleted',
      'supplier_order_created_by_employee',
      'supplier_order_updated_by_employee',
      'supplier_order_deleted_by_employee'
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
