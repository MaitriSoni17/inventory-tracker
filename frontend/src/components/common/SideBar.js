import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Link, useLocation, useNavigate } from "react-router-dom";
import '../../styles/sidebar.css'
import Notifications from './Notifications';
import Chatbot from './Chatbot';
import { useRole } from '../../context/RoleContext';

const SideBar = () => {
    const { role, logout, hasPermission, deletionRestriction, fetchUserRole } = useRole();
    const storedRole = localStorage.getItem('role');
    const currentRole = role || storedRole;
    let location = useLocation();
    const navigate = useNavigate();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isImpersonating = localStorage.getItem('isImpersonating') === 'true';
    const impersonatedEmployeeName = localStorage.getItem('impersonatedEmployeeName') || 'employee';

    // Handle logout
    const handleLogout = () => {
        logout();
        navigate('/');
    };

    useEffect(() => {
        // Close user menu when clicking outside
        const handleClickOutside = (e) => {
            if (!e.target.closest('.user-menu-wrapper')) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Close sidebar when a link is clicked
    useEffect(() => {
        setSidebarOpen(false);
    }, [location]);

    // Close sidebar when pressing Escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setSidebarOpen(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    // Check if user can access certain features based on role
    const isEmployee = currentRole && currentRole !== 'businessowner' && currentRole !== 'supplier';
    const isBusinessOwner = currentRole === 'businessowner';
    const isSupplier = currentRole === 'supplier';
    const isDeletionRestricted = Boolean(deletionRestriction) && (isEmployee || isSupplier);

    // Permission-based access checks (using actual permissions from RoleContext)
    const canViewCategories = hasPermission('canViewCategories');
    const canViewProducts = hasPermission('canViewProducts');
    const canViewOrders = hasPermission('canViewOrders');
    const canViewEmployees = hasPermission('canViewEmployees');
    const canViewWarehouses = hasPermission('canViewWarehouses');
    const canViewNotifications = hasPermission('canViewNotifications');
    const canViewMessages = hasPermission('canViewMessages');
    const canExportReports = hasPermission('canExportReports');
    const canViewDashboard = hasPermission('canViewDashboard');

    const handleStopImpersonation = async () => {
        try {
            const response = await fetch('/api/auth/stop-impersonation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                const backupRaw = sessionStorage.getItem('impersonationBackup');
                if (backupRaw) {
                    const backup = JSON.parse(backupRaw);
                    if (backup?.token && backup?.role) {
                        localStorage.setItem('token', backup.token);
                        localStorage.setItem('role', backup.role);
                        localStorage.setItem('userId', backup.userId || '');
                        localStorage.removeItem('isImpersonating');
                        localStorage.removeItem('impersonatedEmployeeName');
                        sessionStorage.removeItem('impersonationBackup');
                        await fetchUserRole();
                        navigate('/dashboard', { replace: true });
                        return;
                    }
                }
                logout();
                navigate('/login');
                return;
            }

            localStorage.setItem('token', data.authtoken);
            localStorage.setItem('role', data.role);
            localStorage.setItem('userId', data.userId || '');
            localStorage.removeItem('isImpersonating');
            localStorage.removeItem('impersonatedEmployeeName');
            sessionStorage.removeItem('impersonationBackup');
            await fetchUserRole();
            navigate('/dashboard', { replace: true });
        } catch (error) {
            logout();
            navigate('/login');
        }
    };

    return (
        <>
            <div className='d-flex' id="wrapper">
                {/* Overlay for mobile */}
                <div 
                    className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                ></div>

                {/* Sidebar */}
                <div 
                    className={`bg-white border-end sidebar ${sidebarOpen ? 'show' : ''}`} 
                    id="sidebar-wrapper"
                    role="navigation"
                    aria-label="Navigation menu"
                >
                    <div className="sidebar-heading text-center py-4 fs-4 fw-bold app-title">
                        <i className="bi bi-box-seam me-2"></i>Inline Tracker
                    </div>
                    <div className="list-group list-group-flush my-3">
                        
                        {!isDeletionRestricted && canViewDashboard && (
                        <Link to="/dashboard" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/dashboard" ? "active" : ""}`}>
                            <i className="fas fa-th-large me-2"></i>Dashboard
                        </Link>
                        )}

                        {isDeletionRestricted && (
                            <Link to="/dashboard/deletion-hold" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/dashboard/deletion-hold" ? "active" : ""}`}>
                                <i className="bi bi-shield-exclamation me-2"></i>Deletion Hold
                            </Link>
                        )}
                        
                        {/* Categories - Based on canViewCategories permission */}
                        {!isDeletionRestricted && canViewCategories && (
                            <Link to="/dashboard/category" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/dashboard/category" ? "active" : ""}`}>
                                <i className="fas fa-cube me-2"></i>Categories
                            </Link>
                        )}
                        
                        {/* Products - Based on canViewProducts permission */}
                        {!isDeletionRestricted && canViewProducts && (
                            <Link to="/dashboard/products" className={`list-group-item list-group-item-action bg-transparent second-text ${(location.pathname === "/dashboard/products" || location.pathname === "/dashboard/addproduct" || location.pathname.startsWith("/dashboard/editproduct/")) ? "active" : ""}`}>
                                <i className="fas fa-box me-2"></i>Products
                            </Link>
                        )}
                        
                        {/* Orders - Based on canViewOrders permission or supplier role */}
                        {!isDeletionRestricted && (canViewOrders || isSupplier) && (
                            <Link to={(isEmployee || isBusinessOwner)  ? "/dashboard/orders" : (isSupplier ? "/dashboard/suppliersorders" : "/")} className={`list-group-item list-group-item-action bg-transparent second-text ${(location.pathname === "/dashboard/orders" || location.pathname === "/dashboard/addorder" || location.pathname.startsWith("/dashboard/editorder/") || location.pathname === "/dashboard/suppliersorders") ? "active" : ""}`}>
                                <i className="bi bi-cart me-2"></i>Orders
                            </Link>
                        )}
                        
                        {/* Employees - Based on canViewEmployees permission */}
                        {!isDeletionRestricted && canViewEmployees && (
                            <Link to="/dashboard/employee" className={`list-group-item list-group-item-action bg-transparent second-text ${(location.pathname === "/dashboard/createemployee" || location.pathname === "/dashboard/employee" || location.pathname.startsWith("/dashboard/editemployee/")) ? "active" : ""}`}>
                                <i className="bi bi-people me-2"></i>Employees
                            </Link>
                        )}
                        
                        {/* Suppliers - Only BusinessOwner */}
                        {!isDeletionRestricted && isBusinessOwner && (
                            <Link to="/dashboard/suppliers" className={`list-group-item list-group-item-action bg-transparent second-text ${(location.pathname === "/dashboard/suppliers" || location.pathname === "/dashboard/createsupplier" || location.pathname.startsWith("/dashboard/editsupplier/") || location.pathname.startsWith("/dashboard/supplierordes/") || location.pathname.startsWith("/dashboard/addsupplierorder/") || location.pathname.startsWith("/dashboard/editsupplierorder/")) ? "active" : ""}`}>
                                <i className="fas fa-truck me-2"></i>Suppliers
                            </Link>
                        )}
                        
                        {/* Warehouses - Based on canViewWarehouses permission */}
                        {!isDeletionRestricted && canViewWarehouses && (
                            <Link to="/dashboard/warehouses" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/dashboard/warehouses" ? "active" : ""}`}>
                                <i className="fas fa-warehouse me-2"></i>Warehouses
                            </Link>
                        )}
                        
                        {/* Permissions - Only BusinessOwner */}
                        {!isDeletionRestricted && isBusinessOwner && (
                            <Link to="/dashboard/permissions" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/dashboard/permissions" ? "active" : ""}`}>
                                <i className="fas fa-shield-alt me-2"></i>Permissions
                            </Link>
                        )}
                        
                        {/* Salary Management - Only BusinessOwner */}
                        {!isDeletionRestricted && isBusinessOwner && (
                            <Link to="/dashboard/salary" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/dashboard/salary" ? "active" : ""}`}>
                                <i className="fas fa-money-bill-wave me-2"></i>Salary Management
                            </Link>
                        )}
                        
                        {/* Notifications - Based on canViewNotifications permission */}
                        {!isDeletionRestricted && canViewNotifications && (
                            <Link to="/dashboard/notifications" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/dashboard/notifications" ? "active" : ""}`}>
                                <i className="fas fa-bell me-2"></i>Notifications
                            </Link>
                        )}
                        
                        {/* Messages - Based on canViewMessages permission */}
                        {!isDeletionRestricted && canViewMessages && (
                            <Link to="/dashboard/messages" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/dashboard/messages" ? "active" : ""}`}>
                                <i className="bi bi-chat-dots me-2"></i>Messages
                            </Link>
                        )}
                        
                        {/* Reports - Based on canExportReports permission */}
                        {!isDeletionRestricted && canExportReports && (
                            <Link to="/dashboard/reports" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/dashboard/reports" ? "active" : ""}`}>
                                <i className="fas fa-chart-line me-2"></i>Reports
                            </Link>
                        )}

                        {!isDeletionRestricted && canExportReports && (
                            <Link to="/dashboard/ai-insights" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/dashboard/ai-insights" ? "active" : ""}`}>
                                <i className="fas fa-brain me-2"></i>AI Insights
                            </Link>
                        )}
                        
                        {/* Settings */}
                        <Link to={isDeletionRestricted ? "/dashboard/deletion-hold" : isEmployee ? "/dashboard/empsettings" : isBusinessOwner ? "/dashboard/settings" : isSupplier ? "/dashboard/suppliersettings" : "/"} className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/dashboard/settings" || location.pathname === "/dashboard/empsettings" || location.pathname === "/dashboard/suppliersettings" || location.pathname === "/dashboard/deletion-hold" ? "active" : ""}`}>
                            <i className="fas fa-cog me-2"></i>Settings
                        </Link>
                        
                        {/* Log Out */}
                        <button onClick={handleLogout} className="list-group-item list-group-item-action bg-transparent text-danger border-0 text-start">
                            <i className="fas fa-sign-out-alt me-2"></i>Log Out
                        </button>
                    </div>
                    
                </div>

                {/* Main Content */}
                <div id="page-content-wrapper" className="p-0 m-0">
                    <nav className="navbar navbar-expand-lg navbar-light bg-light border-1 border-bottom py-3 px-3 px-lg-4 m-0" role="navigation" aria-label="Top navigation">
                        <div className="d-flex align-items-center justify-content-between w-100">
                            <button 
                                className="btn btn-link d-lg-none me-2"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                aria-label="Toggle sidebar"
                                aria-expanded={sidebarOpen}
                                aria-controls="sidebar-wrapper"
                                style={{ border: 'none', padding: '0.5rem' }}
                            >
                                <i className={`fas fa-${sidebarOpen ? 'times' : 'bars'} fs-5`}></i>
                            </button>
                            <h2 className="fs-2 m-0 d-none d-md-block flex-grow-1">Dashboard</h2>
                            <div className="d-flex align-items-center gap-3 ms-auto">
                                {isImpersonating && (
                                    <div className="badge bg-warning text-dark px-3 py-2 d-flex align-items-center gap-2">
                                        <span>Impersonating {impersonatedEmployeeName}</span>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-dark"
                                            onClick={handleStopImpersonation}
                                        >
                                            Return to Owner
                                        </button>
                                    </div>
                                )}
                                <li className="nav-item d-flex align-items-center">
                                    <Notifications />
                                </li>
                                <li className="nav-item d-flex align-items-center">
                                    <div className="user-menu-wrapper position-relative">
                                        <button 
                                            className="user-icon-button"
                                            onClick={() => setShowUserMenu(!showUserMenu)}
                                            title="User menu"
                                            aria-expanded={showUserMenu}
                                            aria-label="User menu"
                                        >
                                            <i className="bi bi-person-circle"></i>
                                        </button>
                                        {showUserMenu && (
                                            <div className="user-dropdown-menu">
                                                <Link 
                                                    to={isDeletionRestricted ? "/dashboard/deletion-hold" : isEmployee ? "/dashboard/empsettings" : isBusinessOwner ? "/dashboard/settings" : isSupplier ? "/dashboard/suppliersettings" : "/"} 
                                                    className="dropdown-item"
                                                    onClick={() => setShowUserMenu(false)}
                                                >
                                                    <i className="fas fa-cog me-2"></i>Settings
                                                </Link>
                                                <div className="dropdown-divider"></div>
                                                <button 
                                                    className="dropdown-item text-danger border-0 bg-transparent w-100 text-start"
                                                    onClick={() => {
                                                        setShowUserMenu(false);
                                                        handleLogout();
                                                    }}
                                                >
                                                    <i className="fas fa-sign-out-alt me-2"></i>Logout
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            </div>
                        </div>
                    </nav>
                    <Outlet />
                </div>
            </div>
            <Chatbot />
        </>
    )
}

export default SideBar

