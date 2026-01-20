const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * RolePermissions Model
 * Stores custom permissions for each role, set by the Business Owner.
 * Each business owner can have their own permission configuration.
 */
const RolePermissionsSchema = new Schema({
    businessowner: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'BusinessOwner', 
        required: true,
        unique: true 
    },
    // Manager permissions
    manager: {
        // Products
        canViewProducts: { type: Boolean, default: true },
        canCreateProducts: { type: Boolean, default: true },
        canEditProducts: { type: Boolean, default: true },
        canDeleteProducts: { type: Boolean, default: true },
        
        // Categories
        canViewCategories: { type: Boolean, default: true },
        canCreateCategory: { type: Boolean, default: true },
        canEditCategory: { type: Boolean, default: true },
        canDeleteCategory: { type: Boolean, default: false },
        
        // Warehouses
        canViewWarehouses: { type: Boolean, default: true },
        canCreateWarehouse: { type: Boolean, default: true },
        canEditWarehouse: { type: Boolean, default: true },
        canDeleteWarehouse: { type: Boolean, default: true },
        
        // Orders
        canViewOrders: { type: Boolean, default: true },
        canCreateOrders: { type: Boolean, default: true },
        canEditOrders: { type: Boolean, default: true },
        canDeleteOrders: { type: Boolean, default: true },
        canApproveOrders: { type: Boolean, default: true },
        
        // Employees
        canViewEmployees: { type: Boolean, default: true },
        canManageEmployees: { type: Boolean, default: true },
        canEditOthersWork: { type: Boolean, default: true },
        
        // Analytics & Reports
        canViewAnalytics: { type: Boolean, default: true },
        canExportReports: { type: Boolean, default: true },
        
        // Notifications
        canSendNotifications: { type: Boolean, default: true },
        canViewNotifications: { type: Boolean, default: true },

        // Chat
        canChat: { type: Boolean, default: true },
        
        // Messaging
        canViewMessages: { type: Boolean, default: true },
        canSendMessages: { type: Boolean, default: true },
        canDeleteMessages: { type: Boolean, default: true },

        // Dashboard
        canViewDashboard: { type: Boolean, default: true }
    },
    // Supervisor permissions
    supervisor: {
        // Products
        canViewProducts: { type: Boolean, default: true },
        canCreateProducts: { type: Boolean, default: true },
        canEditProducts: { type: Boolean, default: true },
        canDeleteProducts: { type: Boolean, default: true },
        
        // Categories
        canViewCategories: { type: Boolean, default: true },
        canCreateCategory: { type: Boolean, default: true },
        canEditCategory: { type: Boolean, default: true },
        canDeleteCategory: { type: Boolean, default: false },
        
        // Warehouses
        canViewWarehouses: { type: Boolean, default: false },
        canCreateWarehouse: { type: Boolean, default: false },
        canEditWarehouse: { type: Boolean, default: false },
        canDeleteWarehouse: { type: Boolean, default: false },
        
        // Orders
        canViewOrders: { type: Boolean, default: true },
        canCreateOrders: { type: Boolean, default: true },
        canEditOrders: { type: Boolean, default: true },
        canDeleteOrders: { type: Boolean, default: true },
        canApproveOrders: { type: Boolean, default: false },
        
        // Employees
        canViewEmployees: { type: Boolean, default: true },
        canManageEmployees: { type: Boolean, default: false },
        canEditOthersWork: { type: Boolean, default: true },
        
        // Analytics & Reports
        canViewAnalytics: { type: Boolean, default: true },
        canExportReports: { type: Boolean, default: false },
        
        // Notifications
        canSendNotifications: { type: Boolean, default: false },
        canViewNotifications: { type: Boolean, default: true },

        // Chat
        canChat: { type: Boolean, default: true },
        
        // Messaging
        canViewMessages: { type: Boolean, default: true },
        canSendMessages: { type: Boolean, default: true },
        canDeleteMessages: { type: Boolean, default: true },

        // Dashboard
        canViewDashboard: { type: Boolean, default: true }
    },
    // Employee permissions
    employee: {
        // Products
        canViewProducts: { type: Boolean, default: true },
        canCreateProducts: { type: Boolean, default: true },
        canEditProducts: { type: Boolean, default: true },
        canDeleteProducts: { type: Boolean, default: false },
        
        // Categories
        canViewCategories: { type: Boolean, default: false },
        canCreateCategory: { type: Boolean, default: false },
        canEditCategory: { type: Boolean, default: false },
        canDeleteCategory: { type: Boolean, default: false },
        
        // Warehouses
        canViewWarehouses: { type: Boolean, default: false },
        canCreateWarehouse: { type: Boolean, default: false },
        canEditWarehouse: { type: Boolean, default: false },
        canDeleteWarehouse: { type: Boolean, default: false },
        
        // Orders
        canViewOrders: { type: Boolean, default: true },
        canCreateOrders: { type: Boolean, default: true },
        canEditOrders: { type: Boolean, default: true },
        canDeleteOrders: { type: Boolean, default: false },
        canApproveOrders: { type: Boolean, default: false },
        
        // Employees
        canViewEmployees: { type: Boolean, default: false },
        canManageEmployees: { type: Boolean, default: false },
        canEditOthersWork: { type: Boolean, default: false },
        
        // Analytics & Reports
        canViewAnalytics: { type: Boolean, default: false },
        canExportReports: { type: Boolean, default: false },
        
        // Notifications
        canSendNotifications: { type: Boolean, default: false },
        canViewNotifications: { type: Boolean, default: true },

        // Chat
        canChat: { type: Boolean, default: true },
        
        // Messaging
        canViewMessages: { type: Boolean, default: true },
        canSendMessages: { type: Boolean, default: true },
        canDeleteMessages: { type: Boolean, default: true },

        // Dashboard
        canViewDashboard: { type: Boolean, default: true }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field on save
RolePermissionsSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Static method to get default permissions for a role
RolePermissionsSchema.statics.getDefaultPermissions = function(role) {
    const defaults = {
        manager: {
            canViewProducts: true,
            canCreateProducts: true,
            canEditProducts: true,
            canDeleteProducts: true,
            canViewCategories: true,
            canCreateCategory: true,
            canEditCategory: true,
            canDeleteCategory: false,
            canViewWarehouses: true,
            canCreateWarehouse: true,
            canEditWarehouse: true,
            canDeleteWarehouse: true,
            canViewOrders: true,
            canCreateOrders: true,
            canEditOrders: true,
            canDeleteOrders: true,
            canApproveOrders: true,
            canViewEmployees: true,
            canManageEmployees: true,
            canEditOthersWork: true,
            canViewAnalytics: true,
            canExportReports: true,
            canSendNotifications: true,
            canViewNotifications: true,
            canChat: true,
            canViewMessages: true,
            canSendMessages: true,
            canDeleteMessages: true,
            canViewDashboard: true
        },
        supervisor: {
            canViewProducts: true,
            canCreateProducts: true,
            canEditProducts: true,
            canDeleteProducts: true,
            canViewCategories: true,
            canCreateCategory: true,
            canEditCategory: true,
            canDeleteCategory: false,
            canViewWarehouses: false,
            canCreateWarehouse: false,
            canEditWarehouse: false,
            canDeleteWarehouse: false,
            canViewOrders: true,
            canCreateOrders: true,
            canEditOrders: true,
            canDeleteOrders: true,
            canApproveOrders: false,
            canViewEmployees: true,
            canManageEmployees: false,
            canEditOthersWork: true,
            canViewAnalytics: true,
            canExportReports: false,
            canSendNotifications: false,
            canViewNotifications: true,
            canChat: true,
            canViewMessages: true,
            canSendMessages: true,
            canDeleteMessages: true,
            canViewDashboard: true
        },
        employee: {
            canViewProducts: true,
            canCreateProducts: true,
            canEditProducts: true,
            canDeleteProducts: false,
            canViewCategories: false,
            canCreateCategory: false,
            canEditCategory: false,
            canDeleteCategory: false,
            canViewWarehouses: false,
            canCreateWarehouse: false,
            canEditWarehouse: false,
            canDeleteWarehouse: false,
            canViewOrders: true,
            canCreateOrders: true,
            canEditOrders: true,
            canDeleteOrders: false,
            canApproveOrders: false,
            canViewEmployees: false,
            canManageEmployees: false,
            canEditOthersWork: false,
            canViewAnalytics: false,
            canExportReports: false,
            canSendNotifications: false,
            canViewNotifications: true,
            canChat: true,
            canViewMessages: true,
            canSendMessages: true,
            canDeleteMessages: true,
            canViewDashboard: true
        }
    };
    return defaults[role] || defaults.employee;
};

module.exports = mongoose.model('RolePermissions', RolePermissionsSchema);
