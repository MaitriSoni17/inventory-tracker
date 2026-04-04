import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import validationRules from '../../../utils/validationHelper';

const WarehouseDetails = (props) => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [warehouse, setWarehouse] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [warehouseRes, productsRes] = await Promise.all([
                    fetch('/api/warehouse/getwarehouse', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'auth-token': localStorage.getItem('token')
                        }
                    }),
                    fetch('/api/products/getproduct', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'auth-token': localStorage.getItem('token')
                        }
                    })
                ]);

                if (!warehouseRes.ok) {
                    props.showAlert('Failed to fetch warehouse details', 'danger');
                    return;
                }

                if (!productsRes.ok) {
                    props.showAlert('Failed to fetch products', 'danger');
                    return;
                }

                const [warehouseList, productsList] = await Promise.all([
                    warehouseRes.json(),
                    productsRes.json()
                ]);

                const selectedWarehouse = warehouseList.find((w) => w._id === id);
                if (!selectedWarehouse) {
                    props.showAlert('Warehouse not found', 'danger');
                    navigate('/dashboard/warehouses');
                    return;
                }

                const warehouseProducts = productsList.filter((p) => {
                    if (Array.isArray(p.warehouse)) {
                        return p.warehouse.includes(id);
                    }
                    return p.warehouse === id;
                });

                setWarehouse(selectedWarehouse);
                setProducts(warehouseProducts);
            } catch (error) {
                props.showAlert('Error loading warehouse details', 'danger');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, navigate, props]);

    const groupedProducts = useMemo(() => {
        const grouped = {};
        products.forEach((product) => {
            const category = product.categoryName || product.category || 'Uncategorized';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(product);
        });
        return grouped;
    }, [products]);

    const contactError = useMemo(() => {
        if (!warehouse?.wContact) return '';
        return validationRules.phone(warehouse.wContact);
    }, [warehouse]);

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

    if (!warehouse) {
        return null;
    }

    return (
        <div className="container-fluid p-4 bg-light" style={{ minHeight: '100vh' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1">{warehouse.wName}</h2>
                    <p className="text-muted mb-0">Warehouse Details</p>
                </div>
                <button className="btn btn-outline-secondary" onClick={() => navigate('/dashboard/warehouses')}>
                    Back to Warehouses
                </button>
            </div>

            <div className="card border-0 shadow-sm rounded-4 mb-4">
                <div className="card-body p-4">
                    <h5 className="mb-3">Full Details</h5>
                    <div className="row g-3">
                        <div className="col-md-6"><strong>Warehouse Name:</strong> {warehouse.wName || 'N/A'}</div>
                        <div className="col-md-6"><strong>Manager:</strong> {warehouse.wManager || 'N/A'}</div>
                        <div className="col-md-6"><strong>Email:</strong> {warehouse.wEmail || 'N/A'}</div>
                        <div className="col-md-6">
                            <strong>Contact:</strong> {warehouse.wContact || 'N/A'}
                            {contactError && (
                                <div className="text-danger small mt-1">Invalid contact number format</div>
                            )}
                        </div>
                        <div className="col-md-6"><strong>Address:</strong> {warehouse.wAddress || 'N/A'}</div>
                        <div className="col-md-6"><strong>City:</strong> {warehouse.city || 'N/A'}</div>
                        <div className="col-md-6"><strong>State:</strong> {warehouse.state || 'N/A'}</div>
                        <div className="col-md-6"><strong>Country:</strong> {warehouse.country || 'N/A'}</div>
                        <div className="col-md-6"><strong>Total Products:</strong> {products.length}</div>
                        <div className="col-md-6"><strong>Total Employees:</strong> {warehouse.totalEmployeesCount || 0}</div>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-4">
                    <h5 className="mb-3">Products (Category-wise)</h5>
                    {products.length === 0 ? (
                        <div className="alert alert-info mb-0">No products are assigned to this warehouse yet.</div>
                    ) : (
                        Object.keys(groupedProducts).sort().map((category) => (
                            <div key={category} className="mb-4">
                                <h6 className="mb-3 text-primary">{category} ({groupedProducts[category].length})</h6>
                                <div className="list-group">
                                    {groupedProducts[category].map((product) => (
                                        <button
                                            key={product._id}
                                            type="button"
                                            className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                                            onClick={() => navigate(`/dashboard/product/${product._id}`)}
                                        >
                                            <span>{product.name}</span>
                                            <small className="text-muted">View Product</small>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default WarehouseDetails;
