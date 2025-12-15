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
            <div className="container-fluid py-4">
                <div className="row mb-4 mx-3">
                    <div className="col-12">
                        <h1 className="display-5 fw-normal">Add Supplier Order</h1>
                        <p className="text-muted">Supplier: {supplierName}</p>
                    </div>
                </div>

                <div className="row mx-3">
                    <div className="col-lg-8">
                        <div className="card shadow-sm">
                            <div className="card-body p-4">
                                <form onSubmit={handleSubmit}>
                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <label htmlFor="pName" className="form-label fw-500">Product Name <span className="text-danger">*</span></label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                id="pName"
                                                name="pName"
                                                value={orderDetails.pName}
                                                onChange={handleInputChange}
                                                placeholder="Enter product name"
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label htmlFor="category" className="form-label fw-500">Category <span className="text-danger">*</span></label>
                                            <select 
                                                className="form-control" 
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
                                    </div>

                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <label htmlFor="amount" className="form-label fw-500">Amount (₹) <span className="text-danger">*</span></label>
                                            <input 
                                                type="number" 
                                                className="form-control" 
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
                                        <div className="col-md-6">
                                            <label htmlFor="ounits" className="form-label fw-500">Units <span className="text-danger">*</span></label>
                                            <input 
                                                type="number" 
                                                className="form-control" 
                                                id="ounits"
                                                name="ounits"
                                                value={orderDetails.ounits}
                                                onChange={handleInputChange}
                                                placeholder="Enter units"
                                                min="0"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <label htmlFor="oDate" className="form-label fw-500">Order Date <span className="text-danger">*</span></label>
                                            <input 
                                                type="date" 
                                                className="form-control" 
                                                id="oDate"
                                                name="oDate"
                                                value={orderDetails.oDate}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label htmlFor="dDate" className="form-label fw-500">Delivery Date <span className="text-danger">*</span></label>
                                            <input 
                                                type="date" 
                                                className="form-control" 
                                                id="dDate"
                                                name="dDate"
                                                value={orderDetails.dDate}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="row mb-3">
                                        <div className="col-md-4">
                                            <label htmlFor="status" className="form-label fw-500">Status</label>
                                            <select 
                                                className="form-control" 
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
                                        <div className="col-md-4">
                                            <label htmlFor="pAvail" className="form-label fw-500">Product Availability</label>
                                            <select 
                                                className="form-control" 
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
                                        <div className="col-md-4">
                                            <label htmlFor="dStatus" className="form-label fw-500">Delivery Status</label>
                                            <select 
                                                className="form-control" 
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

                                    <div className="mb-3">
                                        <label htmlFor="desc" className="form-label fw-500">Description</label>
                                        <textarea 
                                            className="form-control" 
                                            id="desc"
                                            name="desc"
                                            value={orderDetails.desc}
                                            onChange={handleInputChange}
                                            placeholder="Enter order description (optional)"
                                            rows="4"
                                        ></textarea>
                                    </div>

                                    <div className="d-flex gap-2">
                                        <button type="submit" className="btn btn-custom-purple">
                                            <i className="bi bi-check-lg me-2"></i> Create Order
                                        </button>
                                        <button type="button" className="btn btn-secondary" onClick={() => navigate(`/dashboard/supplierordes/${id}`)}>
                                            <i className="bi bi-x-lg me-2"></i> Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="card shadow-sm">
                            <div className="card-body">
                                <h5 className="card-title mb-3">Order Summary</h5>
                                <div className="mb-3">
                                    <small className="text-muted">Supplier</small>
                                    <p className="mb-0">{supplierName}</p>
                                </div>
                                {orderDetails.pName && (
                                    <div className="mb-3">
                                        <small className="text-muted">Product</small>
                                        <p className="mb-0">{orderDetails.pName}</p>
                                    </div>
                                )}
                                {orderDetails.amount && (
                                    <div className="mb-3">
                                        <small className="text-muted">Total Amount</small>
                                        <p className="mb-0 fs-5 fw-bold">₹{parseFloat(orderDetails.amount).toLocaleString('en-IN')}</p>
                                    </div>
                                )}
                                {orderDetails.ounits && (
                                    <div className="mb-3">
                                        <small className="text-muted">Units</small>
                                        <p className="mb-0">{orderDetails.ounits}</p>
                                    </div>
                                )}
                                {orderDetails.oDate && (
                                    <div className="mb-3">
                                        <small className="text-muted">Order Date</small>
                                        <p className="mb-0">{new Date(orderDetails.oDate).toLocaleDateString('en-IN')}</p>
                                    </div>
                                )}
                                {orderDetails.dDate && (
                                    <div className="mb-3">
                                        <small className="text-muted">Delivery Date</small>
                                        <p className="mb-0">{new Date(orderDetails.dDate).toLocaleDateString('en-IN')}</p>
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
