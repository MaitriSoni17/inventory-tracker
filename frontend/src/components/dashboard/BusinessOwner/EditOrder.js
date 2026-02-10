import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import { useRole } from '../../../context/RoleContext';
import '../../../styles/validation.css';

const EditOrder = (props) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { hasPermission } = useRole();
    const [formData, setFormData] = useState({
        cName: '',
        cEmail: '',
        cPhone: '',
        cAddress: '',
        oDate: '',
        dDate: '',
        status: '',
        pAvail: '',
        dStatus: '',
        desc: ''
    });
    const [loading, setLoading] = useState(true);
    
    // Products state
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');

    // Check permission on mount
    useEffect(() => {
        if (!hasPermission('canEditOrders')) {
            props.showAlert('You do not have permission to edit orders', 'danger');
            navigate('/dashboard/orders');
            return;
        }
    }, [hasPermission, navigate, props]);

    // Fetch products
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/products/getproduct', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    }
                });
                if (response.ok) {
                    const productList = await response.json();
                    setProducts(productList);
                }
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoadingProducts(false);
            }
        };
        fetchProducts();
    }, []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                    oDate: order.oDate ? order.oDate.split('T')[0] : '',
                    dDate: order.dDate ? order.dDate.split('T')[0] : '',
                    status: order.status || '',
                    pAvail: order.pAvail || '',
                    dStatus: order.dStatus || '',
                    desc: order.desc || ''
                });

                // Load existing products
                if (order.products && order.products.length > 0) {
                    const existingProducts = order.products.map(p => ({
                        product: p.product?._id || p.product,
                        productName: p.productName || p.product?.name || '',
                        price: p.unitPrice || p.product?.price || 0,
                        quantity: p.quantity || 1
                    }));
                    setSelectedProducts(existingProducts);
                }
            } else {
                props.showAlert('Order not found', 'danger');
                navigate('/dashboard/orders');
            }
        } catch (error) {
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

    // Calculate total amount
    const calculateTotalAmount = () => {
        return selectedProducts.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
    };

    // Handle product selection
    const handleProductSelect = (productId) => {
        const product = products.find(p => p._id === productId);
        if (!product) return;

        const existingIndex = selectedProducts.findIndex(p => p.product === productId);
        if (existingIndex === -1) {
            setSelectedProducts([...selectedProducts, {
                product: productId,
                productName: product.name,
                price: product.price,
                quantity: 1
            }]);
        }
        setProductSearchTerm('');
        setShowProductDropdown(false);
    };

    // Handle product removal
    const handleProductRemove = (productId) => {
        setSelectedProducts(selectedProducts.filter(p => p.product !== productId));
    };

    // Handle quantity change
    const handleQuantityChange = (productId, quantity) => {
        const qty = parseInt(quantity) || 1;
        setSelectedProducts(selectedProducts.map(p =>
            p.product === productId ? { ...p, quantity: Math.max(1, qty) } : p
        ));
    };

    // Filter products for dropdown
    const filteredProducts = products.filter(product => {
        const isNotSelected = !selectedProducts.some(sp => sp.product === product._id);
        const matchesSearch = product.name.toLowerCase().includes(productSearchTerm.toLowerCase());
        return isNotSelected && matchesSearch;
    });

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.product-dropdown-container')) {
                setShowProductDropdown(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!formData.cName || !formData.cEmail || !formData.cPhone || !formData.cAddress || 
            selectedProducts.length === 0 ||
            !formData.oDate || !formData.dDate || !formData.status || !formData.pAvail || !formData.dStatus) {
            props.showAlert('Please fill all required fields and select at least one product', 'danger');
            return;
        }

        try {
            const orderData = {
                ...formData,
                products: selectedProducts.map(p => ({
                    product: p.product,
                    quantity: p.quantity
                }))
            };

            const response = await fetch(`http://localhost:5000/api/customerorders/updatecustomerorder/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify(orderData)
            });

            const data = await response.json();

            if (response.ok) {
                props.showAlert('Order updated successfully', 'success');
                navigate('/dashboard/orders');
            } else {
                props.showAlert(data.errors?.[0]?.msg || data.error || 'Failed to update order', 'danger');
            }
        } catch (error) {
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
                    <div className="col-12 ms-5">
                        <h1 className="display-5 fw-normal">Edit Order</h1>
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
                                    <input type="text" className="form-control rounded-3 shadow-sm" id="cName" placeholder="Enter customer name" value={formData.cName} onChange={handleChange} required />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="cEmail" className="form-label fw-semibold mb-2">Customer Email</label>
                                    <input type="email" className="form-control rounded-3 shadow-sm" id="cEmail" placeholder="Enter customer email" value={formData.cEmail} onChange={handleChange} required />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="cPhone" className="form-label fw-semibold mb-2">Customer Phone</label>
                                    <input type="number" className="form-control rounded-3 shadow-sm" id="cPhone" placeholder="Enter customer phone" value={formData.cPhone} onChange={handleChange} required />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Product Selection Card */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-5">
                            <h5 className="card-title display-6 mb-4">Product Selection</h5>
                            
                            {/* Product Dropdown */}
                            <div className="mb-4 product-dropdown-container" style={{ position: 'relative' }}>
                                <label className="form-label fw-semibold mb-2">Select Products</label>
                                <div className="d-flex gap-2 align-items-end">
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <input
                                            type="text"
                                            className="form-control rounded-3 shadow-sm"
                                            placeholder={loadingProducts ? "Loading products..." : "Search and select products..."}
                                            value={productSearchTerm}
                                            onChange={(e) => {
                                                setProductSearchTerm(e.target.value);
                                                setShowProductDropdown(true);
                                            }}
                                            onFocus={() => setShowProductDropdown(true)}
                                            disabled={loadingProducts}
                                        />
                                        {showProductDropdown && filteredProducts.length > 0 && (
                                            <div 
                                                className="dropdown-menu show w-100 shadow-sm" 
                                                style={{ 
                                                    position: 'absolute', 
                                                    top: '100%', 
                                                    left: 0, 
                                                    maxHeight: '250px', 
                                                    overflowY: 'auto',
                                                    zIndex: 1000
                                                }}
                                            >
                                                {filteredProducts.map((product) => (
                                                    <button
                                                        key={product._id}
                                                        type="button"
                                                        className="dropdown-item d-flex justify-content-between align-items-center"
                                                        onClick={() => handleProductSelect(product._id)}
                                                    >
                                                        <span>{product.name}</span>
                                                        <span className="badge bg-secondary">₹{product.price}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {showProductDropdown && filteredProducts.length === 0 && productSearchTerm && !loadingProducts && (
                                            <div className="dropdown-menu show w-100" style={{ position: 'absolute', top: '100%', left: 0 }}>
                                                <span className="dropdown-item text-muted">No products found</span>
                                            </div>
                                        )}
                                    </div>
                                    <a href="/dashboard/products" className="btn btn-sm w-auto btn-custom-purple text-decoration-none" title="Add new product">+</a>
                                </div>
                            </div>

                            {/* Selected Products Table */}
                            {selectedProducts.length > 0 && (
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Product</th>
                                                <th style={{ width: '150px' }}>Unit Price</th>
                                                <th style={{ width: '150px' }}>Quantity</th>
                                                <th style={{ width: '150px' }}>Subtotal</th>
                                                <th style={{ width: '80px' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedProducts.map((item) => (
                                                <tr key={item.product}>
                                                    <td>{item.productName}</td>
                                                    <td>₹{item.price.toFixed(2)}</td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="form-control form-control-sm rounded-3"
                                                            value={item.quantity}
                                                            min="1"
                                                            onChange={(e) => handleQuantityChange(item.product, e.target.value)}
                                                            style={{ width: '100px' }}
                                                        />
                                                    </td>
                                                    <td>₹{(item.price * item.quantity).toFixed(2)}</td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-danger rounded-3"
                                                            onClick={() => handleProductRemove(item.product)}
                                                            title="Remove product"
                                                        >
                                                            ✕
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="table-light fw-bold">
                                                <td colSpan="3" className="text-end">Total Amount:</td>
                                                <td colSpan="2">₹{calculateTotalAmount().toFixed(2)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}

                            {selectedProducts.length === 0 && (
                                <div className="text-center text-muted py-4 border rounded-3 bg-light">
                                    <p className="mb-0">No products selected. Search and select products from the dropdown above.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Order Details Card */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-5">
                            <h5 className="card-title display-6 mb-4">Order Details</h5>
                            <div className="d-flex gap-4">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="oDate" className="form-label fw-semibold mb-2">Order Date</label>
                                    <input type="date" className="form-control rounded-3 shadow-sm" id="oDate" value={formData.oDate} onChange={handleChange} required />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="dDate" className="form-label fw-semibold mb-2">Delivery Deadline</label>
                                    <input type="date" className="form-control rounded-3 shadow-sm" id="dDate" value={formData.dDate} onChange={handleChange} required />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label fw-semibold mb-2">Total Amount</label>
                                    <div className="input-group">
                                        <span className="input-group-text rounded-start-3">₹</span>
                                        <input 
                                            type="text" 
                                            className="form-control rounded-end-3 shadow-sm" 
                                            value={calculateTotalAmount().toFixed(2)} 
                                            readOnly 
                                            style={{ backgroundColor: '#f8f9fa' }}
                                        />
                                    </div>
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
                                    <textarea className="form-control rounded-3 shadow-sm" id="cAddress" rows="3" placeholder="Enter delivery address" value={formData.cAddress} onChange={handleChange} required></textarea>
                                </div>
                                <div className="col-md-12">
                                    <label htmlFor="desc" className="form-label fw-semibold mb-2">Additional Notes</label>
                                    <textarea className="form-control rounded-3 shadow-sm" id="desc" rows="3" placeholder="Enter additional notes" value={formData.desc} onChange={handleChange}></textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row mt-4 ms-1 mb-5 pb-5">
                        <div className="col-12 d-flex gap-3 justify-content-start">
                            <button type="submit" className="btn btn-custom-purple btn-lg rounded-3 px-5 shadow-sm">Update Order</button>
                            <button type="button" className="btn btn-outline-secondary btn-lg rounded-3 px-5 shadow-sm" onClick={handleCancel}>Cancel</button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    )
}

export default EditOrder


