import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiCall, parseResponse } from '../utils/apiClient';

const RoleContext = createContext();

export const RoleProvider = ({ children }) => {
    const [role, setRole] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(true);

    // Fetch permissions from dedicated endpoint
    const fetchPermissions = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await apiCall('http://localhost:5000/api/permissions/my-permissions', {
                method: 'POST'
            });

            if (response.ok) {
                const data = await parseResponse(response);
                if (data.permissions) {
                    setPermissions(data.permissions);
                }
            }
        } catch (error) {
            console.error('Error fetching permissions:', error);
        }
    }, []);

    const fetchUserRole = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const storedRole = localStorage.getItem('role');
            
            if (!token) {
                setLoading(false);
                return;
            }

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

            const response = await apiCall(endpoint, {
                method: 'POST'
            });

            // Check if response is unauthorized (401)
            if (response.isUnauthorized) {
                setRole(null);
                setLoading(false);
                return;
            }

            if (response.ok) {
                const data = await parseResponse(response);
                setRole(data.role || storedRole || 'employee');
                setUserDetails(data);
                // Set initial permissions from user data
                if (data.permissions) {
                    setPermissions(data.permissions);
                }
                // Also fetch latest permissions from permissions endpoint
                await fetchPermissions();
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
    }, [fetchPermissions]);

    // Fetch user details and role on mount
    useEffect(() => {
        fetchUserRole();
    }, [fetchUserRole]);

    const hasPermission = (permissionName) => {
        if (role === 'businessowner') return true;
        return permissions[permissionName] || false;
    };

    const isSuperior = () => {
        return ['manager', 'businessowner'].includes(role);
    };

    const canManageEmployees = () => {
        return hasPermission('canManageEmployees') || ['manager', 'businessowner'].includes(role);
    };

    const canDeleteItems = () => {
        return hasPermission('canDeleteProducts') || hasPermission('canDeleteOrders') || role === 'businessowner';
    };

    const canCreateWarehouses = () => {
        return hasPermission('canCreateWarehouse') || role === 'businessowner';
    };

    // Refresh permissions - useful after permission updates
    const refreshPermissions = async () => {
        await fetchPermissions();
    };

    // Logout - clear all user data
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userId');
        setRole(null);
        setUserDetails(null);
        setPermissions({});
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
            fetchPermissions,
            refreshPermissions,
            hasPermission,
            isSuperior,
            canManageEmployees,
            canDeleteItems,
            canCreateWarehouses,
            logout
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
