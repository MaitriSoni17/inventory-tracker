import React, { useState, useEffect, useCallback } from 'react';
import '../../../styles/permissions.css';

const PermissionManager = (props) => {
    // Main tabs: role-based vs individual
    const [mainTab, setMainTab] = useState('role-based');
    
    // Role-based permissions state
    const [permissions, setPermissions] = useState({
        manager: {},
        supervisor: {},
        employee: {}
    });
    const [permissionGroups, setPermissionGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [activeRole, setActiveRole] = useState('manager');
    const [searchTerm, setSearchTerm] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState({});

    // Individual permissions state
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [employeePermissions, setEmployeePermissions] = useState({});
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [savingEmployee, setSavingEmployee] = useState(false);

    // Permission dependencies - if view is disabled, these should be disabled too
    const permissionDependencies = {
        canViewProducts: ['canCreateProducts', 'canEditProducts', 'canDeleteProducts'],
        canViewCategories: ['canCreateCategory', 'canEditCategory', 'canDeleteCategory'],
        canViewWarehouses: ['canCreateWarehouse', 'canEditWarehouse', 'canDeleteWarehouse'],
        canViewOrders: ['canCreateOrders', 'canEditOrders', 'canDeleteOrders', 'canApproveOrders'],
        canViewEmployees: ['canManageEmployees', 'canEditOthersWork'],
        canViewAnalytics: ['canExportReports'],
        canViewNotifications: ['canSendNotifications'],
        canViewMessages: ['canSendMessages', 'canDeleteMessages']
    };

    // Check if a permission is disabled due to its parent view permission being off
    const isPermissionDisabledByView = (permissionsObj, permissionKey) => {
        for (const [viewPerm, dependents] of Object.entries(permissionDependencies)) {
            if (dependents.includes(permissionKey)) {
                return !permissionsObj?.[viewPerm];
            }
        }
        return false;
    };

    // Get the parent view permission for a given permission
    const getParentViewPermission = (permissionKey) => {
        for (const [viewPerm, dependents] of Object.entries(permissionDependencies)) {
            if (dependents.includes(permissionKey)) {
                return viewPerm;
            }
        }
        return null;
    };

    // Fetch permission groups
    const fetchPermissionGroups = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:5000/api/permissions/groups', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });
            if (response.ok) {
                const data = await response.json();
                setPermissionGroups(data.groups);
                const expanded = {};
                data.groups.forEach(group => {
                    expanded[group.id] = true;
                });
                setExpandedGroups(expanded);
            }
        } catch (error) {
            console.error('Error fetching permission groups:', error);
            props.showAlert('Error fetching permission settings', 'danger');
        }
    }, [props]);

    // Fetch role-based permissions
    const fetchPermissions = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:5000/api/permissions/get', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });
            if (response.ok) {
                const data = await response.json();
                setPermissions(data.permissions);
                setLastUpdated(data.updatedAt);
            } else {
                const errorData = await response.json();
                props.showAlert(errorData.error || 'Error fetching permissions', 'danger');
            }
        } catch (error) {
            console.error('Error fetching permissions:', error);
            props.showAlert('Error fetching permissions', 'danger');
        } finally {
            setLoading(false);
        }
    }, [props]);

    // Fetch employees for individual permissions
    const fetchEmployees = useCallback(async () => {
        setLoadingEmployees(true);
        try {
            const response = await fetch('http://localhost:5000/api/permissions/employees', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });
            if (response.ok) {
                const data = await response.json();
                setEmployees(data.employees);
            } else {
                const errorData = await response.json();
                props.showAlert(errorData.error || 'Error fetching employees', 'danger');
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
            props.showAlert('Error fetching employees', 'danger');
        } finally {
            setLoadingEmployees(false);
        }
    }, [props]);

    useEffect(() => {
        fetchPermissionGroups();
        fetchPermissions();
    }, [fetchPermissionGroups, fetchPermissions]);

    useEffect(() => {
        if (mainTab === 'individual') {
            fetchEmployees();
        }
    }, [mainTab, fetchEmployees]);

    // Handle employee selection
    const handleEmployeeSelect = async (employee) => {
        setSelectedEmployee(employee);
        setEmployeePermissions(employee.permissions || {});
    };

    // Toggle role-based permission
    const handlePermissionToggle = async (role, permissionKey, currentValue) => {
        const newValue = !currentValue;
        
        // If disabling a view permission, also disable all dependent permissions
        const dependentPerms = permissionDependencies[permissionKey] || [];
        const permissionsToUpdate = { [permissionKey]: newValue };
        
        if (!newValue && dependentPerms.length > 0) {
            dependentPerms.forEach(dep => {
                permissionsToUpdate[dep] = false;
            });
        }

        setPermissions(prev => ({
            ...prev,
            [role]: {
                ...prev[role],
                ...permissionsToUpdate
            }
        }));

        try {
            // If we have dependent permissions to update, use bulk update
            if (!newValue && dependentPerms.length > 0) {
                const response = await fetch('http://localhost:5000/api/permissions/update', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    },
                    body: JSON.stringify({
                        role,
                        permissions: { ...permissions[role], ...permissionsToUpdate }
                    })
                });

                if (response.ok) {
                    props.showAlert('Permissions updated successfully', 'success');
                } else {
                    // Revert on error
                    setPermissions(prev => ({
                        ...prev,
                        [role]: {
                            ...prev[role],
                            [permissionKey]: currentValue
                        }
                    }));
                    const errorData = await response.json();
                    props.showAlert(errorData.error || 'Error updating permissions', 'danger');
                }
            } else {
                const response = await fetch('http://localhost:5000/api/permissions/update-single', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    },
                    body: JSON.stringify({
                        role,
                        permissionKey,
                        value: newValue
                    })
                });

                if (response.ok) {
                    props.showAlert('Permission updated successfully', 'success');
                } else {
                    setPermissions(prev => ({
                        ...prev,
                        [role]: {
                            ...prev[role],
                            [permissionKey]: currentValue
                        }
                    }));
                    const errorData = await response.json();
                    props.showAlert(errorData.error || 'Error updating permission', 'danger');
                }
            }
        } catch (error) {
            console.error('Error updating permission:', error);
            setPermissions(prev => ({
                ...prev,
                [role]: {
                    ...prev[role],
                    [permissionKey]: currentValue
                }
            }));
            props.showAlert('Error updating permission', 'danger');
        }
    };

    // Toggle individual employee permission
    const handleEmployeePermissionToggle = async (permissionKey, currentValue) => {
        if (!selectedEmployee) return;

        const newValue = !currentValue;
        
        // If disabling a view permission, also disable all dependent permissions
        const dependentPerms = permissionDependencies[permissionKey] || [];
        const permissionsToUpdate = { [permissionKey]: newValue };
        
        if (!newValue && dependentPerms.length > 0) {
            dependentPerms.forEach(dep => {
                permissionsToUpdate[dep] = false;
            });
        }

        setEmployeePermissions(prev => ({
            ...prev,
            ...permissionsToUpdate
        }));

        try {
            // If we have dependent permissions to update, use bulk update
            if (!newValue && dependentPerms.length > 0) {
                const response = await fetch(`http://localhost:5000/api/permissions/employee/${selectedEmployee._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    },
                    body: JSON.stringify({
                        permissions: { ...employeePermissions, ...permissionsToUpdate }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    props.showAlert('Permissions updated successfully', 'success');
                    // Update employee in list with hasCustomPermissions from API
                    setEmployees(prev => prev.map(emp => 
                        emp._id === selectedEmployee._id 
                            ? { ...emp, permissions: data.employee.permissions, hasCustomPermissions: data.employee.hasCustomPermissions }
                            : emp
                    ));
                    setSelectedEmployee(prev => ({ ...prev, permissions: data.employee.permissions, hasCustomPermissions: data.employee.hasCustomPermissions }));
                } else {
                    setEmployeePermissions(prev => ({
                        ...prev,
                        [permissionKey]: currentValue
                    }));
                    const errorData = await response.json();
                    props.showAlert(errorData.error || 'Error updating permissions', 'danger');
                }
            } else {
                const response = await fetch(`http://localhost:5000/api/permissions/employee/${selectedEmployee._id}/single`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    },
                    body: JSON.stringify({
                        permissionKey,
                        value: newValue
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    props.showAlert('Permission updated successfully', 'success');
                    // Update employee in list with hasCustomPermissions from API
                    setEmployees(prev => prev.map(emp => 
                        emp._id === selectedEmployee._id 
                            ? { ...emp, permissions: data.employee.permissions, hasCustomPermissions: data.employee.hasCustomPermissions }
                            : emp
                    ));
                    setSelectedEmployee(prev => ({ ...prev, permissions: data.employee.permissions, hasCustomPermissions: data.employee.hasCustomPermissions }));
                } else {
                    setEmployeePermissions(prev => ({
                        ...prev,
                        [permissionKey]: currentValue
                    }));
                    const errorData = await response.json();
                    props.showAlert(errorData.error || 'Error updating permission', 'danger');
                }
            }
        } catch (error) {
            console.error('Error updating employee permission:', error);
            setEmployeePermissions(prev => ({
                ...prev,
                [permissionKey]: currentValue
            }));
            props.showAlert('Error updating permission', 'danger');
        }
    };

    // Toggle all permissions in a group for a role
    const handleGroupToggle = async (role, groupId, enable) => {
        const group = permissionGroups.find(g => g.id === groupId);
        if (!group) return;

        setSaving(true);
        const updatedPermissions = { ...permissions[role] };
        group.permissions.forEach(perm => {
            updatedPermissions[perm.key] = enable;
        });

        try {
            const response = await fetch('http://localhost:5000/api/permissions/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify({
                    role,
                    permissions: updatedPermissions
                })
            });

            if (response.ok) {
                setPermissions(prev => ({
                    ...prev,
                    [role]: updatedPermissions
                }));
                props.showAlert(`${group.name} permissions ${enable ? 'enabled' : 'disabled'}`, 'success');
            } else {
                const errorData = await response.json();
                props.showAlert(errorData.error || 'Error updating permissions', 'danger');
            }
        } catch (error) {
            console.error('Error updating group permissions:', error);
            props.showAlert('Error updating permissions', 'danger');
        } finally {
            setSaving(false);
        }
    };

    // Reset role permissions to defaults
    const handleResetRole = async (role) => {
        if (!window.confirm(`Are you sure you want to reset all ${role} permissions to defaults?`)) {
            return;
        }

        setSaving(true);
        try {
            const response = await fetch('http://localhost:5000/api/permissions/reset', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify({ role })
            });

            if (response.ok) {
                const data = await response.json();
                setPermissions(data.permissions);
                props.showAlert(`${role.charAt(0).toUpperCase() + role.slice(1)} permissions reset to defaults`, 'success');
            } else {
                const errorData = await response.json();
                props.showAlert(errorData.error || 'Error resetting permissions', 'danger');
            }
        } catch (error) {
            console.error('Error resetting permissions:', error);
            props.showAlert('Error resetting permissions', 'danger');
        } finally {
            setSaving(false);
        }
    };

    // Sync all employees' permissions with current role settings
    const handleSyncAllPermissions = async () => {
        if (!window.confirm('This will update all employees (without custom permissions) to use the current role permission settings. Continue?')) {
            return;
        }

        setSyncing(true);
        try {
            const response = await fetch('http://localhost:5000/api/permissions/sync-all', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const data = await response.json();
                props.showAlert(data.message, 'success');
                // Refresh employee list if on individual tab
                if (mainTab === 'individual') {
                    fetchEmployees();
                }
            } else {
                const errorData = await response.json();
                props.showAlert(errorData.error || 'Error syncing permissions', 'danger');
            }
        } catch (error) {
            console.error('Error syncing permissions:', error);
            props.showAlert('Error syncing permissions', 'danger');
        } finally {
            setSyncing(false);
        }
    };

    // Reset employee permissions to role defaults
    const handleResetEmployee = async () => {
        if (!selectedEmployee) return;
        
        if (!window.confirm(`Reset ${selectedEmployee.fname}'s permissions to ${selectedEmployee.role} defaults?`)) {
            return;
        }

        setSavingEmployee(true);
        try {
            const response = await fetch(`http://localhost:5000/api/permissions/employee/${selectedEmployee._id}/reset`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const data = await response.json();
                setEmployeePermissions(data.employee.permissions);
                setSelectedEmployee({ ...data.employee, hasCustomPermissions: false });
                // Update employee in list - reset hasCustomPermissions flag
                setEmployees(prev => prev.map(emp => 
                    emp._id === selectedEmployee._id 
                        ? { ...emp, permissions: data.employee.permissions, hasCustomPermissions: false }
                        : emp
                ));
                props.showAlert(data.message, 'success');
            } else {
                const errorData = await response.json();
                props.showAlert(errorData.error || 'Error resetting permissions', 'danger');
            }
        } catch (error) {
            console.error('Error resetting employee permissions:', error);
            props.showAlert('Error resetting permissions', 'danger');
        } finally {
            setSavingEmployee(false);
        }
    };

    // Toggle group expansion
    const toggleGroupExpand = (groupId) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    // Check if all permissions in a group are enabled
    const isGroupFullyEnabled = (permissionsObj, groupId) => {
        const group = permissionGroups.find(g => g.id === groupId);
        if (!group || !permissionsObj) return false;
        return group.permissions.every(perm => permissionsObj[perm.key] === true);
    };

    // Filter permission groups based on search
    const getFilteredGroups = (search) => {
        return permissionGroups.filter(group => {
            if (!search) return true;
            const term = search.toLowerCase();
            return (
                group.name.toLowerCase().includes(term) ||
                group.description.toLowerCase().includes(term) ||
                group.permissions.some(p => 
                    p.label.toLowerCase().includes(term) || 
                    p.description.toLowerCase().includes(term)
                )
            );
        });
    };

    // Filter employees based on search
    const filteredEmployees = employees.filter(emp => {
        if (!employeeSearchTerm) return true;
        const term = employeeSearchTerm.toLowerCase();
        return (
            emp.fname?.toLowerCase().includes(term) ||
            emp.lname?.toLowerCase().includes(term) ||
            emp.email?.toLowerCase().includes(term) ||
            emp.role?.toLowerCase().includes(term)
        );
    });

    // Get employee initials for avatar
    const getInitials = (fname, lname) => {
        return `${fname?.charAt(0) || ''}${lname?.charAt(0) || ''}`.toUpperCase();
    };

    // Role info
    const roleInfo = {
        manager: { title: 'Manager', icon: 'fas fa-user-tie', class: 'manager' },
        supervisor: { title: 'Supervisor', icon: 'fas fa-user-check', class: 'supervisor' },
        employee: { title: 'Employee', icon: 'fas fa-user', class: 'employee' }
    };

    if (loading) {
        return (
            <div className="permission-manager-container">
                <div className="loading-state" style={{ minHeight: '400px' }}>
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="permission-manager-container">
            {/* Header */}
            <div className="permission-header">
                <h1 className='text-white'>
                    <i className="fas fa-shield-alt me-2"></i>
                    Permission Management
                </h1>
                <p className="permission-subtitle">
                    Configure access permissions for roles and individual employees
                </p>
            </div>

            {/* Main Tabs */}
            <div className="permission-tabs">
                <button 
                    className={`permission-tab ${mainTab === 'role-based' ? 'active' : ''}`}
                    onClick={() => setMainTab('role-based')}
                >
                    <i className="fas fa-users-cog me-2"></i>
                    Role-Based Permissions
                </button>
                <button 
                    className={`permission-tab ${mainTab === 'individual' ? 'active' : ''}`}
                    onClick={() => setMainTab('individual')}
                >
                    <i className="fas fa-user-cog me-2"></i>
                    Individual Permissions
                </button>
                <button 
                    className={`permission-tab ${mainTab === 'report-download' ? 'active' : ''}`}
                    onClick={() => setMainTab('report-download')}
                >
                    <i className="fas fa-file-download me-2"></i>
                    Report Downloads
                </button>
            </div>

            {/* Role-Based Permissions Tab */}
            {mainTab === 'role-based' && (
                <div className="permission-panel">
                    {/* Sidebar - Role Selection */}
                    <div className="panel-sidebar">
                        <h3 className="sidebar-title">
                            <i className="fas fa-users me-2"></i>
                            Select Role
                        </h3>
                        <div className="role-list">
                            {Object.entries(roleInfo).map(([role, info]) => (
                                <button
                                    key={role}
                                    className={`role-item ${activeRole === role ? 'active' : ''}`}
                                    onClick={() => setActiveRole(role)}
                                >
                                    <div className={`role-icon ${info.class}`}>
                                        <i className={info.icon}></i>
                                    </div>
                                    <div className="role-info">
                                        <span className="role-name">{info.title}</span>
                                        <span className="role-desc">Manage {role} access</span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="sidebar-actions">
                            <button 
                                className="btn-reset"
                                onClick={() => handleResetRole(activeRole)}
                                disabled={saving}
                            >
                                <i className="fas fa-undo me-2"></i>
                                Reset {roleInfo[activeRole].title} Defaults
                            </button>
                            <button 
                                className="btn-sync"
                                onClick={handleSyncAllPermissions}
                                disabled={syncing}
                                title="Apply current role permissions to all employees without custom settings"
                            >
                                <i className={`fas ${syncing ? 'fa-spinner fa-spin' : 'fa-sync'} me-2`}></i>
                                {syncing ? 'Syncing...' : 'Sync All Employees'}
                            </button>
                        </div>
                    </div>

                    {/* Main Content - Permissions */}
                    <div className="panel-main">
                        <div className="panel-header">
                            <div>
                                <h2>
                                    <i className={`${roleInfo[activeRole].icon} me-2`}></i>
                                    {roleInfo[activeRole].title} Permissions
                                </h2>
                                <p>Configure what {activeRole}s can access and modify</p>
                                {lastUpdated && (
                                    <small className="text-muted">
                                        Last updated: {new Date(lastUpdated).toLocaleString()}
                                    </small>
                                )}
                            </div>
                            <div className="header-actions">
                                <div className="employee-search" style={{ marginBottom: 0 }}>
                                    <i className="fas fa-search"></i>
                                    <input
                                        type="text"
                                        placeholder="Search permissions..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="permissions-grid">
                            {getFilteredGroups(searchTerm).length === 0 ? (
                                <div className="empty-state">
                                    <i className="fas fa-search"></i>
                                    <p>No permissions found matching "{searchTerm}"</p>
                                </div>
                            ) : (
                                getFilteredGroups(searchTerm).map(group => (
                                    <div className="permission-category" key={group.id}>
                                        <div 
                                            className="category-header"
                                            onClick={() => toggleGroupExpand(group.id)}
                                        >
                                            <div className="category-title">
                                                <i className={`${group.icon} me-2`}></i>
                                                {group.name}
                                                <span className="category-count">
                                                    {group.permissions.filter(p => permissions[activeRole]?.[p.key]).length}/{group.permissions.length}
                                                </span>
                                            </div>
                                            <div className="category-actions">
                                                <button
                                                    className="btn-toggle-all enable"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleGroupToggle(activeRole, group.id, true);
                                                    }}
                                                    disabled={saving || isGroupFullyEnabled(permissions[activeRole], group.id)}
                                                    title="Enable all"
                                                >
                                                    <i className="fas fa-check"></i>
                                                </button>
                                                <button
                                                    className="btn-toggle-all disable"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleGroupToggle(activeRole, group.id, false);
                                                    }}
                                                    disabled={saving}
                                                    title="Disable all"
                                                >
                                                    <i className="fas fa-times"></i>
                                                </button>
                                                <i className={`fas fa-chevron-${expandedGroups[group.id] ? 'up' : 'down'} ms-2`}></i>
                                            </div>
                                        </div>
                                        
                                        {expandedGroups[group.id] && (
                                            <div className="category-permissions">
                                                {group.permissions.map(permission => {
                                                    const isDisabledByView = isPermissionDisabledByView(permissions[activeRole], permission.key);
                                                    const parentView = getParentViewPermission(permission.key);
                                                    return (
                                                        <div 
                                                            className={`permission-item ${isDisabledByView ? 'disabled-by-view' : ''}`} 
                                                            key={permission.key}
                                                            title={isDisabledByView ? `Enable "${parentView?.replace('canView', 'View ')}" first` : ''}
                                                        >
                                                            <label className="permission-toggle">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={permissions[activeRole]?.[permission.key] || false}
                                                                    onChange={() => handlePermissionToggle(
                                                                        activeRole, 
                                                                        permission.key, 
                                                                        permissions[activeRole]?.[permission.key] || false
                                                                    )}
                                                                    disabled={saving || isDisabledByView}
                                                                />
                                                                <span className="toggle-slider"></span>
                                                            </label>
                                                            <span className="permission-label">
                                                                {permission.label}
                                                                {isDisabledByView && (
                                                                    <i className="fas fa-lock ms-2 text-muted" style={{ fontSize: '0.75rem' }}></i>
                                                                )}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="permission-info">
                            <div className="info-icon">
                                <i className="fas fa-info-circle"></i>
                            </div>
                            <div className="info-content">
                                <h4>How Role Permissions Work</h4>
                                <ul>
                                    <li>Changes apply immediately to all users with the selected role</li>
                                    <li>New employees inherit the permissions set for their role</li>
                                    <li>Use Individual Permissions tab to override for specific employees</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Individual Permissions Tab */}
            {mainTab === 'individual' && (
                <div className="permission-panel">
                    {/* Sidebar - Employee List */}
                    <div className="panel-sidebar">
                        <h3 className="sidebar-title">
                            <i className="fas fa-user me-2"></i>
                            Select Employee
                        </h3>
                        
                        <div className="employee-search">
                            <i className="fas fa-search"></i>
                            <input
                                type="text"
                                placeholder="Search employees..."
                                value={employeeSearchTerm}
                                onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                            />
                        </div>

                        {loadingEmployees ? (
                            <div className="loading-state">
                                <div className="spinner-border spinner-border-sm text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        ) : filteredEmployees.length === 0 ? (
                            <div className="empty-state">
                                <i className="fas fa-users"></i>
                                <p>No employees found</p>
                            </div>
                        ) : (
                            <div className="employee-list">
                                {filteredEmployees.map(emp => (
                                    <button
                                        key={emp._id}
                                        className={`employee-item ${selectedEmployee?._id === emp._id ? 'active' : ''} ${emp.hasCustomPermissions ? 'has-custom' : ''}`}
                                        onClick={() => handleEmployeeSelect(emp)}
                                        title={emp.hasCustomPermissions ? 'Has custom permissions' : 'Using role defaults'}
                                    >
                                        <div className="employee-avatar">
                                            {getInitials(emp.fname, emp.lname)}
                                        </div>
                                        <div className="employee-info">
                                            <span className="employee-name">
                                                {emp.fname} {emp.lname || ''}
                                                {emp.hasCustomPermissions && (
                                                    <i className="fas fa-star ms-1 text-warning" style={{ fontSize: '0.7rem' }}></i>
                                                )}
                                            </span>
                                            <span className={`employee-role badge-${emp.role}`}>
                                                {emp.role}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Main Content - Employee Permissions */}
                    <div className="panel-main">
                        {!selectedEmployee ? (
                            <div className="no-selection">
                                <div className="no-selection-icon">
                                    <i className="fas fa-user-cog"></i>
                                </div>
                                <h3>Select an Employee</h3>
                                <p>Choose an employee from the list to manage their individual permissions</p>
                            </div>
                        ) : (
                            <>
                                <div className="panel-header">
                                    <div className="selected-employee-info">
                                        <div className="employee-avatar large">
                                            {getInitials(selectedEmployee.fname, selectedEmployee.lname)}
                                        </div>
                                        <div>
                                            <h2>
                                                {selectedEmployee.fname} {selectedEmployee.lname || ''}
                                                {selectedEmployee.hasCustomPermissions && (
                                                    <span className="custom-badge ms-2">
                                                        <i className="fas fa-star me-1"></i>
                                                        Custom
                                                    </span>
                                                )}
                                            </h2>
                                            <p>
                                                <span className={`role-badge badge-${selectedEmployee.role}`}>
                                                    {selectedEmployee.role}
                                                </span>
                                                <span className="ms-2">{selectedEmployee.email}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="header-actions">
                                        <button 
                                            className="btn-reset"
                                            onClick={handleResetEmployee}
                                            disabled={savingEmployee}
                                        >
                                            <i className="fas fa-undo me-2"></i>
                                            Reset to Role Defaults
                                        </button>
                                    </div>
                                </div>

                                <div className="permissions-grid">
                                    {permissionGroups.map(group => (
                                        <div className="permission-category" key={group.id}>
                                            <div 
                                                className="category-header"
                                                onClick={() => toggleGroupExpand(group.id)}
                                            >
                                                <div className="category-title">
                                                    <i className={`${group.icon} me-2`}></i>
                                                    {group.name}
                                                    <span className="category-count">
                                                        {group.permissions.filter(p => employeePermissions[p.key]).length}/{group.permissions.length}
                                                    </span>
                                                </div>
                                                <i className={`fas fa-chevron-${expandedGroups[group.id] ? 'up' : 'down'}`}></i>
                                            </div>
                                            
                                            {expandedGroups[group.id] && (
                                                <div className="category-permissions">
                                                    {group.permissions.map(permission => {
                                                        const isDisabledByView = isPermissionDisabledByView(employeePermissions, permission.key);
                                                        const parentView = getParentViewPermission(permission.key);
                                                        return (
                                                            <div 
                                                                className={`permission-item ${isDisabledByView ? 'disabled-by-view' : ''}`} 
                                                                key={permission.key}
                                                                title={isDisabledByView ? `Enable "${parentView?.replace('canView', 'View ')}" first` : ''}
                                                            >
                                                                <label className="permission-toggle">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={employeePermissions[permission.key] || false}
                                                                        onChange={() => handleEmployeePermissionToggle(
                                                                            permission.key, 
                                                                            employeePermissions[permission.key] || false
                                                                        )}
                                                                        disabled={savingEmployee || isDisabledByView}
                                                                    />
                                                                    <span className="toggle-slider"></span>
                                                                </label>
                                                                <span className="permission-label">
                                                                    {permission.label}
                                                                    {isDisabledByView && (
                                                                        <i className="fas fa-lock ms-2 text-muted" style={{ fontSize: '0.75rem' }}></i>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="permission-info">
                                    <div className="info-icon">
                                        <i className="fas fa-info-circle"></i>
                                    </div>
                                    <div className="info-content">
                                        <h4>Individual Permission Overrides</h4>
                                        <ul>
                                            <li>These permissions override the role-based defaults for this employee</li>
                                            <li>Click "Reset to Role Defaults" to sync with role permissions</li>
                                            <li>Changes take effect immediately</li>
                                        </ul>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Report Download Permissions Tab */}
            {mainTab === 'report-download' && (
                <div className="permission-panel" style={{ padding: '30px' }}>
                    <div className="panel-header" style={{ marginBottom: '30px' }}>
                        <div>
                            <h2>
                                <i className="fas fa-file-download me-2"></i>
                                Report Download Permissions
                            </h2>
                            <p>Control who can download individual reports for employees, products, orders, and supplier orders</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                        {/* Employees Reports */}
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', background: '#fff' }}>
                            <h4 style={{ marginBottom: '15px', color: '#333' }}>
                                <i className="fas fa-user me-2" style={{ color: '#667eea' }}></i>
                                Employees Reports
                            </h4>
                            <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                                Allow roles to download individual employee reports
                            </p>
                            <div>
                                {['employee', 'supervisor', 'manager'].map(role => (
                                    <label key={role} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
                                        <input 
                                            type="checkbox" 
                                            defaultChecked={true}
                                            style={{ marginRight: '10px', cursor: 'pointer' }}
                                        />
                                        <span style={{ textTransform: 'capitalize', color: '#333' }}>{role}s</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Products Reports */}
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', background: '#fff' }}>
                            <h4 style={{ marginBottom: '15px', color: '#333' }}>
                                <i className="fas fa-box me-2" style={{ color: '#28a745' }}></i>
                                Products Reports
                            </h4>
                            <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                                Allow roles to download individual product reports
                            </p>
                            <div>
                                {['employee', 'supervisor', 'manager'].map(role => (
                                    <label key={role} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
                                        <input 
                                            type="checkbox" 
                                            defaultChecked={true}
                                            style={{ marginRight: '10px', cursor: 'pointer' }}
                                        />
                                        <span style={{ textTransform: 'capitalize', color: '#333' }}>{role}s</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Orders Reports */}
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', background: '#fff' }}>
                            <h4 style={{ marginBottom: '15px', color: '#333' }}>
                                <i className="fas fa-shopping-cart me-2" style={{ color: '#ffc107' }}></i>
                                Orders Reports
                            </h4>
                            <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                                Allow roles to download individual order reports
                            </p>
                            <div>
                                {['employee', 'supervisor', 'manager'].map(role => (
                                    <label key={role} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
                                        <input 
                                            type="checkbox" 
                                            defaultChecked={role !== 'employee'}
                                            style={{ marginRight: '10px', cursor: 'pointer' }}
                                        />
                                        <span style={{ textTransform: 'capitalize', color: '#333' }}>{role}s</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Supplier Orders Reports */}
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', background: '#fff' }}>
                            <h4 style={{ marginBottom: '15px', color: '#333' }}>
                                <i className="fas fa-truck me-2" style={{ color: '#dc3545' }}></i>
                                Supplier Orders Reports
                            </h4>
                            <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                                Allow roles to download individual supplier order reports
                            </p>
                            <div>
                                {['employee', 'supervisor', 'manager'].map(role => (
                                    <label key={role} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
                                        <input 
                                            type="checkbox" 
                                            defaultChecked={role !== 'employee'}
                                            style={{ marginRight: '10px', cursor: 'pointer' }}
                                        />
                                        <span style={{ textTransform: 'capitalize', color: '#333' }}>{role}s</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Supplier Orders Reports */}
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', background: '#fff' }}>
                            <h4 style={{ marginBottom: '15px', color: '#333' }}>
                                <i className="fas fa-users me-2" style={{ color: '#fd7e14' }}></i>
                                Supplier Reports
                            </h4>
                            <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                                Allow roles to download individual supplier reports
                            </p>
                            <div>
                                {['employee', 'supervisor', 'manager'].map(role => (
                                    <label key={role} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
                                        <input 
                                            type="checkbox" 
                                            defaultChecked={true}
                                            style={{ marginRight: '10px', cursor: 'pointer' }}
                                        />
                                        <span style={{ textTransform: 'capitalize', color: '#333' }}>{role}s</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Salary Reports */}
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', background: '#fff' }}>
                            <h4 style={{ marginBottom: '15px', color: '#333' }}>
                                <i className="fas fa-wallet me-2" style={{ color: '#17a2b8' }}></i>
                                Salary Reports
                            </h4>
                            <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                                Allow roles to download salary reports
                            </p>
                            <div>
                                {['employee', 'supervisor', 'manager'].map(role => (
                                    <label key={role} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
                                        <input 
                                            type="checkbox" 
                                            defaultChecked={false}
                                            style={{ marginRight: '10px', cursor: 'pointer' }}
                                        />
                                        <span style={{ textTransform: 'capitalize', color: '#333' }}>{role}s</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '30px', padding: '20px', background: '#f0f8ff', borderRadius: '8px', borderLeft: '4px solid #667eea' }}>
                        <h5 style={{ marginBottom: '10px', color: '#333' }}>
                            <i className="fas fa-info-circle me-2"></i>
                            About Report Downloads
                        </h5>
                        <ul style={{ marginBottom: 0, color: '#666', fontSize: '14px' }}>
                            <li>Business Owners can always download all reports</li>
                            <li>Individual report downloads are available on each list page (Employees, Products, Orders, Supplier Orders, Suppliers)</li>
                            <li>These permissions only affect individual item downloads, not bulk exports</li>
                            <li>Permissions are enforced both in the UI and on the backend</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Saving Overlay */}
            {(saving || savingEmployee) && (
                <div className="saving-overlay">
                    <div className="saving-spinner">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Saving...</span>
                        </div>
                        <p className="mt-2 mb-0">Saving changes...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PermissionManager;
