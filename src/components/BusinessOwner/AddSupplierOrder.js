import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function AddSupplierOrder(props) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [supplierName, setSupplierName] = useState('');
    const [categories, setCategories] = useState([]);
    const [orderDetails, setOrderDetails] = useState({
        pName: '',
        category: '',
        amount: '',
        ounits: '',
        oDate: '',
        dDate: '',
        status: 'Pending',
        pAvail: 'Available',
        dStatus: 'Pending',
        desc: ''
    });

    useEffect(() => {
        fetchSupplierInfo();
        fetchCategories();
    }, [id]);

    const fetchSupplierInfo = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/supplier/getsupplier/' + id, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSupplierName(`${data.fname} ${data.lname || ''}`);
            } else {
                props.showAlert('Failed to fetch supplier information', 'danger');
            }
        } catch (error) {
            console.error('Error fetching supplier info:', error);
            props.showAlert('Error fetching supplier information', 'danger');
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/category/getcategories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setOrderDetails(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!orderDetails.pName || !orderDetails.category || !orderDetails.amount || 
            !orderDetails.ounits || !orderDetails.oDate || !orderDetails.dDate) {
            props.showAlert('Please fill in all required fields', 'danger');
            return;
        }

        if (new Date(orderDetails.dDate) < new Date(orderDetails.oDate)) {
            props.showAlert('Delivery date must be after order date', 'danger');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/supplierorders/createsupplierorder/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify(orderDetails)
            });

            if (response.ok) {
                props.showAlert('Supplier order created successfully', 'success');
                navigate(`/dashboard/supplierordes/${id}`);
            } else {
                const errorData = await response.json();
                props.showAlert(errorData.errors?.[0]?.msg || 'Failed to create order', 'danger');
            }
        } catch (error) {
            console.error('Error creating order:', error);
            props.showAlert('Error creating order', 'danger');
        }
    };

    return (
        <>
            <div className="container-fluid p-5">
                <div className="mb-5">
                    <h1 className="display-5 fw-semibold mb-1">Add Supplier Order</h1>
                    <p className="text-muted">Supplier: <span className="fw-semibold text-dark">{supplierName}</span></p>
                </div>

                <div className="row g-4">
                    <div className="col-lg-7">
                        <form onSubmit={handleSubmit}>
                            {/* Product Information Card */}
                            <div className="card border-0 shadow-sm mb-4 rounded-4">
                                <div className="card-body p-5">
                                    <h6 className="fw-bold text-uppercase text-muted mb-4" style={{ letterSpacing: '0.5px', fontSize: '12px' }}>Product Information</h6>
                                    <div className="d-flex gap-4">
                                        <div style={{ flex: 1 }}>
                                            <label htmlFor="pName" className="form-label fw-semibold mb-2">Product Name *</label>
                                            <input 
                                                type="text" 
                                                className="form-control rounded-3 shadow-sm" 
                                                id="pName"
                                                name="pName"
                                                value={orderDetails.pName}
                                                onChange={handleInputChange}
                                                placeholder="Enter product name"
                                                required
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label htmlFor="category" className="form-label fw-semibold mb-2">Category *</label>
                                            <select 
                                                className="form-select rounded-3 shadow-sm" 
                                                id="category"
                                                name="category"
                                                value={orderDetails.category}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Select Category</option>
                                                {categories.map(cat => (
                                                    <option key={cat._id} value={cat.cName}>{cat.cName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label htmlFor="amount" className="form-label fw-semibold mb-2">Amount (₹) *</label>
                                            <input 
                                                type="number" 
                                                className="form-control rounded-3 shadow-sm" 
                                                id="amount"
                                                name="amount"
                                                value={orderDetails.amount}
                                                onChange={handleInputChange}
                                                placeholder="Enter amount"
                                                min="0"
                                                step="0.01"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Order Details Card */}
                            <div className="card border-0 shadow-sm mb-4 rounded-4">
                                <div className="card-body p-5">
                                    <h6 className="fw-bold text-uppercase text-muted mb-4" style={{ letterSpacing: '0.5px', fontSize: '12px' }}>Order Details</h6>
                                    <div className="d-flex gap-4 mb-4">
                                        <div style={{ flex: 1 }}>
                                            <label htmlFor="ounits" className="form-label fw-semibold mb-2">Units *</label>
                                            <input 
                                                type="number" 
                                                className="form-control rounded-3 shadow-sm" 
                                                id="ounits"
                                                name="ounits"
                                                value={orderDetails.ounits}
                                                onChange={handleInputChange}
                                                placeholder="Enter units"
                                                min="0"
                                                required
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label htmlFor="oDate" className="form-label fw-semibold mb-2">Order Date *</label>
                                            <input 
                                                type="date" 
                                                className="form-control rounded-3 shadow-sm" 
                                                id="oDate"
                                                name="oDate"
                                                value={orderDetails.oDate}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label htmlFor="dDate" className="form-label fw-semibold mb-2">Delivery Date *</label>
                                            <input 
                                                type="date" 
                                                className="form-control rounded-3 shadow-sm" 
                                                id="dDate"
                                                name="dDate"
                                                value={orderDetails.dDate}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="d-flex gap-4">
                                        <div style={{ flex: 1 }}>
                                            <label htmlFor="status" className="form-label fw-semibold mb-2">Status</label>
                                            <select 
                                                className="form-select rounded-3 shadow-sm" 
                                                id="status"
                                                name="status"
                                                value={orderDetails.status}
                                                onChange={handleInputChange}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="Paid">Paid</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label htmlFor="pAvail" className="form-label fw-semibold mb-2">Availability</label>
                                            <select 
                                                className="form-select rounded-3 shadow-sm" 
                                                id="pAvail"
                                                name="pAvail"
                                                value={orderDetails.pAvail}
                                                onChange={handleInputChange}
                                            >
                                                <option value="Available">Available</option>
                                                <option value="Out of Stock">Out of Stock</option>
                                                <option value="Coming Soon">Coming Soon</option>
                                            </select>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label htmlFor="dStatus" className="form-label fw-semibold mb-2">Delivery Status</label>
                                            <select 
                                                className="form-select rounded-3 shadow-sm" 
                                                id="dStatus"
                                                name="dStatus"
                                                value={orderDetails.dStatus}
                                                onChange={handleInputChange}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="Packed">Packed</option>
                                                <option value="Shipped">Shipped</option>
                                                <option value="Delivered">Delivered</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Information Card */}
                            <div className="card border-0 shadow-sm mb-4 rounded-4">
                                <div className="card-body p-5">
                                    <h6 className="fw-bold text-uppercase text-muted mb-4" style={{ letterSpacing: '0.5px', fontSize: '12px' }}>Additional Information</h6>
                                    <label htmlFor="desc" className="form-label fw-semibold mb-2">Description</label>
                                    <textarea 
                                        className="form-control rounded-3 shadow-sm" 
                                        id="desc"
                                        name="desc"
                                        value={orderDetails.desc}
                                        onChange={handleInputChange}
                                        placeholder="Enter order description (optional)"
                                        rows="3"
                                    ></textarea>
                                </div>
                            </div>

                            <div className="d-flex gap-2">
                                <button type="submit" className="btn btn-custom-purple btn-lg px-5">Create Order</button>
                                <button type="button" className="btn btn-outline-secondary btn-lg px-5" onClick={() => navigate(`/dashboard/supplierordes/${id}`)}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="col-lg-4">
                        <div className="card border-0 shadow-sm rounded-4 sticky-top" style={{ top: '20px' }}>
                            <div className="card-body p-4">
                                <h6 className="fw-bold text-uppercase text-muted mb-4" style={{ letterSpacing: '0.5px', fontSize: '12px' }}>Order Summary</h6>
                                
                                <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                                    <small className="text-muted">Supplier</small>
                                    <p className="mb-0 fw-semibold">{supplierName}</p>
                                </div>

                                {orderDetails.pName && (
                                    <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                                        <small className="text-muted">Product</small>
                                        <p className="mb-0 fw-semibold">{orderDetails.pName}</p>
                                    </div>
                                )}

                                {orderDetails.category && (
                                    <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                                        <small className="text-muted">Category</small>
                                        <p className="mb-0 fw-semibold">{orderDetails.category}</p>
                                    </div>
                                )}

                                {orderDetails.ounits && (
                                    <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                                        <small className="text-muted">Units</small>
                                        <p className="mb-0 fw-semibold">{orderDetails.ounits}</p>
                                    </div>
                                )}

                                {orderDetails.amount && (
                                    <div className="p-3 bg-light rounded-3 mb-3">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <small className="text-muted fw-semibold">Total Amount</small>
                                            <p className="mb-0 fs-5 fw-bold" style={{ color: '#7300FF' }}>₹{parseFloat(orderDetails.amount).toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                )}

                                {orderDetails.oDate && (
                                    <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                                        <small className="text-muted">Order Date</small>
                                        <p className="mb-0 fw-semibold">{new Date(orderDetails.oDate).toLocaleDateString('en-IN')}</p>
                                    </div>
                                )}

                                {orderDetails.dDate && (
                                    <div className="d-flex justify-content-between align-items-center">
                                        <small className="text-muted">Delivery Date</small>
                                        <p className="mb-0 fw-semibold">{new Date(orderDetails.dDate).toLocaleDateString('en-IN')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default AddSupplierOrder;
