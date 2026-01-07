const mongoose = require('mongoose');
const { Schema } = mongoose;

const ChatPermissionSchema = new Schema({
  // The user who can be chatted with
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  userRole: {
    type: String,
    enum: ['BusinessOwner', 'Employee', 'Supplier'],
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  // The user who is allowed to chat with the above user
  allowedUser: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  allowedUserRole: {
    type: String,
    enum: ['BusinessOwner', 'Employee', 'Supplier'],
    required: true
  },
  allowedUserName: {
    type: String,
    required: true
  },
  // Which business owner created this permission
  businessOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessOwner',
    required: true
  },
  // Whether this permission is active
  isActive: {
    type: Boolean,
    default: true
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

// Compound index to ensure unique permissions and efficient queries
ChatPermissionSchema.index({ user: 1, allowedUser: 1, businessOwner: 1 }, { unique: true });
ChatPermissionSchema.index({ businessOwner: 1 });
ChatPermissionSchema.index({ allowedUser: 1, isActive: 1 });

module.exports = mongoose.model('ChatPermission', ChatPermissionSchema);
