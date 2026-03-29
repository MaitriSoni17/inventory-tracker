import { useState, useEffect, useCallback, useRef } from 'react';
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
    const [customRoles, setCustomRoles] = useState({});
    const [showCreateRole, setShowCreateRole] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDescription, setNewRoleDescription] = useState('');
    const [newRoleHierarchy, setNewRoleHierarchy] = useState(1);
    const [creatingRole, setCreatingRole] = useState(false);
    const [deletingRole, setDeletingRole] = useState(null);
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
    const [productCategories, setProductCategories] = useState([]);
    const [loadingProductCategories, setLoadingProductCategories] = useState(false);
    const [employeeCategoryAccess, setEmployeeCategoryAccess] = useState(null);
    const [roleCategorySaveState, setRoleCategorySaveState] = useState('idle'); // idle | saving | saved | error
    const [employeeCategorySaveState, setEmployeeCategorySaveState] = useState('idle'); // idle | saving | saved | error
    const [openCategoryDropdowns, setOpenCategoryDropdowns] = useState({ role: false, employee: false });
    const roleCategorySaveTimerRef = useRef(null);
    const employeeCategorySaveTimerRef = useRef(null);
    const roleCategoryDropdownRef = useRef(null);
    const employeeCategoryDropdownRef = useRef(null);

    // Notification preferences state
    const [notificationPreferences, setNotificationPreferences] = useState({
        salarydueAlert: true,
        salaryDueDaysThreshold: 3,
        supplierOrderDeliveryAlert: true,
        supplierOrderDeliveryDaysThreshold: 2,
        productLowStockAlert: true,
        productLowStockThreshold: 10,
        customerOrderDeliveryAlert: true,
        customerOrderDeliveryDaysThreshold: 1,
        supplierOrderSupplyAlert: true,
        supplierOrderSupplyDaysThreshold: 2
    });
    const [savingNotificationPreferences, setSavingNotificationPreferences] = useState(false);

    // Supplier permissions state
    const [suppliers, setSuppliers] = useState([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);
    const [savingSupplierPermission, setSavingSupplierPermission] = useState(null);

    // Report download permissions state
    const [reportDownloadPerms, setReportDownloadPerms] = useState({
        employee: { canDownloadEmployeeReport: true, canDownloadProductReport: true, canDownloadOrderReport: false, canDownloadSupplierOrderReport: false, canDownloadSupplierReport: false, canDownloadSalaryReport: false },
        supervisor: { canDownloadEmployeeReport: true, canDownloadProductReport: true, canDownloadOrderReport: true, canDownloadSupplierOrderReport: true, canDownloadSupplierReport: true, canDownloadSalaryReport: false },
        manager: { canDownloadEmployeeReport: false, canDownloadProductReport: true, canDownloadOrderReport: true, canDownloadSupplierOrderReport: true, canDownloadSupplierReport: true, canDownloadSalaryReport: false }
    });
    const [savingReportPerm, setSavingReportPerm] = useState(null);

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
                setPermissionGroups(data.groups || []);
                const expanded = {};
                (data.groups || []).forEach(group => {
                    expanded[group.id] = true;
                });
                setExpandedGroups(expanded);
            } else {
                // console.error('Failed to fetch permission groups');
            }
        } catch (error) {
            // console.error('Error fetching permission groups:', error);
        }
    }, []);

    // Fetch role-based permissions
    // Fetch custom roles
    const fetchCustomRoles = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:5000/api/permissions/custom-roles', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });
            if (response.ok) {
                const data = await response.json();
                setCustomRoles(data.customRoles || {});
            }
        } catch (error) {
            // console.error('Error fetching custom roles:', error);
        }
    }, []);

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
                const perms = data.permissions || {};
                // Merge custom role permissions into permissions state
                if (data.customRoles) {
                    Object.entries(data.customRoles).forEach(([key, roleData]) => {
                        if (!perms[key]) {
                            perms[key] = roleData;
                        }
                    });
                }
                setPermissions(perms);
                setLastUpdated(data.updatedAt);
            } else {
                await response.json();
            }
        } catch (error) {
            //  console.error('Error fetching permissions:', error);
        } finally {
            setLoading(false);
        }
    }, []);

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
            // console.error('Error fetching employees:', error);
            props.showAlert('Error fetching employees', 'danger');
        } finally {
            setLoadingEmployees(false);
        }
    }, [props]);

    // Fetch categories for employee category-based product access
    const fetchProductCategories = useCallback(async () => {
        setLoadingProductCategories(true);
        try {
            const response = await fetch('http://localhost:5000/api/category/getcategory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });
            if (response.ok) {
                const data = await response.json();
                setProductCategories(Array.isArray(data) ? data : []);
            } else {
                setProductCategories([]);
            }
        } catch (error) {
            setProductCategories([]);
        } finally {
            setLoadingProductCategories(false);
        }
    }, []);

    // Fetch notification preferences
    const fetchNotificationPreferences = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:5000/api/notificationpreferences', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });
            if (response.ok) {
                const data = await response.json();
                setNotificationPreferences({
                    salarydueAlert: data.salarydueAlert !== undefined ? data.salarydueAlert : true,
                    salaryDueDaysThreshold: data.salaryDueDaysThreshold || 3,
                    supplierOrderDeliveryAlert: data.supplierOrderDeliveryAlert !== undefined ? data.supplierOrderDeliveryAlert : true,
                    supplierOrderDeliveryDaysThreshold: data.supplierOrderDeliveryDaysThreshold || 2,
                    productLowStockAlert: data.productLowStockAlert !== undefined ? data.productLowStockAlert : true,
                    productLowStockThreshold: data.productLowStockThreshold || 10,
                    customerOrderDeliveryAlert: data.customerOrderDeliveryAlert !== undefined ? data.customerOrderDeliveryAlert : true,
                    customerOrderDeliveryDaysThreshold: data.customerOrderDeliveryDaysThreshold || 1,
                    supplierOrderSupplyAlert: data.supplierOrderSupplyAlert !== undefined ? data.supplierOrderSupplyAlert : true,
                    supplierOrderSupplyDaysThreshold: data.supplierOrderSupplyDaysThreshold || 2
                });
            } else {
                await response.json();
            }
        } catch (error) {
            // console.error('Error fetching notification preferences:', error);
        }
    }, []);

    // Fetch suppliers with their permissions
    const fetchSuppliers = useCallback(async () => {
        setLoadingSuppliers(true);
        try {
            const response = await fetch('http://localhost:5000/api/supplier/permissions/list', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });
            if (response.ok) {
                const data = await response.json();
                setSuppliers(data.suppliers || []);
            } else {
                // console.error('Error fetching suppliers: Non-OK response');
            }
        } catch (error) {
            // console.error('Error fetching suppliers:', error);
        } finally {
            setLoadingSuppliers(false);
        }
    }, []);

    // Toggle supplier export permission
    const handleSupplierPermissionToggle = async (supplierId, currentValue) => {
        setSavingSupplierPermission(supplierId);
        const newValue = !currentValue;

        // Optimistically update UI
        setSuppliers(prev => prev.map(s => 
            s._id === supplierId ? { ...s, canExportReports: newValue } : s
        ));

        try {
            const response = await fetch(`http://localhost:5000/api/supplier/permissions/update/${supplierId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify({ canExportReports: newValue })
            });

            if (response.ok) {
                const data = await response.json();
                props?.showAlert?.(data.message || 'Supplier permission updated successfully', 'success');
            } else {
                // Revert on error
                setSuppliers(prev => prev.map(s => 
                    s._id === supplierId ? { ...s, canExportReports: currentValue } : s
                ));
                const errorData = await response.json();
                props?.showAlert?.(errorData.error || 'Error updating supplier permission', 'danger');
            }
        } catch (error) {
            // Revert on error
            setSuppliers(prev => prev.map(s => 
                s._id === supplierId ? { ...s, canExportReports: currentValue } : s
            ));
            // console.error('Error updating supplier permission:', error);
            props?.showAlert?.('Error updating supplier permission', 'danger');
        } finally {
            setSavingSupplierPermission(null);
        }
    };

    // Toggle supplier messaging permission
    const handleSupplierMessageToggle = async (supplierId, currentValue) => {
        setSavingSupplierPermission(supplierId + '-msg');
        const newValue = !currentValue;

        // Optimistically update UI
        setSuppliers(prev => prev.map(s => 
            s._id === supplierId ? { ...s, canMessage: newValue } : s
        ));

        try {
            const response = await fetch(`http://localhost:5000/api/supplier/permissions/update/${supplierId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify({ canMessage: newValue })
            });

            if (response.ok) {
                const data = await response.json();
                props?.showAlert?.(data.message || 'Supplier messaging permission updated successfully', 'success');
            } else {
                // Revert on error
                setSuppliers(prev => prev.map(s => 
                    s._id === supplierId ? { ...s, canMessage: currentValue } : s
                ));
                const errorData = await response.json();
                props?.showAlert?.(errorData.error || 'Error updating supplier permission', 'danger');
            }
        } catch (error) {
            // Revert on error
            setSuppliers(prev => prev.map(s => 
                s._id === supplierId ? { ...s, canMessage: currentValue } : s
            ));
            props?.showAlert?.('Error updating supplier permission', 'danger');
        } finally {
            setSavingSupplierPermission(null);
        }
    };

    // Bulk update all suppliers' export permission
    const handleBulkSupplierPermission = async (enable) => {
        const supplierIds = suppliers.map(s => s._id);
        if (supplierIds.length === 0) return;

        setSavingSupplierPermission('bulk');

        try {
            const response = await fetch('http://localhost:5000/api/supplier/permissions/bulk-update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify({ supplierIds, canExportReports: enable })
            });

            if (response.ok) {
                const data = await response.json();
                setSuppliers(prev => prev.map(s => ({ ...s, canExportReports: enable })));
                props?.showAlert?.(data.message || `Export reports ${enable ? 'enabled' : 'disabled'} for all suppliers`, 'success');
            } else {
                const errorData = await response.json();
                props?.showAlert?.(errorData.error || 'Error updating supplier permissions', 'danger');
            }
        } catch (error) {
            // console.error('Error updating supplier permissions:', error);
            props?.showAlert?.('Error updating supplier permissions', 'danger');
        } finally {
            setSavingSupplierPermission(null);
        }
    };

    // Bulk update all suppliers' messaging permission
    const handleBulkSupplierMessagePermission = async (enable) => {
        const supplierIds = suppliers.map(s => s._id);
        if (supplierIds.length === 0) return;

        setSavingSupplierPermission('bulk-msg');

        try {
            const response = await fetch('http://localhost:5000/api/supplier/permissions/bulk-update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify({ supplierIds, canMessage: enable })
            });

            if (response.ok) {
                const data = await response.json();
                setSuppliers(prev => prev.map(s => ({ ...s, canMessage: enable })));
                props?.showAlert?.(data.message || `Messaging ${enable ? 'enabled' : 'disabled'} for all suppliers`, 'success');
            } else {
                const errorData = await response.json();
                props?.showAlert?.(errorData.error || 'Error updating supplier permissions', 'danger');
            }
        } catch (error) {
            props?.showAlert?.('Error updating supplier permissions', 'danger');
        } finally {
            setSavingSupplierPermission(null);
        }
    };

    // Fetch report download permissions from role permissions
    const fetchReportDownloadPerms = useCallback(async () => {
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
                const perms = data.permissions || {};
                const reportKeys = ['canDownloadEmployeeReport', 'canDownloadProductReport', 'canDownloadOrderReport', 'canDownloadSupplierOrderReport', 'canDownloadSupplierReport', 'canDownloadSalaryReport'];
                const extracted = {};
                // Built-in roles
                ['employee', 'supervisor', 'manager'].forEach(role => {
                    extracted[role] = {};
                    reportKeys.forEach(key => {
                        extracted[role][key] = perms[role]?.[key] ?? false;
                    });
                });
                // Custom roles
                if (data.customRoles) {
                    Object.keys(data.customRoles).forEach(roleKey => {
                        extracted[roleKey] = {};
                        reportKeys.forEach(key => {
                            extracted[roleKey][key] = data.customRoles[roleKey]?.[key] ?? perms[roleKey]?.[key] ?? false;
                        });
                    });
                }
                setReportDownloadPerms(extracted);
            }
        } catch (error) {
            // console.error('Error fetching report download permissions:', error);
        }
    }, []);

    // Toggle a report download permission for a role
    const handleReportDownloadToggle = async (role, permissionKey) => {
        const currentValue = reportDownloadPerms[role]?.[permissionKey] ?? false;
        const newValue = !currentValue;
        const saveKey = `${role}-${permissionKey}`;

        // Optimistic update
        setReportDownloadPerms(prev => ({
            ...prev,
            [role]: { ...prev[role], [permissionKey]: newValue }
        }));
        setSavingReportPerm(saveKey);

        try {
            const response = await fetch('http://localhost:5000/api/permissions/update-single', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify({ role, permissionKey, value: newValue })
            });

            if (response.ok) {
                props?.showAlert?.('Report download permission updated', 'success');
            } else {
                // Revert on error
                setReportDownloadPerms(prev => ({
                    ...prev,
                    [role]: { ...prev[role], [permissionKey]: currentValue }
                }));
                const errorData = await response.json();
                props?.showAlert?.(errorData.error || 'Error updating permission', 'danger');
            }
        } catch (error) {
            // Revert on error
            setReportDownloadPerms(prev => ({
                ...prev,
                [role]: { ...prev[role], [permissionKey]: currentValue }
            }));
            props?.showAlert?.('Error updating report download permission', 'danger');
        } finally {
            setSavingReportPerm(null);
        }
    };

    useEffect(() => {
        fetchPermissionGroups();
        fetchPermissions();
        fetchCustomRoles();
        fetchProductCategories();
    }, [fetchPermissionGroups, fetchPermissions, fetchCustomRoles, fetchProductCategories]);

    useEffect(() => {
        if (mainTab === 'role-based') {
            fetchProductCategories();
        } else if (mainTab === 'individual') {
            fetchEmployees();
            fetchProductCategories();
        } else if (mainTab === 'notifications') {
            fetchNotificationPreferences();
        } else if (mainTab === 'supplier-permissions') {
            fetchSuppliers();
        } else if (mainTab === 'report-download') {
            fetchReportDownloadPerms();
        }
    }, [mainTab, fetchEmployees, fetchProductCategories, fetchNotificationPreferences, fetchSuppliers, fetchReportDownloadPerms]);

    useEffect(() => {
        return () => {
            if (roleCategorySaveTimerRef.current) {
                clearTimeout(roleCategorySaveTimerRef.current);
            }
            if (employeeCategorySaveTimerRef.current) {
                clearTimeout(employeeCategorySaveTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (roleCategoryDropdownRef.current && !roleCategoryDropdownRef.current.contains(event.target)) {
                setOpenCategoryDropdowns(prev => ({ ...prev, role: false }));
            }
            if (employeeCategoryDropdownRef.current && !employeeCategoryDropdownRef.current.contains(event.target)) {
                setOpenCategoryDropdowns(prev => ({ ...prev, employee: false }));
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const getRoleCategoryAccess = (roleKey) => {
        const rolePerms = permissions?.[roleKey] || {};
        if (!Array.isArray(rolePerms.allowedProductCategories)) {
            return null;
        }
        return [...new Set(rolePerms.allowedProductCategories.map((id) => String(id || '').trim()).filter(Boolean))];
    };

    const getAllCategoryIds = () => [...new Set(productCategories.map((cat) => String(cat?._id || '').trim()).filter(Boolean))];

    const getCategoryDropdownSummary = (selectedIds) => {
        if (!Array.isArray(selectedIds)) return 'Use role defaults';
        if (selectedIds.length === 0) return 'Select categories';

        const selectedNames = selectedIds
            .map((id) => {
                const found = productCategories.find((cat) => String(cat?._id) === String(id));
                return found?.cName || found?.name || found?.categoryName;
            })
            .filter(Boolean);

        if (selectedNames.length === 0) return `${selectedIds.length} selected`;
        if (selectedNames.length <= 2) return selectedNames.join(', ');
        return `${selectedIds.length} categories selected`;
    };

    const persistRoleCategoryAccess = async (roleKey, nextCategories) => {
        const rolePerms = permissions?.[roleKey] || {};
        const nextRolePerms = {
            ...rolePerms,
            allowedProductCategories: Array.isArray(nextCategories) ? nextCategories : undefined
        };

        try {
            const response = await fetch('http://localhost:5000/api/permissions/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify({ role: roleKey, permissions: nextRolePerms })
            });

            const data = await response.json();
            if (!response.ok) {
                props.showAlert(data.error || 'Error updating role category access', 'danger');
                return false;
            }

            return true;
        } catch (error) {
            props.showAlert('Error updating role category access', 'danger');
            return false;
        }
    };

    const scheduleRoleCategorySave = (roleKey, nextCategories) => {
        if (roleCategorySaveTimerRef.current) {
            clearTimeout(roleCategorySaveTimerRef.current);
        }

        setRoleCategorySaveState('saving');
        roleCategorySaveTimerRef.current = setTimeout(async () => {
            const ok = await persistRoleCategoryAccess(roleKey, nextCategories);
            setRoleCategorySaveState(ok ? 'saved' : 'error');
            setTimeout(() => setRoleCategorySaveState('idle'), 1000);
        }, 280);
    };

    const applyRoleCategoryAccessLocally = (roleKey, nextCategories) => {
        setPermissions(prev => ({
            ...prev,
            [roleKey]: {
                ...prev[roleKey],
                allowedProductCategories: Array.isArray(nextCategories) ? nextCategories : undefined
            }
        }));
    };

    const handleRoleCategoryRestrictionToggle = async () => {
        const currentCategories = getRoleCategoryAccess(activeRole);
        const nextCategories = Array.isArray(currentCategories) ? null : [];
        applyRoleCategoryAccessLocally(activeRole, nextCategories);
        scheduleRoleCategorySave(activeRole, nextCategories);
        if (Array.isArray(currentCategories)) {
            setOpenCategoryDropdowns(prev => ({ ...prev, role: false }));
        }
    };

    const handleRoleCategoryToggle = async (categoryId) => {
        const currentCategories = getRoleCategoryAccess(activeRole);
        if (!Array.isArray(currentCategories)) return;

        const normalizedCategoryId = String(categoryId);
        const exists = currentCategories.includes(normalizedCategoryId);
        const nextCategories = exists
            ? currentCategories.filter((id) => id !== normalizedCategoryId)
            : [...currentCategories, normalizedCategoryId];

        applyRoleCategoryAccessLocally(activeRole, nextCategories);
        scheduleRoleCategorySave(activeRole, nextCategories);
    };

    const handleRoleCategorySelectAll = () => {
        const currentCategories = getRoleCategoryAccess(activeRole);
        if (!Array.isArray(currentCategories)) return;

        const nextCategories = getAllCategoryIds();
        applyRoleCategoryAccessLocally(activeRole, nextCategories);
        scheduleRoleCategorySave(activeRole, nextCategories);
    };

    const handleRoleCategoryClear = () => {
        const currentCategories = getRoleCategoryAccess(activeRole);
        if (!Array.isArray(currentCategories)) return;

        const nextCategories = [];
        applyRoleCategoryAccessLocally(activeRole, nextCategories);
        scheduleRoleCategorySave(activeRole, nextCategories);
    };

    // Save notification preferences
    const saveNotificationPreferences = async () => {
        setSavingNotificationPreferences(true);
        try {
            const response = await fetch('http://localhost:5000/api/notificationpreferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify(notificationPreferences)
            });
            if (response.ok) {
                const data = await response.json();
                props.showAlert('Notification preferences saved successfully!', 'success');
                setNotificationPreferences(data.preferences);
            } else {
                const errorData = await response.json();
                props.showAlert(errorData.message || 'Error saving notification preferences', 'danger');
            }
        } catch (error) {
            // console.error('Error saving notification preferences:', error);
            props.showAlert('Error saving notification preferences', 'danger');
        } finally {
            setSavingNotificationPreferences(false);
        }
    };

    // Handle employee selection
    const handleEmployeeSelect = async (employee) => {
        setSelectedEmployee(employee);
        setEmployeePermissions(employee.permissions || {});
        setEmployeeCategoryAccess(Array.isArray(employee.allowedProductCategories) ? employee.allowedProductCategories : null);
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
            // console.error('Error updating permission:', error);
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
            // console.error('Error updating employee permission:', error);
            setEmployeePermissions(prev => ({
                ...prev,
                [permissionKey]: currentValue
            }));
            props.showAlert('Error updating permission', 'danger');
        }
    };

    const persistEmployeeCategoryAccess = async (nextCategories) => {
        if (!selectedEmployee) return;

        try {
            const response = await fetch(`http://localhost:5000/api/permissions/employee/${selectedEmployee._id}/product-categories`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify({ allowedProductCategories: nextCategories })
            });

            const data = await response.json();
            if (!response.ok) {
                props.showAlert(data.error || 'Error updating product category access', 'danger');
                return false;
            }

            const savedCategories = Array.isArray(data.employee?.allowedProductCategories)
                ? data.employee.allowedProductCategories
                : null;

            setEmployeeCategoryAccess(savedCategories);
            setSelectedEmployee(prev => prev ? { ...prev, allowedProductCategories: savedCategories } : prev);
            setEmployees(prev => prev.map(emp =>
                emp._id === selectedEmployee._id
                    ? { ...emp, allowedProductCategories: savedCategories }
                    : emp
            ));
            return true;
        } catch (error) {
            props.showAlert('Error updating product category access', 'danger');
            return false;
        }
    };

    const scheduleEmployeeCategorySave = (nextCategories) => {
        if (employeeCategorySaveTimerRef.current) {
            clearTimeout(employeeCategorySaveTimerRef.current);
        }

        setEmployeeCategorySaveState('saving');
        employeeCategorySaveTimerRef.current = setTimeout(async () => {
            const ok = await persistEmployeeCategoryAccess(nextCategories);
            setEmployeeCategorySaveState(ok ? 'saved' : 'error');
            setTimeout(() => setEmployeeCategorySaveState('idle'), 1000);
        }, 280);
    };

    const handleCategoryRestrictionToggle = async () => {
        if (!selectedEmployee) return;

        const currentlyRestricted = Array.isArray(employeeCategoryAccess);
        const nextCategories = currentlyRestricted ? null : [];
        setEmployeeCategoryAccess(nextCategories);
        scheduleEmployeeCategorySave(nextCategories);
        if (currentlyRestricted) {
            setOpenCategoryDropdowns(prev => ({ ...prev, employee: false }));
        }
    };

    const handleEmployeeCategoryToggle = async (categoryId) => {
        if (!selectedEmployee || !Array.isArray(employeeCategoryAccess)) return;

        const categoryKey = String(categoryId);
        const exists = employeeCategoryAccess.includes(categoryKey);
        const nextCategories = exists
            ? employeeCategoryAccess.filter((id) => id !== categoryKey)
            : [...employeeCategoryAccess, categoryKey];

        setEmployeeCategoryAccess(nextCategories);
        scheduleEmployeeCategorySave(nextCategories);
    };

    const handleEmployeeCategorySelectAll = () => {
        if (!selectedEmployee || !Array.isArray(employeeCategoryAccess)) return;

        const nextCategories = getAllCategoryIds();
        setEmployeeCategoryAccess(nextCategories);
        scheduleEmployeeCategorySave(nextCategories);
    };

    const handleEmployeeCategoryClear = () => {
        if (!selectedEmployee || !Array.isArray(employeeCategoryAccess)) return;

        const nextCategories = [];
        setEmployeeCategoryAccess(nextCategories);
        scheduleEmployeeCategorySave(nextCategories);
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
            // console.error('Error updating group permissions:', error);
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
            // console.error('Error resetting permissions:', error);
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
            // console.error('Error syncing permissions:', error);
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
                setEmployeeCategoryAccess(Array.isArray(data.employee.allowedProductCategories) ? data.employee.allowedProductCategories : null);
                setSelectedEmployee({ ...data.employee, hasCustomPermissions: false });
                // Update employee in list - reset hasCustomPermissions flag
                setEmployees(prev => prev.map(emp => 
                    emp._id === selectedEmployee._id 
                        ? {
                            ...emp,
                            permissions: data.employee.permissions,
                            hasCustomPermissions: false,
                            allowedProductCategories: data.employee.allowedProductCategories
                          }
                        : emp
                ));
                props.showAlert(data.message, 'success');
            } else {
                const errorData = await response.json();
                props.showAlert(errorData.error || 'Error resetting permissions', 'danger');
            }
        } catch (error) {
            // console.error('Error resetting employee permissions:', error);
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

    // Role info - built-in + custom
    const builtInRoleInfo = {
        manager: { title: 'Manager', icon: 'fas fa-user-tie', class: 'manager' },
        supervisor: { title: 'Supervisor', icon: 'fas fa-user-check', class: 'supervisor' },
        employee: { title: 'Employee', icon: 'fas fa-user', class: 'employee' }
    };

    const roleInfo = { ...builtInRoleInfo };
    Object.entries(customRoles).forEach(([key, role]) => {
        roleInfo[key] = {
            title: role.displayName || key,
            icon: role.hierarchyLevel === 3 ? 'fas fa-user-tie' : role.hierarchyLevel === 2 ? 'fas fa-user-check' : 'fas fa-user-tag',
            class: role.hierarchyLevel === 3 ? 'manager' : role.hierarchyLevel === 2 ? 'supervisor' : 'employee',
            isCustom: true,
            description: role.description || ''
        };
    });

    // Create custom role handler
    const handleCreateCustomRole = async () => {
        if (!newRoleName.trim()) {
            props.showAlert('Role name is required', 'danger');
            return;
        }
        setCreatingRole(true);
        try {
            const response = await fetch('http://localhost:5000/api/permissions/custom-role', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify({
                    name: newRoleName.trim(),
                    description: newRoleDescription.trim(),
                    hierarchyLevel: newRoleHierarchy
                })
            });
            const data = await response.json();
            if (response.ok) {
                props.showAlert(data.message || 'Custom role created successfully', 'success');
                setNewRoleName('');
                setNewRoleDescription('');
                setNewRoleHierarchy(1);
                setShowCreateRole(false);
                fetchCustomRoles();
                fetchPermissions();
            } else {
                props.showAlert(data.error || 'Error creating custom role', 'danger');
            }
        } catch (error) {
            props.showAlert('Error creating custom role', 'danger');
        } finally {
            setCreatingRole(false);
        }
    };

    // Delete custom role handler
    const handleDeleteCustomRole = async (roleKey) => {
        if (!window.confirm(`Are you sure you want to delete the "${roleInfo[roleKey]?.title || roleKey}" role? This cannot be undone.`)) return;
        setDeletingRole(roleKey);
        try {
            const response = await fetch(`http://localhost:5000/api/permissions/custom-role/${roleKey}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });
            const data = await response.json();
            if (response.ok) {
                props.showAlert(data.message || 'Custom role deleted', 'success');
                if (activeRole === roleKey) setActiveRole('manager');
                fetchCustomRoles();
                fetchPermissions();
            } else {
                props.showAlert(data.error || 'Error deleting custom role', 'danger');
            }
        } catch (error) {
            props.showAlert('Error deleting custom role', 'danger');
        } finally {
            setDeletingRole(null);
        }
    };

    if (loading) {
        return (
            <div className="permission-manager-container">
                <div className="loading-state" style={{ minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p style={{ marginLeft: '15px', color: '#666' }}>Loading permissions...</p>
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
                <button 
                    className={`permission-tab ${mainTab === 'supplier-permissions' ? 'active' : ''}`}
                    onClick={() => setMainTab('supplier-permissions')}
                >
                    <i className="fas fa-truck me-2"></i>
                    Supplier Permissions
                </button>
                <button 
                    className={`permission-tab ${mainTab === 'notifications' ? 'active' : ''}`}
                    onClick={() => setMainTab('notifications')}
                >
                    <i className="fas fa-bell me-2"></i>
                    Notification Settings
                </button>
            </div>

            {/* Role-Based Permissions Tab */}
            {mainTab === 'role-based' && (
                <div className="permission-panel" style={{ padding: 0, maxWidth: '100%', display: 'flex' }}>
                    {/* Sidebar - Role Selection */}
                    <div className="panel-sidebar">
                        <h3 className="sidebar-title">
                            <i className="fas fa-users me-2"></i>
                            Select Role
                        </h3>
                        <div className="role-list">
                            {/* Built-in roles */}
                            {Object.entries(builtInRoleInfo).map(([role, info]) => (
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

                            {/* Custom roles section */}
                            {Object.keys(customRoles).length > 0 && (
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '10px 0', paddingTop: '10px' }}>
                                    <small style={{ color: 'black', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 15px' }}>Custom Roles</small>
                                </div>
                            )}
                            {Object.entries(customRoles).map(([key, role]) => (
                                <div key={key} style={{ position: 'relative' }}>
                                    <button
                                        className={`role-item ${activeRole === key ? 'active' : ''}`}
                                        onClick={() => setActiveRole(key)}
                                        style={{ width: '100%' }}
                                    >
                                        <div className={`role-icon ${roleInfo[key]?.class || 'employee'}`}>
                                            <i className={roleInfo[key]?.icon || 'fas fa-user-tag'}></i>
                                        </div>
                                        <div className="role-info">
                                            <span className="role-name">{role.displayName}</span>
                                            <span className="role-desc">{role.description || `Manage ${key} access`}</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteCustomRole(key); }}
                                        disabled={deletingRole === key}
                                        title={`Delete ${role.displayName} role`}
                                        style={{ position: 'absolute', top: '50%', right: '8px', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', opacity: 0.6, fontSize: '12px', padding: '4px' }}
                                    >
                                        {deletingRole === key ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash-alt"></i>}
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Create custom role */}
                        <div style={{ padding: '10px 15px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            {!showCreateRole ? (
                                <button
                                    onClick={() => setShowCreateRole(true)}
                                    style={{ width: '100%', padding: '10px', background: 'rgba(102, 126, 234, 0.2)', border: '1px dashed rgba(102, 126, 234, 0.5)', borderRadius: '8px', color: '#667eea', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                                >
                                    <i className="fas fa-plus me-2"></i>Create Custom Role
                                </button>
                            ) : (
                                <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '12px', border: '1px solid #e0e0e0' }}>
                                    <input
                                        type="text"
                                        placeholder="Role name (e.g. Team Lead)"
                                        value={newRoleName}
                                        onChange={(e) => setNewRoleName(e.target.value)}
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', color: '#333', fontSize: '13px', marginBottom: '8px' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Description (optional)"
                                        value={newRoleDescription}
                                        onChange={(e) => setNewRoleDescription(e.target.value)}
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', color: '#333', fontSize: '13px', marginBottom: '8px' }}
                                    />
                                    <select
                                        value={newRoleHierarchy}
                                        onChange={(e) => setNewRoleHierarchy(Number(e.target.value))}
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', color: '#333', fontSize: '13px', marginBottom: '10px' }}
                                    >
                                        <option value={1}>Employee Level</option>
                                        <option value={2}>Supervisor Level</option>
                                        <option value={3}>Manager Level</option>
                                    </select>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            onClick={handleCreateCustomRole}
                                            disabled={creatingRole || !newRoleName.trim()}
                                            style={{ flex: 1, padding: '8px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                                        >
                                            {creatingRole ? <><i className="fas fa-spinner fa-spin me-1"></i>Creating...</> : <><i className="fas fa-check me-1"></i>Create</>}
                                        </button>
                                        <button
                                            onClick={() => { setShowCreateRole(false); setNewRoleName(''); setNewRoleDescription(''); setNewRoleHierarchy(1); }}
                                            style={{ padding: '8px 12px', background: '#e9ecef', color: '#555', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="sidebar-actions">
                            <button 
                                className="btn-reset"
                                onClick={() => handleResetRole(activeRole)}
                                disabled={saving}
                            >
                                <i className="fas fa-undo me-2"></i>
                                Reset {roleInfo[activeRole]?.title || activeRole} Defaults
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
                                    <i className={`${roleInfo[activeRole]?.icon || 'fas fa-user-tag'} me-2`}></i>
                                    {roleInfo[activeRole]?.title || activeRole} Permissions
                                    {roleInfo[activeRole]?.isCustom && <span style={{ fontSize: '12px', background: '#667eea', color: '#fff', padding: '2px 8px', borderRadius: '10px', marginLeft: '10px', verticalAlign: 'middle' }}>Custom</span>}
                                </h2>
                                <p>Configure what {roleInfo[activeRole]?.title || activeRole}s can access and modify</p>
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
                            <div className="permission-category" style={{ marginBottom: '18px' }}>
                                <div className="category-header">
                                    <div className="category-title">
                                        <i className="fas fa-tags me-2"></i>
                                        Product Category Access (Role Default)
                                    </div>
                                </div>
                                <div className="category-permissions" style={{ paddingTop: '8px' }}>
                                    <div className="permission-item" style={{ marginBottom: '10px' }}>
                                        <label className="permission-toggle">
                                            <input
                                                type="checkbox"
                                                checked={Array.isArray(getRoleCategoryAccess(activeRole))}
                                                onChange={handleRoleCategoryRestrictionToggle}
                                                disabled={saving}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                        <span className="permission-label">
                                            Restrict this role to selected product categories
                                        </span>
                                    </div>

                                    {Array.isArray(getRoleCategoryAccess(activeRole)) && (
                                        <div>
                                            {loadingProductCategories ? (
                                                <small className="text-muted">Loading categories...</small>
                                            ) : productCategories.length === 0 ? (
                                                <small className="text-muted">No categories available yet.</small>
                                            ) : (
                                                <div className="category-multi-select" ref={roleCategoryDropdownRef}>
                                                    <button
                                                        type="button"
                                                        className="category-dropdown-trigger"
                                                        onClick={() => setOpenCategoryDropdowns(prev => ({ ...prev, role: !prev.role }))}
                                                        disabled={saving}
                                                    >
                                                        <span>{getCategoryDropdownSummary(getRoleCategoryAccess(activeRole))}</span>
                                                        <i className={`fas fa-chevron-${openCategoryDropdowns.role ? 'up' : 'down'}`}></i>
                                                    </button>

                                                    {openCategoryDropdowns.role && (
                                                        <div className="category-dropdown-panel">
                                                            <div className="category-dropdown-actions">
                                                                <button type="button" onClick={handleRoleCategorySelectAll} disabled={saving}>Select all</button>
                                                                <button type="button" onClick={handleRoleCategoryClear} disabled={saving}>Clear</button>
                                                            </div>
                                                            <div className="category-dropdown-list">
                                                                {productCategories.map((cat) => {
                                                                    const catId = String(cat._id);
                                                                    const checked = getRoleCategoryAccess(activeRole)?.includes(catId) || false;
                                                                    const categoryLabel = cat?.cName || cat?.name || cat?.categoryName || 'Unnamed category';
                                                                    return (
                                                                        <label key={catId} className="category-dropdown-option">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={checked}
                                                                                onChange={() => handleRoleCategoryToggle(catId)}
                                                                                disabled={saving}
                                                                            />
                                                                            <span>{categoryLabel}</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <small className="text-muted d-block mt-2">
                                                This applies to employees of this role unless they have individual category overrides.
                                            </small>
                                            <small className="text-muted d-block mt-1">
                                                {roleCategorySaveState === '' && ''}
                                            </small>
                                        </div>
                                    )}
                                </div>
                            </div>

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
                <div className="permission-panel" style={{ padding: 0, maxWidth: '100%', display: 'flex' }}>
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
                                    <div className="permission-category" style={{ marginBottom: '18px' }}>
                                        <div className="category-header">
                                            <div className="category-title">
                                                <i className="fas fa-tags me-2"></i>
                                                Product Category Access
                                            </div>
                                        </div>
                                        <div className="category-permissions" style={{ paddingTop: '8px' }}>
                                            <div className="permission-item" style={{ marginBottom: '10px' }}>
                                                <label className="permission-toggle">
                                                    <input
                                                        type="checkbox"
                                                        checked={Array.isArray(employeeCategoryAccess)}
                                                        onChange={handleCategoryRestrictionToggle}
                                                        disabled={savingEmployee}
                                                    />
                                                    <span className="toggle-slider"></span>
                                                </label>
                                                <span className="permission-label">
                                                    Restrict product access by category
                                                </span>
                                            </div>

                                            {Array.isArray(employeeCategoryAccess) && (
                                                <div>
                                                    {loadingProductCategories ? (
                                                        <small className="text-muted">Loading categories...</small>
                                                    ) : productCategories.length === 0 ? (
                                                        <small className="text-muted">No categories available yet.</small>
                                                    ) : (
                                                        <div className="category-multi-select" ref={employeeCategoryDropdownRef}>
                                                            <button
                                                                type="button"
                                                                className="category-dropdown-trigger"
                                                                onClick={() => setOpenCategoryDropdowns(prev => ({ ...prev, employee: !prev.employee }))}
                                                                disabled={savingEmployee}
                                                            >
                                                                <span>{getCategoryDropdownSummary(employeeCategoryAccess)}</span>
                                                                <i className={`fas fa-chevron-${openCategoryDropdowns.employee ? 'up' : 'down'}`}></i>
                                                            </button>

                                                            {openCategoryDropdowns.employee && (
                                                                <div className="category-dropdown-panel">
                                                                    <div className="category-dropdown-actions">
                                                                        <button type="button" onClick={handleEmployeeCategorySelectAll} disabled={savingEmployee}>Select all</button>
                                                                        <button type="button" onClick={handleEmployeeCategoryClear} disabled={savingEmployee}>Clear</button>
                                                                    </div>
                                                                    <div className="category-dropdown-list">
                                                                        {productCategories.map((cat) => {
                                                                            const categoryId = String(cat._id);
                                                                            const checked = employeeCategoryAccess.includes(categoryId);
                                                                            const categoryLabel = cat?.cName || cat?.name || cat?.categoryName || 'Unnamed category';
                                                                            return (
                                                                                <label key={categoryId} className="category-dropdown-option">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={checked}
                                                                                        onChange={() => handleEmployeeCategoryToggle(categoryId)}
                                                                                        disabled={savingEmployee}
                                                                                    />
                                                                                    <span>{categoryLabel}</span>
                                                                                </label>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <small className="text-muted d-block mt-2">
                                                        When enabled, this employee can only view and manage products in selected categories.
                                                    </small>
                                                    <small className="text-muted d-block mt-1">
                                                        {employeeCategorySaveState === 'saving' && 'Saving category changes...'}
                                                        {employeeCategorySaveState === 'saved' && 'Saved'}
                                                        {employeeCategorySaveState === 'error' && 'Could not save changes'}
                                                    </small>
                                                </div>
                                            )}
                                        </div>
                                    </div>

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
                <div className="permission-panel" style={{ padding: '30px', maxWidth: '100%' }}>
                    <div className="panel-header" style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                <i className="fas fa-file-download me-2"></i>
                                Report Download Permissions
                            </h2>
                            <p style={{ margin: 0 }}>Control who can download individual reports for employees, products, orders, and supplier orders</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px', marginBottom: '30px' }}>
                        {[
                            { key: 'canDownloadEmployeeReport', label: 'Employees Reports', desc: 'Allow roles to download individual employee reports', icon: 'fas fa-user', color: '#667eea' },
                            { key: 'canDownloadProductReport', label: 'Products Reports', desc: 'Allow roles to download individual product reports', icon: 'fas fa-box', color: '#28a745' },
                            { key: 'canDownloadOrderReport', label: 'Orders Reports', desc: 'Allow roles to download individual order reports', icon: 'fas fa-shopping-cart', color: '#ffc107' },
                            { key: 'canDownloadSupplierOrderReport', label: 'Supplier Orders Reports', desc: 'Allow roles to download individual supplier order reports', icon: 'fas fa-truck', color: '#dc3545' },
                            { key: 'canDownloadSupplierReport', label: 'Supplier Reports', desc: 'Allow roles to download individual supplier reports', icon: 'fas fa-users', color: '#fd7e14' },
                            { key: 'canDownloadSalaryReport', label: 'Salary Reports', desc: 'Allow roles to download salary reports', icon: 'fas fa-wallet', color: '#17a2b8' }
                        ].map(reportType => (
                            <div key={reportType.key} style={{ border: '1px solid #e0e0e0', borderRadius: '10px', padding: '25px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.3s ease' }}>
                                <h4 style={{ marginBottom: '15px', color: '#333', fontSize: '16px', fontWeight: '600' }}>
                                    <i className={`${reportType.icon} me-2`} style={{ color: reportType.color }}></i>
                                    {reportType.label}
                                </h4>
                                <p style={{ color: '#666', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' }}>
                                    {reportType.desc}
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {Object.keys(roleInfo).map(role => (
                                        <label key={role} style={{ display: 'flex', alignItems: 'center', cursor: savingReportPerm === `${role}-${reportType.key}` ? 'wait' : 'pointer', padding: '10px', borderRadius: '6px', transition: 'background 0.2s', background: savingReportPerm === `${role}-${reportType.key}` ? '#f0f0f0' : 'transparent' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={reportDownloadPerms[role]?.[reportType.key] ?? false}
                                                onChange={() => handleReportDownloadToggle(role, reportType.key)}
                                                disabled={savingReportPerm === `${role}-${reportType.key}`}
                                                style={{ width: '18px', height: '18px', marginRight: '12px', cursor: 'pointer' }}
                                            />
                                            <span style={{ color: '#333', fontSize: '14px', fontWeight: '500' }}>
                                                {roleInfo[role]?.title || role}s
                                                {roleInfo[role]?.isCustom && <span style={{ fontSize: '10px', background: '#667eea', color: '#fff', padding: '1px 5px', borderRadius: '8px', marginLeft: '6px' }}>Custom</span>}
                                            </span>
                                            {savingReportPerm === `${role}-${reportType.key}` && (
                                                <i className="fas fa-spinner fa-spin ms-2" style={{ color: '#667eea', fontSize: '12px' }}></i>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '30px', padding: '20px', background: '#f0f8ff', borderRadius: '10px', borderLeft: '5px solid #667eea' }}>
                        <h5 style={{ marginBottom: '12px', color: '#333', fontSize: '14px', fontWeight: '600' }}>
                            <i className="fas fa-info-circle me-2"></i>
                            About Report Downloads
                        </h5>
                        <ul style={{ marginBottom: 0, color: '#666', fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px' }}>
                            <li>Business Owners can always download all reports</li>
                            <li>These permissions control which report types each role can access on the Reports page</li>
                            <li>Changes take effect immediately for all users of the selected role</li>
                            <li>Users also need the "Export Reports" permission (in Role-Based Permissions) to access the Reports page</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Supplier Permissions Tab */}
            {mainTab === 'supplier-permissions' && (
                <div className="permission-panel" style={{ padding: '30px' }}>
                    <div className="panel-header" style={{ marginBottom: '25px' }}>
                        <h2><i className="fas fa-truck me-2"></i>Supplier Permissions</h2>
                        <p>Control supplier report and messaging permissions</p>
                    </div>

                    {/* Bulk Actions */}
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '25px' }}>
                        {/* Reports Bulk Actions */}
                        <div style={{ 
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px', 
                            padding: '20px', 
                            background: '#f8f9fa', 
                            borderRadius: '10px'
                        }}>
                            <span style={{ fontWeight: '500', color: '#333' }}>Bulk Actions — Reports:</span>
                            <button 
                                className="btn btn-success btn-sm"
                                onClick={() => handleBulkSupplierPermission(true)}
                                disabled={savingSupplierPermission === 'bulk' || suppliers.length === 0}
                                style={{ padding: '8px 20px' }}
                            >
                                {savingSupplierPermission === 'bulk' ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-check-circle me-2"></i>
                                        Enable All
                                    </>
                                )}
                            </button>
                            <button 
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleBulkSupplierPermission(false)}
                                disabled={savingSupplierPermission === 'bulk' || suppliers.length === 0}
                                style={{ padding: '8px 20px' }}
                            >
                                <i className="fas fa-times-circle me-2"></i>
                                Disable All
                            </button>
                            <span style={{ color: '#666', fontSize: '13px', textAlign: 'right' }}>
                                {suppliers.filter(s => s.canExportReports).length} of {suppliers.length} can export reports
                            </span>
                        </div>

                        {/* Messaging Bulk Actions */}
                        <div style={{ 
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px', 
                            padding: '20px', 
                            background: '#f8f9fa', 
                            borderRadius: '10px'
                        }}>
                            <span style={{ fontWeight: '500', color: '#333' }}>Bulk Actions — Messaging:</span>
                            <button 
                                className="btn btn-success btn-sm"
                                onClick={() => handleBulkSupplierMessagePermission(true)}
                                disabled={savingSupplierPermission === 'bulk-msg' || suppliers.length === 0}
                                style={{ padding: '8px 20px' }}
                            >
                                {savingSupplierPermission === 'bulk-msg' ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-check-circle me-2"></i>
                                        Enable All
                                    </>
                                )}
                            </button>
                            <button 
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleBulkSupplierMessagePermission(false)}
                                disabled={savingSupplierPermission === 'bulk-msg' || suppliers.length === 0}
                                style={{ padding: '8px 20px' }}
                            >
                                <i className="fas fa-times-circle me-2"></i>
                                Disable All
                            </button>
                            <span style={{ color: '#666', fontSize: '13px', textAlign: 'right' }}>
                                {suppliers.filter(s => s.canMessage).length} of {suppliers.length} can message
                            </span>
                        </div>
                    </div>

                    {/* Suppliers List */}
                    {loadingSuppliers ? (
                        <div style={{ textAlign: 'center', padding: '50px' }}>
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p style={{ marginTop: '15px', color: '#666' }}>Loading suppliers...</p>
                        </div>
                    ) : suppliers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
                            <i className="fas fa-truck" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.3 }}></i>
                            <p>No suppliers found. Add suppliers to manage their permissions.</p>
                        </div>
                    ) : (
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
                            gap: '20px' 
                        }}>
                            {suppliers.map(supplier => (
                                <div 
                                    key={supplier._id} 
                                    style={{ 
                                        border: '1px solid #e0e0e0', 
                                        borderRadius: '10px', 
                                        padding: '20px', 
                                        background: '#fff',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    <div style={{ marginBottom: '15px' }}>
                                        <h5 style={{ margin: 0, color: '#333', fontSize: '15px', fontWeight: '600' }}>
                                            {supplier.fname} {supplier.lname || ''}
                                        </h5>
                                        <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '13px' }}>
                                            {supplier.email}
                                        </p>
                                        {supplier.companyName && (
                                            <p style={{ margin: '3px 0 0 0', color: '#888', fontSize: '12px' }}>
                                                <i className="fas fa-building me-1"></i>{supplier.companyName}
                                            </p>
                                        )}
                                    </div>
                                    {/* Export Reports Toggle */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
                                        <span style={{ fontSize: '13px', color: '#555' }}>
                                            <i className="fas fa-file-export me-2"></i>Export Reports
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ 
                                                fontSize: '12px', 
                                                color: supplier.canExportReports ? '#28a745' : '#dc3545',
                                                fontWeight: '500'
                                            }}>
                                                {supplier.canExportReports ? 'Enabled' : 'Disabled'}
                                            </span>
                                            <label className="permission-toggle" style={{ margin: 0 }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={supplier.canExportReports || false}
                                                    onChange={() => handleSupplierPermissionToggle(supplier._id, supplier.canExportReports)}
                                                    disabled={savingSupplierPermission === supplier._id}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                            {savingSupplierPermission === supplier._id && (
                                                <span className="spinner-border spinner-border-sm text-primary" role="status"></span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Messaging Toggle */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
                                        <span style={{ fontSize: '13px', color: '#555' }}>
                                            <i className="fas fa-comment-dots me-2"></i>Messaging
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ 
                                                fontSize: '12px', 
                                                color: supplier.canMessage ? '#28a745' : '#dc3545',
                                                fontWeight: '500'
                                            }}>
                                                {supplier.canMessage ? 'Enabled' : 'Disabled'}
                                            </span>
                                            <label className="permission-toggle" style={{ margin: 0 }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={supplier.canMessage || false}
                                                    onChange={() => handleSupplierMessageToggle(supplier._id, supplier.canMessage)}
                                                    disabled={savingSupplierPermission === supplier._id + '-msg'}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                            {savingSupplierPermission === supplier._id + '-msg' && (
                                                <span className="spinner-border spinner-border-sm text-primary" role="status"></span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Info Note */}
                    <div style={{ marginTop: '30px', padding: '20px', background: '#e8f4fd', borderRadius: '10px', borderLeft: '4px solid #0d6efd' }}>
                        <h5 style={{ marginBottom: '10px', color: '#0d6efd', fontSize: '14px' }}>
                            <i className="fas fa-info-circle me-2"></i>About Supplier Permissions
                        </h5>
                        <ul style={{ marginBottom: 0, color: '#333', fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px' }}>
                            <li><strong>Export Reports:</strong> Suppliers with this permission can download PDF and Excel reports of their orders</li>
                            <li>They can download both individual order reports and all orders report</li>
                            <li><strong>Messaging:</strong> Suppliers with this permission can send messages to you (Business Owner)</li>
                            <li>Suppliers can only communicate with their Business Owner — not with employees or other suppliers</li>
                            <li>You can enable/disable these permissions anytime</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Notification Settings Tab */}
            {mainTab === 'notifications' && (
                <div className="permission-panel" style={{ padding: '30px' }}>
                    <div className="panel-header">
                        <h2><i className="fas fa-bell me-2"></i>Notification Settings</h2>
                        <p>Configure when and how you receive notifications for business events</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '25px', marginBottom: '30px' }}>
                        {/* Salary Due Alert */}
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '10px', padding: '25px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#333', fontSize: '16px', fontWeight: '600' }}>
                                <i className="fas fa-money-bill me-2" style={{ color: '#28a745' }}></i>
                                Salary Due Alert
                            </h4>
                            <p style={{ color: '#666', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' }}>
                                Get notified when employee salary is due to be paid
                            </p>
                            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '18px', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={notificationPreferences.salarydueAlert} 
                                    onChange={(e) => setNotificationPreferences({
                                        ...notificationPreferences,
                                        salarydueAlert: e.target.checked
                                    })}
                                    style={{ width: '18px', height: '18px', marginRight: '12px', cursor: 'pointer' }} 
                                />
                                <span style={{ color: '#333', fontSize: '14px', fontWeight: '500' }}>Enable salary due notifications</span>
                            </label>
                            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                                <label style={{ color: '#333', fontSize: '13px', marginBottom: '10px', display: 'block', fontWeight: '500' }}>
                                    Alert <strong>X days</strong> before salary due date:
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="30" 
                                        value={notificationPreferences.salaryDueDaysThreshold}
                                        onChange={(e) => setNotificationPreferences({
                                            ...notificationPreferences,
                                            salaryDueDaysThreshold: parseInt(e.target.value) || 3
                                        })}
                                        style={{ width: '70px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} 
                                    />
                                    <span style={{ color: '#666', fontSize: '14px' }}>days</span>
                                </div>
                            </div>
                        </div>

                        {/* Supplier Order Delivery Alert */}
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '10px', padding: '25px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#333', fontSize: '16px', fontWeight: '600' }}>
                                <i className="fas fa-truck me-2" style={{ color: '#fd7e14' }}></i>
                                Supplier Order Delivery Alert
                            </h4>
                            <p style={{ color: '#666', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' }}>
                                Get notified when supplier orders are near delivery
                            </p>
                            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '18px', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={notificationPreferences.supplierOrderDeliveryAlert}
                                    onChange={(e) => setNotificationPreferences({
                                        ...notificationPreferences,
                                        supplierOrderDeliveryAlert: e.target.checked
                                    })}
                                    style={{ width: '18px', height: '18px', marginRight: '12px', cursor: 'pointer' }} 
                                />
                                <span style={{ color: '#333', fontSize: '14px', fontWeight: '500' }}>Enable delivery notifications</span>
                            </label>
                            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                                <label style={{ color: '#333', fontSize: '13px', marginBottom: '10px', display: 'block', fontWeight: '500' }}>
                                    Alert <strong>X days</strong> before delivery date:
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="30" 
                                        value={notificationPreferences.supplierOrderDeliveryDaysThreshold}
                                        onChange={(e) => setNotificationPreferences({
                                            ...notificationPreferences,
                                            supplierOrderDeliveryDaysThreshold: parseInt(e.target.value) || 2
                                        })}
                                        style={{ width: '70px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} 
                                    />
                                    <span style={{ color: '#666', fontSize: '14px' }}>days</span>
                                </div>
                            </div>
                        </div>

                        {/* Low Stock Alert */}
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '10px', padding: '25px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#333', fontSize: '16px', fontWeight: '600' }}>
                                <i className="fas fa-warehouse me-2" style={{ color: '#ffc107' }}></i>
                                Low Stock Alert
                            </h4>
                            <p style={{ color: '#666', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' }}>
                                Get notified when product stock falls below a threshold
                            </p>
                            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '18px', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={notificationPreferences.productLowStockAlert}
                                    onChange={(e) => setNotificationPreferences({
                                        ...notificationPreferences,
                                        productLowStockAlert: e.target.checked
                                    })}
                                    style={{ width: '18px', height: '18px', marginRight: '12px', cursor: 'pointer' }} 
                                />
                                <span style={{ color: '#333', fontSize: '14px', fontWeight: '500' }}>Enable low stock notifications</span>
                            </label>
                            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                                <label style={{ color: '#333', fontSize: '13px', marginBottom: '10px', display: 'block', fontWeight: '500' }}>
                                    Alert when stock is below:
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="100" 
                                        value={notificationPreferences.productLowStockThreshold}
                                        onChange={(e) => setNotificationPreferences({
                                            ...notificationPreferences,
                                            productLowStockThreshold: parseInt(e.target.value) || 10
                                        })}
                                        style={{ width: '70px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} 
                                    />
                                    <span style={{ color: '#666', fontSize: '14px' }}>units</span>
                                </div>
                            </div>
                        </div>

                        {/* Customer Order Delivery Alert */}
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '10px', padding: '25px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#333', fontSize: '16px', fontWeight: '600' }}>
                                <i className="fas fa-shopping-cart me-2" style={{ color: '#17a2b8' }}></i>
                                Customer Order Delivery Alert
                            </h4>
                            <p style={{ color: '#666', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' }}>
                                Get notified when customer orders are near delivery
                            </p>
                            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '18px', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={notificationPreferences.customerOrderDeliveryAlert}
                                    onChange={(e) => setNotificationPreferences({
                                        ...notificationPreferences,
                                        customerOrderDeliveryAlert: e.target.checked
                                    })}
                                    style={{ width: '18px', height: '18px', marginRight: '12px', cursor: 'pointer' }} 
                                />
                                <span style={{ color: '#333', fontSize: '14px', fontWeight: '500' }}>Enable order delivery notifications</span>
                            </label>
                            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                                <label style={{ color: '#333', fontSize: '13px', marginBottom: '10px', display: 'block', fontWeight: '500' }}>
                                    Alert <strong>X days</strong> before delivery date:
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="30" 
                                        value={notificationPreferences.customerOrderDeliveryDaysThreshold}
                                        onChange={(e) => setNotificationPreferences({
                                            ...notificationPreferences,
                                            customerOrderDeliveryDaysThreshold: parseInt(e.target.value) || 1
                                        })}
                                        style={{ width: '70px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} 
                                    />
                                    <span style={{ color: '#666', fontSize: '14px' }}>days</span>
                                </div>
                            </div>
                        </div>

                        {/* Supplier Order Supply Alert */}
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '10px', padding: '25px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#333', fontSize: '16px', fontWeight: '600' }}>
                                <i className="fas fa-industry me-2" style={{ color: '#6f42c1' }}></i>
                                Supplier Order Supply Alert
                            </h4>
                            <p style={{ color: '#666', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' }}>
                                Suppliers get notified when they need to supply orders (Supplier View)
                            </p>
                            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '18px', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={notificationPreferences.supplierOrderSupplyAlert}
                                    onChange={(e) => setNotificationPreferences({
                                        ...notificationPreferences,
                                        supplierOrderSupplyAlert: e.target.checked
                                    })}
                                    style={{ width: '18px', height: '18px', marginRight: '12px', cursor: 'pointer' }} 
                                />
                                <span style={{ color: '#333', fontSize: '14px', fontWeight: '500' }}>Enable supply notifications</span>
                            </label>
                            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                                <label style={{ color: '#333', fontSize: '13px', marginBottom: '10px', display: 'block', fontWeight: '500' }}>
                                    Alert <strong>X days</strong> before order due date:
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="30" 
                                        value={notificationPreferences.supplierOrderSupplyDaysThreshold}
                                        onChange={(e) => setNotificationPreferences({
                                            ...notificationPreferences,
                                            supplierOrderSupplyDaysThreshold: parseInt(e.target.value) || 2
                                        })}
                                        style={{ width: '70px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} 
                                    />
                                    <span style={{ color: '#666', fontSize: '14px' }}>days</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '30px', padding: '20px', background: '#f0f8ff', borderRadius: '8px', borderLeft: '4px solid #667eea' }}>
                        <h5 style={{ marginBottom: '10px', color: '#333' }}>
                            <i className="fas fa-info-circle me-2"></i>
                            About Notifications
                        </h5>
                        <ul style={{ marginBottom: 0, color: '#666', fontSize: '14px' }}>
                            <li><strong>Salary Due Alerts:</strong> Notified when employee salaries are due within the configured number of days</li>
                            <li><strong>Supplier Order Delivery:</strong> Notified when supplier orders are approaching their expected delivery date</li>
                            <li><strong>Low Stock Alerts:</strong> Notified when product inventory drops below the threshold</li>
                            <li><strong>Customer Order Delivery:</strong> Notified when customer orders need to be sent/delivered soon</li>
                            <li><strong>Supplier Order Supply:</strong> Suppliers notified when they need to supply orders to your business</li>
                            <li>All settings are customizable with thresholds and can be enabled/disabled independently</li>
                        </ul>
                    </div>

                    <div style={{ marginTop: '20px', textAlign: 'right' }}>
                        <button 
                            className="btn btn-primary" 
                            style={{ padding: '10px 30px', fontSize: '16px' }}
                            onClick={saveNotificationPreferences}
                            disabled={savingNotificationPreferences}
                        >
                            <i className="fas fa-save me-2"></i>
                            {savingNotificationPreferences ? 'Saving...' : 'Save Notification Settings'}
                        </button>
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
