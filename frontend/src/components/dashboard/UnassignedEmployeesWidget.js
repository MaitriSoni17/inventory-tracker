import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const UnassignedEmployeesWidget = () => {
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchUnassignedCount();
        // Refresh every 30 seconds
        const interval = setInterval(fetchUnassignedCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchUnassignedCount = async () => {
        try {
            const response = await fetch(
                'http://localhost:5000/api/employee/unassigned-employees',
                {
                    headers: {
                        'auth-token': localStorage.getItem('token'),
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                setCount(data.count || 0);
            }
        } catch (error) {
            // console.error('Error fetching unassigned employees:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                    <div>
                        <p className="text-muted mb-2">
                            <i className="bi bi-exclamation-triangle text-warning me-2"></i>
                            Unassigned Employees
                        </p>
                        <h2 className="mb-3 fw-bold">
                            {loading ? (
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            ) : (
                                count
                            )}
                        </h2>
                        <small className="text-muted">
                            {count === 0 
                                ? '✅ All employees are assigned'
                                : `${count} employee${count !== 1 ? 's' : ''} need warehouse assignment`
                            }
                        </small>
                    </div>
                    <div className="text-warning fs-4">
                        <i className="bi bi-person-exclamation"></i>
                    </div>
                </div>

                {count > 0 && (
                    <button 
                        className="btn btn-sm btn-warning mt-3 w-100"
                        onClick={() => navigate('/dashboard/assign-warehouse')}
                    >
                        <i className="bi bi-arrow-right me-2"></i>
                        Assign Now
                    </button>
                )}
            </div>
        </div>
    );
};

export default UnassignedEmployeesWidget;
