import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom';

const EditOrder = (props) => {
    const navigate = useNavigate();
    const { id } = useParams();
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const fetchOrder = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/customerorders/getcustomerorder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });

            const orders = await response.json();
            const order = orders.find(o => o._id === id);
            
            if (order) {
                setFormData({
                    cName: order.cName || '',
                    cEmail: order.cEmail || '',
                    cPhone: order.cPhone || '',
                    cAddress: order.cAddress || '',
                    pName: order.pName || '',
                    category: order.category || '',
                    amount: order.amount || '',
                    ounits: order.ounits || '',
                    oDate: order.oDate ? order.oDate.split('T')[0] : '',
                    dDate: order.dDate ? order.dDate.split('T')[0] : '',
                    status: order.status || '',
                    pAvail: order.pAvail || '',
                    dStatus: order.dStatus || '',
                    desc: order.desc || ''
                });
            } else {
                props.showAlert('Order not found', 'danger');
                navigate('/dashboard/orders');
            }
        } catch (error) {
            console.error('Error fetching order:', error);
            props.showAlert('Error fetching order', 'danger');
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
        if (!formData.cName || !formData.cEmail || !formData.cPhone || !formData.cAddress || 
            !formData.pName || !formData.category || !formData.amount || !formData.ounits ||
            !formData.oDate || !formData.dDate || !formData.status || !formData.pAvail || !formData.dStatus) {
            props.showAlert('Please fill all required fields', 'danger');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/customerorders/updatecustomerorder/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                props.showAlert('Order updated successfully', 'success');
                navigate('/dashboard/orders');
            } else {
                props.showAlert(data.errors?.[0]?.msg || 'Failed to update order', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            props.showAlert('Error updating order', 'danger');
        }
    };

    const handleCancel = () => {
        navigate('/dashboard/orders');
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
                        <h1 className="display-5 fw-normal">Edit Order</h1>
                    </div>
                </div>

                <form className="needs-validation" onSubmit={handleSubmit} noValidate>
                    <div className="row g-4 mb-4">
                        <div className="col-md-4">
                            <label htmlFor="cName" className="form-label fw-semibold">Customer Name</label>
                            <input type="text" className="form-control mt-3" id="cName" placeholder="Enter customer name" value={formData.cName} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="cEmail" className="form-label fw-semibold">Customer Email</label>
                            <input type="email" className="form-control mt-3" id="cEmail" placeholder="Enter customer email" value={formData.cEmail} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="cPhone" className="form-label fw-semibold">Customer Phone</label>
                            <input type="number" className="form-control mt-3" id="cPhone" placeholder="Enter customer phone" value={formData.cPhone} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-md-4">
                            <label htmlFor="pName" className="form-label fw-semibold">Product Name</label>
                            <input type="text" className="form-control mt-3" id="pName" placeholder="Enter product name" value={formData.pName} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="category" className="form-label fw-semibold">Product Category</label>
                            <select className="form-select mt-3" id="category" value={formData.category} onChange={handleChange} required>
                               <option value="">Select Category</option>
                               <option value="Electronics">Electronics</option>
                               <option value="Clothing">Clothing</option> 
                            </select>
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="amount" className="form-label fw-semibold">Total Amount</label>
                            <input type="number" className="form-control mt-3" id="amount" placeholder="Enter total amount" value={formData.amount} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-md-4">
                            <label htmlFor="ounits" className="form-label fw-semibold">Units</label>
                            <input type="number" className="form-control mt-3" id="ounits" placeholder="Enter number of units" value={formData.ounits} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="oDate" className="form-label fw-semibold">Order Date</label>
                            <input type="date" className="form-control text-secondary mt-3" id="oDate" value={formData.oDate} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="dDate" className="form-label fw-semibold">Delivery Deadline</label>
                            <input type="date" className="form-control text-secondary mt-3" id="dDate" value={formData.dDate} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-md-3">
                            <label htmlFor="status" className="form-label fw-semibold">Status</label>
                            <select className="form-select mt-3" id="status" value={formData.status} onChange={handleChange} required>
                                <option value="">Select Status</option>
                                <option value="Paid">Paid</option>
                                <option value="Not Paid">Not Paid</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label htmlFor="dStatus" className="form-label fw-semibold">Delivery Status</label>
                            <select className="form-select mt-3" id="dStatus" value={formData.dStatus} onChange={handleChange} required>
                                <option value="">Select Delivery Status</option>
                                <option value="Packed">Packed</option>
                                <option value="Not Packed">Not Packed</option>
                                <option value="Shipped">Shipped</option>
                                <option value="Delivered">Delivered</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label htmlFor="pAvail" className="form-label fw-semibold">Product Availability</label>
                            <select className="form-select mt-3" id="pAvail" value={formData.pAvail} onChange={handleChange} required>
                                <option value="">Select Availability</option>
                                <option value="Available">Available</option>
                                <option value="Not Available">Not Available</option>
                            </select>
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-12">
                            <label htmlFor="cAddress" className="form-label fw-semibold">Delivery Address</label>
                            <textarea className="form-control mt-3" id="cAddress" rows="3" placeholder="Enter delivery address" value={formData.cAddress} onChange={handleChange} required></textarea>
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-12">
                            <label htmlFor="desc" className="form-label fw-semibold">Additional Notes</label>
                            <textarea className="form-control mt-3" id="desc" rows="3" placeholder="Enter additional notes" value={formData.desc} onChange={handleChange}></textarea>
                        </div>
                    </div>

                    <div className="row mt-5">
                        <div className="col-12 d-flex justify-content-start">
                            <button type="submit" className="btn btn-custom-purple btn-lg me-3 shadow-sm">Update Order</button>
                            <button type="button" className="btn btn-secondary btn-lg shadow-sm" onClick={handleCancel}>Cancel</button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    )
}

export default EditOrder
