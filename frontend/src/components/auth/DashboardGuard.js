import React from 'react';
import { useRole } from '../../context/RoleContext';
import BusinessOwner from '../dashboard/BusinessOwner';
import Employee from '../dashboard/Employee';
import Supplier from '../dashboard/Supplier';
import AccessDenied from '../common/AccessDenied';

/**
 * DashboardGuard - Checks canViewDashboard permission before rendering the dashboard.
 * Business owners and suppliers always have dashboard access.
 * Employee-type roles (employee, supervisor, manager) need the canViewDashboard permission.
 */
const DashboardGuard = ({ showAlert }) => {
    const { role, hasPermission, loading } = useRole();
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

    if (currentRole === 'businessowner') {
        return <BusinessOwner showAlert={showAlert} />;
    }

    if (currentRole === 'supplier') {
        return <Supplier showAlert={showAlert} />;
    }

    // Employee-type roles (built-in + custom): check canViewDashboard permission
    if (currentRole && currentRole !== 'businessowner' && currentRole !== 'supplier') {
        if (!hasPermission('canViewDashboard')) {
            return (
                <AccessDenied
                    message="Your dashboard access has been disabled by the administrator. You do not have permission to view the dashboard."
                    showLogout={true}
                />
            );
        }
        return <Employee showAlert={showAlert} />;
    }

    return <AccessDenied message="Unable to determine your role. Please log in again." showLogout={true} />;
};

export default DashboardGuard;
