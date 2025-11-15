import React, { useEffect } from 'react';

import { Link, useLocation, useNavigate } from "react-router-dom";

import './styles/sidebar.css'

const SideBar = () => {
    let location = useLocation();
    useEffect(() => {
        // console.log(location.pathname);
    }, [location]);
    return (
        <>
            <div className='d-flex' id="wrapper">
                <div className='sidebar'>
                    <div className="bg-white border-end sidebar" id="sidebar-wrapper">
                        <div className="sidebar-heading text-center py-4 fs-4 fw-bold app-title">Inline Tracker</div>
                        <div className="list-group list-group-flush my-3">
                            <Link to="/" className={`list-group-item list-group-item-action second-text ${location.pathname === "/" ? "active" : ""}`}>
                                <i className="fas fa-th-large me-2"></i>Dashboard
                            </Link>
                            <Link to="/" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/category" ? "active" : ""}`}>
                                <i className="fas fa-cube me-2"></i>Categories
                            </Link>
                            <Link to="/" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/products" ? "active" : ""}`}>
                                <i className="fas fa-box me-2"></i>Products
                            </Link>
                            <Link to="/" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/orders" ? "active" : ""}`}>
                                <i className="bi bi-cart me-2"></i>Orders
                            </Link>
                            <Link to="/" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/employees" ? "active" : ""}`}>
                                <i className="bi bi-people me-2"></i>Employees
                            </Link>
                            <Link to="/" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/suppliers" ? "active" : ""}`}>
                                <i className="fas fa-truck me-2"></i>Suppliers
                            </Link>
                            <Link to="/" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/warehouses" ? "active" : ""}`}>
                                <i className="fas fa-warehouse me-2"></i>Warehouses
                            </Link>
                            <Link to="/" className={`list-group-item list-group-item-action bg-transparent second-text ${location.pathname === "/settings" ? "active" : ""}`}>
                                <i className="fas fa-cog me-2"></i>Settings
                            </Link>
                            <Link to="/" className="list-group-item list-group-item-action bg-transparent text-danger">
                                <i className="fas fa-sign-out-alt me-2"></i>Log Out
                            </Link>
                        </div>
                    </div>
                </div>
                <div id="page-content-wrapper" class="p-0 m-0">
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
                                    <a className="nav-link icon-link" href="notifications.html">
                                        <i className="fas fa-bell"></i>
                                        <span
                                            className="badge bg-danger rounded-circle position-absolute top-0 start-100 translate-middle">3</span>
                                    </a>
                                </li>
                                <li className="nav-item d-flex align-items-center">
                                    <a className="nav-link icon-link" href="settings.html">
                                        <i className="fas fa-user-circle"></i>
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </nav>
                </div>
            </div>
        </>
    )
}

export default SideBar