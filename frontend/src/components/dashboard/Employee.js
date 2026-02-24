import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';
import {
    Chart as ChartJS,
    LineElement,
    BarElement,
    PointElement,
    LineController,
    BarController,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import '../../styles/dashboard-elegant.css';

ChartJS.register(
    LineElement,
    BarElement,
    PointElement,
    LineController,
    BarController,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    Filler
);
function Employee(props) {
    const navigate = useNavigate();
    const { userDetails, hasPermission, loading: roleLoading, permissions } = useRole();
    const salesRef = useRef(null);
    const stockRef = useRef(null);
    const salesChartInstance = useRef(null);
    const stockChartInstance = useRef(null);
    const chartTimerRef = useRef(null);

    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ordersView, setOrdersView] = useState('monthly');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showProductModal, setShowProductModal] = useState(false);
    const [employeeWarehouse, setEmployeeWarehouse] = useState(null);
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalOrders: 0,
        totalCategories: 0,
        totalEmployees: 0,
        totalWarehouses: 0,
        lowStockItems: 0
    });

    // Fetch all data on mount — wait for permissions to be loaded first
    useEffect(() => {
        // Don't fetch until role/permissions are fully loaded
        if (roleLoading) return;

        // Extract warehouse from user details
        if (userDetails && userDetails.warehouse) {
            // warehouse can be an object {_id, wName, wAddress} or string
            const warehouseName = typeof userDetails.warehouse === 'string' 
                ? userDetails.warehouse 
                : userDetails.warehouse.wName || userDetails.warehouse.name;
            setEmployeeWarehouse(warehouseName);
        }
        fetchAllData();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchAllData();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userDetails, roleLoading, permissions]);

    const fetchAllData = async () => {
        try {
            const headers = {
                'Content-Type': 'application/json',
                'auth-token': localStorage.getItem('token')
            };

            let ordersData = [];
            let productsData = [];
            let categoriesData = [];
            let employeesData = [];
            let warehousesData = [];

            // Only fetch orders if user has permission
            if (hasPermission('canViewOrders')) {
                const ordersRes = await fetch('http://localhost:5000/api/customerorders/getcustomerorder', {
                    method: 'POST',
                    headers
                });
                ordersData = ordersRes.ok ? await ordersRes.json() : [];
            }
            setOrders(ordersData);

            // Only fetch products if user has permission
            if (hasPermission('canViewProducts')) {
                const productsRes = await fetch('http://localhost:5000/api/products/getproduct', {
                    method: 'POST',
                    headers
                });
                productsData = productsRes.ok ? await productsRes.json() : [];
            }
            setProducts(productsData);

            // Only fetch categories if user has permission
            if (hasPermission('canViewCategories')) {
                const categoriesRes = await fetch('http://localhost:5000/api/category/getcategories', {
                    method: 'POST',
                    headers
                });
                categoriesData = categoriesRes.ok ? await categoriesRes.json() : [];
            }
            setCategories(categoriesData);

            // Only fetch employees if user has permission
            if (hasPermission('canViewEmployees')) {
                const employeesRes = await fetch('http://localhost:5000/api/employee/getallemployees', {
                    method: 'POST',
                    headers
                });
                employeesData = employeesRes.ok ? await employeesRes.json() : [];
            }
            setEmployees(employeesData);

            // Only fetch warehouses if user has permission
            if (hasPermission('canViewWarehouses')) {
                const warehousesRes = await fetch('http://localhost:5000/api/warehouse/getwarehouse', {
                    method: 'POST',
                    headers
                });
                warehousesData = warehousesRes.ok ? await warehousesRes.json() : [];
            }
            setWarehouses(warehousesData);

            // Calculate statistics
            const lowStockCount = productsData.filter(p => p.totalProducts <= 10).length;

            setStats({
                totalProducts: productsData.length,
                totalOrders: ordersData.length,
                totalCategories: categoriesData.length,
                totalEmployees: employeesData.length,
                totalWarehouses: warehousesData.length,
                lowStockItems: lowStockCount
            });

            // Check and trigger low stock alert notifications
            try {
                await fetch('http://localhost:5000/api/notifications/check-low-stock-alerts', {
                    method: 'POST',
                    headers
                });
            } catch (e) {}

            setLoading(false);
        } catch (error) {
            props.showAlert?.('Failed to load dashboard data', 'danger');
            setLoading(false);
        }
    };

    const aggregateMonthlyOrders = (orders) => {
        const monthlyData = {};
        const currentYear = new Date().getFullYear();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Initialize all months with 0
        monthNames.forEach(month => {
            monthlyData[month] = 0;
        });

        // Aggregate order counts by month
        orders.forEach(order => {
            if (order.oDate) {
                const orderDate = new Date(order.oDate);
                if (orderDate.getFullYear() === currentYear) {
                    const monthIndex = orderDate.getMonth();
                    const monthName = monthNames[monthIndex];
                    monthlyData[monthName] += 1;
                }
            }
        });

        return {
            labels: monthNames,
            data: monthNames.map(month => monthlyData[month])
        };
    };

    const aggregateQuarterlyOrders = (orders) => {
        const quarterlyData = { 'Q1': 0, 'Q2': 0, 'Q3': 0, 'Q4': 0 };
        const currentYear = new Date().getFullYear();

        // Aggregate order counts by quarter
        orders.forEach(order => {
            if (order.oDate) {
                const orderDate = new Date(order.oDate);
                if (orderDate.getFullYear() === currentYear) {
                    const monthIndex = orderDate.getMonth();
                    const quarter = Math.floor(monthIndex / 3) + 1;
                    quarterlyData[`Q${quarter}`] += 1;
                }
            }
        });

        return {
            labels: ['Q1', 'Q2', 'Q3', 'Q4'],
            data: ['Q1', 'Q2', 'Q3', 'Q4'].map(q => quarterlyData[q])
        };
    };

    const aggregateAnnuallyOrders = (orders) => {
        const annualData = {};
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 4; // Show last 5 years

        // Initialize last 5 years with 0
        for (let i = startYear; i <= currentYear; i++) {
            annualData[i] = 0;
        }

        // Aggregate order counts by year
        orders.forEach(order => {
            if (order.oDate) {
                const orderDate = new Date(order.oDate);
                const year = orderDate.getFullYear();
                if (year >= startYear && year <= currentYear) {
                    annualData[year] += 1;
                }
            }
        });

        const years = Object.keys(annualData).map(Number).sort((a, b) => a - b);
        return {
            labels: years.map(y => y.toString()),
            data: years.map(y => annualData[y])
        };
    };

    const getOrdersData = (orders) => {
        switch (ordersView) {
            case 'quarterly':
                return aggregateQuarterlyOrders(orders);
            case 'annually':
                return aggregateAnnuallyOrders(orders);
            case 'monthly':
            default:
                return aggregateMonthlyOrders(orders);
        }
    };

    const getTopProductsByOrders = (products) => {
        // Get top 12 products by order count or all if less than 12
        return products
            .sort((a, b) => (b.totalProducts || 0) - (a.totalProducts || 0))
            .slice(0, 12)
            .map(p => ({
                name: p.name || 'Unknown',
                quantity: p.totalProducts || 0
            }));
    };

    const getCategoryNameById = (categoryId, product) => {
        if (!categoryId) return 'N/A';
        // Use enriched categoryName from backend if available
        if (product && product.categoryName) return product.categoryName;
        // Fallback: find the category by ObjectId and return the cName
        const category = categories.find(cat => cat._id === categoryId);
        return category ? category.cName : categoryId;
    };

    const initCharts = useCallback(() => {
        // Clear any pending chart creation timeout
        if (chartTimerRef.current) {
            clearTimeout(chartTimerRef.current);
            chartTimerRef.current = null;
        }

        // Destroy existing charts if they exist
        if (salesChartInstance.current) {
            salesChartInstance.current.destroy();
            salesChartInstance.current = null;
        }
        if (stockChartInstance.current) {
            stockChartInstance.current.destroy();
            stockChartInstance.current = null;
        }

        const monthlyOrders = getOrdersData(orders);
        const topProducts = getTopProductsByOrders(products);

        // Use setTimeout to ensure DOM is fully rendered
        chartTimerRef.current = setTimeout(() => {
            if (salesRef.current) {
                try {
                    const ctx = salesRef.current.getContext('2d');
                    if (ctx) {
                        salesChartInstance.current = new ChartJS(ctx, {
                        type: 'line',
                        data: {
                            labels: monthlyOrders.labels,
                            datasets: [{
                                label: 'Orders',
                                data: monthlyOrders.data,
                                backgroundColor: 'rgba(138, 43, 226, 0.2)',
                                borderColor: '#8a2be2',
                                borderWidth: 3,
                                tension: 0.4,
                                fill: true,
                                pointBackgroundColor: '#8a2be2',
                                pointBorderColor: '#fff',
                                pointHoverBackgroundColor: '#fff',
                                pointHoverBorderColor: '#8a2be2'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    backgroundColor: '#333',
                                    titleColor: '#fff',
                                    bodyColor: '#fff',
                                    callbacks: {
                                        label: function (context) {
                                            let label = context.dataset.label || '';
                                            if (label) label += ': ';
                                            if (context.parsed.y !== null) {
                                                label += context.parsed.y + ' orders';
                                            }
                                            return label;
                                        }
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        callback: value => value
                                    },
                                    grid: { color: '#f0f0f0' }
                                },
                                x: {
                                    grid: { display: false }
                                }
                            }
                        }
                    });
                    }
                } catch (error) {
                }
            }

            if (stockRef.current) {
                try {
                    const ctx = stockRef.current.getContext('2d');
                    if (ctx) {
                        stockChartInstance.current = new ChartJS(ctx, {
                            type: 'bar',
                            data: {
                                labels: topProducts.map(p => p.name),
                                datasets: [{
                                    label: 'Stock Quantity',
                                    data: topProducts.map(p => p.quantity),
                                    backgroundColor: '#8a2be2',
                                    borderColor: '#8a2be2',
                                    borderWidth: 1,
                                    borderRadius: 5
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                        backgroundColor: '#333',
                                        titleColor: '#fff',
                                        bodyColor: '#fff'
                                    }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        ticks: {
                                            callback: value => value >= 1000 ? `${value / 1000}K` : value
                                        },
                                        grid: { color: '#f0f0f0' }
                                    },
                                    x: {
                                        grid: { display: false }
                                    }
                                }
                            }
                        });
                    }
                } catch (error) {
                }
            }
        }, 100); // Increased timeout
    }, [orders, products, ordersView]);

    // Initialize or update charts when data changes
    useEffect(() => {
        if (orders.length > 0 || products.length > 0) {
            initCharts();
        }
        return () => {
            if (chartTimerRef.current) {
                clearTimeout(chartTimerRef.current);
                chartTimerRef.current = null;
            }
            if (salesChartInstance.current) {
                salesChartInstance.current.destroy();
                salesChartInstance.current = null;
            }
            if (stockChartInstance.current) {
                stockChartInstance.current.destroy();
                stockChartInstance.current = null;
            }
        };
    }, [orders, products, ordersView, initCharts]);

    return (
        <div className="container-fluid px-5 mt-4 mb-5">
            {/* Warehouse Info Header */}
            {employeeWarehouse && (
                <div style={{ 
                    backgroundColor: '#e7f3ff', 
                    padding: '16px 20px', 
                    borderRadius: '8px', 
                    border: '2px solid #0056b3',
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666' }}>Assigned Warehouse</p>
                        <h3 style={{ margin: 0, color: '#0056b3', fontSize: '20px' }}>{employeeWarehouse}</h3>
                    </div>
                    <div style={{ fontSize: '32px' }}>📦</div>
                </div>
            )}
            {!employeeWarehouse && (
                <div style={{ 
                    backgroundColor: '#fff3cd', 
                    padding: '16px 20px', 
                    borderRadius: '8px', 
                    border: '2px solid #856404',
                    marginBottom: '20px'
                }}>
                    <p style={{ margin: 0, color: '#856404', fontWeight: 'bold' }}>⚠️ No Warehouse Assigned - You do not have access to warehouse data</p>
                </div>
            )}

            {loading && (
                <div className="text-center p-5">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            )}

            {!loading && (
                <>
                    {/* Dashboard Cards - dynamically shows all permitted stat cards */}
                    <div className="row g-3 my-2">
                        {hasPermission('canViewProducts') && (
                        <div className="col-md-4">
                            <a href="/dashboard/products" className="text-decoration-none"> <div
                                className="p-3 bg-white shadow border border-3 border-primary d-flex justify-content-around align-items-center rounded-4 dashboard-card">
                                <div className="dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3">
                                    <i className="bi bi-box-seam-fill"></i>
                                </div>
                                <div className="mt-3">
                                    <h3 className="fs-2">{stats.totalProducts}</h3>
                                    <p className="fs-5">Total Products</p>
                                </div>
                            </div></a>
                        </div>
                        )}

                        {hasPermission('canViewOrders') && (
                        <div className="col-md-4">
                            <a href="/dashboard/orders" className="text-decoration-none"><div
                                className="p-3 bg-white shadow border border-3 border-primary d-flex justify-content-around align-items-center rounded-4 dashboard-card">
                                <div className="dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3">
                                    <i className="bi bi-cart"></i>
                                </div>
                                <div className="mt-3">
                                    <h3 className="fs-2">{stats.totalOrders}</h3>
                                    <p className="fs-5">Total Orders</p>
                                </div>
                            </div></a>
                        </div>
                        )}

                        {hasPermission('canViewCategories') && (
                        <div className="col-md-4">
                            <a href="/dashboard/category" className="text-decoration-none"><div
                                className="p-3 bg-white shadow border border-3 border-primary d-flex justify-content-around align-items-center rounded-4 dashboard-card">
                                <div className="dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3">
                                    <i className="bi bi-boxes"></i>
                                </div>
                                <div className="mt-3">
                                    <h3 className="fs-2">{stats.totalCategories}</h3>
                                    <p className="fs-5">Total Categories</p>
                                </div>
                            </div></a>
                        </div>
                        )}

                        {hasPermission('canViewEmployees') && (
                        <div className="col-md-4">
                            <a href="/dashboard/employee" className="text-decoration-none"><div
                                className="p-3 bg-white shadow border border-3 border-primary d-flex justify-content-around align-items-center rounded-4 dashboard-card">
                                <div className="dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3">
                                    <i className="bi bi-people-fill"></i>
                                </div>
                                <div className="mt-3">
                                    <h3 className="fs-2">{stats.totalEmployees}</h3>
                                    <p className="fs-5">Total Employees</p>
                                </div>
                            </div></a>
                        </div>
                        )}

                        {hasPermission('canViewWarehouses') && (
                        <div className="col-md-4">
                            <a href="/dashboard/warehouses" className="text-decoration-none"><div
                                className="p-3 bg-white shadow border border-3 border-primary d-flex justify-content-around align-items-center rounded-4 dashboard-card">
                                <div className="dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3">
                                    <i className="bi bi-building"></i>
                                </div>
                                <div className="mt-3">
                                    <h3 className="fs-2">{stats.totalWarehouses}</h3>
                                    <p className="fs-5">Total Warehouses</p>
                                </div>
                            </div></a>
                        </div>
                        )}
                    </div>

                    {/* Charts - only visible when analytics permission is enabled */}
                    {hasPermission('canViewAnalytics') && hasPermission('canViewOrders') && (
                    <div className="row my-5 mb-5">
                        <div className="col-12">
                            <div className="p-4 bg-white shadow rounded-4 border border-4">
                                <div className="d-flex justify-content-between mb-4">
                                    <h1>Orders Overview</h1>
                                    <select className="form-select w-auto pe-5" value={ordersView} onChange={(e) => setOrdersView(e.target.value)}>
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="annually">Annually</option>
                                    </select>
                                </div>
                                <div className="chart-container" style={{ height: '400px' }}>
                                    {orders.length === 0 ? (
                                        <div className="alert alert-info m-4" role="alert">
                                            <i className="bi bi-info-circle me-2"></i>
                                            No order data available to display orders overview chart. Please add orders to see the chart.
                                        </div>
                                    ) : (
                                        <canvas ref={salesRef} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    )}

                    {hasPermission('canViewAnalytics') && hasPermission('canViewProducts') && (
                    <div className="row my-4 g-3">
                        <div className="col-md-5 me-5">
                            <div className="p-3 bg-white shadow rounded-4 border border-4">
                                <h3 className="fs-4 mb-4 mt-2 ms-2">Stock Numbers</h3>
                                <table className="table align-middle mt-4">
                                    <tbody>
                                        <tr 
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => navigate('/dashboard/products?filter=lowStock')}
                                        >
                                            <td>Low Stock Items</td>
                                            <td><span className="fw-bold">{stats.lowStockItems}</span></td>
                                        </tr>
                                        {hasPermission('canViewCategories') && (
                                        <tr 
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => navigate('/dashboard/category')}
                                        >
                                            <td>Items Categories</td>
                                            <td><span className="fw-bold">{stats.totalCategories}</span></td>
                                        </tr>
                                        )}
                                        <tr 
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => navigate('/dashboard/products')}
                                        >
                                            <td>Total Products</td>
                                            <td><span className="fw-bold">{stats.totalProducts}</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="p-3 bg-white shadow border border-4 rounded-4">
                                <h3 className="fs-4 mb-3 ms-2 mt-2 d-flex justify-content-between align-items-baseline">
                                    Top Products
                                    <a href="/dashboard/products" className="text-decoration-none me-3 text-violet fs-6 fw-normal">View All</a>
                                </h3>
                                <table className="table table-borderless align-middle mb-0">
                                    <thead className="text-secondary">
                                        <tr>
                                            <th scope="col">Product Name</th>
                                            <th scope="col">Category</th>
                                            <th scope="col">Stock</th>
                                            <th scope="col">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="text-center text-muted">No products found</td>
                                            </tr>
                                        ) : (
                                            products.slice(0, 3).map((product, index) => (
                                                <tr 
                                                    key={index}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => {
                                                        setSelectedProduct(product);
                                                        setShowProductModal(true);
                                                        navigate('/dashboard/products');
                                                    }}
                                                >
                                                    <td>{product.name || 'N/A'}</td>
                                                    <td>{product.categoryName || getCategoryNameById(product.category, product) || 'N/A'}</td>
                                                    <td>{product.totalProducts || 0} Units</td>
                                                    <td>₹{product.price || 0}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    )}

                    {hasPermission('canViewAnalytics') && hasPermission('canViewProducts') && (
                    <div className="row my-5 mb-5">
                        <div className="col-12">
                            <div className="p-4 bg-white shadow rounded-4 border border-4">
                                <div className="d-flex justify-content-between mb-4">
                                    <h1>Stock Overview</h1>
                                </div>
                                <div className="chart-container" style={{ height: '400px' }}>
                                    {products.length === 0 ? (
                                        <div className="alert alert-info m-4" role="alert">
                                            <i className="bi bi-info-circle me-2"></i>
                                            No product data available to display stock chart. Please add products to see the chart.
                                        </div>
                                    ) : (
                                        <canvas ref={stockRef} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Product Details Modal */}
                    {showProductModal && selectedProduct && (
                        <div 
                            className="modal fade show d-block" 
                            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                        >
                            <div className="modal-dialog modal-dialog-centered">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h5 className="modal-title">Product Details</h5>
                                        <button 
                                            type="button" 
                                            className="btn-close" 
                                            onClick={() => setShowProductModal(false)}
                                        ></button>
                                    </div>
                                    <div className="modal-body">
                                        <div className="mb-3">
                                            <label className="form-label fw-bold text-muted">Product Name</label>
                                            <p className="form-control-plaintext">{selectedProduct.name || 'N/A'}</p>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold text-muted">Category</label>
                                            <p className="form-control-plaintext">{selectedProduct.categoryName || getCategoryNameById(selectedProduct.category, selectedProduct) || 'N/A'}</p>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold text-muted">Stock</label>
                                            <p className="form-control-plaintext">{selectedProduct.totalProducts || 0} Units</p>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold text-muted">Sale Price</label>
                                            <p className="form-control-plaintext">₹{selectedProduct.salePrice || 0}</p>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold text-muted">Cost Price</label>
                                            <p className="form-control-plaintext">₹{selectedProduct.costPrice || 0}</p>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold text-muted">Description</label>
                                            <p className="form-control-plaintext">{selectedProduct.description || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button 
                                            type="button" 
                                            className="btn btn-secondary" 
                                            onClick={() => setShowProductModal(false)}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Categories Overview - shown when user has categories permission but not products */}
                    {hasPermission('canViewCategories') && !hasPermission('canViewProducts') && (
                    <div className="row my-4">
                        <div className="col-12">
                            <div className="p-4 bg-white shadow rounded-4 border border-4">
                                <h3 className="fs-4 mb-3 d-flex justify-content-between align-items-baseline">
                                    <span><i className="bi bi-boxes me-2"></i>Categories Overview</span>
                                    <a href="/dashboard/category" className="text-decoration-none text-violet fs-6 fw-normal">View All</a>
                                </h3>
                                {categories.length === 0 ? (
                                    <div className="alert alert-info" role="alert">
                                        <i className="bi bi-info-circle me-2"></i>
                                        No categories found. Add categories to organize your inventory.
                                    </div>
                                ) : (
                                    <div className="row g-3">
                                        {categories.slice(0, 6).map((cat, index) => (
                                            <div key={cat._id || index} className="col-md-4">
                                                <div className="p-3 border rounded-3 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/category')}>
                                                    <h5 className="mb-1"><i className="bi bi-tag-fill me-2 text-primary"></i>{cat.cName}</h5>
                                                    {cat.cDescription && <p className="text-muted mb-0 small">{cat.cDescription}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Employees Overview - shown when user has employees permission */}
                    {hasPermission('canViewEmployees') && (
                    <div className="row my-4">
                        <div className="col-12">
                            <div className="p-4 bg-white shadow rounded-4 border border-4">
                                <h3 className="fs-4 mb-3 d-flex justify-content-between align-items-baseline">
                                    <span><i className="bi bi-people-fill me-2"></i>Team Overview</span>
                                    <a href="/dashboard/employee" className="text-decoration-none text-violet fs-6 fw-normal">View All</a>
                                </h3>
                                {employees.length === 0 ? (
                                    <p className="text-muted">No team members found.</p>
                                ) : (
                                    <table className="table table-borderless align-middle mb-0">
                                        <thead className="text-secondary">
                                            <tr>
                                                <th scope="col">Name</th>
                                                <th scope="col">Email</th>
                                                <th scope="col">Role</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {employees.slice(0, 5).map((emp, index) => (
                                                <tr key={emp._id || index}>
                                                    <td>{emp.fname} {emp.lname}</td>
                                                    <td>{emp.email}</td>
                                                    <td><span className="badge bg-primary text-capitalize">{emp.role}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Warehouses Overview - shown when user has warehouses permission */}
                    {hasPermission('canViewWarehouses') && (
                    <div className="row my-4">
                        <div className="col-12">
                            <div className="p-4 bg-white shadow rounded-4 border border-4">
                                <h3 className="fs-4 mb-3 d-flex justify-content-between align-items-baseline">
                                    <span><i className="bi bi-building me-2"></i>Warehouses</span>
                                    <a href="/dashboard/warehouses" className="text-decoration-none text-violet fs-6 fw-normal">View All</a>
                                </h3>
                                {warehouses.length === 0 ? (
                                    <p className="text-muted">No warehouses configured.</p>
                                ) : (
                                    <div className="row g-3">
                                        {warehouses.slice(0, 4).map((warehouse, index) => (
                                            <div key={warehouse._id || index} className="col-md-6">
                                                <div className="p-3 border rounded-3 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/warehouses')}>
                                                    <h5 className="mb-1"><i className="bi bi-building me-2 text-primary"></i>{warehouse.wName}</h5>
                                                    {warehouse.wManager && <p className="text-muted mb-0 small">Manager: {warehouse.wManager}</p>}
                                                    {warehouse.city && <p className="text-muted mb-0 small">Location: {warehouse.city}{warehouse.state ? `, ${warehouse.state}` : ''}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Recent Orders - shown when user has orders permission but as a supplementary section */}
                    {hasPermission('canViewOrders') && (
                    <div className="row my-4">
                        <div className="col-12">
                            <div className="p-4 bg-white shadow rounded-4 border border-4">
                                <h3 className="fs-4 mb-3 d-flex justify-content-between align-items-baseline">
                                    <span><i className="bi bi-clock-history me-2"></i>Recent Orders</span>
                                    <a href="/dashboard/orders" className="text-decoration-none text-violet fs-6 fw-normal">View All</a>
                                </h3>
                                {orders.length === 0 ? (
                                    <p className="text-muted">No orders found.</p>
                                ) : (
                                    <table className="table table-borderless align-middle mb-0">
                                        <thead className="text-secondary">
                                            <tr>
                                                <th scope="col">Customer</th>
                                                <th scope="col">Product</th>
                                                <th scope="col">Status</th>
                                                <th scope="col">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orders.slice(0, 5).map((order, index) => (
                                                <tr key={order._id || index}>
                                                    <td>{order.cName || 'N/A'}</td>
                                                    <td>{order.pName || (order.products && order.products.length > 0 ? order.products[0].productName : 'N/A')}</td>
                                                    <td>
                                                        <span className={`badge ${order.dStatus === 'Delivered' ? 'bg-success' : order.dStatus === 'Pending' ? 'bg-warning text-dark' : 'bg-info'}`}>
                                                            {order.dStatus || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td>{order.oDate ? new Date(order.oDate).toLocaleDateString() : 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                    )}
                </>
            )}
        </div>
    )
}

export default Employee

