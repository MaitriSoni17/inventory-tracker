import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function Navigation() {
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);

    const isActive = (path) => {
        return location.pathname === path;
    };

    const handleNavClick = (path) => {
        navigate(path);
        setMenuOpen(false);
    };

    // Close menu on route change
    useEffect(() => {
        setMenuOpen(false);
    }, [location]);

    // Close menu on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setMenuOpen(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (menuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [menuOpen]);

    return (
        <nav className="navbar-elegant">
            <div className="nav-container">
                <button className="nav-logo" onClick={() => handleNavClick('/')}>
                    <i className="bi bi-box-seam"></i> Inline Tracker
                </button>
                
                {/* Mobile hamburger button */}
                <button 
                    className={`hamburger-menu ${menuOpen ? 'active' : ''}`}
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle navigation menu"
                    aria-expanded={menuOpen}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                {/* Mobile overlay */}
                <div 
                    className={`mobile-nav-overlay ${menuOpen ? 'show' : ''}`}
                    onClick={() => setMenuOpen(false)}
                ></div>

                <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
                    <li>
                        <button
                            onClick={() => handleNavClick('/features')}
                            className={`nav-link ${isActive('/features') ? 'active' : ''}`}
                        >
                            Features
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={() => handleNavClick('/about')}
                            className={`nav-link ${isActive('/about') ? 'active' : ''}`}
                        >
                            About
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={() => handleNavClick('/contact')}
                            className={`nav-link ${isActive('/contact') ? 'active' : ''}`}
                        >
                            Contact
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={() => handleNavClick('/login')}
                            className={`nav-link ${isActive('/login') ? 'active' : ''}`}
                        >
                            Login
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={() => handleNavClick('/signup')}
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


