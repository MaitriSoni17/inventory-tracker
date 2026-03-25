import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import { useRole } from '../../../context/RoleContext';
import '../../../styles/validation.css';

const AddOrder = (props) => {
    const navigate = useNavigate();
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
        desc: '',
        warehouse: ''
    });
    
    // Products state
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    
    const [warehouses, setWarehouses] = useState([]);
    const [loadingWarehouses, setLoadingWarehouses] = useState(true);
    const [errors, setErrors] = useState({});
    // eslint-disable-next-line no-unused-vars
    const [touched, setTouched] = useState({});

    // Check permission on mount
    useEffect(() => {
        if (!hasPermission('canCreateOrders')) {
            props.showAlert('You do not have permission to add orders', 'danger');
            navigate('/dashboard/orders');
            return;
        }
    }, [hasPermission, navigate, props]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Fetch products
        const fetchProducts = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/products/getproduct', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    }
                });
                if (!response.ok) {
                    setLoadingProducts(false);
                    return;
                }
                const productList = await response.json();
                setProducts(productList);
            } catch (error) {
                // console.error('Error fetching products:', error);
            } finally {
                setLoadingProducts(false);
            }
        };
        fetchProducts();

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

    // Calculate total amount
    const calculateTotalAmount = () => {
        return selectedProducts.reduce((total, item) => {
            const product = products.find(p => p._id === item.product);
            if (product) {
                return total + (product.price * item.quantity);
            }
            return total;
        }, 0);
    };

    // Handle product selection
    const handleProductSelect = (productId) => {
        const product = products.find(p => p._id === productId);
        if (!product) return;

        const existingIndex = selectedProducts.findIndex(p => p.product === productId);
        if (existingIndex === -1) {
            // Add new product
            setSelectedProducts([...selectedProducts, {
                product: productId,
                productName: product.name,
                price: product.price,
                quantity: 1
            }]);
        }
        setProductSearchTerm('');
        setShowProductDropdown(false);
        // Clear product error if exists
        if (errors.products) {
            setErrors(prev => ({ ...prev, products: '' }));
        }
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

    // Check if any selected product has insufficient stock
    const hasInsufficientStock = () => {
        return selectedProducts.some(item => {
            const product = products.find(p => p._id === item.product);
            return product && product.totalProducts < item.quantity;
        });
    };

    // Filter products for dropdown
    const filteredProducts = products.filter(product => {
        const isNotSelected = !selectedProducts.some(sp => sp.product === product._id);
        const matchesSearch = product.name.toLowerCase().includes(productSearchTerm.toLowerCase());
        return isNotSelected && matchesSearch;
    });

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

        // Products validation
        if (selectedProducts.length === 0) {
            newErrors.products = 'Please select at least one product';
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
            [id]: id === 'cPhone' ? value.replace(/[^\d+\-()\s]/g, '').slice(0, 16) : value
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
            const orderData = {
                ...formData,
                products: selectedProducts.map(p => ({
                    product: p.product,
                    quantity: p.quantity
                }))
            };

            const response = await fetch('http://localhost:5000/api/customerorders/createcustomerorder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify(orderData)
            });

            const data = await response.json();

            if (response.ok) {
                if (data.isPending) {
                    props.showAlert('Order saved as pending due to insufficient stock. It will be automatically fulfilled when stock becomes available.', 'warning');
                } else {
                    props.showAlert('Order created successfully', 'success');
                }
                navigate('/dashboard/orders');
            } else {
                props.showAlert(data.errors?.[0]?.msg || data.error || 'Failed to create order', 'danger');
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
                                    <input type="tel" className={`form-control rounded-3 shadow-sm ${errors.cPhone ? 'is-invalid' : ''}`} id="cPhone" placeholder="+91 9876543210" value={formData.cPhone} onChange={handleChange} onBlur={handleBlur} maxLength={16} pattern="[\+]?[\d\s\-\(\)]*" required />
                                    {errors.cPhone && <div className="error-message">{errors.cPhone}</div>}
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
                                            className={`form-control rounded-3 shadow-sm ${errors.products ? 'is-invalid' : ''}`}
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
                                                        <div>
                                                            <span className={`badge ${product.totalProducts > 0 ? 'bg-success' : 'bg-danger'} me-2`}>
                                                                Stock: {product.totalProducts}
                                                            </span>
                                                            <span className="badge bg-secondary">₹{product.price}</span>
                                                        </div>
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
                                {errors.products && <div className="error-message">{errors.products}</div>}
                            </div>

                            {/* Selected Products Table */}
                            {selectedProducts.length > 0 && (
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Product</th>
                                                <th style={{ width: '120px' }}>Available</th>
                                                <th style={{ width: '150px' }}>Unit Price</th>
                                                <th style={{ width: '150px' }}>Quantity</th>
                                                <th style={{ width: '150px' }}>Subtotal</th>
                                                <th style={{ width: '80px' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedProducts.map((item) => {
                                                const productInfo = products.find(p => p._id === item.product);
                                                const availableStock = productInfo ? productInfo.totalProducts : 0;
                                                const isLowStock = availableStock < item.quantity;
                                                return (
                                                <tr key={item.product} className={isLowStock ? 'table-warning' : ''}>
                                                    <td>
                                                        {item.productName}
                                                        {isLowStock && (
                                                            <div className="small text-danger mt-1">
                                                                <i className="bi bi-exclamation-triangle-fill me-1"></i>
                                                                Insufficient stock — order will be saved as pending
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${isLowStock ? 'bg-danger' : 'bg-success'} rounded-pill px-3 py-2`}>
                                                            {availableStock}
                                                        </span>
                                                    </td>
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
                                                );
                                            })}
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
                                    <input type="date" className={`form-control text-secondary rounded-3 shadow-sm ${errors.oDate ? 'is-invalid' : ''}`} id="oDate" value={formData.oDate} onChange={handleChange} onBlur={handleBlur} required />
                                    {errors.oDate && <div className="error-message">{errors.oDate}</div>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="dDate" className="form-label fw-semibold mb-2">Delivery Deadline</label>
                                    <input type="date" className={`form-control text-secondary rounded-3 shadow-sm ${errors.dDate ? 'is-invalid' : ''}`} id="dDate" value={formData.dDate} onChange={handleChange} onBlur={handleBlur} required />
                                    {errors.dDate && <div className="error-message">{errors.dDate}</div>}
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

                    {/* Insufficient Stock Warning */}
                    {selectedProducts.length > 0 && hasInsufficientStock() && (
                        <div className="alert alert-warning d-flex align-items-center mb-4 rounded-4" role="alert">
                            <i className="bi bi-exclamation-triangle-fill me-3 fs-4"></i>
                            <div>
                                <strong>Low Stock Warning:</strong> One or more products have insufficient stock. 
                                The order will be saved as <strong>Pending</strong> and will automatically move to Customer Orders 
                                when stock becomes sufficient.
                            </div>
                        </div>
                    )}

                    <div className="row mt-4 ms-2 mb-5 pb-5">
                        <div className="col-12 d-flex gap-3 justify-content-start">
                            <button type="submit" className="btn btn-custom-purple btn-lg rounded-3 px-5 shadow-sm" disabled={isSubmitting}>
                                {isSubmitting ? 'Adding Order...' : (hasInsufficientStock() ? 'Add as Pending Order' : 'Add Order')}
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

