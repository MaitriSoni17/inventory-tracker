import React, { useState, useEffect } from 'react'

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
        if ( !name || !category || !price || !totalProducts || !warehouse || !brand || !mDate || !eDate || !desc ) {
            props.showAlert('Please fill in all required fields.', "danger");
            return;
        }
        if (uploadedImages.length === 0) {
            props.showAlert('Please upload at least one product image.', "danger");
            return;
        }
        try {
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

            console.log('Sending product data with', uploadedImages.length, 'images');
            uploadedImages.forEach((img, idx) => {
                console.log(`Image ${idx + 1}:`, img.name);
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
                console.error(`API Error: Status ${response.status}`, errorText);
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
            console.error("Network or Parsing Error:", error);
            props.showAlert("An unexpected network error occurred: " + error.message, "danger");
        }
    }
    const onChange = (e) => {
        e.preventDefault()
        setProductDetails({ ...productDetails, [e.target.name]: e.target.value });
    }

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
    return (
        <>
            <div className="container-fluid p-5">
                <div className="row mb-4">
                    <div className="col-12">
                        <h1 className="display-5 fw-normal">Add Product</h1>
                    </div>
                </div>

                <form className="needs-validation" onSubmit={handleSubmit}>
                    <div className="row">
                        <div className="col-md-3 mt-2">
                            <label htmlFor="productName" className="form-label fw-semibold">Product Name</label>
                            <input type="text" className="form-control mt-3" id="productName" name="name" placeholder="" value={productDetails.name} onChange={onChange} />
                            <div className="invalid-feedback">
                                Product name is required.
                            </div>
                            <div className="col mt-4">
                                <label htmlFor="productPrice" className="form-label fw-semibold">Product Price</label>
                                <input type="number" className="form-control mt-3" id="productPrice" name="price" placeholder="" value={productDetails.price} onChange={onChange}
                                />
                                <div className="invalid-feedback">
                                    Product price is required.
                                </div>
                            </div>
                            <div className="col mt-4">
                                <label htmlFor="warehouse" className="form-label fw-semibold">Warehouse</label>
                                <div className="d-flex gap-2 align-items-end">
                                    <div style={{ flex: 1 }}>
                                        <select className="form-select mt-2" id="warehouse" name="warehouse" value={productDetails.warehouse} onChange={onChange} disabled={loadingWarehouses}>
                                            <option value="" disabled>{loadingWarehouses ? 'Loading warehouses...' : 'Select Warehouse'}</option>
                                            {warehouses.map((warehouse) => (
                                                <option key={warehouse._id} value={warehouse._id}>{warehouse.wName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <a href="/dashboard/warehouses" className="btn btn-sm btn-custom-purple text-decoration-none" title="Add new warehouse">+</a>
                                </div>
                                <div className="invalid-feedback">
                                    Please select a warehouse.
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="productCategory" className="form-label fw-semibold">Product Category</label>
                            <div className="d-flex gap-2 align-items-end">
                                <div style={{ flex: 1 }}>
                                    <select className="form-select mt-3" id="productCategory" name="category" value={productDetails.category} onChange={onChange} disabled={loadingCategories}>
                                        <option value="" disabled>{loadingCategories ? 'Loading categories...' : 'Select Category'}</option>
                                        {categories.map((category) => (
                                            <option key={category._id} value={category._id}>{category.cName}</option>
                                        ))}
                                    </select>
                                </div>
                                <a href="/dashboard/category" className="btn btn-sm btn-custom-purple text-decoration-none" title="Add new category">+</a>
                            </div>
                            <div className="invalid-feedback">
                                Please select a category.
                            </div>

                            <div className="col mt-4">
                                <label htmlFor="totalProducts" className="form-label fw-semibold">Total Products</label>
                                <input type="number" className="form-control mt-3" id="totalProducts" name="totalProducts" placeholder="" value={productDetails.totalProducts} onChange={onChange} />
                                <div className="invalid-feedback">
                                    Total products count is required.
                                </div>
                            </div>
                            <div className="col mt-4">
                                <label htmlFor="brand" className="form-label fw-semibold">Brand</label>
                                <input type="text" className="form-control mt-3" id="brand" name="brand" placeholder="" value={productDetails.brand} onChange={onChange} />
                                <div className="invalid-feedback">
                                    Brand name is required.
                                </div>
                            </div>

                        </div>

                        <div className="col-md-4 ms-5">
                            <label htmlFor="productImages" className="form-label fw-semibold">Add Multiple Images</label>
                            <div
                                className="image-upload-area text-center d-flex flex-column justify-content-center align-items-center shadow p-3 rounded-4 mt-3"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('productImages').click()}
                                style={{ cursor: 'pointer', border: '2px dashed #ccc', minHeight: '200px', overflow: 'auto' }}>
                                {uploadedImages.length === 0 ? (
                                    <>
                                        <i className="bi bi-images fs-1 text-secondary p-5 border border-3 rounded-4 w-100"><br /><span
                                            className="fs-5">Drop or Select Multiple Images</span></i>
                                        <p className="text-muted mb-0"></p>
                                    </>
                                ) : (
                                    <div className="w-100">
                                        <p className="text-muted mb-2">{uploadedImages.length} image(s) selected</p>
                                        <div className="d-flex flex-wrap gap-2 justify-content-center w-100">
                                            {uploadedImages.map((image, index) => (
                                                <div key={index} className="position-relative">
                                                    <img
                                                        src={URL.createObjectURL(image)}
                                                        alt={`Preview ${index + 1}`}
                                                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-danger position-absolute top-0 end-0"
                                                        onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                                                        style={{ padding: '2px 6px', fontSize: '12px' }}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <input type="file" className="form-control-file d-none" id="productImages" multiple
                                    accept="image/*" onChange={handleImageSelect} />
                            </div>
                        </div>

                        <div className="col-md-5 mt-4">
                            <label htmlFor="manufacturingDate" className="form-label fw-semibold">Manufacturing Date</label>
                            <div className="input-group mt-3">
                                <input type="date" className="form-control" id="manufacturingDate" name="mDate" placeholder="DD/MM/YYYY"
                                    value={productDetails.mDate} onChange={onChange} />
                            </div>
                            <div className="invalid-feedback">
                                Manufacturing date is required.
                            </div>
                        </div>

                        <div className="col-md-5 mt-4">
                            <label htmlFor="expiringDate" className="form-label fw-semibold">Expiring Date</label>
                            <div className="input-group mt-3">
                                <input type="date" className="form-control" id="expiringDate" name="eDate" placeholder="DD/MM/YYYY"
                                    value={productDetails.eDate} onChange={onChange} />
                            </div>
                            <div className="invalid-feedback">
                                Expiring date is required.
                            </div>
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-md-12">
                            <label htmlFor="description" className="form-label fw-semibold">Description</label>
                            <textarea className="form-control mt-3" id="description" name="desc" rows="5" value={productDetails.desc} onChange={onChange}></textarea>
                            <div className="invalid-feedback">
                                Product description is required.
                            </div>
                        </div>
                    </div>

                    <div className="row mt-4 mb-5 pb-5">
                        <div className="col-12 d-flex justify-content-start">
                            <input type="submit" className="btn btn-custom-purple text-decoration-none btn-lg me-3 shadow-sm" value="Add Product" />
                            <a href="/dashboard/products" className="btn btn-secondary btn-lg shadow-sm text-decoration-none">Cancel</a>
                        </div>
                    </div>
                </form>
            </div>
        </>
    )
}

export default AddProduct