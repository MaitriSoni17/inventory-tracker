import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import '../../../styles/validation.css';

const AddOrder = (props) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        cName: '',
        cEmail: '',
        cPhone: '',
        cAddress: '',
        pName: '',
        category: '',
        amount: '',
        ounits: '',
        oDate: '',
        dDate: '',
        status: '',
        pAvail: '',
        dStatus: '',
        desc: '',
        warehouse: ''
    });
    const [categories, setCategories] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [loadingWarehouses, setLoadingWarehouses] = useState(true);
    const [errors, setErrors] = useState({});
    // eslint-disable-next-line no-unused-vars
    const [touched, setTouched] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/category/getcategory', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    }
                });
                if (!response.ok) {
                    setLoadingCategories(false);
                    return;
                }
                const categoryList = await response.json();
                setCategories(categoryList);
            } catch (error) {
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchCategories();

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
                if (!response.ok) {
                    setLoadingWarehouses(false);
                    return;
                }
                const warehouseList = await response.json();
                setWarehouses(warehouseList);
            } catch (error) {
            } finally {
                setLoadingWarehouses(false);
            }
        };
        fetchWarehouses();
    }, []);

    // Validation Functions
    const validateForm = () => {
        const newErrors = {};

        // Customer Name validation
        if (!formData.cName?.trim()) {
            newErrors.cName = 'Customer name is required';
        }

        // Customer Email validation
        if (!formData.cEmail?.trim()) {
            newErrors.cEmail = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.cEmail)) {
            newErrors.cEmail = 'Please enter a valid email address';
        }

        // Customer Phone validation
        if (!formData.cPhone?.toString().trim()) {
            newErrors.cPhone = 'Phone number is required';
        } else if (!/^\d{10}$/.test(formData.cPhone.toString().trim())) {
            newErrors.cPhone = 'Phone number must be exactly 10 digits';
        }

        // Customer Address validation
        if (!formData.cAddress?.trim()) {
            newErrors.cAddress = 'Delivery address is required';
        }

        // Product Name validation
        if (!formData.pName?.trim()) {
            newErrors.pName = 'Product name is required';
        }

        // Category validation
        if (!formData.category?.trim()) {
            newErrors.category = 'Please select a product category';
        }

        // Amount validation
        if (!formData.amount?.toString().trim()) {
            newErrors.amount = 'Amount is required';
        } else if (isNaN(formData.amount) || Number(formData.amount) <= 0) {
            newErrors.amount = 'Amount must be a positive number';
        }

        // Units validation
        if (!formData.ounits?.toString().trim()) {
            newErrors.ounits = 'Units are required';
        } else if (isNaN(formData.ounits) || Number(formData.ounits) <= 0) {
            newErrors.ounits = 'Units must be a positive number';
        }

        // Order Date validation
        if (!formData.oDate?.trim()) {
            newErrors.oDate = 'Order date is required';
        }

        // Delivery Date validation
        if (!formData.dDate?.trim()) {
            newErrors.dDate = 'Delivery deadline is required';
        } else if (formData.oDate && new Date(formData.dDate) < new Date(formData.oDate)) {
            newErrors.dDate = 'Delivery date must be after order date';
        }

        // Payment Status validation
        if (!formData.status?.trim()) {
            newErrors.status = 'Payment status is required';
        }

        // Product Availability validation
        if (!formData.pAvail?.trim()) {
            newErrors.pAvail = 'Product availability is required';
        }

        // Delivery Status validation
        if (!formData.dStatus?.trim()) {
            newErrors.dStatus = 'Delivery status is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const hasErrors = () => {
        return Object.keys(errors).length > 0;
    };

    const handleBlur = (e) => {
        const { id } = e.target;
        setTouched(prev => ({
            ...prev,
            [id]: true
        }));

        // Validate single field
        const fieldErrors = {};
        const value = formData[id];

        if (id === 'cName' && !value?.trim()) {
            fieldErrors.cName = 'Customer name is required';
        }

        if (id === 'cEmail') {
            if (!value?.trim()) {
                fieldErrors.cEmail = 'Email is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                fieldErrors.cEmail = 'Please enter a valid email address';
            }
        }

        if (id === 'cPhone') {
            if (!value?.toString().trim()) {
                fieldErrors.cPhone = 'Phone number is required';
            } else if (!/^\d{10}$/.test(value.toString().trim())) {
                fieldErrors.cPhone = 'Phone number must be exactly 10 digits';
            }
        }

        if (id === 'cAddress' && !value?.trim()) {
            fieldErrors.cAddress = 'Delivery address is required';
        }

        if (id === 'pName' && !value?.trim()) {
            fieldErrors.pName = 'Product name is required';
        }

        if (id === 'category' && !value?.trim()) {
            fieldErrors.category = 'Please select a product category';
        }

        if (id === 'amount') {
            if (!value?.toString().trim()) {
                fieldErrors.amount = 'Amount is required';
            } else if (isNaN(value) || Number(value) <= 0) {
                fieldErrors.amount = 'Amount must be a positive number';
            }
        }

        if (id === 'ounits') {
            if (!value?.toString().trim()) {
                fieldErrors.ounits = 'Units are required';
            } else if (isNaN(value) || Number(value) <= 0) {
                fieldErrors.ounits = 'Units must be a positive number';
            }
        }

        if (id === 'oDate' && !value?.trim()) {
            fieldErrors.oDate = 'Order date is required';
        }

        if (id === 'dDate') {
            if (!value?.trim()) {
                fieldErrors.dDate = 'Delivery deadline is required';
            } else if (formData.oDate && new Date(value) < new Date(formData.oDate)) {
                fieldErrors.dDate = 'Delivery date must be after order date';
            }
        }

        if (id === 'status' && !value?.trim()) {
            fieldErrors.status = 'Payment status is required';
        }

        if (id === 'pAvail' && !value?.trim()) {
            fieldErrors.pAvail = 'Product availability is required';
        }

        if (id === 'dStatus' && !value?.trim()) {
            fieldErrors.dStatus = 'Delivery status is required';
        }

        setErrors(prev => ({
            ...prev,
            ...fieldErrors
        }));
    };

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: value
        }));
        // Clear error for this field when user starts typing
        if (errors[id]) {
            setErrors(prev => ({
                ...prev,
                [id]: ''
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate form
        if (!validateForm()) {
            props.showAlert('Please fix all validation errors', 'danger');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('http://localhost:5000/api/customerorders/createcustomerorder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                props.showAlert('Order created successfully', 'success');
                navigate('/dashboard/orders');
            } else {
                props.showAlert(data.errors?.[0]?.msg || 'Failed to create order', 'danger');
            }
        } catch (error) {
            props.showAlert('Error creating order', 'danger');
        } finally {
            setIsSubmitting(false);
        }
    };

    // eslint-disable-next-line no-unused-vars
    const handleCancel = () => {
        navigate('/dashboard/orders');
    };

    return (
        <>
            <div className="container-fluid p-5">
                <div className="row mb-4">
                    <div className="col-12 ms-5">
                        <h1 className="display-5 fw-normal">Add Order</h1>
                    </div>
                </div>

                <form className="needs-validation" onSubmit={handleSubmit} noValidate>
                    {/* Validation Errors Summary */}
                    {hasErrors() && (
                        <div className="alert alert-danger alert-dismissible fade show mb-4 rounded-3" role="alert">
                            <h6 className="fw-semibold mb-3">Please fix the following errors:</h6>
                            <ul className="mb-0">
                                {Object.entries(errors).map(([field, error]) => (
                                    error && <li key={field}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Customer Information Card */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-5">
                            <h5 className="card-title display-6 mb-4">Customer Information</h5>
                            <div className="d-flex gap-4">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="cName" className="form-label fw-semibold mb-2">Customer Name</label>
                                    <input type="text" className={`form-control rounded-3 shadow-sm ${errors.cName ? 'is-invalid' : ''}`} id="cName" placeholder="Enter Customer Name" value={formData.cName} onChange={handleChange} onBlur={handleBlur} required />
                                    {errors.cName && <div className="error-message">{errors.cName}</div>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="cEmail" className="form-label fw-semibold mb-2">Customer Email</label>
                                    <input type="email" className={`form-control rounded-3 shadow-sm ${errors.cEmail ? 'is-invalid' : ''}`} id="cEmail" placeholder="Enter Customer Email" value={formData.cEmail} onChange={handleChange} onBlur={handleBlur} required />
                                    {errors.cEmail && <div className="error-message">{errors.cEmail}</div>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="cPhone" className="form-label fw-semibold mb-2">Customer Phone</label>
                                    <input type="tel" className={`form-control rounded-3 shadow-sm ${errors.cPhone ? 'is-invalid' : ''}`} id="cPhone" placeholder="Enter Customer Phone" value={formData.cPhone} onChange={handleChange} onBlur={handleBlur} required />
                                    {errors.cPhone && <div className="error-message">{errors.cPhone}</div>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Product Information Card */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-5">
                            <h5 className="card-title display-6 mb-4">Product Information</h5>
                            <div className="d-flex gap-4">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="pName" className="form-label fw-semibold mb-2">Product Name</label>
                                    <input type="text" className={`form-control rounded-3 shadow-sm ${errors.pName ? 'is-invalid' : ''}`} id="pName" placeholder="Enter Product Name" value={formData.pName} onChange={handleChange} onBlur={handleBlur} required />
                                    {errors.pName && <div className="error-message">{errors.pName}</div>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="category" className="form-label fw-semibold mb-2">Product Category</label>
                                    <div className="d-flex gap-2 align-items-end">
                                        <div style={{ flex: 1 }}>
                                            <select className={`form-select rounded-3 shadow-sm ${errors.category ? 'is-invalid' : ''}`} id="category" value={formData.category} onChange={handleChange} onBlur={handleBlur} disabled={loadingCategories} required>
                                               <option value="">{loadingCategories ? 'Loading categories...' : 'Select Category'}</option>
                                               {categories.map((category) => (
                                                   <option key={category._id} value={category._id}>{category.cName}</option>
                                               ))}
                                            </select>
                                            {errors.category && <div className="error-message">{errors.category}</div>}
                                        </div>
                                        <a href="/dashboard/category" className="btn btn-sm w-auto btn-custom-purple text-decoration-none" title="Add new category">+</a>
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="amount" className="form-label fw-semibold mb-2">Total Amount</label>
                                    <div className="input-group gap-0">
                                        <span className="input-group-text rounded-start-3 ms-1">₹</span>
                                        <input type="number" className={`form-control ${errors.amount ? 'is-invalid' : ''}`} id="amount" placeholder="0.00" value={formData.amount} onChange={handleChange} onBlur={handleBlur} required />
                                    </div>
                                    {errors.amount && <div className="error-message">{errors.amount}</div>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Details Card */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-5">
                            <h5 className="card-title display-6 mb-4">Order Details</h5>
                            <div className="d-flex gap-4">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="ounits" className="form-label fw-semibold mb-2">Units</label>
                                    <input type="number" className={`form-control rounded-3 shadow-sm text-secondary ${errors.ounits ? 'is-invalid' : ''}`} id="ounits" placeholder="Enter Number of Units" value={formData.ounits} onChange={handleChange} onBlur={handleBlur} required />
                                    {errors.ounits && <div className="error-message">{errors.ounits}</div>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="oDate" className="form-label fw-semibold mb-2">Order Date</label>
                                    <input type="date" className={`form-control text-secondary rounded-3 shadow-sm ${errors.oDate ? 'is-invalid' : ''}`} id="oDate" value={formData.oDate} onChange={handleChange} onBlur={handleBlur} required />
                                    {errors.oDate && <div className="error-message">{errors.oDate}</div>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="dDate" className="form-label fw-semibold mb-2">Delivery Deadline</label>
                                    <input type="date" className={`form-control text-secondary rounded-3 shadow-sm ${errors.dDate ? 'is-invalid' : ''}`} id="dDate" value={formData.dDate} onChange={handleChange} onBlur={handleBlur} required />
                                    {errors.dDate && <div className="error-message">{errors.dDate}</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Warehouse Selection Card */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-5">
                            <h5 className="card-title display-6 mb-4">Warehouse Assignment</h5>
                            <div className="d-flex gap-2 align-items-end">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="warehouse" className="form-label fw-semibold mb-2">Select Warehouse</label>
                                    <select className={`form-select rounded-3 shadow-sm ${errors.warehouse ? 'is-invalid' : ''}`} id="warehouse" value={formData.warehouse} onChange={handleChange} onBlur={handleBlur} disabled={loadingWarehouses}>
                                        <option value="">{loadingWarehouses ? 'Loading warehouses...' : 'Select Warehouse'}</option>
                                        {warehouses.map((warehouse) => (
                                            <option key={warehouse._id} value={warehouse._id}>{warehouse.wName}</option>
                                        ))}
                                    </select>
                                    {errors.warehouse && <div className="error-message">{errors.warehouse}</div>}
                                </div>
                                <a href="/dashboard/warehouses" className="btn btn-sm w-auto btn-custom-purple text-decoration-none" title="Add new warehouse">+</a>
                            </div>
                        </div>
                    </div>

                    {/* Status Information Card */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-5">
                            <h5 className="card-title display-6 mb-4">Status Information</h5>
                            <div className="d-flex gap-4">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="status" className="form-label fw-semibold mb-2">Payment Status</label>
                                    <select className={`form-select rounded-3 shadow-sm ${errors.status ? 'is-invalid' : ''}`} id="status" value={formData.status} onChange={handleChange} onBlur={handleBlur} required>
                                        <option value="">Select Status</option>
                                        <option value="Paid">Paid</option>
                                        <option value="Not Paid">Not Paid</option>
                                    </select>
                                    {errors.status && <div className="error-message">{errors.status}</div>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="pAvail" className="form-label fw-semibold mb-2">Product Availability</label>
                                    <select className={`form-select rounded-3 shadow-sm ${errors.pAvail ? 'is-invalid' : ''}`} id="pAvail" value={formData.pAvail} onChange={handleChange} onBlur={handleBlur} required>
                                        <option value="">Select Availability</option>
                                        <option value="Available">Available</option>
                                        <option value="Not Available">Not Available</option>
                                    </select>
                                    {errors.pAvail && <div className="error-message">{errors.pAvail}</div>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="dStatus" className="form-label fw-semibold mb-2">Delivery Status</label>
                                    <select className={`form-select rounded-3 shadow-sm ${errors.dStatus ? 'is-invalid' : ''}`} id="dStatus" value={formData.dStatus} onChange={handleChange} onBlur={handleBlur} required>
                                        <option value="">Select Delivery Status</option>
                                        <option value="Packed">Packed</option>
                                        <option value="Not Packed">Not Packed</option>
                                        <option value="Shipped">Shipped</option>
                                        <option value="Delivered">Delivered</option>
                                    </select>
                                    {errors.dStatus && <div className="error-message">{errors.dStatus}</div>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Address & Notes Card */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-5">
                            <h5 className="card-title display-6 mb-4">Additional Information</h5>
                            <div className="row g-4">
                                <div className="col-md-12">
                                    <label htmlFor="cAddress" className="form-label fw-semibold mb-2">Delivery Address</label>
                                    <textarea className={`form-control rounded-3 shadow-sm ${errors.cAddress ? 'is-invalid' : ''}`} id="cAddress" rows="3" placeholder="Enter Delivery Address" value={formData.cAddress} onChange={handleChange} onBlur={handleBlur} required></textarea>
                                    {errors.cAddress && <div className="error-message">{errors.cAddress}</div>}
                                </div>
                                <div className="col-md-12">
                                    <label htmlFor="desc" className="form-label fw-semibold mb-2">Additional Notes</label>
                                    <textarea className="form-control rounded-3 shadow-sm" id="desc" rows="3" placeholder="Enter Additional Notes" value={formData.desc} onChange={handleChange}></textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row mt-4 ms-2 mb-5 pb-5">
                        <div className="col-12 d-flex gap-3 justify-content-start">
                            <button type="submit" className="btn btn-custom-purple btn-lg rounded-3 px-5 shadow-sm" disabled={isSubmitting}>
                                {isSubmitting ? 'Adding Order...' : 'Add Order'}
                            </button>
                            <button type="button" className="btn btn-outline-secondary btn-lg rounded-3 px-5 shadow-sm" onClick={() => navigate('/dashboard/orders')} disabled={isSubmitting}>Cancel</button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    )
}

export default AddOrder

