import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const EditProduct = (props) => {
    const { id } = useParams();
    const navigate = useNavigate();
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
        image: ''
    });
    const [existingImages, setExistingImages] = useState([]);
    const [removedImages, setRemovedImages] = useState([]);
    const [newUploadedImages, setNewUploadedImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [warehouses, setWarehouses] = useState([]);
    const [loadingWarehouses, setLoadingWarehouses] = useState(true);
    const [categories, setCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(true);

    useEffect(() => {
        // Fetch the product details
        const fetchProduct = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/products/getproduct`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    }
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`API Error: Status ${response.status}`, errorText);
                    props.showAlert(`Failed to fetch products (Status ${response.status})`, "danger");
                    setLoading(false);
                    return;
                }
                const products = await response.json();
                const product = products.find(p => p._id === id);
                
                if (!product) {
                    props.showAlert("Product not found", "danger");
                    navigate('/dashboard/products');
                    return;
                }

                // Format dates to input format (YYYY-MM-DD)
                const formatDate = (dateString) => {
                    if (!dateString) return '';
                    const date = new Date(dateString);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };

                setProductDetails({
                    name: product.name || '',
                    category: product.category || '',
                    price: product.price || '',
                    totalProducts: product.totalProducts || '',
                    warehouse: product.warehouse?.[0] || '',
                    brand: product.brand || '',
                    mDate: formatDate(product.mDate),
                    eDate: formatDate(product.eDate),
                    desc: product.desc || '',
                    image: product.image || ''
                });
                
                // Store all existing images
                setExistingImages(product.images || []);
                setLoading(false);
            } catch (error) {
                console.error("Network or Parsing Error:", error);
                props.showAlert("Failed to fetch product", "danger");
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id, navigate, props]);

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
                    console.error('Failed to fetch warehouses');
                    setLoadingWarehouses(false);
                    return;
                }
                const warehouseList = await response.json();
                setWarehouses(warehouseList);
            } catch (error) {
                console.error('Error fetching warehouses:', error);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { name, category, price, totalProducts, warehouse, brand, mDate, eDate, desc } = productDetails;
        
        // Add form validation here
        if (!name || !category || !price || !totalProducts || !warehouse || !brand || !mDate || !eDate || !desc) {
            props.showAlert('Please fill in all required fields.', "danger");
            return;
        }

        setSubmitting(true);
        try {
            let updatedImages = [...existingImages];
            
            // Remove images that were deleted
            removedImages.forEach(img => {
                updatedImages = updatedImages.filter(existImg => existImg !== img);
            });

            const updateData = {
                name,
                category,
                price: parseFloat(price),
                totalProducts: parseInt(totalProducts),
                warehouse: [warehouse],
                brand,
                mDate,
                eDate,
                desc,
                image: productDetails.image,
                images: updatedImages,
                removedImages: removedImages
            };

            // If new images were uploaded, send them as FormData
            if (newUploadedImages.length > 0) {
                const formData = new FormData();
                Object.keys(updateData).forEach(key => {
                    if (key === 'images') {
                        updateData.images.forEach(img => {
                            formData.append('existingImages[]', img);
                        });
                    } else if (key === 'removedImages') {
                        updateData.removedImages.forEach(img => {
                            formData.append('removedImages[]', img);
                        });
                    } else if (key === 'warehouse') {
                        formData.append(key, JSON.stringify(updateData[key]));
                    } else {
                        formData.append(key, updateData[key]);
                    }
                });

                newUploadedImages.forEach((image) => {
                    formData.append('images', image);
                });

                const response = await fetch(`http://localhost:5000/api/products/updateproduct/${id}`, {
                    method: 'PUT',
                    headers: {
                        'auth-token': localStorage.getItem('token')
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`API Error: Status ${response.status}`, errorText);
                    props.showAlert(`Product update failed (Status ${response.status})`, "danger");
                    setSubmitting(false);
                    return;
                }
            } else {
                const response = await fetch(`http://localhost:5000/api/products/updateproduct/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    },
                    body: JSON.stringify(updateData)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`API Error: Status ${response.status}`, errorText);
                    props.showAlert(`Product update failed (Status ${response.status})`, "danger");
                    setSubmitting(false);
                    return;
                }
            }

            props.showAlert("Product Updated Successfully", "success");
            navigate('/dashboard/products');
        } catch (error) {
            console.error("Network or Parsing Error:", error);
            props.showAlert("An unexpected network error occurred: " + error.message, "danger");
        } finally {
            setSubmitting(false);
        }
    };

    const onChange = (e) => {
        e.preventDefault();
        setProductDetails({ ...productDetails, [e.target.name]: e.target.value });
    };

    const handleImageUpload = (files) => {
        if (!files || files.length === 0) return;

        const newImages = Array.from(files).filter(file => file.type.startsWith('image/'));
        const totalImages = existingImages.length - removedImages.length + newUploadedImages.length + newImages.length;
        
        if (totalImages > 10) {
            props.showAlert('Maximum 10 images allowed.', "warning");
            return;
        }

        setNewUploadedImages([...newUploadedImages, ...newImages]);
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

    const removeNewImage = (index) => {
        setNewUploadedImages(newUploadedImages.filter((_, i) => i !== index));
    };

    const removeExistingImage = (imageName) => {
        setRemovedImages([...removedImages, imageName]);
    };

    const restoreImage = (imageName) => {
        setRemovedImages(removedImages.filter(img => img !== imageName));
    };

    if (loading) {
        return (
            <div className="container-fluid p-4">
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="container-fluid p-5">
                {/* Header Section */}
                <div className="row mb-4">
                    <div className="col-12 ms-5">
                        <div className="d-flex align-items-center">
                            <h1 className="mb-0 display-3">
                                Edit Product
                            </h1>
                        </div>
                    </div>
                </div>

                <form className="needs-validation" onSubmit={handleSubmit}>
                    {/* Product Details Section */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-5">
                            <h5 className="card-title display-6 mb-4">
                                Product Information
                            </h5>

                            <div className="row g-4">
                                {/* Product Name */}
                                <div className="col-md-5 me-5">
                                    <label htmlFor="productName" className="form-label fw-semibold">Product Name</label>
                                    <input 
                                        type="text" 
                                        className="form-control rounded-3 shadow-sm" 
                                        id="productName" 
                                        name="name" 
                                        value={productDetails.name} 
                                        onChange={onChange}
                                        placeholder="Enter product name"
                                    />
                                </div>

                                {/* Product Price */}
                                <div className="col-md-5 me-5">
                                    <label htmlFor="productPrice" className="form-label fw-semibold mb-2">Product Price</label>
                                    <div className="input-group gap-0">
                                        <span className="input-group-text shadow-sm border-1 rounded-start-3 border-end-0">₹</span>
                                        <input 
                                            type="number" 
                                            className="form-control rounded-end-3 shadow-sm border-start-0" 
                                            id="productPrice" 
                                            name="price" 
                                            value={productDetails.price} 
                                            onChange={onChange}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* Product Category */}
                                <div className="col-md-5 me-5">
                                    <label htmlFor="productCategory" className="form-label fw-semibold">Product Category</label>
                                    <div className="d-flex gap-2 align-items-end">
                                        <div style={{ flex: 1 }}>
                                            <select 
                                                className="form-select rounded-3 shadow-sm" 
                                                id="productCategory" 
                                                name="category" 
                                                value={productDetails.category} 
                                                onChange={onChange}
                                                disabled={loadingCategories}
                                            >
                                                <option value="" disabled>{loadingCategories ? 'Loading categories...' : 'Select Category'}</option>
                                                {categories.map((category) => (
                                                    <option key={category._id} value={category._id}>{category.cName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <a href="/dashboard/category" className="btn btn-sm btn-custom-purple text-decoration-none" title="Add new category">+</a>
                                    </div>
                                </div>

                                {/* Total Products */}
                                <div className="col-md-5 me-5">
                                    <label htmlFor="totalProducts" className="form-label fw-semibold">Total Products</label>
                                    <input 
                                        type="number" 
                                        className="form-control rounded-3 shadow-sm" 
                                        id="totalProducts" 
                                        name="totalProducts" 
                                        value={productDetails.totalProducts} 
                                        onChange={onChange}
                                        placeholder="0"
                                    />
                                </div>

                                {/* Warehouse */}
                                <div className="col-md-5 me-5">
                                    <label htmlFor="warehouse" className="form-label fw-semibold">Warehouse</label>
                                    <div className="d-flex gap-2 align-items-end">
                                        <div style={{ flex: 1 }}>
                                            <select 
                                                className="form-select rounded-3 shadow-sm" 
                                                id="warehouse" 
                                                name="warehouse" 
                                                value={productDetails.warehouse} 
                                                onChange={onChange}
                                                disabled={loadingWarehouses}
                                            >
                                                <option value="" disabled>{loadingWarehouses ? 'Loading warehouses...' : 'Select Warehouse'}</option>
                                                {warehouses.map((warehouse) => (
                                                    <option key={warehouse._id} value={warehouse._id}>{warehouse.wName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <a href="/dashboard/warehouses" className="btn btn-sm btn-custom-purple text-decoration-none" title="Add new warehouse">+</a>
                                    </div>
                                </div>

                                {/* Brand */}
                                <div className="col-md-5 me-5">
                                    <label htmlFor="brand" className="form-label fw-semibold">Brand</label>
                                    <input 
                                        type="text" 
                                        className="form-control rounded-3 shadow-sm" 
                                        id="brand" 
                                        name="brand" 
                                        value={productDetails.brand} 
                                        onChange={onChange}
                                        placeholder="Enter brand name"
                                    />
                                </div>

                                {/* Manufacturing Date */}
                                <div className="col-md-5 me-5">
                                    <label htmlFor="manufacturingDate" className="form-label fw-semibold">Manufacturing Date</label>
                                    <input 
                                        type="date" 
                                        className="form-control rounded-3 shadow-sm" 
                                        id="manufacturingDate" 
                                        name="mDate" 
                                        value={productDetails.mDate} 
                                        onChange={onChange}
                                    />
                                </div>

                                {/* Expiring Date */}
                                <div className="col-md-5 me-5">
                                    <label htmlFor="expiringDate" className="form-label fw-semibold">Expiring Date</label>
                                    <input 
                                        type="date" 
                                        className="form-control rounded-3 shadow-sm" 
                                        id="expiringDate" 
                                        name="eDate" 
                                        value={productDetails.eDate} 
                                        onChange={onChange}
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="row g-4 mt-2">
                                <div className="col-md-12">
                                    <label htmlFor="description" className="form-label fw-semibold">Description</label>
                                    <textarea 
                                        className="form-control rounded-3 shadow-sm" 
                                        id="description" 
                                        name="desc" 
                                        rows="4" 
                                        value={productDetails.desc} 
                                        onChange={onChange}
                                        placeholder="Enter product description"
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Images Section */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-4">
                            <h5 className="card-title display-6 mb-4">
                                Product Images
                            </h5>

                            {/* Existing Images */}
                            {existingImages.length > 0 && (
                                <div className="mb-5">
                                    <h6 className="fw-semibold mb-3 text-dark">Current Images ({existingImages.length - removedImages.length})</h6>
                                    <div className="row g-3">
                                        {existingImages.map((imageName, index) => {
                                            const isRemoved = removedImages.includes(imageName);
                                            return (
                                                <div key={index} className="col-md-3 col-sm-4 col-6">
                                                    <div className={`position-relative rounded-3 overflow-hidden shadow-sm ${isRemoved ? 'opacity-50' : ''}`} style={{ aspectRatio: '1/1' }}>
                                                        <img 
                                                            src={`http://localhost:5000/uploads/${imageName}`}
                                                            alt={`Product ${index + 1}`}
                                                            className="w-100 h-100 object-fit-cover"
                                                            onError={(e) => { e.target.src = '../imgs/product1.jpg'; }}
                                                        />
                                                        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-end p-2" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }}>
                                                            {!isRemoved ? (
                                                                <button 
                                                                    type="button"
                                                                    className="btn btn-sm btn-danger w-100 rounded-2"
                                                                    onClick={() => removeExistingImage(imageName)}
                                                                >
                                                                    <i className="bi bi-trash me-2"></i>Remove
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    type="button"
                                                                    className="btn btn-sm btn-success w-100 rounded-2"
                                                                    onClick={() => restoreImage(imageName)}
                                                                >
                                                                    <i className="bi bi-arrow-clockwise me-2"></i>Restore
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <hr className="my-4" />
                                </div>
                            )}

                            {/* Upload New Images */}
                            <div className="mb-3">
                                <h6 className="fw-semibold mb-3 text-dark">Add New Images</h6>
                                <div
                                    className="border-2 border-dashed rounded-4 p-5 text-center"
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => document.getElementById('productImages').click()}
                                    style={{ cursor: 'pointer', borderColor: '#ccc', transition: 'all 0.3s ease' }}>
                                    
                                    {newUploadedImages.length === 0 ? (
                                        <div>
                                            <i className="bi bi-cloud-upload text-muted" style={{ fontSize: '3rem' }}></i>
                                            <p className="text-muted mt-3 mb-1">Drag and drop your images here</p>
                                            <p className="text-muted small">or click to select files</p>
                                            <p className="text-secondary mt-3" style={{ fontSize: '0.85rem' }}>
                                                Supported formats: JPG, PNG, GIF
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="fw-semibold text-dark mb-3">{newUploadedImages.length} new image(s) selected</p>
                                            <div className="row g-3">
                                                {newUploadedImages.map((image, index) => (
                                                    <div key={index} className="col-md-3 col-sm-4 col-6">
                                                        <div className="position-relative rounded-3 overflow-hidden shadow-sm" style={{ aspectRatio: '1/1' }}>
                                                            <img
                                                                src={URL.createObjectURL(image)}
                                                                alt={`Preview ${index + 1}`}
                                                                className="w-100 h-100 object-fit-cover"
                                                            />
                                                            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-danger rounded-circle"
                                                                    onClick={(e) => { e.stopPropagation(); removeNewImage(index); }}
                                                                >
                                                                    <i className="bi bi-x"></i>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        className="d-none" 
                                        id="productImages" 
                                        multiple
                                        accept="image/*" 
                                        onChange={handleImageSelect} 
                                    />
                                </div>
                            </div>

                            {/* Image Count Info */}
                            <div className="alert alert-info rounded-3 mt-3 mb-0">
                                <i className="bi bi-info-circle me-2"></i>
                                <small>
                                    Total images: {existingImages.length - removedImages.length + newUploadedImages.length}/10
                                </small>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="row mt-4 ms-1 mb-5 pb-5">
                        <div className="col-12 d-flex gap-3 justify-content-start">
                            <button 
                                type="submit" 
                                disabled={submitting} 
                                className="btn btn-custom-purple btn-lg rounded-3 px-5 shadow-sm"
                            >
                                {submitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        Update Product
                                    </>
                                )}
                            </button>
                            <button 
                                type="button" 
                                onClick={() => navigate('/dashboard/products')} 
                                className="btn btn-outline-secondary btn-lg rounded-3 px-5 shadow-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    )
}

export default EditProduct
