import React from 'react';
import { useRole } from '../../context/RoleContext';

const RoleInfo = () => {
    const { role, userDetails } = useRole();
    const storedRole = localStorage.getItem('role');
    const currentRole = role || storedRole;

    const getRoleBadgeClass = (role) => {
        switch(role) {
            case 'manager':
                return 'bg-primary';
            case 'supervisor':
                return 'bg-info';
            case 'employee':
                return 'bg-success';
            case 'businessowner':
                return 'bg-warning';
            case 'supplier':
                return 'bg-dark';
            default:
                // Custom roles get a distinct color
                return 'bg-purple';
        }
    };

    const getRoleLabel = (role) => {
        switch(role) {
            case 'manager':
                return 'Manager';
            case 'supervisor':
                return 'Supervisor';
            case 'employee':
                return 'Employee';
            case 'businessowner':
                return 'Business Owner';
            case 'supplier':
                return 'Supplier';
            default:
                // Custom roles: capitalize and replace underscores/hyphens with spaces
                return role ? role.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'User';
        }
    };

    return (
        <div className="role-info d-inline-block ms-2">
            <span className={`badge ${getRoleBadgeClass(currentRole)} text-white`}>
                {getRoleLabel(currentRole)}
            </span>
            {userDetails && userDetails.department && (
                <span className="badge bg-light text-dark ms-2">
                    {userDetails.department}
                </span>
            )}
        </div>
    );
};

export default RoleInfo;
