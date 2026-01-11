const mongoose = require('mongoose');
const { Schema } = mongoose;

const ChatPermissionSchema = new Schema({
  // INDIVIDUAL PERMISSION FIELDS
  // The user who can be chatted with (individual permission)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  userRole: {
    type: String,
    enum: ['BusinessOwner', 'Employee', 'Supplier'],
    default: null
  },
  userName: {
    type: String,
    default: null
  },
  // The user who is allowed to chat with the above user (individual permission)
  allowedUser: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  allowedUserRole: {
    type: String,
    enum: ['BusinessOwner', 'Employee', 'Supplier'],
    default: null
  },
  allowedUserName: {
    type: String,
    default: null
  },

  // GROUP-BASED PERMISSION FIELDS
  // The role/group who can be chatted with (e.g., 'manager', 'supervisor', 'employee', 'supplier')
  groupRole: {
    type: String,
    enum: ['manager', 'supervisor', 'employee', 'supplier', null],
    default: null
  },
  // The role/group who is allowed to chat with the above group
  allowedGroupRole: {
    type: String,
    enum: ['manager', 'supervisor', 'employee', 'supplier', null],
    default: null
  },

  // PERMISSION TYPE: 'individual' or 'group'
  permissionType: {
    type: String,
    enum: ['individual', 'group'],
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

// Indices for efficient queries
// For individual permissions
ChatPermissionSchema.index({ permissionType: 1, user: 1, allowedUser: 1, businessOwner: 1 }, { sparse: true });
// For group permissions
ChatPermissionSchema.index({ permissionType: 1, groupRole: 1, allowedGroupRole: 1, businessOwner: 1 }, { sparse: true });
// General queries
ChatPermissionSchema.index({ businessOwner: 1, isActive: 1 });
ChatPermissionSchema.index({ allowedUser: 1, isActive: 1 });
ChatPermissionSchema.index({ allowedGroupRole: 1, isActive: 1 });

module.exports = mongoose.model('ChatPermission', ChatPermissionSchema);
