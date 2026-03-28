import { Navigate, useLocation } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';

/**
 * ProtectedRoute component that checks if user is authenticated
 * If not, redirects to login page
 */
const ProtectedRoute = ({ children }) => {
    const { role, loading, deletionRestriction } = useRole();
    const location = useLocation();
    const token = localStorage.getItem('token');

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    // If no token or role, redirect to login
    if (!token || !role) {
        return <Navigate to="/login" replace />;
    }

    const isEmployeeTypeRole = role && role !== 'businessowner' && role !== 'supplier';
    const isRestrictedRole = role === 'supplier' || isEmployeeTypeRole;
    const isDeletionRestricted = Boolean(deletionRestriction) && isRestrictedRole;
    const isOnDeletionHoldPage = location.pathname === '/dashboard/deletion-hold';

    if (isDeletionRestricted && !isOnDeletionHoldPage) {
        return <Navigate to="/dashboard/deletion-hold" replace />;
    }

    if (!isDeletionRestricted && isOnDeletionHoldPage) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute;
