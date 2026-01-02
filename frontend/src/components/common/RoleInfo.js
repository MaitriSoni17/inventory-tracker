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
            default:
                return 'bg-secondary';
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
            default:
                return 'User';
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
