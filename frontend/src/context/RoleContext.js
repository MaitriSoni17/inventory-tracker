import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiCall, parseResponse } from '../utils/apiClient';

const RoleContext = createContext();

export const RoleProvider = ({ children }) => {
    const [role, setRole] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(true);

    // Helper to extract only permission keys from an object
    const extractPermissions = (permsObj) => {
        if (!permsObj) return {};
        const cleanPerms = {};
        for (const key of Object.keys(permsObj)) {
            if (key.startsWith('can')) {
                cleanPerms[key] = permsObj[key];
            }
        }
        return cleanPerms;
    };

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
                    // Extract only permission keys to ensure clean object
                    setPermissions(extractPermissions(data.permissions));
                }
            }
        } catch (error) {
            // console.error('Error fetching permissions:', error);
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
                const currentRole = data.role || storedRole || 'employee';
                setRole(currentRole);
                setUserDetails(data);
                
                // Set initial permissions from user data (with extraction)
                if (data.permissions) {
                    setPermissions(extractPermissions(data.permissions));
                }
                
                // For employees, also fetch latest permissions from permissions endpoint
                // This ensures permissions are up-to-date with any changes made by business owner
                if (currentRole && currentRole !== 'businessowner' && currentRole !== 'supplier') {
                    await fetchPermissions();
                }
            } else {
                // Fallback to stored role
                setRole(storedRole || 'employee');
            }
        } catch (error) {
            // console.error('Error fetching user role:', error);
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
        // Business owners have all permissions
        if (role === 'businessowner') return true;
        
        // Suppliers have specific permissions for messaging, notifications, and settings
        if (role === 'supplier') {
            const supplierPermissions = {
                'canViewDashboard': true,
                'canViewMessages': true,
                'canSendMessages': true,
                'canDeleteMessages': true,
                'canViewNotifications': true,
                'canViewSettings': true
            };
            return supplierPermissions[permissionName] || false;
        }
        
        // Employees use role-based permissions system
        return permissions[permissionName] || false;
    };

    const isSuperior = () => {
        return role === 'businessowner' || role === 'manager' || hasPermission('canManageEmployees');
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
