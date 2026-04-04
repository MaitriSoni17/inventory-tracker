import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const ProductDetails = (props) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await fetch('/api/products/getproduct', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    }
                });

                if (!response.ok) {
                    props.showAlert('Failed to fetch product details', 'danger');
                    return;
                }

                const products = await response.json();
                const selectedProduct = products.find((p) => p._id === id);

                if (!selectedProduct) {
                    props.showAlert('Product not found', 'danger');
                    navigate('/dashboard/products');
                    return;
                }

                setProduct(selectedProduct);
            } catch (error) {
                props.showAlert('Error loading product details', 'danger');
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id, navigate, props]);

    if (loading) {
        return (
            <div className="container-fluid p-4">
                <div className="text-center p-5">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!product) {
        return null;
    }

    return (
        <div className="container-fluid p-4 bg-light" style={{ minHeight: '100vh' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1">{product.name}</h2>
                    <p className="text-muted mb-0">Product Details</p>
                </div>
                <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
                    Back
                </button>
            </div>

            <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-4">
                    <div className="row g-3">
                        <div className="col-md-6"><strong>Name:</strong> {product.name || 'N/A'}</div>
                        <div className="col-md-6"><strong>Category:</strong> {product.categoryName || product.category || 'N/A'}</div>
                        <div className="col-md-6"><strong>Brand:</strong> {product.brand || 'N/A'}</div>
                        <div className="col-md-6"><strong>Price:</strong> {product.price ?? 'N/A'}</div>
                        <div className="col-md-6"><strong>Total Stock:</strong> {product.totalProducts ?? 0}</div>
                        <div className="col-md-6"><strong>Warehouses:</strong> {(product.warehouseNames && product.warehouseNames.filter(Boolean).join(', ')) || 'N/A'}</div>
                        <div className="col-md-6"><strong>Manufacturing Date:</strong> {product.mDate ? new Date(product.mDate).toLocaleDateString('en-IN') : 'N/A'}</div>
                        <div className="col-md-6"><strong>Expiry Date:</strong> {product.eDate ? new Date(product.eDate).toLocaleDateString('en-IN') : 'N/A'}</div>
                        <div className="col-12"><strong>Description:</strong> {product.desc || 'N/A'}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;
