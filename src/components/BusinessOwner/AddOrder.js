import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';

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
        desc: ''
    });
    const [categories, setCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(true);

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
                    console.error('Failed to fetch categories');
                    setLoadingCategories(false);
                    return;
                }
                const categoryList = await response.json();
                setCategories(categoryList);
            } catch (error) {
                console.error('Error fetching categories:', error);
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchCategories();
    }, []);

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
        if (!formData.cName || !formData.cEmail || !formData.cPhone || !formData.cAddress || 
            !formData.pName || !formData.category || !formData.amount || !formData.ounits ||
            !formData.oDate || !formData.dDate || !formData.status || !formData.pAvail || !formData.dStatus) {
            props.showAlert('Please fill all required fields', 'danger');
            return;
        }

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
            console.error('Error:', error);
            props.showAlert('Error creating order', 'danger');
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
                    <div className="col-12">
                        <h1 className="display-5 fw-normal">Add Order</h1>
                    </div>
                </div>

                <form className="needs-validation" onSubmit={handleSubmit} noValidate>
                    {/* Customer Information Card */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-5">
                            <h5 className="card-title display-6 mb-4">Customer Information</h5>
                            <div className="d-flex gap-4">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="cName" className="form-label fw-semibold mb-2">Customer Name</label>
                                    <input type="text" className="form-control rounded-3 shadow-sm" id="cName" placeholder="Enter Customer Name" value={formData.cName} onChange={handleChange} required />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="cEmail" className="form-label fw-semibold mb-2">Customer Email</label>
                                    <input type="email" className="form-control rounded-3 shadow-sm" id="cEmail" placeholder="Enter Customer Email" value={formData.cEmail} onChange={handleChange} required />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="cPhone" className="form-label fw-semibold mb-2">Customer Phone</label>
                                    <input type="number" className="form-control rounded-3 shadow-sm" id="cPhone" placeholder="Enter Customer Phone" value={formData.cPhone} onChange={handleChange} required />
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
                                    <input type="text" className="form-control rounded-3 shadow-sm" id="pName" placeholder="Enter Product Name" value={formData.pName} onChange={handleChange} required />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="category" className="form-label fw-semibold mb-2">Product Category</label>
                                    <div className="d-flex gap-2 align-items-end">
                                        <div style={{ flex: 1 }}>
                                            <select className="form-select rounded-3 shadow-sm" id="category" value={formData.category} onChange={handleChange} disabled={loadingCategories} required>
                                               <option value="">{loadingCategories ? 'Loading categories...' : 'Select Category'}</option>
                                               {categories.map((category) => (
                                                   <option key={category._id} value={category._id}>{category.cName}</option>
                                               ))}
                                            </select>
                                        </div>
                                        <a href="/dashboard/category" className="btn btn-sm btn-custom-purple text-decoration-none" title="Add new category">+</a>
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="amount" className="form-label fw-semibold mb-2">Total Amount</label>
                                    <div className="input-group gap-0">
                                        <span className="input-group-text rounded-start-3 border-end-0 shadow-sm border-1">₹</span>
                                        <input type="number" className="form-control rounded-end-3 shadow-sm border-start-0" id="amount" placeholder="0.00" value={formData.amount} onChange={handleChange} required />
                                    </div>
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
                                    <input type="number" className="form-control rounded-3 shadow-sm text-secondary" id="ounits" placeholder="Enter Number of Units" value={formData.ounits} onChange={handleChange} required />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="oDate" className="form-label fw-semibold mb-2">Order Date</label>
                                    <input type="date" className="form-control text-secondary rounded-3 shadow-sm" id="oDate" value={formData.oDate} onChange={handleChange} required />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="dDate" className="form-label fw-semibold mb-2">Delivery Deadline</label>
                                    <input type="date" className="form-control text-secondary rounded-3 shadow-sm" id="dDate" value={formData.dDate} onChange={handleChange} required />
                                </div>
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
                                    <select className="form-select rounded-3 shadow-sm" id="status" value={formData.status} onChange={handleChange} required>
                                        <option value="">Select Status</option>
                                        <option value="Paid">Paid</option>
                                        <option value="Not Paid">Not Paid</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="pAvail" className="form-label fw-semibold mb-2">Product Availability</label>
                                    <select className="form-select rounded-3 shadow-sm" id="pAvail" value={formData.pAvail} onChange={handleChange} required>
                                        <option value="">Select Availability</option>
                                        <option value="Available">Available</option>
                                        <option value="Not Available">Not Available</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="dStatus" className="form-label fw-semibold mb-2">Delivery Status</label>
                                    <select className="form-select rounded-3 shadow-sm" id="dStatus" value={formData.dStatus} onChange={handleChange} required>
                                        <option value="">Select Delivery Status</option>
                                        <option value="Packed">Packed</option>
                                        <option value="Not Packed">Not Packed</option>
                                        <option value="Shipped">Shipped</option>
                                        <option value="Delivered">Delivered</option>
                                    </select>
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
                                    <textarea className="form-control rounded-3 shadow-sm" id="cAddress" rows="3" placeholder="Enter Delivery Address" value={formData.cAddress} onChange={handleChange} required></textarea>
                                </div>
                                <div className="col-md-12">
                                    <label htmlFor="desc" className="form-label fw-semibold mb-2">Additional Notes</label>
                                    <textarea className="form-control rounded-3 shadow-sm" id="desc" rows="3" placeholder="Enter Additional Notes" value={formData.desc} onChange={handleChange}></textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row mt-4 ms-2">
                        <div className="col-12 d-flex gap-3 justify-content-start">
                            <button type="submit" className="btn btn-custom-purple btn-lg rounded-3 px-5 shadow-sm">Add Order</button>
                            <button type="button" className="btn btn-outline-secondary btn-lg rounded-3 px-5 shadow-sm" onClick={() => navigate('/dashboard/orders')}>Cancel</button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    )
}

export default AddOrder