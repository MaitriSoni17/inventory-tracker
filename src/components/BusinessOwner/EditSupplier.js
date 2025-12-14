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
            console.error('Error fetching supplier:', error);
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
            console.error('Error:', error);
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
                    <div className="col-12">
                        <h1 className="display-5 fw-normal">Edit Supplier</h1>
                    </div>
                </div>

                <form className="needs-validation" onSubmit={handleSubmit} noValidate>
                    <div className="row g-4 mb-4">
                        <div className="col-md-4">
                            <label htmlFor="fname" className="form-label fw-semibold">First Name *</label>
                            <input type="text" className="form-control mt-3" id="fname" placeholder="Enter first name" value={formData.fname} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="lname" className="form-label fw-semibold">Last Name</label>
                            <input type="text" className="form-control mt-3" id="lname" placeholder="Enter last name" value={formData.lname} onChange={handleChange} />
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="email" className="form-label fw-semibold">Email *</label>
                            <input type="email" className="form-control mt-3" id="email" placeholder="Enter email" value={formData.email} onChange={handleChange} required disabled />
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-md-4">
                            <label htmlFor="phone" className="form-label fw-semibold">Contact Number</label>
                            <input type="text" className="form-control mt-3" id="phone" placeholder="Enter phone number" value={formData.phone} onChange={handleChange} />
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="nationality" className="form-label fw-semibold">Nationality</label>
                            <input type="text" className="form-control mt-3" id="nationality" placeholder="Enter nationality" value={formData.nationality} onChange={handleChange} />
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="country" className="form-label fw-semibold">Country</label>
                            <input type="text" className="form-control mt-3" id="country" placeholder="Enter country" value={formData.country} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-md-4">
                            <label htmlFor="state" className="form-label fw-semibold">State</label>
                            <input type="text" className="form-control mt-3" id="state" placeholder="Enter state" value={formData.state} onChange={handleChange} />
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="city" className="form-label fw-semibold">City</label>
                            <input type="text" className="form-control mt-3" id="city" placeholder="Enter city" value={formData.city} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-12">
                            <label htmlFor="address" className="form-label fw-semibold">Address</label>
                            <textarea className="form-control mt-3" id="address" rows="3" placeholder="Enter address" value={formData.address} onChange={handleChange}></textarea>
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-12">
                            <label htmlFor="about" className="form-label fw-semibold">About</label>
                            <textarea className="form-control mt-3" id="about" rows="3" placeholder="Enter about/description" value={formData.about} onChange={handleChange}></textarea>
                        </div>
                    </div>

                    <div className="row mt-5">
                        <div className="col-12 d-flex justify-content-start">
                            <button type="submit" className="btn btn-custom-purple btn-lg me-3 shadow-sm">Update Supplier</button>
                            <button type="button" className="btn btn-secondary btn-lg shadow-sm" onClick={handleCancel}>Cancel</button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    )
}

export default EditSupplier
