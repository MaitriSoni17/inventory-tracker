const mongoose = require('mongoose');
const { Schema } = mongoose;

const Employee = new Schema({
    businessowner: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessOwner', required: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null },
    fname: {  type: String, required: true },
    lname: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    birthDate: { type: String },
    gender: {type: String },
    jDate: { type: String },
    nationality: { type: String },
    country: { type: String },
    state: { type: String },
    city: { type: String },
    hireAt: { type: String },
    phone: { type: String },
    address: { type: String },
    image: { type: String },
    about: { type: String },
    salary: {
        baseSalary: { type: Number, default: 0 },
        currency: { type: String, default: 'INR' },
        paymentFrequency: { type: String, enum: ['monthly', 'weekly', 'daily'], default: 'monthly' },
        lastUpdated: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessOwner' }
    },
    role: { 
        type: String, 
        default: 'employee'
    },
    department: { 
        type: String,
        default: null 
    },
    reportingTo: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Employee',
        default: null // null if reports directly to BusinessOwner
    },
    subordinates: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Employee' 
    }],
    permissions: {
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
        
        // Report Downloads
        canDownloadEmployeeReport: { type: Boolean, default: false },
        canDownloadProductReport: { type: Boolean, default: false },
        canDownloadOrderReport: { type: Boolean, default: false },
        canDownloadSupplierOrderReport: { type: Boolean, default: false },
        canDownloadSupplierReport: { type: Boolean, default: false },
        canDownloadSalaryReport: { type: Boolean, default: false },
        
        // Notifications
        canSendNotifications: { type: Boolean, default: false },
        canViewNotifications: { type: Boolean, default: true },

        // Messaging
        canViewMessages: { type: Boolean, default: true },
        canSendMessages: { type: Boolean, default: true },
        canDeleteMessages: { type: Boolean, default: true },
        canMessageSuppliers: { type: Boolean, default: true },
        canMessageColleagues: { type: Boolean, default: true },

        // Dashboard
        canViewDashboard: { type: Boolean, default: true }
    },
    hasCustomPermissions: { type: Boolean, default: false },
    // Optional category restriction for product access.
    // Undefined means unrestricted product-category access.
    allowedProductCategories: [{ type: String }],
    hasCustomCategoryAccess: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },
    mustChangePassword: { type: Boolean, default: false },
    lastLogin: { type: Date },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    preferences: {
        emailNotifications: { type: Boolean, default: true },
        orderAlerts: { type: Boolean, default: true },
        lowStockAlerts: { type: Boolean, default: true },
        weeklyReport: { type: Boolean, default: false }
    }
});

module.exports = mongoose.model('Employee', Employee);

