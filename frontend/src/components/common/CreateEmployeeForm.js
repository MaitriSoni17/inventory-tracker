import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';

const CreateEmployeeForm = ({ showAlert, employees = [] }) => {
    const navigate = useNavigate();
    const { role } = useRole();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fname: '',
        lname: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        country: '',
        state: '',
        city: '',
        address: '',
        hireAt: '',
        role: 'employee',
        department: '',
        reportingTo: '',
        warehouse: '',
        image: null
    });
    const [warehouses, setWarehouses] = useState([]);
    const [customRoles, setCustomRoles] = useState({});

    const [errors, setErrors] = useState({});

    const isBusinessOwner = role === 'businessowner' || localStorage.getItem('role') === 'businessowner';

    // Only business owners can create employees
    useEffect(() => {
        if (!isBusinessOwner) {
            showAlert('Only business owners can create employees', 'danger');
            navigate('/dashboard');
        }
        // Fetch warehouses
        const fetchWarehouses = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/warehouse/getwarehouse', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setWarehouses(data);
                }
            } catch (error) {
                // console.error('Error fetching warehouses:', error);
            }
        };
        const fetchCustomRoles = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/permissions/custom-roles', {
                    method: 'GET',
                    headers: {
                        'auth-token': localStorage.getItem('token')
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.customRoles) {
                        setCustomRoles(data.customRoles);
                    }
                }
            } catch (error) {
                // Custom roles are optional
            }
        };
        fetchWarehouses();
        fetchCustomRoles();
    }, [isBusinessOwner, navigate, showAlert]);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'image') {
            setFormData(prev => ({
                ...prev,
                [name]: files[0]
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.fname.trim()) newErrors.fname = 'First name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
        if (!formData.password) newErrors.password = 'Password is required';
        else if (formData.password.length < 5) newErrors.password = 'Password must be at least 5 characters';
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        if (!formData.hireAt) newErrors.hireAt = 'Hire date is required';
        // Warehouse is required - must select warehouse location when hiring
        if (!formData.warehouse) newErrors.warehouse = 'Warehouse/Hire Location is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showAlert('Please fix all errors in the form', 'danger');
            return;
        }

        setLoading(true);

        try {
            const data = new FormData();
            data.append('fname', formData.fname);
            data.append('lname', formData.lname);
            data.append('email', formData.email);
            data.append('password', formData.password);
            data.append('phone', formData.phone);
            data.append('country', formData.country);
            data.append('state', formData.state);
            data.append('city', formData.city);
            data.append('address', formData.address);
            data.append('hireAt', formData.hireAt);
            data.append('role', formData.role);
            data.append('department', formData.department);
            data.append('reportingTo', formData.reportingTo);
            if (formData.warehouse) {
                data.append('warehouse', formData.warehouse);
            }
            if (formData.image) {
                data.append('image', formData.image);
            }

            const response = await fetch('http://localhost:5000/api/employee/createemployee', {
                method: 'POST',
                headers: {
                    'auth-token': localStorage.getItem('token')
                },
                body: data
            });

            const result = await response.json();

            if (result.success) {
                showAlert(`Employee ${formData.fname} created successfully with role: ${formData.role}`, 'success');
                navigate('/dashboard/employee');
            } else {
                showAlert(result.error || 'Failed to create employee', 'danger');
            }
        } catch (error) {
            showAlert('Error creating employee: ' + error.message, 'danger');
        } finally {
            setLoading(false);
        }
    };

    // Get managers/supervisors for reporting-to dropdown (includes custom roles with management permissions)
    const managers = employees.filter(emp => 
        emp.role === 'manager' || emp.role === 'supervisor' || 
        (emp.permissions && emp.permissions.canManageEmployees)
    );

    return (
        <div className="container-fluid py-4">
            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header bg-primary text-white">
                            <h4 className="card-title mb-0">Create New Employee</h4>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleSubmit}>
                                {/* Name Row */}
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label">First Name *</label>
                                        <input
                                            type="text"
                                            className={`form-control ${errors.fname ? 'is-invalid' : ''}`}
                                            name="fname"
                                            value={formData.fname}
                                            onChange={handleChange}
                                            placeholder="Enter first name"
                                        />
                                        {errors.fname && <div className="invalid-feedback">{errors.fname}</div>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Last Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="lname"
                                            value={formData.lname}
                                            onChange={handleChange}
                                            placeholder="Enter last name"
                                        />
                                    </div>
                                </div>

                                {/* Email & Password Row */}
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Email *</label>
                                        <input
                                            type="email"
                                            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="Enter email"
                                        />
                                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Role *</label>
                                        <select
                                            className="form-control"
                                            name="role"
                                            value={formData.role}
                                            onChange={handleChange}
                                        >
                                            <option value="employee">Employee (Basic)</option>
                                            <option value="supervisor">Supervisor</option>
                                            <option value="manager">Manager</option>
                                            {Object.keys(customRoles).length > 0 && (
                                                <optgroup label="Custom Roles">
                                                    {Object.entries(customRoles).map(([key, role]) => (
                                                        <option key={key} value={key}>{role.displayName}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                        <small className="text-muted d-block mt-1">
                                            Employee: Basic access | Supervisor: Team lead | Manager: Full operational control
                                        </small>
                                    </div>
                                </div>

                                {/* Password Row */}
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Password *</label>
                                        <input
                                            type="password"
                                            className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="Enter password (min 5 characters)"
                                        />
                                        {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Confirm Password *</label>
                                        <input
                                            type="password"
                                            className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            placeholder="Confirm password"
                                        />
                                        {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
                                    </div>
                                </div>

                                {/* Department & Reporting To */}
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Department</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="department"
                                            value={formData.department}
                                            onChange={handleChange}
                                            placeholder="e.g., Sales, Operations, HR"
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Reports To (Manager)</label>
                                        <select
                                            className="form-control"
                                            name="reportingTo"
                                            value={formData.reportingTo}
                                            onChange={handleChange}
                                        >
                                            <option value="">Direct to Business Owner</option>
                                            {managers.map(manager => (
                                                <option key={manager._id} value={manager._id}>
                                                    {manager.fname} {manager.lname} (Manager)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Warehouse Assignment - Required for All Employees */}
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Hire Location (Warehouse) *</label>
                                        <select
                                            className={`form-control ${errors.warehouse ? 'is-invalid' : ''}`}
                                            name="warehouse"
                                            value={formData.warehouse}
                                            onChange={handleChange}
                                        >
                                            <option value="">Select Warehouse/Location</option>
                                            {warehouses.map(warehouse => (
                                                <option key={warehouse._id} value={warehouse._id}>
                                                    {warehouse.wName} ({warehouse.wAddress})
                                                </option>
                                            ))}
                                        </select>
                                        {errors.warehouse && <div className="invalid-feedback">{errors.warehouse}</div>}
                                        <small className="text-muted d-block mt-1">
                                            Select the warehouse location where this employee will be hired
                                        </small>
                                    </div>
                                </div>

                                {/* Contact & Location Row */}
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Phone</label>
                                        <input
                                            type="tel"
                                            className="form-control"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="Enter phone number"
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Hire Date *</label>
                                        <input
                                            type="date"
                                            className={`form-control ${errors.hireAt ? 'is-invalid' : ''}`}
                                            name="hireAt"
                                            value={formData.hireAt}
                                            onChange={handleChange}
                                        />
                                        {errors.hireAt && <div className="invalid-feedback">{errors.hireAt}</div>}
                                    </div>
                                </div>

                                {/* Location Details */}
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Country</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="country"
                                            value={formData.country}
                                            onChange={handleChange}
                                            placeholder="Enter country"
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">State/Province</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="state"
                                            value={formData.state}
                                            onChange={handleChange}
                                            placeholder="Enter state/province"
                                        />
                                    </div>
                                </div>

                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label">City</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            placeholder="Enter city"
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Address</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            placeholder="Enter address"
                                        />
                                    </div>
                                </div>

                                {/* Image Upload */}
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Profile Image</label>
                                        <input
                                            type="file"
                                            className="form-control"
                                            name="image"
                                            onChange={handleChange}
                                            accept="image/*"
                                        />
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="d-flex gap-2">
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={loading}
                                    >
                                        {loading ? 'Creating...' : 'Create Employee'}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => navigate('/dashboard/employee')}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateEmployeeForm;
