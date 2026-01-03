import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';

/**
 * ProtectedRoute component that checks if user is authenticated
 * If not, redirects to login page
 */
const ProtectedRoute = ({ children }) => {
    const { role, loading } = useRole();
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

    return children;
};

export default ProtectedRoute;
