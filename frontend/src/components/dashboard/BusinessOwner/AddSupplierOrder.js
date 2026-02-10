import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function AddSupplierOrder(props) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [supplierName, setSupplierName] = useState('');
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [isOtherProduct, setIsOtherProduct] = useState(false);
    const [otherProductDetails, setOtherProductDetails] = useState({ pName: '', category: '', amount: '', ounits: '' });
    const [errors, setErrors] = useState({});
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [orderDetails, setOrderDetails] = useState({
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
        fetchSupplierInfo();
        fetchCategories();
        fetchProducts();
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
        // First try to find by ID
        const categoryById = categories.find(cat => cat._id === categoryIdOrName);
        if (categoryById) return categoryById.cName;
        // If not found by ID, check if it's already a name
        const categoryByName = categories.find(cat => cat.cName === categoryIdOrName);
        if (categoryByName) return categoryByName.cName;
        // Return the original value if no match (might already be a name)
        return categoryIdOrName;
    };

    // Filter products for dropdown
    const filteredProducts = products.filter(product => {
        const isNotSelected = !selectedProducts.some(sp => sp._id === product._id);
        const matchesSearch = product.name.toLowerCase().includes(productSearchTerm.toLowerCase());
        return isNotSelected && matchesSearch;
    });

    // Handle product selection from dropdown
    const handleProductSelect = (product) => {
        const newProduct = {
            _id: product._id,
            name: product.name,
            category: getCategoryName(product.category),
            amount: '',
            ounits: ''
        };
        setSelectedProducts(prev => [...prev, newProduct]);
        setProductSearchTerm('');
        setShowProductDropdown(false);
        
        // Clear product error
        if (errors.products) {
            setErrors(prev => ({ ...prev, products: "" }));
        }
    };

    // Handle product removal
    const removeProduct = (productId) => {
        setSelectedProducts(prev => prev.filter(p => p._id !== productId));
    };

    const handleProductDetailChange = (productId, field, value) => {
        setSelectedProducts(prev => prev.map(p => 
            p._id === productId ? { ...p, [field]: value } : p
        ));
    };

    const handleOtherProductChange = (e) => {
        const { name, value } = e.target;
        setOtherProductDetails(prev => ({ ...prev, [name]: value }));
    };

    const addOtherProduct = () => {
        if (!otherProductDetails.pName.trim() || !otherProductDetails.category) {
            props.showAlert('Please enter product name and category', 'warning');
            return;
        }
        const newProduct = {
            _id: `other_${Date.now()}`,
            name: otherProductDetails.pName,
            category: otherProductDetails.category,
            amount: otherProductDetails.amount || '',
            ounits: otherProductDetails.ounits || '',
            isCustom: true
        };
        setSelectedProducts(prev => [...prev, newProduct]);
        setOtherProductDetails({ pName: '', category: '', amount: '', ounits: '' });
        props.showAlert('Custom product added', 'success');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setOrderDetails(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error for this field when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ""
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Products validation
        if (selectedProducts.length === 0) {
            newErrors.products = "Please select at least one product";
        } else {
            // Validate each product has amount and units
            const invalidProducts = selectedProducts.filter(p => !p.amount || !p.ounits || parseFloat(p.amount) <= 0 || parseInt(p.ounits) <= 0);
            if (invalidProducts.length > 0) {
                newErrors.products = "Please enter valid amount and units for all selected products";
            }
        }

        // Order Date validation
        if (!orderDetails.oDate) {
            newErrors.oDate = "Order date is required";
        }

        // Delivery Date validation
        if (!orderDetails.dDate) {
            newErrors.dDate = "Delivery date is required";
        }

        // Date comparison validation
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

        // Validate form before submission
        if (!validateForm()) {
            props.showAlert('Please fix the errors in the form', 'danger');
            return;
        }

        try {
            let successCount = 0;
            let failCount = 0;

            // Create an order for each selected product
            for (const product of selectedProducts) {
                const orderData = {
                    pName: product.name,
                    category: product.category,
                    amount: parseFloat(product.amount),
                    ounits: parseInt(product.ounits),
                    oDate: orderDetails.oDate,
                    dDate: orderDetails.dDate,
                    status: orderDetails.status,
                    pAvail: orderDetails.pAvail,
                    dStatus: orderDetails.dStatus,
                    desc: orderDetails.desc
                };

                const response = await fetch(`http://localhost:5000/api/supplierorders/createsupplierorder/${id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    },
                    body: JSON.stringify(orderData)
                });

                if (response.ok) {
                    successCount++;
                } else {
                    failCount++;
                }
            }

            if (successCount > 0) {
                props.showAlert(`${successCount} order(s) created successfully${failCount > 0 ? `, ${failCount} failed` : ''}`, 'success');
                navigate(`/dashboard/supplierordes/${id}`);
            } else {
                props.showAlert('Failed to create orders', 'danger');
            }
        } catch (error) {
            props.showAlert('Error creating orders', 'danger');
        }
    };

    // Calculate totals
    const totalAmount = selectedProducts.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalUnits = selectedProducts.reduce((sum, p) => sum + (parseInt(p.ounits) || 0), 0);

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
                                    <h6 className="fw-bold text-uppercase text-muted mb-4" style={{ letterSpacing: '0.5px', fontSize: '12px' }}>Product Selection</h6>
                                    
                                    {/* Product Dropdown - Same as Customer Orders */}
                                    <div className="mb-4 product-dropdown-container" style={{ position: 'relative' }}>
                                        <label className="form-label fw-semibold mb-2">Select Products</label>
                                        <div className="d-flex gap-2 align-items-end">
                                            <div style={{ flex: 1, position: 'relative' }}>
                                                <input
                                                    type="text"
                                                    className={`form-control rounded-3 shadow-sm ${errors.products ? 'is-invalid' : ''}`}
                                                    placeholder="Search and select products..."
                                                    value={productSearchTerm}
                                                    onChange={(e) => {
                                                        setProductSearchTerm(e.target.value);
                                                        setShowProductDropdown(true);
                                                    }}
                                                    onFocus={() => setShowProductDropdown(true)}
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
                                                                onClick={() => handleProductSelect(product)}
                                                            >
                                                                <span>{product.name}</span>
                                                                <span className="badge bg-secondary">{getCategoryName(product.category)}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {showProductDropdown && filteredProducts.length === 0 && productSearchTerm && (
                                                    <div className="dropdown-menu show w-100" style={{ position: 'absolute', top: '100%', left: 0 }}>
                                                        <span className="dropdown-item text-muted">No products found</span>
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
                                        {errors.products && <div className="text-danger small mt-1">{errors.products}</div>}
                                    </div>

                                    {/* Add Custom Product Form */}
                                    {isOtherProduct && (
                                        <div className="p-3 bg-light rounded-3 mb-4">
                                            <h6 className="fw-semibold mb-3"><i className="bi bi-plus-circle me-2"></i>Add Custom Product</h6>
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <label htmlFor="pName" className="form-label fw-semibold mb-2">Product Name *</label>
                                                    <input 
                                                        type="text" 
                                                        className="form-control rounded-3 shadow-sm"
                                                        id="pName"
                                                        name="pName"
                                                        value={otherProductDetails.pName}
                                                        onChange={handleOtherProductChange}
                                                        placeholder="Enter product name"
                                                    />
                                                </div>
                                                <div className="col-md-6">
                                                    <label htmlFor="category" className="form-label fw-semibold mb-2">Category *</label>
                                                    <select 
                                                        className="form-select rounded-3 shadow-sm"
                                                        id="category"
                                                        name="category"
                                                        value={otherProductDetails.category}
                                                        onChange={handleOtherProductChange}
                                                    >
                                                        <option value="">Select Category</option>
                                                        {categories.map(cat => (
                                                            <option key={cat._id} value={cat.cName}>{cat.cName}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="col-12 d-flex justify-content-start gap-2">
                                                    <button type="button" className="btn btn-custom-purple" onClick={addOtherProduct}>
                                                        <i className="bi bi-plus-lg me-1"></i> Add Product
                                                    </button>
                                                    <button type="button" className="btn btn-outline-secondary" onClick={() => {
                                                        setIsOtherProduct(false);
                                                        setOtherProductDetails({ pName: '', category: '', amount: '', ounits: '' });
                                                    }}>
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Selected Products Table - Same as Customer Orders */}
                                    {selectedProducts.length > 0 && (
                                        <div className="table-responsive">
                                            <table className="table table-hover align-middle">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>Product</th>
                                                        <th>Category</th>
                                                        <th style={{ width: '120px' }}>Units</th>
                                                        <th style={{ width: '150px' }}>Amount (₹)</th>
                                                        <th style={{ width: '80px' }}>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedProducts.map((product) => (
                                                        <tr key={product._id}>
                                                            <td>
                                                                {product.name}
                                                                {product.isCustom && <span className="badge bg-secondary ms-2">Custom</span>}
                                                            </td>
                                                            <td><span className="text-muted">{product.category}</span></td>
                                                            <td>
                                                                <input
                                                                    type="number"
                                                                    className="form-control form-control-sm rounded-3"
                                                                    value={product.ounits}
                                                                    min="1"
                                                                    onChange={(e) => handleProductDetailChange(product._id, 'ounits', e.target.value)}
                                                                    placeholder="Units"
                                                                />
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="number"
                                                                    className="form-control form-control-sm rounded-3"
                                                                    value={product.amount}
                                                                    min="0"
                                                                    step="0.01"
                                                                    onChange={(e) => handleProductDetailChange(product._id, 'amount', e.target.value)}
                                                                    placeholder="Amount"
                                                                />
                                                            </td>
                                                            <td>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-outline-danger rounded-3"
                                                                    onClick={() => removeProduct(product._id)}
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
                                                        <td colSpan="2" className="text-end">Total:</td>
                                                        <td>{totalUnits} units</td>
                                                        <td>₹{totalAmount.toFixed(2)}</td>
                                                        <td></td>
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
                                            {errors.oDate && <div className="invalid-feedback d-block">{errors.oDate}</div>}
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
                                            {errors.dDate && <div className="invalid-feedback d-block">{errors.dDate}</div>}
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
                                <button type="submit" className="btn btn-custom-purple btn-lg px-5" disabled={selectedProducts.length === 0}>
                                    Create {selectedProducts.length > 1 ? `${selectedProducts.length} Orders` : 'Order'}
                                </button>
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

                                <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                                    <small className="text-muted">Products</small>
                                    <p className="mb-0 fw-semibold">{selectedProducts.length} selected</p>
                                </div>

                                {selectedProducts.length > 0 && (
                                    <div className="mb-3 pb-3 border-bottom">
                                        <small className="text-muted d-block mb-2">Product Details</small>
                                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                            {selectedProducts.map((product, index) => (
                                                <div key={product._id} className="d-flex justify-content-between align-items-center py-1 small">
                                                    <span className="text-truncate" style={{ maxWidth: '60%' }}>
                                                        {product.name}
                                                        {product.isCustom && <span className="badge bg-secondary ms-1" style={{ fontSize: '9px' }}>Custom</span>}
                                                    </span>
                                                    <span className="fw-semibold">
                                                        {product.ounits || '-'} × ₹{product.amount || '-'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {totalUnits > 0 && (
                                    <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                                        <small className="text-muted">Total Units</small>
                                        <p className="mb-0 fw-semibold">{totalUnits}</p>
                                    </div>
                                )}

                                {totalAmount > 0 && (
                                    <div className="p-3 bg-light rounded-3 mb-3">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <small className="text-muted fw-semibold">Total Amount</small>
                                            <p className="mb-0 fs-5 fw-bold" style={{ color: '#7300FF' }}>₹{totalAmount.toLocaleString('en-IN')}</p>
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