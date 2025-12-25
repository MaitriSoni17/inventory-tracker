import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom';

const EditSupplier = (props) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [formData, setFormData] = useState({
        fname: '',
        lname: '',
        email: '',
        phone: '',
        nationality: '',
        country: '',
        state: '',
        city: '',
        address: '',
        about: ''
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSupplier();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchSupplier = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/supplier/getallsuppliers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const suppliers = await response.json();
                const supplier = suppliers.find(s => s._id === id);
                
                if (supplier) {
                    setFormData({
                        fname: supplier.fname || '',
                        lname: supplier.lname || '',
                        email: supplier.email || '',
                        phone: supplier.phone || '',
                        nationality: supplier.nationality || '',
                        country: supplier.country || '',
                        state: supplier.state || '',
                        city: supplier.city || '',
                        address: supplier.address || '',
                        about: supplier.about || ''
                    });
                } else {
                    props.showAlert('Supplier not found', 'danger');
                    navigate('/dashboard/suppliers');
                }
            } else {
                props.showAlert('Failed to fetch supplier', 'danger');
            }
        } catch (error) {
            props.showAlert('Error fetching supplier', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handlePasswordChange = (e) => {
        const { id, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            props.showAlert('Passwords do not match', 'warning');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            props.showAlert('Password must be at least 6 characters', 'warning');
            return;
        }

        try {
            setSaving(true);
            const headers = {
                'Content-Type': 'application/json',
                'auth-token': localStorage.getItem('token')
            };

            const dataToSend = {
                ...formData,
                password: passwordData.newPassword
            };

            const res = await fetch(`http://localhost:5000/api/supplier/updatesupplier/${id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(dataToSend)
            });

            if (res.ok) {
                props.showAlert('Password changed successfully', 'success');
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                props.showAlert('Failed to change password', 'danger');
            }
        } catch (error) {
            props.showAlert('Error changing password', 'danger');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!formData.fname || !formData.email) {
            props.showAlert('Please fill all required fields', 'danger');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/supplier/updatesupplier/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                props.showAlert('Supplier updated successfully', 'success');
                navigate('/dashboard/suppliers');
            } else {
                props.showAlert(data.error || 'Failed to update supplier', 'danger');
            }
        } catch (error) {
            props.showAlert('Error updating supplier', 'danger');
        }
    };

    const handleCancel = () => {
        navigate('/dashboard/suppliers');
    };

    if (loading) {
        return (
            <div className="container-fluid p-5">
                <div className="row">
                    <div className="col-12 text-center">
                        <div className="spinner-border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="container-fluid p-5">
                <div className="row mb-4">
                    <div className="col-12 ms-5">
                        <h1 className="display-5 fw-normal">Edit Supplier</h1>
                    </div>
                </div>

                <form className="needs-validation" onSubmit={handleSubmit} noValidate>
                    {/* Basic Information Card */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-5">
                            <h5 className="card-title display-6 mb-4">Basic Information</h5>
                            <div className="d-flex gap-4 mb-4">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="fname" className="form-label fw-semibold mb-2">First Name *</label>
                                    <input type="text" className="form-control rounded-3 shadow-sm" id="fname" placeholder="Enter first name" value={formData.fname} onChange={handleChange} required />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="lname" className="form-label fw-semibold mb-2">Last Name</label>
                                    <input type="text" className="form-control rounded-3 shadow-sm" id="lname" placeholder="Enter last name" value={formData.lname} onChange={handleChange} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="email" className="form-label fw-semibold mb-2">Email *</label>
                                    <input type="email" className="form-control rounded-3 shadow-sm" id="email" placeholder="Enter email" value={formData.email} onChange={handleChange} required disabled />
                                </div>
                            </div>
                            <div className="d-flex gap-4 mb-4">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="phone" className="form-label fw-semibold mb-2">Contact Number</label>
                                    <input type="text" className="form-control rounded-3 shadow-sm" id="phone" placeholder="Enter phone number" value={formData.phone} onChange={handleChange} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="nationality" className="form-label fw-semibold mb-2">Nationality</label>
                                    <input type="text" className="form-control rounded-3 shadow-sm" id="nationality" placeholder="Enter nationality" value={formData.nationality} onChange={handleChange} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="country" className="form-label fw-semibold mb-2">Country</label>
                                    <input type="text" className="form-control rounded-3 shadow-sm" id="country" placeholder="Enter country" value={formData.country} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="d-flex gap-4">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="state" className="form-label fw-semibold mb-2">State</label>
                                    <input type="text" className="form-control rounded-3 shadow-sm" id="state" placeholder="Enter state" value={formData.state} onChange={handleChange} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="city" className="form-label fw-semibold mb-2">City</label>
                                    <input type="text" className="form-control rounded-3 shadow-sm" id="city" placeholder="Enter city" value={formData.city} onChange={handleChange} />
                                </div>
                                <div style={{ flex: 1 }}>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Information Card */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-5">
                            <h5 className="card-title display-6 mb-4">Additional Information</h5>
                            <div className="mb-4">
                                <label htmlFor="about" className="form-label fw-semibold mb-2">About</label>
                                <textarea className="form-control rounded-3 shadow-sm" id="about" rows="4" placeholder="Enter details about the supplier" value={formData.about} onChange={handleChange}></textarea>
                            </div>
                            <div className="mb-4">
                                <label htmlFor="address" className="form-label fw-semibold mb-2">Address</label>
                                <textarea className="form-control rounded-3 shadow-sm" id="address" rows="3" placeholder="Enter full address" value={formData.address} onChange={handleChange}></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Change Password Section */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-5">
                            <h5 className="card-title display-6 mb-4">Change Password</h5>
                            <div className="mb-4">
                                <label htmlFor="currentPassword" className="form-label fw-semibold mb-2">Current Password</label>
                                <div className="position-relative">
                                    <input
                                        type={showCurrentPassword ? "text" : "password"}
                                        className="form-control rounded-3 shadow-sm pe-5"
                                        id="currentPassword"
                                        placeholder="Enter current password"
                                        value={passwordData.currentPassword}
                                        onChange={handlePasswordChange}
                                    />
                                    <button
                                        type="button"
                                        className="btn position-absolute end-0 top-50 translate-middle-y border-0 bg-transparent"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        tabIndex="-1"
                                        style={{ marginRight: '12px' }}
                                    >
                                        <i className={`bi ${showCurrentPassword ? "bi-eye-fill" : "bi-eye-slash-fill"} text-secondary`}></i>
                                    </button>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6">
                                    <div className="mb-4">
                                        <label htmlFor="newPassword" className="form-label fw-semibold mb-2">New Password</label>
                                        <div className="position-relative">
                                            <input
                                                type={showNewPassword ? "text" : "password"}
                                                className="form-control rounded-3 shadow-sm pe-5"
                                                id="newPassword"
                                                placeholder="Enter new password"
                                                value={passwordData.newPassword}
                                                onChange={handlePasswordChange}
                                            />
                                            <button
                                                type="button"
                                                className="btn position-absolute end-0 top-50 translate-middle-y border-0 bg-transparent"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                tabIndex="-1"
                                                style={{ marginRight: '12px' }}
                                            >
                                                <i className={`bi ${showNewPassword ? "bi-eye-fill" : "bi-eye-slash-fill"} text-secondary`}></i>
                                            </button>
                                        </div>
                                        <small className="text-muted d-block mt-2">At least 6 characters</small>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="mb-4">
                                        <label htmlFor="confirmPassword" className="form-label fw-semibold mb-2">Confirm Password</label>
                                        <div className="position-relative">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                className="form-control rounded-3 shadow-sm pe-5"
                                                id="confirmPassword"
                                                placeholder="Confirm new password"
                                                value={passwordData.confirmPassword}
                                                onChange={handlePasswordChange}
                                            />
                                            <button
                                                type="button"
                                                className="btn position-absolute end-0 top-50 translate-middle-y border-0 bg-transparent"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                tabIndex="-1"
                                                style={{ marginRight: '12px' }}
                                            >
                                                <i className={`bi ${showConfirmPassword ? "bi-eye-fill" : "bi-eye-slash-fill"} text-secondary`}></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3">
                                <button 
                                    type="button"
                                    className="btn btn-link text-primary fw-semibold p-0"
                                    onClick={handleChangePassword}
                                    disabled={saving}
                                >
                                    {saving ? 'Changing Password...' : 'Change Password'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="row mt-5 ms-1 mb-5 pb-5">
                        <div className="col-12 d-flex justify-content-start gap-3">
                            <button type="submit" className="btn btn-custom-purple btn-lg shadow-sm">Update Supplier</button>
                            <button type="button" className="btn btn-secondary btn-lg shadow-sm" onClick={handleCancel}>Cancel</button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    )
}

export default EditSupplier


