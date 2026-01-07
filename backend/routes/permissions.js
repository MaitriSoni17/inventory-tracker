const express = require('express');
const router = express.Router();
const RolePermissions = require('../models/RolePermissions');
const Employee = require('../models/Employee');
const fetchuser = require('../middleware/fetchuser');

/**
 * Helper function to compare if employee permissions match role permissions
 * Returns true if they match (no custom permissions)
 */
const permissionsMatchRole = (employeePerms, rolePerms) => {
    if (!employeePerms || !rolePerms) return false;
    
    // Convert to plain objects if needed
    const empPerms = employeePerms.toObject ? employeePerms.toObject() : employeePerms;
    const rolPerms = rolePerms.toObject ? rolePerms.toObject() : rolePerms;
    
    // Get all permission keys from both objects
    const allKeys = new Set([...Object.keys(empPerms), ...Object.keys(rolPerms)]);
    
    // Remove mongoose internal fields
    allKeys.delete('_id');
    allKeys.delete('$__');
    allKeys.delete('$isNew');
    
    for (const key of allKeys) {
        // Skip non-permission fields
        if (key.startsWith('$') || key === '_id') continue;
        
        const empVal = empPerms[key];
        const roleVal = rolPerms[key];
        
        // If values are different, permissions are custom
        if (empVal !== roleVal) {
            return false;
        }
    }
    
    return true;
};

/**
 * Get role permissions for the business owner's organization
 * GET /api/permissions/get
 */
router.post('/get', fetchuser, async (req, res) => {
    try {
        // Only business owner can access permissions settings
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: "Only Business Owner can manage permissions" });
        }

        let rolePermissions = await RolePermissions.findOne({ businessowner: req.user._id });
        
        // If no permissions document exists, create one with defaults
        if (!rolePermissions) {
            rolePermissions = await RolePermissions.create({
                businessowner: req.user._id,
                manager: RolePermissions.getDefaultPermissions('manager'),
                supervisor: RolePermissions.getDefaultPermissions('supervisor'),
                employee: RolePermissions.getDefaultPermissions('employee')
            });
        }

        res.json({
            success: true,
            permissions: {
                manager: rolePermissions.manager,
                supervisor: rolePermissions.supervisor,
                employee: rolePermissions.employee
            },
            updatedAt: rolePermissions.updatedAt
        });
    } catch (err) {
        console.error('Error getting permissions:', err);
        res.status(500).json({ error: "Internal Server error occurred", details: err.message });
    }
});

/**
 * Update role permissions
 * PUT /api/permissions/update
 */
router.put('/update', fetchuser, async (req, res) => {
    try {
        // Only business owner can update permissions
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: "Only Business Owner can manage permissions" });
        }

        const { role, permissions } = req.body;

        // Validate role
        if (!['manager', 'supervisor', 'employee'].includes(role)) {
            return res.status(400).json({ error: "Invalid role specified" });
        }

        // Find or create permissions document
        let rolePermissions = await RolePermissions.findOne({ businessowner: req.user._id });
        
        if (!rolePermissions) {
            rolePermissions = new RolePermissions({
                businessowner: req.user._id,
                manager: RolePermissions.getDefaultPermissions('manager'),
                supervisor: RolePermissions.getDefaultPermissions('supervisor'),
                employee: RolePermissions.getDefaultPermissions('employee')
            });
        }

        // Update the specific role's permissions
        rolePermissions[role] = { ...rolePermissions[role].toObject(), ...permissions };
        await rolePermissions.save();

        // Convert to plain object for MongoDB update and remove mongoose internal fields
        const rawPerms = rolePermissions[role].toObject ? rolePermissions[role].toObject() : rolePermissions[role];
        const permissionsToUpdate = {};
        
        // Only copy actual permission fields (those starting with 'can')
        for (const key of Object.keys(rawPerms)) {
            if (key.startsWith('can')) {
                permissionsToUpdate[key] = rawPerms[key];
            }
        }

        // Only update employees who don't have custom permissions set
        // $or handles both: hasCustomPermissions is false, or field doesn't exist
        const updateResult = await Employee.updateMany(
            { 
                businessowner: req.user._id, 
                role: role,
                $or: [
                    { hasCustomPermissions: false },
                    { hasCustomPermissions: { $exists: false } }
                ]
            },
            { $set: { permissions: permissionsToUpdate } }
        );
        
        console.log(`Updated ${updateResult.modifiedCount} employees with new ${role} permissions`);

        res.json({
            success: true,
            message: `${role.charAt(0).toUpperCase() + role.slice(1)} permissions updated successfully`,
            permissions: rolePermissions[role]
        });
    } catch (err) {
        console.error('Error updating permissions:', err);
        res.status(500).json({ error: "Internal Server error occurred", details: err.message });
    }
});

/**
 * Update a single permission for a specific role
 * PUT /api/permissions/update-single
 */
router.put('/update-single', fetchuser, async (req, res) => {
    try {
        // Only business owner can update permissions
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: "Only Business Owner can manage permissions" });
        }

        const { role, permissionKey, value } = req.body;

        // Validate role
        if (!['manager', 'supervisor', 'employee'].includes(role)) {
            return res.status(400).json({ error: "Invalid role specified" });
        }

        // Find or create permissions document
        let rolePermissions = await RolePermissions.findOne({ businessowner: req.user._id });
        
        if (!rolePermissions) {
            rolePermissions = new RolePermissions({
                businessowner: req.user._id,
                manager: RolePermissions.getDefaultPermissions('manager'),
                supervisor: RolePermissions.getDefaultPermissions('supervisor'),
                employee: RolePermissions.getDefaultPermissions('employee')
            });
        }

        // Update the specific permission
        rolePermissions[role][permissionKey] = value;
        await rolePermissions.save();

        // Only update employees who don't have custom permissions set
        const updateQuery = {};
        updateQuery[`permissions.${permissionKey}`] = value;
        
        const updateResult = await Employee.updateMany(
            { 
                businessowner: req.user._id, 
                role: role,
                $or: [
                    { hasCustomPermissions: false },
                    { hasCustomPermissions: { $exists: false } }
                ]
            },
            { $set: updateQuery }
        );
        
        console.log(`Updated ${updateResult.modifiedCount} employees with permission ${permissionKey}=${value}`);

        res.json({
            success: true,
            message: `Permission updated successfully`,
            role: role,
            permissionKey: permissionKey,
            value: value
        });
    } catch (err) {
        console.error('Error updating single permission:', err);
        res.status(500).json({ error: "Internal Server error occurred", details: err.message });
    }
});

/**
 * Reset permissions to default for a specific role
 * PUT /api/permissions/reset
 */
router.put('/reset', fetchuser, async (req, res) => {
    try {
        // Only business owner can reset permissions
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: "Only Business Owner can manage permissions" });
        }

        const { role } = req.body;

        // Validate role
        if (!['manager', 'supervisor', 'employee', 'all'].includes(role)) {
            return res.status(400).json({ error: "Invalid role specified" });
        }

        let rolePermissions = await RolePermissions.findOne({ businessowner: req.user._id });
        
        if (!rolePermissions) {
            rolePermissions = new RolePermissions({
                businessowner: req.user._id
            });
        }

        if (role === 'all') {
            // Reset all roles to defaults
            rolePermissions.manager = RolePermissions.getDefaultPermissions('manager');
            rolePermissions.supervisor = RolePermissions.getDefaultPermissions('supervisor');
            rolePermissions.employee = RolePermissions.getDefaultPermissions('employee');
            
            // Update all employees
            await Employee.updateMany(
                { businessowner: req.user._id, role: 'manager' },
                { $set: { permissions: rolePermissions.manager } }
            );
            await Employee.updateMany(
                { businessowner: req.user._id, role: 'supervisor' },
                { $set: { permissions: rolePermissions.supervisor } }
            );
            await Employee.updateMany(
                { businessowner: req.user._id, role: 'employee' },
                { $set: { permissions: rolePermissions.employee } }
            );
        } else {
            // Reset specific role to defaults
            rolePermissions[role] = RolePermissions.getDefaultPermissions(role);
            
            // Update employees of that role
            await Employee.updateMany(
                { businessowner: req.user._id, role: role },
                { $set: { permissions: rolePermissions[role] } }
            );
        }

        await rolePermissions.save();

        res.json({
            success: true,
            message: role === 'all' ? 'All permissions reset to defaults' : `${role.charAt(0).toUpperCase() + role.slice(1)} permissions reset to defaults`,
            permissions: {
                manager: rolePermissions.manager,
                supervisor: rolePermissions.supervisor,
                employee: rolePermissions.employee
            }
        });
    } catch (err) {
        console.error('Error resetting permissions:', err);
        res.status(500).json({ error: "Internal Server error occurred", details: err.message });
    }
});

/**
 * Get permissions for the current logged-in employee
 * POST /api/permissions/my-permissions
 */
router.post('/my-permissions', fetchuser, async (req, res) => {
    try {
        // Business owner has all permissions
        if (req.role === 'businessowner') {
            return res.json({
                success: true,
                role: 'businessowner',
                permissions: {
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
                    canSendNotifications: true,
                    canViewNotifications: true,
                    canViewDashboard: true
                }
            });
        }

        // For employees, get their specific permissions from their profile
        const employee = await Employee.findById(req.user._id).select('permissions role businessowner hasCustomPermissions');
        
        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // Convert Mongoose subdocument to plain object and extract only permission keys
        const extractPermissions = (permsObj) => {
            const rawPerms = permsObj && permsObj.toObject ? permsObj.toObject() : permsObj;
            if (!rawPerms) return null;
            
            const cleanPerms = {};
            for (const key of Object.keys(rawPerms)) {
                if (key.startsWith('can')) {
                    cleanPerms[key] = rawPerms[key];
                }
            }
            return cleanPerms;
        };

        // Check if employee has permissions embedded
        const employeePerms = extractPermissions(employee.permissions);
        
        // If employee has permissions set (and they are not all undefined/null), use them
        if (employeePerms && Object.keys(employeePerms).length > 0) {
            return res.json({
                success: true,
                role: employee.role,
                permissions: employeePerms,
                hasCustomPermissions: employee.hasCustomPermissions || false
            });
        }

        // Fallback: get from role permissions for this business owner
        const rolePermissions = await RolePermissions.findOne({ businessowner: employee.businessowner });
        
        if (rolePermissions && rolePermissions[employee.role]) {
            const rolePerms = extractPermissions(rolePermissions[employee.role]);
            return res.json({
                success: true,
                role: employee.role,
                permissions: rolePerms,
                hasCustomPermissions: false
            });
        }
        
        // Return defaults if nothing found
        return res.json({
            success: true,
            role: employee.role,
            permissions: RolePermissions.getDefaultPermissions(employee.role),
            hasCustomPermissions: false
        });
    } catch (err) {
        console.error('Error getting my permissions:', err);
        res.status(500).json({ error: "Internal Server error occurred", details: err.message });
    }
});

/**
 * Get all employees with their permissions for individual permission management
 * GET /api/permissions/employees
 */
router.get('/employees', fetchuser, async (req, res) => {
    try {
        // Only business owner can access this
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: "Only Business Owner can manage permissions" });
        }

        const employees = await Employee.find({ businessowner: req.user._id })
            .select('fname lname email role permissions department image isActive hasCustomPermissions')
            .sort({ role: 1, fname: 1 });

        res.json({
            success: true,
            employees: employees
        });
    } catch (err) {
        console.error('Error getting employees for permissions:', err);
        res.status(500).json({ error: "Internal Server error occurred", details: err.message });
    }
});

/**
 * Get individual employee permissions
 * GET /api/permissions/employee/:id
 */
router.get('/employee/:id', fetchuser, async (req, res) => {
    try {
        // Only business owner can access this
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: "Only Business Owner can manage permissions" });
        }

        const employee = await Employee.findOne({ 
            _id: req.params.id, 
            businessowner: req.user._id 
        }).select('fname lname email role permissions department image');

        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        res.json({
            success: true,
            employee: employee
        });
    } catch (err) {
        console.error('Error getting employee permissions:', err);
        res.status(500).json({ error: "Internal Server error occurred", details: err.message });
    }
});

/**
 * Update individual employee permissions
 * PUT /api/permissions/employee/:id
 */
router.put('/employee/:id', fetchuser, async (req, res) => {
    try {
        // Only business owner can update permissions
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: "Only Business Owner can manage permissions" });
        }

        const { permissions } = req.body;

        // First, update the employee's permissions
        let employee = await Employee.findOneAndUpdate(
            { _id: req.params.id, businessowner: req.user._id },
            { $set: { permissions: permissions } },
            { new: true }
        ).select('fname lname email role permissions hasCustomPermissions');

        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // Get role permissions to compare
        const rolePermissions = await RolePermissions.findOne({ businessowner: req.user._id });
        const rolePerms = rolePermissions && rolePermissions[employee.role] 
            ? rolePermissions[employee.role] 
            : RolePermissions.getDefaultPermissions(employee.role);

        // Check if permissions match role defaults
        const isCustom = !permissionsMatchRole(employee.permissions, rolePerms);
        
        // Update hasCustomPermissions flag if needed
        if (employee.hasCustomPermissions !== isCustom) {
            employee = await Employee.findByIdAndUpdate(
                employee._id,
                { $set: { hasCustomPermissions: isCustom } },
                { new: true }
            ).select('fname lname email role permissions hasCustomPermissions');
        }

        res.json({
            success: true,
            message: `Permissions updated for ${employee.fname} ${employee.lname || ''}`,
            employee: employee
        });
    } catch (err) {
        console.error('Error updating employee permissions:', err);
        res.status(500).json({ error: "Internal Server error occurred", details: err.message });
    }
});

/**
 * Update a single permission for an individual employee
 * PUT /api/permissions/employee/:id/single
 */
router.put('/employee/:id/single', fetchuser, async (req, res) => {
    try {
        // Only business owner can update permissions
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: "Only Business Owner can manage permissions" });
        }

        const { permissionKey, value } = req.body;

        const updateQuery = {};
        updateQuery[`permissions.${permissionKey}`] = value;

        // First update the permission
        let employee = await Employee.findOneAndUpdate(
            { _id: req.params.id, businessowner: req.user._id },
            { $set: updateQuery },
            { new: true }
        ).select('fname lname email role permissions hasCustomPermissions');

        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // Get role permissions to compare
        const rolePermissions = await RolePermissions.findOne({ businessowner: req.user._id });
        const rolePerms = rolePermissions && rolePermissions[employee.role] 
            ? rolePermissions[employee.role] 
            : RolePermissions.getDefaultPermissions(employee.role);

        // Check if permissions match role defaults
        const isCustom = !permissionsMatchRole(employee.permissions, rolePerms);
        
        // Update hasCustomPermissions flag if needed
        if (employee.hasCustomPermissions !== isCustom) {
            employee = await Employee.findByIdAndUpdate(
                employee._id,
                { $set: { hasCustomPermissions: isCustom } },
                { new: true }
            ).select('fname lname email role permissions hasCustomPermissions');
        }

        res.json({
            success: true,
            message: `Permission updated for ${employee.fname}`,
            employee: employee,
            permissionKey: permissionKey,
            value: value
        });
    } catch (err) {
        console.error('Error updating employee single permission:', err);
        res.status(500).json({ error: "Internal Server error occurred", details: err.message });
    }
});

/**
 * Reset individual employee permissions to role defaults
 * PUT /api/permissions/employee/:id/reset
 */
router.put('/employee/:id/reset', fetchuser, async (req, res) => {
    try {
        // Only business owner can reset permissions
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: "Only Business Owner can manage permissions" });
        }

        // Get employee to find their role
        const employee = await Employee.findOne({ 
            _id: req.params.id, 
            businessowner: req.user._id 
        });

        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // Get role permissions for this business owner
        let rolePermissions = await RolePermissions.findOne({ businessowner: req.user._id });
        
        let defaultPermissions;
        if (rolePermissions && rolePermissions[employee.role]) {
            // Use business owner's customized role permissions
            defaultPermissions = rolePermissions[employee.role];
        } else {
            // Use system defaults
            defaultPermissions = RolePermissions.getDefaultPermissions(employee.role);
        }

        // Update employee with role defaults and reset custom flag
        const updatedEmployee = await Employee.findByIdAndUpdate(
            req.params.id,
            { $set: { permissions: defaultPermissions, hasCustomPermissions: false } },
            { new: true }
        ).select('fname lname email role permissions hasCustomPermissions');

        res.json({
            success: true,
            message: `Permissions reset to ${employee.role} defaults for ${employee.fname} ${employee.lname || ''}`,
            employee: updatedEmployee
        });
    } catch (err) {
        console.error('Error resetting employee permissions:', err);
        res.status(500).json({ error: "Internal Server error occurred", details: err.message });
    }
});

/**
 * Get permission groups with descriptions for the UI
 * GET /api/permissions/groups
 */
router.get('/groups', fetchuser, async (req, res) => {
    try {
        // Only business owner can access this
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: "Only Business Owner can access permission settings" });
        }

        const permissionGroups = [
            {
                id: 'products',
                name: 'Products Management',
                icon: 'fas fa-box',
                description: 'Control access to product-related features',
                permissions: [
                    { key: 'canViewProducts', label: 'View Products', description: 'Can view all products in the inventory' },
                    { key: 'canCreateProducts', label: 'Create Products', description: 'Can add new products to inventory' },
                    { key: 'canEditProducts', label: 'Edit Products', description: 'Can modify existing product details' },
                    { key: 'canDeleteProducts', label: 'Delete Products', description: 'Can remove products from inventory' }
                ]
            },
            {
                id: 'categories',
                name: 'Categories Management',
                icon: 'fas fa-cube',
                description: 'Control access to category-related features',
                permissions: [
                    { key: 'canViewCategories', label: 'View Categories', description: 'Can view all categories' },
                    { key: 'canCreateCategory', label: 'Create Categories', description: 'Can add new categories' },
                    { key: 'canEditCategory', label: 'Edit Categories', description: 'Can modify existing categories' },
                    { key: 'canDeleteCategory', label: 'Delete Categories', description: 'Can remove categories' }
                ]
            },
            {
                id: 'warehouses',
                name: 'Warehouses Management',
                icon: 'fas fa-warehouse',
                description: 'Control access to warehouse-related features',
                permissions: [
                    { key: 'canViewWarehouses', label: 'View Warehouses', description: 'Can view all warehouses' },
                    { key: 'canCreateWarehouse', label: 'Create Warehouses', description: 'Can add new warehouses' },
                    { key: 'canEditWarehouse', label: 'Edit Warehouses', description: 'Can modify existing warehouses' },
                    { key: 'canDeleteWarehouse', label: 'Delete Warehouses', description: 'Can remove warehouses' }
                ]
            },
            {
                id: 'orders',
                name: 'Orders Management',
                icon: 'bi bi-cart',
                description: 'Control access to order-related features',
                permissions: [
                    { key: 'canViewOrders', label: 'View Orders', description: 'Can view all orders' },
                    { key: 'canCreateOrders', label: 'Create Orders', description: 'Can create new orders' },
                    { key: 'canEditOrders', label: 'Edit Orders', description: 'Can modify existing orders' },
                    { key: 'canDeleteOrders', label: 'Delete Orders', description: 'Can remove orders' },
                    { key: 'canApproveOrders', label: 'Approve Orders', description: 'Can approve pending orders' }
                ]
            },
            {
                id: 'employees',
                name: 'Employee Management',
                icon: 'bi bi-people',
                description: 'Control access to employee-related features',
                permissions: [
                    { key: 'canViewEmployees', label: 'View Employees', description: 'Can view employee list' },
                    { key: 'canManageEmployees', label: 'Manage Employees', description: 'Can create and modify employees' },
                    { key: 'canEditOthersWork', label: 'Edit Others Work', description: 'Can edit work done by other employees' }
                ]
            },
            {
                id: 'analytics',
                name: 'Analytics & Reports',
                icon: 'fas fa-chart-bar',
                description: 'Control access to analytics and reporting features',
                permissions: [
                    { key: 'canViewAnalytics', label: 'View Analytics', description: 'Can view dashboard analytics' },
                    { key: 'canExportReports', label: 'Export Reports', description: 'Can export data reports' }
                ]
            },
            {
                id: 'notifications',
                name: 'Notifications',
                icon: 'fas fa-bell',
                description: 'Control access to notification features',
                permissions: [
                    { key: 'canViewNotifications', label: 'View Notifications', description: 'Can view notifications' },
                    { key: 'canSendNotifications', label: 'Send Notifications', description: 'Can send notifications to other users' }
                ]
            },
            {
                id: 'dashboard',
                name: 'Dashboard',
                icon: 'fas fa-th-large',
                description: 'Control access to dashboard features',
                permissions: [
                    { key: 'canViewDashboard', label: 'View Dashboard', description: 'Can access the main dashboard' }
                ]
            }
        ];

        res.json({
            success: true,
            groups: permissionGroups
        });
    } catch (err) {
        console.error('Error getting permission groups:', err);
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

/**
 * Sync all employees' permissions with current role permissions
 * This is useful for ensuring all employees have the latest permission structure
 * PUT /api/permissions/sync-all
 */
router.put('/sync-all', fetchuser, async (req, res) => {
    try {
        // Only business owner can sync permissions
        if (req.role !== 'businessowner') {
            return res.status(403).json({ error: "Only Business Owner can sync permissions" });
        }

        // Get or create role permissions for this business owner
        let rolePermissionsDoc = await RolePermissions.findOne({ businessowner: req.user._id });
        
        if (!rolePermissionsDoc) {
            rolePermissionsDoc = await RolePermissions.create({
                businessowner: req.user._id,
                manager: RolePermissions.getDefaultPermissions('manager'),
                supervisor: RolePermissions.getDefaultPermissions('supervisor'),
                employee: RolePermissions.getDefaultPermissions('employee')
            });
        }

        const results = {
            manager: { synced: 0, skipped: 0 },
            supervisor: { synced: 0, skipped: 0 },
            employee: { synced: 0, skipped: 0 }
        };

        // Sync each role
        for (const role of ['manager', 'supervisor', 'employee']) {
            // Get clean permissions for this role
            const rawPerms = rolePermissionsDoc[role].toObject ? rolePermissionsDoc[role].toObject() : rolePermissionsDoc[role];
            const permissionsToSync = {};
            
            for (const key of Object.keys(rawPerms)) {
                if (key.startsWith('can')) {
                    permissionsToSync[key] = rawPerms[key];
                }
            }

            // Update employees who don't have custom permissions
            const syncResult = await Employee.updateMany(
                { 
                    businessowner: req.user._id, 
                    role: role,
                    $or: [
                        { hasCustomPermissions: false },
                        { hasCustomPermissions: { $exists: false } }
                    ]
                },
                { $set: { permissions: permissionsToSync } }
            );

            results[role].synced = syncResult.modifiedCount;

            // Count skipped (those with custom permissions)
            const customCount = await Employee.countDocuments({
                businessowner: req.user._id,
                role: role,
                hasCustomPermissions: true
            });
            results[role].skipped = customCount;
        }

        const totalSynced = results.manager.synced + results.supervisor.synced + results.employee.synced;
        const totalSkipped = results.manager.skipped + results.supervisor.skipped + results.employee.skipped;

        res.json({
            success: true,
            message: `Synced ${totalSynced} employees, skipped ${totalSkipped} with custom permissions`,
            results
        });
    } catch (err) {
        console.error('Error syncing permissions:', err);
        res.status(500).json({ error: "Internal Server error occurred", details: err.message });
    }
});

module.exports = router;
