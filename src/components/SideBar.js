import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Link, useLocation } from "react-router-dom";
import './styles/sidebar.css'
import Notifications from './Notifications';

const SideBar = () => {
    const role = localStorage.getItem('role');
    let location = useLocation();
    const [showUserMenu, setShowUserMenu] = useState(false);

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

    return (
        <>
            <div className='d-flex' id="wrapper">
                <div className='sidebar' id="sidebar-wrapper">
                    <div className="bg-white border-end sidebar" id="sidebar-wrapper">
                        <div className="sidebar-heading text-center py-4 fs-4 fw-bold app-title">Inline Tracker</div>
                        <div className="list-group list-group-flush my-3">
                            
                            <Link to="/dashboard" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/dashboard" ? "active" : ""}`}>
                                <i className="fas fa-th-large me-2"></i>Dashboard
                            </Link>
                            <Link to={(role === "businessowner" || role === "employee")  ? "/dashboard/category" : "/"} className={`list-group-item list-group-item-action bg-transparent second-text ${role === "supplier" ? "d-none" : ""} ${location.pathname === "/dashboard/category" ? "active" : ""}`}>
                                <i className="fas fa-cube me-2"></i>Categories
                            </Link>
                            <Link to={(role === "businessowner" || role === "employee")  ? "/dashboard/products" : "/"} className={`list-group-item list-group-item-action bg-transparent second-text ${role === "supplier" ? "d-none" : ""} ${(location.pathname === "/dashboard/products" || location.pathname === "/dashboard/addproduct" || location.pathname.startsWith("/dashboard/editproduct/")) ? "active" : ""}`}>
                                <i className="fas fa-box me-2"></i>Products
                            </Link>
                            <Link to={(role === "businessowner" || role === "employee")  ? "/dashboard/orders" : "/"} className={`list-group-item list-group-item-action bg-transparent second-text ${(location.pathname === "/dashboard/orders" || location.pathname === "/dashboard/addorder" || location.pathname.startsWith("/dashboard/editorder/")) ? "active" : ""}`}>
                                <i className="bi bi-cart me-2"></i>Orders
                            </Link>
                            <Link to={role === "businessowner"  ? "/dashboard/employee" : "/"} className={`list-group-item list-group-item-action bg-transparent second-text ${role === "businessowner"  ? "" : "d-none"} ${(location.pathname === "/dashboard/createemployee" || location.pathname === "/dashboard/employee" || location.pathname.startsWith("/dashboard/editemployee/")) ? "active" : ""}`}>
                                <i className="bi bi-people me-2"></i>Employees
                            </Link>
                            <Link to={role === "businessowner"  ? "/dashboard/suppliers" : "/"} className={`list-group-item list-group-item-action bg-transparent second-text ${role === "businessowner"  ? "" : "d-none"} ${(location.pathname === "/dashboard/suppliers" || location.pathname === "/dashboard/createsupplier" || location.pathname.startsWith("/dashboard/editsupplier/") || location.pathname.startsWith("/dashboard/supplierordes/") || location.pathname.startsWith("/dashboard/addsupplierorder/") || location.pathname.startsWith("/dashboard/editsupplierorder/")) ? "active" : ""}`}>
                                <i className="fas fa-truck me-2"></i>Suppliers
                            </Link>
                            <Link to={role === "businessowner"  ? "/dashboard/warehouses" : "/"} className={`list-group-item list-group-item-action bg-transparent second-text ${role === "businessowner"  ? "" : "d-none"} ${location.pathname === "/dashboard/warehouses" ? "active" : ""}`}>
                                <i className="fas fa-warehouse me-2"></i>Warehouses
                            </Link>
                            <Link to={role === "employee" ? "/dashboard/empsettings" : role === "businessowner" ? "/dashboard/settings" : "/"} className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/dashboard/settings" || location.pathname === "/dashboard/empsettings" ? "active" : ""}`}>
                                <i className="fas fa-cog me-2"></i>Settings
                            </Link>
                            <Link to="/" className="list-group-item list-group-item-action bg-transparent text-danger">
                                <i className="fas fa-sign-out-alt me-2"></i>Log Out
                            </Link>
                        </div>
                        
                    </div>
                </div>
                <div id="page-content-wrapper" className="p-0 m-0">
                    <nav className="navbar navbar-expand-lg navbar-light bg-light border-1 border-bottom py-4 px-4 m-0">
                        <div className="d-flex align-items-center">
                            <h2 className="fs-2 m-0 d-none d-md-block">Dashboard</h2>
                        </div>

                        <button className="navbar-toggler" type="button" data-bs-toggle="collapse"
                            data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent"
                            aria-expanded="false" aria-label="Toggle navigation">
                            <span className="navbar-toggler-icon"></span>
                        </button>

                        <div className="collapse navbar-collapse" id="navbarSupportedContent">
                            <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
                                <li className="nav-item d-flex align-items-center me-3">
                                    <Notifications />
                                </li>
                                <li className="nav-item d-flex align-items-center">
                                    <div className="user-menu-wrapper position-relative">
                                        <button 
                                            className="nav-link icon-link btn btn-link"
                                            style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                                            onClick={() => setShowUserMenu(!showUserMenu)}
                                            title="User menu"
                                        >
                                            <i className="fas fa-user-circle"></i>
                                        </button>
                                        {showUserMenu && (
                                            <div className="user-dropdown-menu">
                                                <Link 
                                                    to="/dashboard/settings" 
                                                    className="dropdown-item"
                                                    onClick={() => setShowUserMenu(false)}
                                                >
                                                    <i className="fas fa-cog me-2"></i>Settings
                                                </Link>
                                                <div className="dropdown-divider"></div>
                                                <Link 
                                                    to="/" 
                                                    className="dropdown-item text-danger"
                                                    onClick={() => setShowUserMenu(false)}
                                                >
                                                    <i className="fas fa-sign-out-alt me-2"></i>Logout
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </nav>
                    <Outlet />
                </div>
            </div>
        </>
    )
}

export default SideBar