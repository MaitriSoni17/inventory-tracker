import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Link, useLocation, useNavigate } from "react-router-dom";
import '../../styles/sidebar.css'
import Notifications from './Notifications';
import Chatbot from './Chatbot';
import { useRole } from '../../context/RoleContext';

const SideBar = () => {
    const { role, logout, hasPermission } = useRole();
    const storedRole = localStorage.getItem('role');
    const currentRole = role || storedRole;
    let location = useLocation();
    const navigate = useNavigate();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

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
    const isEmployee = ['employee', 'supervisor', 'manager'].includes(currentRole);
    const isBusinessOwner = currentRole === 'businessowner';
    const isSupplier = currentRole === 'supplier';

    // Permission-based access checks (using actual permissions from RoleContext)
    const canViewCategories = hasPermission('canViewCategories');
    const canViewProducts = hasPermission('canViewProducts');
    const canViewOrders = hasPermission('canViewOrders');
    const canViewEmployees = hasPermission('canViewEmployees');
    const canViewWarehouses = hasPermission('canViewWarehouses');
    const canViewNotifications = hasPermission('canViewNotifications');
    const canViewMessages = hasPermission('canViewMessages');

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
                        
                        <Link to="/dashboard" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/dashboard" ? "active" : ""}`}>
                            <i className="fas fa-th-large me-2"></i>Dashboard
                        </Link>
                        
                        {/* Categories - Based on canViewCategories permission */}
                        {canViewCategories && (
                            <Link to="/dashboard/category" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/dashboard/category" ? "active" : ""}`}>
                                <i className="fas fa-cube me-2"></i>Categories
                            </Link>
                        )}
                        
                        {/* Products - Based on canViewProducts permission */}
                        {canViewProducts && (
                            <Link to="/dashboard/products" className={`list-group-item list-group-item-action bg-transparent second-text ${(location.pathname === "/dashboard/products" || location.pathname === "/dashboard/addproduct" || location.pathname.startsWith("/dashboard/editproduct/")) ? "active" : ""}`}>
                                <i className="fas fa-box me-2"></i>Products
                            </Link>
                        )}
                        
                        {/* Orders - Based on canViewOrders permission or supplier role */}
                        {(canViewOrders || isSupplier) && (
                            <Link to={(isEmployee || isBusinessOwner)  ? "/dashboard/orders" : (isSupplier ? "/dashboard/suppliersorders" : "/")} className={`list-group-item list-group-item-action bg-transparent second-text ${(location.pathname === "/dashboard/orders" || location.pathname === "/dashboard/addorder" || location.pathname.startsWith("/dashboard/editorder/") || location.pathname === "/dashboard/suppliersorders") ? "active" : ""}`}>
                                <i className="bi bi-cart me-2"></i>Orders
                            </Link>
                        )}
                        
                        {/* Employees - Based on canViewEmployees permission */}
                        {canViewEmployees && (
                            <Link to="/dashboard/employee" className={`list-group-item list-group-item-action bg-transparent second-text ${(location.pathname === "/dashboard/createemployee" || location.pathname === "/dashboard/employee" || location.pathname.startsWith("/dashboard/editemployee/")) ? "active" : ""}`}>
                                <i className="bi bi-people me-2"></i>Employees
                            </Link>
                        )}
                        
                        {/* Suppliers - Only BusinessOwner */}
                        {isBusinessOwner && (
                            <Link to="/dashboard/suppliers" className={`list-group-item list-group-item-action bg-transparent second-text ${(location.pathname === "/dashboard/suppliers" || location.pathname === "/dashboard/createsupplier" || location.pathname.startsWith("/dashboard/editsupplier/") || location.pathname.startsWith("/dashboard/supplierordes/") || location.pathname.startsWith("/dashboard/addsupplierorder/") || location.pathname.startsWith("/dashboard/editsupplierorder/")) ? "active" : ""}`}>
                                <i className="fas fa-truck me-2"></i>Suppliers
                            </Link>
                        )}
                        
                        {/* Warehouses - Based on canViewWarehouses permission */}
                        {canViewWarehouses && (
                            <Link to="/dashboard/warehouses" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/dashboard/warehouses" ? "active" : ""}`}>
                                <i className="fas fa-warehouse me-2"></i>Warehouses
                            </Link>
                        )}
                        
                        {/* Permissions - Only BusinessOwner */}
                        {isBusinessOwner && (
                            <Link to="/dashboard/permissions" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/dashboard/permissions" ? "active" : ""}`}>
                                <i className="fas fa-shield-alt me-2"></i>Permissions
                            </Link>
                        )}
                        
                        {/* Notifications - Based on canViewNotifications permission */}
                        {canViewNotifications && (
                            <Link to="/dashboard/notifications" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/dashboard/notifications" ? "active" : ""}`}>
                                <i className="fas fa-bell me-2"></i>Notifications
                            </Link>
                        )}
                        
                        {/* Messages - Based on canViewMessages permission */}
                        {canViewMessages && (
                            <Link to="/dashboard/messages" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/dashboard/messages" ? "active" : ""}`}>
                                <i className="bi bi-chat-dots me-2"></i>Messages
                            </Link>
                        )}
                        
                        {/* Settings */}
                        <Link to={isEmployee ? "/dashboard/empsettings" : isBusinessOwner ? "/dashboard/settings" : isSupplier ? "/dashboard/suppliersettings" : "/"} className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/dashboard/settings" || location.pathname === "/dashboard/empsettings" || location.pathname === "/dashboard/suppliersettings" ? "active" : ""}`}>
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
                                                    to={isEmployee ? "/dashboard/empsettings" : isBusinessOwner ? "/dashboard/settings" : isSupplier ? "/dashboard/suppliersettings" : "/"} 
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

