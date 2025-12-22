import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function Navigation() {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <nav className="navbar-elegant">
            <div className="nav-container">
                <button className="nav-logo" onClick={() => navigate('/')}>
                    <i className="bi bi-box-seam"></i> Inline Tracker
                </button>
                <ul className="nav-menu">
                    <li>
                        <button
                            onClick={() => navigate('/features')}
                            className={`nav-link ${isActive('/features') ? 'active' : ''}`}
                        >
                            Features
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={() => navigate('/about')}
                            className={`nav-link ${isActive('/about') ? 'active' : ''}`}
                        >
                            About
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={() => navigate('/contact')}
                            className={`nav-link ${isActive('/contact') ? 'active' : ''}`}
                        >
                            Contact
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={() => navigate('/login')}
                            className={`nav-link ${isActive('/login') ? 'active' : ''}`}
                        >
                            Login
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={() => navigate('/signup')}
                            className="btn-primary-nav"
                        >
                            Get Started
                        </button>
                    </li>
                </ul>
            </div>
        </nav>
    );
}

export default Navigation;
