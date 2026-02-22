import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/access-denied.css';

/**
 * AccessDenied component displayed when a user navigates to a page
 * they don't have permission to access.
 * @param {string} message - Custom message to display
 * @param {boolean} showLogout - If true, shows a Log Out button instead of Go to Dashboard
 */
const AccessDenied = ({ message, showLogout }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userId');
        navigate('/login');
    };

    return (
        <div className="access-denied-container">
            <div className="access-denied-card">
                <div className="access-denied-icon">
                    <i className="bi bi-shield-lock"></i>
                </div>
                <h2 className="access-denied-title">Access Restricted</h2>
                <p className="access-denied-message">
                    {message || "You don't have the required permissions to view this page."}
                </p>
                <p className="access-denied-hint">
                    If you believe this is an error, please contact your administrator to request access.
                </p>
                <div className="access-denied-actions">
                    {showLogout ? (
                        <button className="btn btn-danger" onClick={handleLogout}>
                            <i className="bi bi-box-arrow-right me-2"></i>Log Out
                        </button>
                    ) : (
                        <button className="btn btn-custom-purple" onClick={() => navigate('/dashboard')}>
                            <i className="bi bi-house-door me-2"></i>Go to Dashboard
                        </button>
                    )}
                    <button className="btn btn-outline-secondary ms-2" onClick={() => navigate(-1)}>
                        <i className="bi bi-arrow-left me-2"></i>Go Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccessDenied;
