import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function EditSupplierOrder(props) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [supplierName, setSupplierName] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [loading, setLoading] = useState(true);
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [isOtherProduct, setIsOtherProduct] = useState(false);
    const [isCustomProduct, setIsCustomProduct] = useState(false);
    const [errors, setErrors] = useState({});
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetchOrderDetails();
        fetchCategories();
        fetchProducts();
    }, [id]);

    const fetchOrderDetails = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/supplierorders/getsupplierorder/' + id, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    const order = data[0];
                    setOrderDetails({
                        pName: order.pName,
                        category: order.category,
                        amount: order.amount,
                        ounits: order.ounits,
                        oDate: order.oDate.split('T')[0],
                        dDate: order.dDate.split('T')[0],
                        status: order.status || 'Pending',
                        pAvail: order.pAvail || 'Available',
                        dStatus: order.dStatus || 'Pending',
                        desc: order.desc || ''
                    });
                    setSupplierId(order.supplier);
                    fetchSupplierInfo(order.supplier);
                }
            } else {
                props.showAlert('Failed to fetch order details', 'danger');
            }
        } catch (error) {
            props.showAlert('Error fetching order details', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const fetchSupplierInfo = async (suppId) => {
        try {
            const response = await fetch('http://localhost:5000/api/supplier/getsupplier/' + suppId, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSupplierName(`${data.fname} ${data.lname || ''}`);
            }
        } catch (error) {
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
        }
    };

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
                const data = await response.json();
                setProducts(data);
            }
        } catch (error) {
        }
    };

    // Helper function to get category name by ID
    const getCategoryName = (categoryIdOrName) => {
        if (!categoryIdOrName) return '';
        const categoryById = categories.find(cat => cat._id === categoryIdOrName);
        if (categoryById) return categoryById.cName;
        const categoryByName = categories.find(cat => cat.cName === categoryIdOrName);
        if (categoryByName) return categoryByName.cName;
        return categoryIdOrName;
    };

    // Filter products for dropdown
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(productSearchTerm.toLowerCase());
        return matchesSearch;
    });

    // Handle product selection from dropdown
    const handleProductSelect = (product) => {
        setOrderDetails(prev => ({
            ...prev,
            pName: product.name,
            category: getCategoryName(product.category)
        }));
        setProductSearchTerm('');
        setShowProductDropdown(false);
        setIsCustomProduct(false);
        
        if (errors.pName) {
            setErrors(prev => ({ ...prev, pName: "" }));
        }
    };

    // Handle custom product addition
    const handleAddCustomProduct = () => {
        if (!orderDetails.pName.trim() || !orderDetails.category) {
            props.showAlert('Please enter product name and category', 'warning');
            return;
        }
        setIsCustomProduct(true);
        setIsOtherProduct(false);
        props.showAlert('Custom product set', 'success');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setOrderDetails(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ""
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!orderDetails.pName) {
            newErrors.pName = "Product name is required";
        }

        if (!orderDetails.category) {
            newErrors.category = "Category is required";
        }

        if (!orderDetails.amount || parseFloat(orderDetails.amount) <= 0) {
            newErrors.amount = "Valid amount is required";
        }

        if (!orderDetails.ounits || parseInt(orderDetails.ounits) <= 0) {
            newErrors.ounits = "Valid units is required";
        }

        if (!orderDetails.oDate) {
            newErrors.oDate = "Order date is required";
        }

        if (!orderDetails.dDate) {
            newErrors.dDate = "Delivery date is required";
        }

        if (orderDetails.oDate && orderDetails.dDate) {
            const orderDate = new Date(orderDetails.oDate);
            const deliveryDate = new Date(orderDetails.dDate);
            
            if (deliveryDate < orderDate) {
                newErrors.dDate = "Delivery date must be after order date";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            props.showAlert('Please fix the errors in the form', 'danger');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/supplierorders/updatesupplierorder/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify(orderDetails)
            });

            if (response.ok) {
                props.showAlert('Supplier order updated successfully', 'success');
                navigate(`/dashboard/supplierordes/${supplierId}`);
            } else {
                const errorData = await response.json();
                props.showAlert(errorData.errors?.[0]?.msg || 'Failed to update order', 'danger');
            }
        } catch (error) {
            props.showAlert('Error updating order', 'danger');
        }
    };

    if (loading) {
        return (
            <div className="container-fluid d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="container-fluid p-5">
                <div className="mb-5 ms-5">
                    <h1 className="display-5 fw-semibold mb-1">Edit Supplier Order</h1>
                    <p className="text-muted">Supplier: <span className="fw-semibold text-dark">{supplierName}</span></p>
                </div>

                <div className="row g-4">
                    <div className="col-lg-7">
                        <form onSubmit={handleSubmit}>
                            {/* Product Selection Card */}
                            <div className="card border-0 shadow-sm mb-4 rounded-4">
                                <div className="card-body p-5">
                                    <h6 className="fw-bold text-uppercase text-muted mb-4" style={{ letterSpacing: '0.5px', fontSize: '12px' }}>Product Selection</h6>
                                    
                                    {/* Product Search Dropdown */}
                                    <div className="mb-4">
                                        <label className="form-label fw-semibold mb-2">Select Product</label>
                                        <div className="d-flex gap-2 product-dropdown-container">
                                            <div className="position-relative flex-grow-1">
                                                <input
                                                    type="text"
                                                    className="form-control rounded-3 shadow-sm"
                                                    placeholder="Search and select products..."
                                                    value={productSearchTerm}
                                                    onChange={(e) => {
                                                        setProductSearchTerm(e.target.value);
                                                        setShowProductDropdown(true);
                                                    }}
                                                    onFocus={() => setShowProductDropdown(true)}
                                                />
                                                {showProductDropdown && filteredProducts.length > 0 && (
                                                    <div className="dropdown-menu show w-100 shadow" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                                        {filteredProducts.map(product => (
                                                            <button
                                                                key={product._id}
                                                                type="button"
                                                                className="dropdown-item py-2"
                                                                onClick={() => handleProductSelect(product)}
                                                            >
                                                                <div className="d-flex justify-content-between align-items-center">
                                                                    <span>{product.name}</span>
                                                                    <small className="text-muted">{getCategoryName(product.category)}</small>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <button 
                                                type="button" 
                                                className="btn-custom-purple" 
                                                title="Add custom product"
                                                onClick={() => setIsOtherProduct(!isOtherProduct)}
                                            >
                                                <i className="bi bi-plus-lg"></i>
                                            </button>
                                        </div>
                                        {errors.pName && <div className="text-danger small mt-1">{errors.pName}</div>}
                                    </div>

                                    {/* Add Custom Product Form */}
                                    {isOtherProduct && (
                                        <div className="p-3 bg-light rounded-3 mb-4">
                                            <h6 className="fw-semibold mb-3"><i className="bi bi-plus-circle me-2"></i>Add Custom Product</h6>
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <label htmlFor="customPName" className="form-label fw-semibold mb-2">Product Name *</label>
                                                    <input 
                                                        type="text" 
                                                        className="form-control rounded-3 shadow-sm"
                                                        id="customPName"
                                                        value={orderDetails.pName}
                                                        onChange={(e) => setOrderDetails(prev => ({ ...prev, pName: e.target.value }))}
                                                        placeholder="Enter product name"
                                                    />
                                                </div>
                                                <div className="col-md-6">
                                                    <label htmlFor="customCategory" className="form-label fw-semibold mb-2">Category *</label>
                                                    <select 
                                                        className="form-select rounded-3 shadow-sm"
                                                        id="customCategory"
                                                        value={orderDetails.category}
                                                        onChange={(e) => setOrderDetails(prev => ({ ...prev, category: e.target.value }))}
                                                    >
                                                        <option value="">Select Category</option>
                                                        {categories.map(cat => (
                                                            <option key={cat._id} value={cat.cName}>{cat.cName}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="col-12 d-flex justify-content-start gap-2">
                                                    <button type="button" className="btn btn-custom-purple" onClick={handleAddCustomProduct}>
                                                        <i className="bi bi-check-lg me-1"></i> Set Product
                                                    </button>
                                                    <button type="button" className="btn btn-outline-secondary" onClick={() => setIsOtherProduct(false)}>
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Current Product Display */}
                                    {orderDetails.pName && !isOtherProduct && (
                                        <div className="table-responsive">
                                            <table className="table table-hover align-middle">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>Product</th>
                                                        <th>Category</th>
                                                        <th style={{ width: '120px' }}>Units *</th>
                                                        <th style={{ width: '150px' }}>Amount (₹) *</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td>
                                                            {orderDetails.pName}
                                                            {isCustomProduct && <span className="badge bg-secondary ms-2">Custom</span>}
                                                        </td>
                                                        <td><span className="text-muted">{orderDetails.category}</span></td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                className={`form-control form-control-sm rounded-3 ${errors.ounits ? 'is-invalid' : ''}`}
                                                                name="ounits"
                                                                value={orderDetails.ounits}
                                                                min="1"
                                                                onChange={handleInputChange}
                                                                placeholder="Units"
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                className={`form-control form-control-sm rounded-3 ${errors.amount ? 'is-invalid' : ''}`}
                                                                name="amount"
                                                                value={orderDetails.amount}
                                                                min="0"
                                                                step="0.01"
                                                                onChange={handleInputChange}
                                                                placeholder="Amount"
                                                            />
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            {(errors.ounits || errors.amount) && (
                                                <div className="text-danger small">{errors.ounits || errors.amount}</div>
                                            )}
                                        </div>
                                    )}

                                    {!orderDetails.pName && !isOtherProduct && (
                                        <div className="text-center text-muted py-4">
                                            No product selected. Search and select a product from the dropdown above.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Order Details Card */}
                            <div className="card border-0 shadow-sm mb-4 rounded-4">
                                <div className="card-body p-5">
                                    <h6 className="fw-bold text-uppercase text-muted mb-4" style={{ letterSpacing: '0.5px', fontSize: '12px' }}>Order Details</h6>
                                    <div className="d-flex gap-4 mb-4">
                                        <div style={{ flex: 1 }}>
                                            <label htmlFor="oDate" className="form-label fw-semibold mb-2">Order Date *</label>
                                            <input 
                                                type="date" 
                                                className={`form-control rounded-3 shadow-sm ${errors.oDate ? 'is-invalid' : ''}`}
                                                id="oDate"
                                                name="oDate"
                                                value={orderDetails.oDate}
                                                onChange={handleInputChange}
                                                required
                                            />
                                            {errors.oDate && <div className="invalid-feedback">{errors.oDate}</div>}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label htmlFor="dDate" className="form-label fw-semibold mb-2">Delivery Date *</label>
                                            <input 
                                                type="date" 
                                                className={`form-control rounded-3 shadow-sm ${errors.dDate ? 'is-invalid' : ''}`}
                                                id="dDate"
                                                name="dDate"
                                                value={orderDetails.dDate}
                                                onChange={handleInputChange}
                                                required
                                            />
                                            {errors.dDate && <div className="invalid-feedback">{errors.dDate}</div>}
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

                            <div className="d-flex gap-2 mb-5">
                                <button type="submit" className="btn btn-custom-purple btn-lg px-5">Update Order</button>
                                <button type="button" className="btn btn-outline-secondary btn-lg px-5" onClick={() => navigate(`/dashboard/supplierordes/${supplierId}`)}>
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

export default EditSupplierOrder;


