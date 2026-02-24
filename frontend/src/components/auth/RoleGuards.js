/**
 * Role-Based Access Control Helper Components
 * These components conditionally render content based on user role
 */

import { useRole } from '../../context/RoleContext';

/**
 * Only renders if user has a specific permission
 */
export const PermissionGuard = ({ permission, children, fallback = null }) => {
    const { hasPermission } = useRole();

    if (!hasPermission(permission)) {
        return fallback;
    }

    return children;
};

/**
 * Only renders if user role matches one of the allowed roles
 */
export const RoleGuard = ({ roles, children, fallback = null }) => {
    const { role } = useRole();
    const storedRole = localStorage.getItem('role');
    const currentRole = role || storedRole;

    if (!Array.isArray(roles)) {
        roles = [roles];
    }

    if (!roles.includes(currentRole)) {
        return fallback;
    }

    return children;
};

/**
 * Only renders if user is a business owner
 */
export const BusinessOwnerOnly = ({ children, fallback = null }) => {
    return <RoleGuard roles="businessowner" fallback={fallback}>{children}</RoleGuard>;
};

/**
 * Only renders if user is manager, business owner, or custom role with canManageEmployees
 */
export const ManagerOnly = ({ children, fallback = null }) => {
    const { role, hasPermission } = useRole();
    const storedRole = localStorage.getItem('role');
    const currentRole = role || storedRole;

    if (currentRole === 'businessowner' || currentRole === 'manager' || hasPermission('canManageEmployees')) {
        return children;
    }

    return fallback;
};

/**
 * Only renders if user can create products
 */
export const CanCreateProducts = ({ children, fallback = null }) => {
    return <PermissionGuard permission="canCreateProducts" fallback={fallback}>{children}</PermissionGuard>;
};

/**
 * Only renders if user can delete products
 */
export const CanDeleteProducts = ({ children, fallback = null }) => {
    return <PermissionGuard permission="canDeleteProducts" fallback={fallback}>{children}</PermissionGuard>;
};

/**
 * Only renders if user can create categories
 */
export const CanCreateCategories = ({ children, fallback = null }) => {
    return <PermissionGuard permission="canCreateCategory" fallback={fallback}>{children}</PermissionGuard>;
};

/**
 * Only renders if user can delete categories
 */
export const CanDeleteCategories = ({ children, fallback = null }) => {
    return <PermissionGuard permission="canDeleteCategory" fallback={fallback}>{children}</PermissionGuard>;
};

/**
 * Only renders if user can create warehouses
 */
export const CanCreateWarehouses = ({ children, fallback = null }) => {
    return <PermissionGuard permission="canCreateWarehouse" fallback={fallback}>{children}</PermissionGuard>;
};

/**
 * Only renders if user can delete warehouses
 */
export const CanDeleteWarehouses = ({ children, fallback = null }) => {
    return <PermissionGuard permission="canDeleteWarehouse" fallback={fallback}>{children}</PermissionGuard>;
};

/**
 * Only renders if user can create orders
 */
export const CanCreateOrders = ({ children, fallback = null }) => {
    return <PermissionGuard permission="canCreateOrders" fallback={fallback}>{children}</PermissionGuard>;
};

/**
 * Only renders if user can delete orders
 */
export const CanDeleteOrders = ({ children, fallback = null }) => {
    return <PermissionGuard permission="canDeleteOrders" fallback={fallback}>{children}</PermissionGuard>;
};

/**
 * Only renders if user can manage employees
 */
export const CanManageEmployees = ({ children, fallback = null }) => {
    return <PermissionGuard permission="canManageEmployees" fallback={fallback}>{children}</PermissionGuard>;
};

/**
 * Only renders if user can edit others' work
 */
export const CanEditOthersWork = ({ children, fallback = null }) => {
    return <PermissionGuard permission="canEditOthersWork" fallback={fallback}>{children}</PermissionGuard>;
};

/**
 * Only renders if user can view analytics
 */
export const CanViewAnalytics = ({ children, fallback = null }) => {
    return <PermissionGuard permission="canViewAnalytics" fallback={fallback}>{children}</PermissionGuard>;
};

/**
 * Only renders if user can export reports
 */
export const CanExportReports = ({ children, fallback = null }) => {
    return <PermissionGuard permission="canExportReports" fallback={fallback}>{children}</PermissionGuard>;
};

/**
 * Only renders if user can send notifications
 */
export const CanSendNotifications = ({ children, fallback = null }) => {
    return <PermissionGuard permission="canSendNotifications" fallback={fallback}>{children}</PermissionGuard>;
};

/**
 * Only renders if user can approve orders
 */
export const CanApproveOrders = ({ children, fallback = null }) => {
    return <PermissionGuard permission="canApproveOrders" fallback={fallback}>{children}</PermissionGuard>;
};

/**
 * Only renders if user can edit products
 */
export const CanEditProducts = ({ children, fallback = null }) => {
    return <PermissionGuard permission="canEditProducts" fallback={fallback}>{children}</PermissionGuard>;
};

/**
 * Only renders if user can edit categories
 */
export const CanEditCategories = ({ children, fallback = null }) => {
    return <PermissionGuard permission="canEditCategory" fallback={fallback}>{children}</PermissionGuard>;
};

/**
 * Only renders if user can edit warehouses
 */
export const CanEditWarehouses = ({ children, fallback = null }) => {
    return <PermissionGuard permission="canEditWarehouse" fallback={fallback}>{children}</PermissionGuard>;
};

/**
 * Only renders if user can edit orders
 */
export const CanEditOrders = ({ children, fallback = null }) => {
    return <PermissionGuard permission="canEditOrders" fallback={fallback}>{children}</PermissionGuard>;
};

/**
 * Only renders if user can edit employees (Business Owner, Manager, or custom role with canManageEmployees)
 */
export const CanEditEmployees = ({ children, fallback = null }) => {
    const { role, hasPermission } = useRole();
    const storedRole = localStorage.getItem('role');
    const currentRole = role || storedRole;

    // Business Owner always can, or anyone with canManageEmployees permission
    if (currentRole === 'businessowner' || hasPermission('canManageEmployees')) {
        return children;
    }

    return fallback;
};
