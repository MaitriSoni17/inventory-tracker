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
    role: { 
        type: String, 
        enum: ['employee', 'supervisor', 'manager'],
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
        canCreateProducts: { type: Boolean, default: true },
        canDeleteProducts: { type: Boolean, default: true },
        canCreateWarehouse: { type: Boolean, default: false },
        canDeleteWarehouse: { type: Boolean, default: false },
        canCreateCategory: { type: Boolean, default: true },
        canDeleteCategory: { type: Boolean, default: false },
        canDeleteOrders: { type: Boolean, default: true },
        canManageEmployees: { type: Boolean, default: false },
        canViewAnalytics: { type: Boolean, default: true },
        canExportReports: { type: Boolean, default: false },
        canEditOthersWork: { type: Boolean, default: false },
        canSendNotifications: { type: Boolean, default: false },
        canApproveOrders: { type: Boolean, default: false }
    },
    hasCustomPermissions: { type: Boolean, default: false },
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

