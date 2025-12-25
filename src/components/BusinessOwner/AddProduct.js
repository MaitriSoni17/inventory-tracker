import React, { useState, useEffect } from 'react'
import validationRules from '../../utils/validationHelper';
import '../styles/validation.css';

const AddProduct = (props) => {
    const [productDetails, setProductDetails] = useState({
        name: '',
        category: '',
        price: '',
        totalProducts: '',
        warehouse: '',
        brand: '',
        mDate: '',
        eDate: '',
        desc: '',
    });
    const [uploadedImages, setUploadedImages] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loadingWarehouses, setLoadingWarehouses] = useState(true);
    const [categories, setCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
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
    }, []);

    const validateForm = () => {
        const newErrors = {};

        // Name validation
        const nameError = validationRules.required(productDetails.name, 'Product Name');
        if (nameError) newErrors.name = nameError;

        // Category validation
        const categoryError = validationRules.required(productDetails.category, 'Category');
        if (categoryError) newErrors.category = categoryError;

        // Price validation
        const priceError = validationRules.required(productDetails.price, 'Price');
        if (priceError) {
            newErrors.price = priceError;
        } else {
            const numberError = validationRules.number(productDetails.price, 'Price');
            if (numberError) newErrors.price = numberError;
        }

        // Total Products validation
        const totalError = validationRules.required(productDetails.totalProducts, 'Total Products');
        if (totalError) {
            newErrors.totalProducts = totalError;
        } else {
            const numberError = validationRules.number(productDetails.totalProducts, 'Total Products');
            if (numberError) newErrors.totalProducts = numberError;
        }

        // Warehouse validation
        const warehouseError = validationRules.required(productDetails.warehouse, 'Warehouse');
        if (warehouseError) newErrors.warehouse = warehouseError;

        // Brand validation
        const brandError = validationRules.required(productDetails.brand, 'Brand');
        if (brandError) newErrors.brand = brandError;

        // Manufacturing Date validation
        const mDateError = validationRules.required(productDetails.mDate, 'Manufacturing Date');
        if (mDateError) newErrors.mDate = mDateError;

        // Expiring Date validation
        const eDateError = validationRules.required(productDetails.eDate, 'Expiring Date');
        if (eDateError) {
            newErrors.eDate = eDateError;
        } else {
            const dateCompareError = new Date(productDetails.eDate) > new Date(productDetails.mDate) ? '' : 'Expiring date must be after manufacturing date';
            if (dateCompareError) newErrors.eDate = dateCompareError;
        }

        // Description validation
        const descError = validationRules.required(productDetails.desc, 'Description');
        if (descError) {
            newErrors.desc = descError;
        } else {
            const lengthError = validationRules.minLength(productDetails.desc, 10, 'Description');
            if (lengthError) newErrors.desc = lengthError;
        }

        // Image validation
        if (uploadedImages.length === 0) {
            newErrors.images = 'Please upload at least one product image';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleBlur = (fieldName) => {
        setTouched({ ...touched, [fieldName]: true });

        // Validate individual field
        let error = '';
        const field = productDetails[fieldName];

        switch (fieldName) {
            case 'name':
                error = validationRules.required(field, 'Product Name');
                break;
            case 'category':
                error = validationRules.required(field, 'Category');
                break;
            case 'price':
                error = validationRules.required(field, 'Price') || validationRules.number(field, 'Price');
                break;
            case 'totalProducts':
                error = validationRules.required(field, 'Total Products') || validationRules.number(field, 'Total Products');
                break;
            case 'warehouse':
                error = validationRules.required(field, 'Warehouse');
                break;
            case 'brand':
                error = validationRules.required(field, 'Brand');
                break;
            case 'mDate':
                error = validationRules.required(field, 'Manufacturing Date');
                break;
            case 'eDate':
                error = validationRules.required(field, 'Expiring Date') || (new Date(field) > new Date(productDetails.mDate) ? '' : 'Expiring date must be after manufacturing date');
                break;
            case 'desc':
                error = validationRules.required(field, 'Description') || validationRules.minLength(field, 10, 'Description');
                break;
            default:
                break;
        }

        if (error) {
            setErrors({ ...errors, [fieldName]: error });
        } else {
            setErrors({ ...errors, [fieldName]: '' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            props.showAlert('Please fix the errors in the form', "danger");
            return;
        }

        setIsSubmitting(true);
        try {
            const { name, category, price, totalProducts, warehouse, brand, mDate, eDate, desc } = productDetails;
            const formData = new FormData();
            formData.append('name', name);
            formData.append('price', price);
            formData.append('warehouse', warehouse);
            formData.append('category', category);
            formData.append('totalProducts', totalProducts);
            formData.append('brand', brand);
            formData.append('mDate', mDate);
            formData.append('eDate', eDate);
            formData.append('desc', desc);

            uploadedImages.forEach((image) => {
                formData.append('images', image);
            });

            const response = await fetch('http://localhost:5000/api/products/createproduct', {
                method: 'POST',
                headers: {
                    'auth-token': localStorage.getItem('token')
                },
                body: formData
            });
            if (!response.ok) {
                const errorText = await response.text();
                props.showAlert(`Product creation failed (Status ${response.status}). ${errorText}`, "danger");
                return;
            }
            const json = await response.json();
            if (json.success) {
                setProductDetails({
                    name: '',
                    category: '',
                    price: '',
                    totalProducts: '',
                    warehouse: '',
                    brand: '',
                    mDate: '',
                    eDate: '',
                    desc: '',
                });
                setUploadedImages([]);
                props.showAlert("Product Created Successfully", "success");
            } else {
                props.showAlert(json.message || json.errors?.[0]?.msg || "Invalid Credentials or server error.", "danger");
            }
        } catch (error) {
            props.showAlert("An unexpected network error occurred: " + error.message, "danger");
        } finally {
            setIsSubmitting(false);
        }
    };
    const onChange = (e) => {
        e.preventDefault()
        const { name, value } = e.target;
        setProductDetails({ ...productDetails, [name]: value });

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const handleImageUpload = (files) => {
        if (!files || files.length === 0) return;

        const newImages = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (newImages.length + uploadedImages.length > 10) {
            alert('Maximum 10 images allowed.');
            return;
        }

        setUploadedImages([...uploadedImages, ...newImages]);
    };

    const handleImageSelect = (e) => {
        handleImageUpload(e.target.files);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('drag-over');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('drag-over');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over');
        handleImageUpload(e.dataTransfer.files);
    };

    const removeImage = (index) => {
        setUploadedImages(uploadedImages.filter((_, i) => i !== index));
    };

    // Helper function to check if there are real validation errors
    const hasErrors = () => {
        return Object.values(errors).some(error => error && error.trim() !== '');
    };

    // Helper functions to get names from IDs
    const getCategoryName = (categoryId) => {
        const category = categories.find(cat => cat._id === categoryId);
        return category ? category.cName : categoryId;
    };

    const getWarehouseName = (warehouseId) => {
        const warehouse = warehouses.find(w => w._id === warehouseId);
        return warehouse ? warehouse.wName : warehouseId;
    };
    return (
        <>
            <div className="container-fluid" style={{ background: '#fff', padding: '3rem' }}>
                {/* Header */}
                <div style={{ marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#333', marginBottom: '0.5rem' }}>Add Product</h1>
                    <p style={{ color: '#666', fontSize: '1rem' }}>Create a new product in your inventory</p>
                </div>

                {/* Error Summary */}
                {Object.keys(errors).length > 0 && Object.values(touched).some(v => v) && (
                    <div className="validation-summary" style={{ marginBottom: '2rem' }}>
                        <div className="validation-summary-title">
                            <i className="bi bi-exclamation-circle me-2"></i>Please fix the following errors:
                        </div>
                        <ul className="validation-summary-list">
                            {errors.name && <li>{errors.name}</li>}
                            {errors.category && <li>{errors.category}</li>}
                            {errors.price && <li>{errors.price}</li>}
                            {errors.totalProducts && <li>{errors.totalProducts}</li>}
                            {errors.warehouse && <li>{errors.warehouse}</li>}
                            {errors.brand && <li>{errors.brand}</li>}
                            {errors.mDate && <li>{errors.mDate}</li>}
                            {errors.eDate && <li>{errors.eDate}</li>}
                            {errors.desc && <li>{errors.desc}</li>}
                            {errors.images && <li>{errors.images}</li>}
                        </ul>
                    </div>
                )}

                {/* Form Container */}
                <div style={{ background: '#fafafa', borderRadius: '16px', padding: '2.5rem', border: '1px solid #f0f0f0' }}>
                    <form onSubmit={handleSubmit}>
                        {/* Row 1: Basic Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                            {/* Product Name */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Product Name <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Enter product name"
                                    value={productDetails.name}
                                    onChange={onChange}
                                    onBlur={() => handleBlur('name')}
                                    disabled={isSubmitting}
                                    className={`form-control ${errors.name && touched.name ? 'is-invalid' : ''} ${!errors.name && touched.name && productDetails.name ? 'is-valid' : ''}`}
                                    style={{ minHeight: '44px', fontSize: '1rem' }}
                                />
                                {errors.name && touched.name && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.name}</div>}
                            </div>

                            {/* Price */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Price <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <div className="input-group gap-0">
                                    <span className="input-group-text rounded-start-3 ms-1">₹</span>
                                    <input
                                        type="number"
                                        name="price"
                                        placeholder="0.00"
                                        value={productDetails.price}
                                        onChange={onChange}
                                        onBlur={() => handleBlur('price')}
                                        disabled={isSubmitting}
                                        className={`form-control ${errors.price && touched.price ? 'is-invalid' : ''} ${!errors.price && touched.price && productDetails.price ? 'is-valid' : ''}`}
                                        style={{ minHeight: '44px', fontSize: '1rem' }}
                                    />
                                </div>
                                {errors.price && touched.price && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.price}</div>}
                            </div>

                            {/* Brand */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Brand <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    name="brand"
                                    placeholder="Enter brand name"
                                    value={productDetails.brand}
                                    onChange={onChange}
                                    onBlur={() => handleBlur('brand')}
                                    disabled={isSubmitting}
                                    className={`form-control ${errors.brand && touched.brand ? 'is-invalid' : ''} ${!errors.brand && touched.brand && productDetails.brand ? 'is-valid' : ''}`}
                                    style={{ minHeight: '44px', fontSize: '1rem' }}
                                />
                                {errors.brand && touched.brand && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.brand}</div>}
                            </div>
                        </div>

                        {/* Row 2: Category & Warehouse */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                            {/* Category */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Category <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                                    <select
                                        name="category"
                                        value={productDetails.category}
                                        onChange={onChange}
                                        onBlur={() => handleBlur('category')}
                                        disabled={loadingCategories || isSubmitting}
                                        className={`form-select ${errors.category && touched.category ? 'is-invalid' : ''} ${!errors.category && touched.category && productDetails.category ? 'is-valid' : ''}`}
                                        style={{ minHeight: '44px', fontSize: '1rem', flex: 1 }}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map((category) => (
                                            <option key={category._id} value={category._id}>{category.cName}</option>
                                        ))}
                                    </select>
                                    <a href="/dashboard/category" className="btn btn-sm" style={{ background: '#af50ff', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', textDecoration: 'none', fontSize: '1.2rem', lineHeight: '1', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Add new category">+</a>
                                </div>
                                {errors.category && touched.category && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.category}</div>}
                            </div>

                            {/* Warehouse */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Warehouse <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                                    <select
                                        name="warehouse"
                                        value={productDetails.warehouse}
                                        onChange={onChange}
                                        onBlur={() => handleBlur('warehouse')}
                                        disabled={loadingWarehouses || isSubmitting}
                                        className={`form-select ${errors.warehouse && touched.warehouse ? 'is-invalid' : ''} ${!errors.warehouse && touched.warehouse && productDetails.warehouse ? 'is-valid' : ''}`}
                                        style={{ minHeight: '44px', fontSize: '1rem', flex: 1 }}
                                    >
                                        <option value="">Select Warehouse</option>
                                        {warehouses.map((warehouse) => (
                                            <option key={warehouse._id} value={warehouse._id}>{warehouse.wName}</option>
                                        ))}
                                    </select>
                                    <a href="/dashboard/warehouses" className="btn btn-sm" style={{ background: '#af50ff', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', textDecoration: 'none', fontSize: '1.2rem', lineHeight: '1', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Add new warehouse">+</a>
                                </div>
                                {errors.warehouse && touched.warehouse && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.warehouse}</div>}
                            </div>

                            {/* Total Products */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Total Quantity <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="number"
                                    name="totalProducts"
                                    placeholder="0"
                                    value={productDetails.totalProducts}
                                    onChange={onChange}
                                    onBlur={() => handleBlur('totalProducts')}
                                    disabled={isSubmitting}
                                    className={`form-control ${errors.totalProducts && touched.totalProducts ? 'is-invalid' : ''} ${!errors.totalProducts && touched.totalProducts && productDetails.totalProducts ? 'is-valid' : ''}`}
                                    style={{ minHeight: '44px', fontSize: '1rem' }}
                                />
                                {errors.totalProducts && touched.totalProducts && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.totalProducts}</div>}
                            </div>
                        </div>

                        {/* Row 3: Dates */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                            {/* Manufacturing Date */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Manufacturing Date <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="date"
                                    name="mDate"
                                    value={productDetails.mDate}
                                    onChange={onChange}
                                    onBlur={() => handleBlur('mDate')}
                                    disabled={isSubmitting}
                                    className={`form-control ${errors.mDate && touched.mDate ? 'is-invalid' : ''} ${!errors.mDate && touched.mDate && productDetails.mDate ? 'is-valid' : ''}`}
                                    style={{ minHeight: '44px', fontSize: '1rem' }}
                                />
                                {errors.mDate && touched.mDate && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.mDate}</div>}
                            </div>

                            {/* Expiring Date */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Expiring Date <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="date"
                                    name="eDate"
                                    value={productDetails.eDate}
                                    onChange={onChange}
                                    onBlur={() => handleBlur('eDate')}
                                    disabled={isSubmitting}
                                    className={`form-control ${errors.eDate && touched.eDate ? 'is-invalid' : ''} ${!errors.eDate && touched.eDate && productDetails.eDate ? 'is-valid' : ''}`}
                                    style={{ minHeight: '44px', fontSize: '1rem' }}
                                />
                                {errors.eDate && touched.eDate && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.eDate}</div>}
                            </div>
                        </div>

                        {/* Row 4: Description */}
                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                Description <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <textarea
                                name="desc"
                                placeholder="Enter product description"
                                rows="5"
                                value={productDetails.desc}
                                onChange={onChange}
                                onBlur={() => handleBlur('desc')}
                                disabled={isSubmitting}
                                className={`form-control ${errors.desc && touched.desc ? 'is-invalid' : ''} ${!errors.desc && touched.desc && productDetails.desc ? 'is-valid' : ''}`}
                                style={{ minHeight: '120px', fontSize: '1rem', fontFamily: 'inherit' }}
                            ></textarea>
                            {errors.desc && touched.desc && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.desc}</div>}
                            {productDetails.desc && <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>{productDetails.desc.length} characters</div>}
                        </div>

                        {/* Row 5: Image Upload */}
                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                Product Images <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('productImages').click()}
                                style={{
                                    border: `2px dashed ${errors.images && uploadedImages.length === 0 ? '#ef4444' : '#d1d5db'}`,
                                    borderRadius: '8px',
                                    padding: '2rem',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    background: errors.images && uploadedImages.length === 0 ? '#fee2e2' : '#f9fafb',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {uploadedImages.length === 0 ? (
                                    <div>
                                        <i className="bi bi-cloud-arrow-up" style={{ fontSize: '3rem', color: '#9ca3af', marginBottom: '1rem', display: 'block' }}></i>
                                        <p style={{ fontSize: '1.1rem', fontWeight: '500', color: '#333', marginBottom: '0.5rem' }}>Drag and drop images here or click to select</p>
                                        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: 0 }}>Supported formats: JPG, PNG, GIF. Max 10 images.</p>
                                    </div>
                                ) : (
                                    <div>
                                        <p style={{ fontSize: '1rem', fontWeight: '500', color: '#333', marginBottom: '1.5rem' }}>📸 {uploadedImages.length} image(s) selected</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
                                            {uploadedImages.map((image, index) => (
                                                <div key={index} style={{ position: 'relative' }}>
                                                    <img
                                                        src={URL.createObjectURL(image)}
                                                        alt={`Preview ${index + 1}`}
                                                        style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #e5e7eb' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '-8px',
                                                            right: '-8px',
                                                            background: '#ef4444',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '50%',
                                                            width: '28px',
                                                            height: '28px',
                                                            cursor: 'pointer',
                                                            fontSize: '1.2rem',
                                                            lineHeight: '1',
                                                            padding: '0'
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <input type="file" className="d-none" id="productImages" multiple accept="image/*" onChange={handleImageSelect} />
                            </div>
                            {errors.images && uploadedImages.length === 0 && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.images}</div>}
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                            <button
                                type="submit"
                                disabled={isSubmitting || hasErrors()}
                                style={{
                                    background: isSubmitting || hasErrors() ? '#d1d5db' : '#af50ff',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.75rem 1.75rem',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: isSubmitting || hasErrors() ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {isSubmitting ? 'Adding Product...' : 'Add Product'}
                            </button>
                            <a
                                href="/dashboard/products"
                                style={{
                                    background: '#e5e7eb',
                                    color: '#333',
                                    border: 'none',
                                    padding: '0.75rem 1.75rem',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    textDecoration: 'none',
                                    display: 'inline-block',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                Cancel
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}

export default AddProduct

