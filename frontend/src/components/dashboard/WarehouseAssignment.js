import React, { useState, useEffect } from 'react';

const WarehouseAssignment = ({ showAlert }) => {
    const [unassignedEmployees, setUnassignedEmployees] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    // Fetch unassigned employees and warehouses on mount
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoadingData(true);
        try {
            // Fetch unassigned employees
            const empResponse = await fetch(
                'http://localhost:5000/api/employee/unassigned-employees',
                { 
                    headers: { 
                        'auth-token': localStorage.getItem('token'),
                        'Content-Type': 'application/json'
                    } 
                }
            );
            
            if (empResponse.ok) {
                const empData = await empResponse.json();
                setUnassignedEmployees(empData.unassignedEmployees || []);
            } else {
                showAlert('Error fetching unassigned employees', 'danger');
            }

            // Fetch warehouses
            const whResponse = await fetch(
                'http://localhost:5000/api/warehouse/getwarehouse',
                { 
                    method: 'POST',
                    headers: { 
                        'auth-token': localStorage.getItem('token'),
                        'Content-Type': 'application/json'
                    } 
                }
            );
            
            if (whResponse.ok) {
                const whData = await whResponse.json();
                setWarehouses(Array.isArray(whData) ? whData : []);
            } else {
                showAlert('Error fetching warehouses', 'danger');
            }
        } catch (error) {
            showAlert('Error loading data: ' + error.message, 'danger');
        } finally {
            setLoadingData(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedEmployee || !selectedWarehouse) {
            setMessage('Please select both employee and warehouse');
            setMessageType('warning');
            return;
        }

        setLoading(true);
        setMessage('');
        
        try {
            const response = await fetch(
                `http://localhost:5000/api/employee/assignwarehouse/${selectedEmployee}`,
                {
                    method: 'PUT',
                    headers: {
                        'auth-token': localStorage.getItem('token'),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ warehouseId: selectedWarehouse })
                }
            );

            if (response.ok) {
                setMessage('✅ Warehouse assigned successfully!');
                setMessageType('success');
                setSelectedEmployee('');
                setSelectedWarehouse('');
                
                // Refresh lists
                fetchData();
                
                // Clear message after 3 seconds
                setTimeout(() => setMessage(''), 3000);
            } else {
                const errorData = await response.json();
                setMessage('❌ Error: ' + (errorData.error || 'Failed to assign warehouse'));
                setMessageType('danger');
            }
        } catch (error) {
            setMessage('❌ Error: ' + error.message);
            setMessageType('danger');
        } finally {
            setLoading(false);
        }
    };

    if (loadingData) {
        return (
            <div className="container-fluid py-4">
                <div className="text-center p-5">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4">
            <div className="row">
                <div className="col-12">
                    <div className="card shadow-lg">
                        <div className="card-header bg-gradient" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                            <h4 className="card-title text-white mb-0 d-flex align-items-center">
                                <i className="bi bi-diagram-3 me-2"></i>
                                Assign Warehouse to Employee
                            </h4>
                            <small className="text-white-50">Link employees and warehouses together</small>
                        </div>

                        <div className="card-body p-4">
                            {/* Alert Messages */}
                            {message && (
                                <div className={`alert alert-${messageType} alert-dismissible fade show`} role="alert">
                                    {message}
                                    <button 
                                        type="button" 
                                        className="btn-close" 
                                        onClick={() => setMessage('')}
                                    ></button>
                                </div>
                            )}

                            {/* Statistics */}
                            <div className="row mb-4">
                                <div className="col-md-6">
                                    <div className="alert alert-info mb-0 d-flex align-items-center">
                                        <i className="bi bi-person-badge me-2"></i>
                                        <div>
                                            <strong>Unassigned Employees:</strong> {unassignedEmployees.length}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="alert alert-info mb-0 d-flex align-items-center">
                                        <i className="bi bi-shop me-2"></i>
                                        <div>
                                            <strong>Total Warehouses:</strong> {warehouses.length}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Assignment Form */}
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                        <i className="bi bi-person-fill me-2"></i>
                                        Select Employee *
                                    </label>
                                    <select 
                                        className="form-select form-select-lg rounded-3"
                                        value={selectedEmployee} 
                                        onChange={(e) => setSelectedEmployee(e.target.value)}
                                    >
                                        <option value="">-- Choose Employee --</option>
                                        {unassignedEmployees.map(emp => (
                                            <option key={emp._id} value={emp._id}>
                                                {emp.fname} {emp.lname} ({emp.role})
                                            </option>
                                        ))}
                                    </select>
                                    {unassignedEmployees.length === 0 && (
                                        <small className="text-muted d-block mt-2">
                                            ✅ All employees are assigned to warehouses!
                                        </small>
                                    )}
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                        <i className="bi bi-shop-window me-2"></i>
                                        Select Warehouse *
                                    </label>
                                    <select 
                                        className="form-select form-select-lg rounded-3"
                                        value={selectedWarehouse} 
                                        onChange={(e) => setSelectedWarehouse(e.target.value)}
                                    >
                                        <option value="">-- Choose Warehouse --</option>
                                        {warehouses.map(wh => (
                                            <option key={wh._id} value={wh._id}>
                                                {wh.wName} ({wh.wManager || 'No Manager'})
                                            </option>
                                        ))}
                                    </select>
                                    {warehouses.length === 0 && (
                                        <small className="text-muted d-block mt-2">
                                            ⚠️ No warehouses available. Create one first.
                                        </small>
                                    )}
                                </div>

                                <div className="col-12">
                                    <button 
                                        onClick={handleAssign} 
                                        disabled={loading || unassignedEmployees.length === 0 || warehouses.length === 0}
                                        className="btn btn-lg btn-custom-purple w-100 fw-semibold"
                                        style={{ borderRadius: '12px' }}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Assigning...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-link-45deg me-2"></i>
                                                Assign Warehouse to Employee
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Info Cards */}
                            <div className="row g-3 mt-4">
                                <div className="col-md-12">
                                    <div className="alert alert-light border-2 border-info rounded-3">
                                        <h5 className="alert-heading d-flex align-items-center">
                                            <i className="bi bi-info-circle-fill me-2 text-info"></i>
                                            How It Works
                                        </h5>
                                        <ul className="mb-0">
                                            <li>First, create all your <strong>Managers</strong> (no warehouse needed)</li>
                                            <li>Then, create all your <strong>Warehouses</strong> (no manager needed)</li>
                                            <li>Finally, use this page to <strong>assign</strong> managers to warehouses</li>
                                            <li>You can reassign a manager to a different warehouse anytime</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Unassigned Employees List */}
                            {unassignedEmployees.length > 0 && (
                                <div className="row mt-4">
                                    <div className="col-12">
                                        <h5 className="mb-3 fw-semibold">Employees Waiting for Assignment</h5>
                                        <div className="table-responsive">
                                            <table className="table table-hover">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>Name</th>
                                                        <th>Email</th>
                                                        <th>Role</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {unassignedEmployees.map(emp => (
                                                        <tr key={emp._id}>
                                                            <td className="fw-semibold">{emp.fname} {emp.lname}</td>
                                                            <td>{emp.email}</td>
                                                            <td>
                                                                <span className="badge bg-info">{emp.role}</span>
                                                            </td>
                                                            <td>
                                                                <span className="badge bg-warning text-dark">
                                                                    <i className="bi bi-exclamation-triangle me-1"></i>
                                                                    Unassigned
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WarehouseAssignment;
