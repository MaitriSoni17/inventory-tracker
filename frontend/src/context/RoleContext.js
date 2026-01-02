import React, { createContext, useContext, useState, useEffect } from 'react';

const RoleContext = createContext();

export const RoleProvider = ({ children }) => {
    const [role, setRole] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(true);

    // Fetch user details and role on mount
    useEffect(() => {
        fetchUserRole();
    }, []);

    const fetchUserRole = async () => {
        try {
            const token = localStorage.getItem('token');
            const storedRole = localStorage.getItem('role');
            
            if (!token) {
                setLoading(false);
                return;
            }

            const headers = {
                'Content-Type': 'application/json',
                'auth-token': token
            };

            // Determine which endpoint to call based on stored role
            let endpoint = '';
            if (storedRole === 'businessowner') {
                endpoint = 'http://localhost:5000/api/businessowner/getbusinessowner';
            } else if (storedRole === 'supplier') {
                endpoint = 'http://localhost:5000/api/supplier/getsupplier';
            } else {
                // Default to employee for all employee types (employee, supervisor, manager)
                endpoint = 'http://localhost:5000/api/employee/getemployee';
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers
            });

            if (response.ok) {
                const data = await response.json();
                setRole(data.role || storedRole || 'employee');
                setUserDetails(data);
                setPermissions(data.permissions || {});
            } else {
                // Fallback to stored role
                setRole(storedRole || 'employee');
            }
        } catch (error) {
            console.error('Error fetching user role:', error);
            // Fallback to stored role on error
            const storedRole = localStorage.getItem('role');
            setRole(storedRole || 'employee');
        } finally {
            setLoading(false);
        }
    };

    const hasPermission = (permissionName) => {
        if (role === 'businessowner') return true;
        return permissions[permissionName] || false;
    };

    const isSuperior = () => {
        return ['manager', 'businessowner'].includes(role);
    };

    const canManageEmployees = () => {
        return ['manager', 'businessowner'].includes(role);
    };

    const canDeleteItems = () => {
        return permissions.canDeleteProducts || permissions.canDeleteOrders || role === 'businessowner';
    };

    const canCreateWarehouses = () => {
        return permissions.canCreateWarehouse || role === 'businessowner';
    };

    return (
        <RoleContext.Provider value={{
            role,
            setRole,
            userDetails,
            setUserDetails,
            permissions,
            setPermissions,
            loading,
            fetchUserRole,
            hasPermission,
            isSuperior,
            canManageEmployees,
            canDeleteItems,
            canCreateWarehouses
        }}>
            {children}
        </RoleContext.Provider>
    );
};

export const useRole = () => {
    const context = useContext(RoleContext);
    if (!context) {
        throw new Error('useRole must be used within RoleProvider');
    }
    return context;
};
