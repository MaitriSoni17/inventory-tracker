/**
 * RouteGuard - Route-level access control component
 * Wraps route elements to check role/permission before rendering.
 * Shows AccessDenied component when the user lacks required access.
 */

import { useRole } from '../../context/RoleContext';
import AccessDenied from '../common/AccessDenied';

/**
 * Guards a route by checking if the user has the required permission.
 * @param {string} permission - The permission key to check (e.g., 'canViewProducts')
 * @param {React.ReactNode} children - The component to render if permitted
 * @param {string} [message] - Optional custom denied message
 */
export const PermissionRouteGuard = ({ permission, children, message }) => {
    const { hasPermission, loading } = useRole();

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!hasPermission(permission)) {
        return <AccessDenied message={message} />;
    }

    return children;
};

/**
 * Guards a route by checking if the user's role is in the allowed roles list.
 * @param {string|string[]} roles - Allowed role(s)
 * @param {React.ReactNode} children - The component to render if role matches
 * @param {string} [message] - Optional custom denied message
 */
export const RoleRouteGuard = ({ roles, children, message, allowCustomRoles }) => {
    const { role, loading } = useRole();
    const storedRole = localStorage.getItem('role');
    const currentRole = role || storedRole;

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    // If allowCustomRoles is true, also allow any custom employee-type role
    if (allowCustomRoles && currentRole && currentRole !== 'businessowner' && currentRole !== 'supplier') {
        return children;
    }

    if (!allowedRoles.includes(currentRole)) {
        return <AccessDenied message={message} />;
    }

    return children;
};
