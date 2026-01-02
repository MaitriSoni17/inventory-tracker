/**
 * Role-Based Access Control (RBAC) Middleware
 * Validates user permissions based on their role and specific actions
 */

const Employee = require('../models/Employee');

// Default permissions for each role
const rolePermissions = {
    businessowner: {
        canCreateProducts: true,
        canDeleteProducts: true,
        canCreateWarehouse: true,
        canDeleteWarehouse: true,
        canCreateCategory: true,
        canDeleteCategory: true,
        canDeleteOrders: true,
        canManageEmployees: true,
        canViewAnalytics: true,
        canExportReports: true,
        canEditOthersWork: true,
        canSendNotifications: true,
        canApproveOrders: true
    },
    manager: {
        canCreateProducts: true,
        canDeleteProducts: true,
        canCreateWarehouse: true,
        canDeleteWarehouse: true,
        canCreateCategory: true,
        canDeleteCategory: false,
        canDeleteOrders: true,
        canManageEmployees: true, // Can manage team members
        canViewAnalytics: true,
        canExportReports: true,
        canEditOthersWork: true, // Can edit team members' work
        canSendNotifications: true,
        canApproveOrders: true
    },
    supervisor: {
        canCreateProducts: true,
        canDeleteProducts: true,
        canCreateWarehouse: false,
        canDeleteWarehouse: false,
        canCreateCategory: true,
        canDeleteCategory: false,
        canDeleteOrders: true,
        canManageEmployees: false,
        canViewAnalytics: true,
        canExportReports: false,
        canEditOthersWork: true, // Can edit direct reports' work
        canSendNotifications: false,
        canApproveOrders: false
    },
    employee: {
        canCreateProducts: true,
        canDeleteProducts: false,
        canCreateWarehouse: false,
        canDeleteWarehouse: false,
        canCreateCategory: false,
        canDeleteCategory: false,
        canDeleteOrders: false,
        canManageEmployees: false,
        canViewAnalytics: false,
        canExportReports: false,
        canEditOthersWork: false,
        canSendNotifications: false,
        canApproveOrders: false
    }
};

/**
 * Check if user has specific permission
 * @param {Object} user - User object from request
 * @param {String} permission - Permission to check
 * @returns {Boolean} - True if user has permission
 */
const hasPermission = (user, permission) => {
    if (user.role === 'businessowner') return true; // Business owner has all permissions
    
    const perms = rolePermissions[user.role];
    return perms ? perms[permission] : false;
};

/**
 * Check if user can access/edit another user's work
 * @param {Object} requestUser - User making the request
 * @param {Object} targetUser - User whose work is being accessed
 * @returns {Boolean} - True if access is allowed
 */
const canAccessUserWork = async (requestUser, targetUser) => {
    // Business owner can access everyone
    if (requestUser.role === 'businessowner') return true;
    
    // If same user, always allowed
    if (requestUser._id.toString() === targetUser._id.toString()) return true;
    
    // Check if requestUser is manager or supervisor of targetUser
    if (requestUser.role === 'manager' || requestUser.role === 'supervisor') {
        const isSupervisor = targetUser.reportingTo?.toString() === requestUser._id.toString();
        if (isSupervisor) return true;
    }
    
    return false;
};

/**
 * Middleware to check if user has permission for an action
 * @param {String} permission - Permission to check
 * @returns {Function} - Middleware function
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        if (!hasPermission(req.user, permission)) {
            return res.status(403).json({ 
                error: `You do not have permission to ${permission}`,
                requiredRole: permission
            });
        }

        next();
    };
};

/**
 * Middleware to check if user can manage employees
 */
const requireEmployeeManagement = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    if (req.user.role !== 'businessowner' && req.user.role !== 'manager') {
        return res.status(403).json({ error: "Only Business Owner and Managers can manage employees" });
    }

    next();
};

/**
 * Middleware to check if user can manage warehouses
 */
const requireWarehouseManagement = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    if (!['businessowner', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: "You do not have permission to manage warehouses" });
    }

    next();
};

/**
 * Middleware to check if user can manage categories
 */
const requireCategoryManagement = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    if (!['businessowner', 'manager', 'supervisor'].includes(req.user.role)) {
        return res.status(403).json({ error: "You do not have permission to manage categories" });
    }

    next();
};

/**
 * Middleware to check if user can delete items
 */
const requireDeletePermission = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    if (!hasPermission(req.user, 'canDeleteOrders') && !hasPermission(req.user, 'canDeleteProducts')) {
        return res.status(403).json({ error: "You do not have permission to delete items" });
    }

    next();
};

/**
 * Get filtered data based on user role
 * For employees, return only their data and their manager's data
 * For supervisors, return their team's data
 * For managers, return their team's data
 * For business owner, return all data
 */
const getDataFilter = async (requestUser, targetBusinessOwner) => {
    // Business owner sees all
    if (requestUser.role === 'businessowner') {
        return { businessowner: targetBusinessOwner };
    }

    // Manager sees all in their business
    if (requestUser.role === 'manager') {
        return { businessowner: targetBusinessOwner };
    }

    // Supervisor sees only their team's work
    if (requestUser.role === 'supervisor') {
        // Get all employees reporting to this supervisor
        const subordinates = await Employee.find({ reportingTo: requestUser._id });
        const subordinateIds = subordinates.map(s => s._id);
        
        return {
            $or: [
                { employee: requestUser._id }, // Their own work
                { employee: { $in: subordinateIds } } // Their team's work
            ]
        };
    }

    // Regular employee sees only their own work
    return { employee: requestUser._id };
};

/**
 * Check if user can edit a specific product/order/item
 * Owner: Can edit everything
 * Manager: Can edit own and team's items
 * Supervisor: Can edit own and direct reports' items
 * Employee: Can only edit own items
 */
const canEditItem = async (requestUser, itemCreatorId, itemOwnerId = null) => {
    // Business owner can edit everything
    if (requestUser.role === 'businessowner') return true;
    
    // User can always edit their own items
    if (requestUser._id.toString() === itemCreatorId.toString()) return true;
    
    // Manager can edit team members' items
    if (requestUser.role === 'manager') {
        const creator = await Employee.findById(itemCreatorId);
        if (creator && creator.businessowner.toString() === requestUser.businessowner.toString()) {
            return true; // Manager can edit any item in their organization
        }
    }
    
    // Supervisor can edit direct reports' items
    if (requestUser.role === 'supervisor') {
        const creator = await Employee.findById(itemCreatorId);
        if (creator && creator.reportingTo?.toString() === requestUser._id.toString()) {
            return true; // Supervisor can edit direct report's items
        }
    }
    
    return false;
};

/**
 * Check if user can delete a specific item
 * Owner: Can delete everything
 * Manager: Can delete team items
 * Supervisor: Can delete team items
 * Employee: Cannot delete
 */
const canDeleteItem = async (requestUser, itemCreatorId) => {
    // Business owner can delete everything
    if (requestUser.role === 'businessowner') return true;
    
    // Employees cannot delete
    if (requestUser.role === 'employee') return false;
    
    // Manager can delete team items
    if (requestUser.role === 'manager') {
        const creator = await Employee.findById(itemCreatorId);
        if (creator && creator.businessowner.toString() === requestUser.businessowner.toString()) {
            return true;
        }
    }
    
    // Supervisor can delete direct reports' items
    if (requestUser.role === 'supervisor') {
        const creator = await Employee.findById(itemCreatorId);
        if (creator && creator.reportingTo?.toString() === requestUser._id.toString()) {
            return true;
        }
    }
    
    return false;
};

/**
 * Get all subordinates of a user (direct reports)
 */
const getSubordinates = async (managerId) => {
    try {
        return await Employee.find({ reportingTo: managerId }).select('_id');
    } catch (error) {
        return [];
    }
};

/**
 * Get all team members under a manager (recursive)
 * Includes supervisors and their employees
 */
const getAllTeamMembers = async (managerId) => {
    try {
        // Get direct reports
        const directReports = await Employee.find({ reportingTo: managerId }).select('_id');
        const teamMembers = [managerId, ...directReports.map(m => m._id)];
        
        // Get employees under each supervisor
        for (const supervisor of directReports) {
            if (supervisor.role === 'supervisor') {
                const employees = await Employee.find({ reportingTo: supervisor._id }).select('_id');
                teamMembers.push(...employees.map(e => e._id));
            }
        }
        
        return teamMembers;
    } catch (error) {
        return [managerId];
    }
};

/**
 * Middleware to verify user can view team analytics
 */
const requireAnalyticsAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    if (!['businessowner', 'manager', 'supervisor'].includes(req.user.role)) {
        return res.status(403).json({ error: "You do not have permission to view analytics" });
    }

    next();
};

/**
 * Middleware to verify user can send notifications
 */
const requireNotificationAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    if (!['businessowner', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: "Only Managers and Business Owner can send notifications" });
    }

    next();
};

module.exports = {
    hasPermission,
    canAccessUserWork,
    requirePermission,
    requireEmployeeManagement,
    requireWarehouseManagement,
    requireCategoryManagement,
    requireDeletePermission,
    requireAnalyticsAccess,
    requireNotificationAccess,
    getDataFilter,
    canEditItem,
    canDeleteItem,
    getSubordinates,
    getAllTeamMembers,
    rolePermissions
};
