/**
 * Role-Based Access Control (RBAC) Middleware
 * Validates user permissions based on their role and specific actions
 */

const Employee = require('../models/Employee');
const RolePermissions = require('../models/RolePermissions');

// Default permissions for each role (fallback when no custom permissions exist)
const rolePermissions = {
    businessowner: {
        canViewProducts: true,
        canCreateProducts: true,
        canEditProducts: true,
        canDeleteProducts: true,
        canViewCategories: true,
        canCreateCategory: true,
        canEditCategory: true,
        canDeleteCategory: true,
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
        canDownloadEmployeeReport: true,
        canDownloadProductReport: true,
        canDownloadOrderReport: true,
        canDownloadSupplierOrderReport: true,
        canDownloadSupplierReport: true,
        canDownloadSalaryReport: true,
        canSendNotifications: true,
        canViewNotifications: true,
        canViewDashboard: true
    },
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
        canDownloadEmployeeReport: false,
        canDownloadProductReport: true,
        canDownloadOrderReport: true,
        canDownloadSupplierOrderReport: true,
        canDownloadSupplierReport: true,
        canDownloadSalaryReport: false,
        canSendNotifications: true,
        canViewNotifications: true,
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
        canDownloadEmployeeReport: true,
        canDownloadProductReport: true,
        canDownloadOrderReport: true,
        canDownloadSupplierOrderReport: true,
        canDownloadSupplierReport: true,
        canDownloadSalaryReport: false,
        canSendNotifications: false,
        canViewNotifications: true,
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
        canDownloadEmployeeReport: true,
        canDownloadProductReport: true,
        canDownloadOrderReport: false,
        canDownloadSupplierOrderReport: false,
        canDownloadSupplierReport: false,
        canDownloadSalaryReport: false,
        canSendNotifications: false,
        canViewNotifications: true,
        canViewDashboard: true
    }
};

/**
 * Check if user has specific permission
 * First checks user's custom permissions, then falls back to role defaults
 * @param {Object} user - User object from request
 * @param {String} permission - Permission to check
 * @returns {Boolean} - True if user has permission
 */
const hasPermission = (user, permission) => {
    if (user.role === 'businessowner') return true; // Business owner has all permissions
    
    // Check if user has custom permissions set
    if (user.permissions && user.permissions[permission] !== undefined) {
        return user.permissions[permission];
    }
    
    // Fall back to role defaults
    const perms = rolePermissions[user.role];
    return perms ? perms[permission] : false;
};

/**
 * Async version of hasPermission that checks database for custom permissions
 * @param {Object} user - User object from request
 * @param {String} permission - Permission to check
 * @param {String} businessOwnerId - Business owner ID for fetching custom permissions
 * @returns {Promise<Boolean>} - True if user has permission
 */
const hasPermissionAsync = async (user, permission, businessOwnerId) => {
    if (user.role === 'businessowner') return true;
    
    // Check user's own permissions first
    if (user.permissions && user.permissions[permission] !== undefined) {
        return user.permissions[permission];
    }
    
    // Try to get custom permissions from database
    try {
        const customPermissions = await RolePermissions.findOne({ businessowner: businessOwnerId });
        if (customPermissions && customPermissions[user.role] && customPermissions[user.role][permission] !== undefined) {
            return customPermissions[user.role][permission];
        }
    } catch (err) {
        // console.error('Error fetching custom permissions:', err);
    }
    
    // Fall back to role defaults
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
    
    // If item has no creator (e.g., created by business owner), allow managers/supervisors based on org
    if (!itemCreatorId) {
        if (requestUser.role === 'manager' || requestUser.role === 'supervisor') return true;
        return false;
    }

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

    // If item has no creator (e.g., created by business owner), allow managers/supervisors
    if (!itemCreatorId) {
        if (requestUser.role === 'manager' || requestUser.role === 'supervisor') return true;
        return false;
    }
    
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

/**
 * Middleware to verify user can export reports
 */
const requireExportReports = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if user has the canExportReports permission
    const businessOwnerId = req.businessowner || req.user.businessowner || req.user._id;
    const allowed = await hasPermissionAsync(req.user, 'canExportReports', businessOwnerId);
    if (!allowed) {
        return res.status(403).json({ error: "You do not have permission to export reports" });
    }

    next();
};

/**
 * Middleware factory to restrict report routes to business owner only
 */
const requireBusinessOwnerForReport = (reportName) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: `Only Business Owner can export ${reportName} reports` });
        }
        next();
    };
};

/**
 * Middleware factory to check a specific view permission before allowing report export
 */
const requireViewPermissionForReport = (viewPermission, reportName) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        const businessOwnerId = req.businessowner || req.user.businessowner || req.user._id;
        const allowed = await hasPermissionAsync(req.user, viewPermission, businessOwnerId);
        if (!allowed) {
            return res.status(403).json({ error: `You do not have permission to export ${reportName} reports` });
        }
        next();
    };
};

module.exports = {
    hasPermission,
    hasPermissionAsync,
    canAccessUserWork,
    requirePermission,
    requireEmployeeManagement,
    requireWarehouseManagement,
    requireCategoryManagement,
    requireDeletePermission,
    requireAnalyticsAccess,
    requireNotificationAccess,
    requireExportReports,
    requireBusinessOwnerForReport,
    requireViewPermissionForReport,
    getDataFilter,
    canEditItem,
    canDeleteItem,
    getSubordinates,
    getAllTeamMembers,
    rolePermissions
};
