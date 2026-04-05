import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { apiCall, parseResponse } from '../../utils/apiClient';

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

const BusinessOwner = (props) => {
    const navigate = useNavigate();
    const salesRef = useRef(null);
    const stockRef = useRef(null);
    const salesChartInstance = useRef(null);
    const stockChartInstance = useRef(null);
    const resizeObserver = useRef(null);

    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    // eslint-disable-next-line no-unused-vars
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [salesView, setSalesView] = useState('monthly');
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    // eslint-disable-next-line no-unused-vars
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showWarehouseModal, setShowWarehouseModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalOrders: 0,
        totalEmployees: 0,
        lowStockItems: 0,
        totalCategories: 0,
        totalWarehouses: 0
    });

    // Fetch all data on component mount and refresh when tab becomes visible
    useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
        fetchAllData();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchAllData();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Initialize or update charts when data changes
    useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
        if (orders.length > 0 || products.length > 0) {
            // Use requestAnimationFrame to ensure DOM is painted before accessing refs
            const rafId = requestAnimationFrame(() => {
                initCharts();
            });
            return () => cancelAnimationFrame(rafId);
        }
    }, [orders, products, salesView]);

    const fetchAllData = async () => {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            // Fetch all data in parallel using Promise.all
            const [ordersRes, productsRes, warehousesRes, employeesRes] = await Promise.all([
                apiCall('/api/customerorders/getcustomerorder', {
                    method: 'POST',
                    headers
                }),
                apiCall('/api/products/getproduct', {
                    method: 'POST',
                    headers
                }),
                apiCall('/api/warehouse/getwarehouse', {
                    method: 'POST',
                    headers
                }),
                apiCall('/api/employee/getallemployees', {
                    method: 'POST',
                    headers
                })
            ]);

            const [ordersData, productsData, warehousesData, employeesData] = await Promise.all([
                ordersRes.ok ? parseResponse(ordersRes) : [],
                productsRes.ok ? parseResponse(productsRes) : [],
                warehousesRes.ok ? parseResponse(warehousesRes) : [],
                employeesRes.ok ? parseResponse(employeesRes) : []
            ]);

            setOrders(ordersData);
            setProducts(productsData);
            setWarehouses(warehousesData);
            setEmployees(employeesData);

            // Calculate statistics
            const lowStockCount = productsData.filter(p => p.totalProducts <= 10).length;
            const uniqueCategories = [...new Set(productsData.map(p => p.category))].length;

            setStats({
                totalProducts: productsData.length,
                totalOrders: ordersData.length,
                totalEmployees: employeesData.length,
                lowStockItems: lowStockCount,
                totalCategories: uniqueCategories,
                totalWarehouses: warehousesData.length
            });

            setLoading(false);

            // Check low stock alerts in the background (non-blocking)
            apiCall('/api/notifications/check-low-stock-alerts', {
                method: 'POST',
                headers
            }).catch(() => {});
        } catch (error) {
            props.showAlert?.('Failed to load dashboard data', 'danger');
            setLoading(false);
        }
    };

    const aggregateMonthlySales = (orders) => {
        const salesStatuses = new Set(['paid', 'confirmed', 'completed', 'delivered']);

        const shouldCountInSales = (order) => {
            if (!order || !order.oDate) return false;
            if (order.isPending === true) return false;

            const normalizedStatus = String(order.status || '').trim().toLowerCase();
            if (!normalizedStatus) return true;

            return salesStatuses.has(normalizedStatus);
        };

        const monthlyData = {};
        const currentYear = new Date().getFullYear();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Initialize all months with 0
        monthNames.forEach(month => {
            monthlyData[month] = 0;
        });

        // Aggregate order amounts by month using non-pending completed/confirmed sales.
        orders.forEach(order => {
            if (shouldCountInSales(order)) {
                const orderDate = new Date(order.oDate);
                if (orderDate.getFullYear() === currentYear) {
                    const monthIndex = orderDate.getMonth();
                    const monthName = monthNames[monthIndex];
                    monthlyData[monthName] += order.amount || 0;
                }
            }
        });

        return {
            labels: monthNames,
            data: monthNames.map(month => monthlyData[month])
        };
    };

    const aggregateQuarterlySales = (orders) => {
        const salesStatuses = new Set(['paid', 'confirmed', 'completed', 'delivered']);

        const shouldCountInSales = (order) => {
            if (!order || !order.oDate) return false;
            if (order.isPending === true) return false;

            const normalizedStatus = String(order.status || '').trim().toLowerCase();
            if (!normalizedStatus) return true;

            return salesStatuses.has(normalizedStatus);
        };

        const quarterlyData = { 'Q1': 0, 'Q2': 0, 'Q3': 0, 'Q4': 0 };
        const currentYear = new Date().getFullYear();

        // Aggregate order amounts by quarter using non-pending completed/confirmed sales.
        orders.forEach(order => {
            if (shouldCountInSales(order)) {
                const orderDate = new Date(order.oDate);
                if (orderDate.getFullYear() === currentYear) {
                    const monthIndex = orderDate.getMonth();
                    const quarter = Math.floor(monthIndex / 3) + 1;
                    quarterlyData[`Q${quarter}`] += order.amount || 0;
                }
            }
        });

        return {
            labels: ['Q1', 'Q2', 'Q3', 'Q4'],
            data: ['Q1', 'Q2', 'Q3', 'Q4'].map(q => quarterlyData[q])
        };
    };

    const aggregateAnnuallySales = (orders) => {
        const salesStatuses = new Set(['paid', 'confirmed', 'completed', 'delivered']);

        const shouldCountInSales = (order) => {
            if (!order || !order.oDate) return false;
            if (order.isPending === true) return false;

            const normalizedStatus = String(order.status || '').trim().toLowerCase();
            if (!normalizedStatus) return true;

            return salesStatuses.has(normalizedStatus);
        };

        const annualData = {};
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 4; // Show last 5 years

        // Initialize last 5 years with 0
        for (let i = startYear; i <= currentYear; i++) {
            annualData[i] = 0;
        }

        // Aggregate order amounts by year using non-pending completed/confirmed sales.
        orders.forEach(order => {
            if (shouldCountInSales(order)) {
                const orderDate = new Date(order.oDate);
                const year = orderDate.getFullYear();
                if (year >= startYear && year <= currentYear) {
                    annualData[year] += order.amount || 0;
                }
            }
        });

        const years = Object.keys(annualData).map(Number).sort((a, b) => a - b);
        return {
            labels: years.map(y => y.toString()),
            data: years.map(y => annualData[y])
        };
    };

    const getSalesData = (orders) => {
        switch (salesView) {
            case 'quarterly':
                return aggregateQuarterlySales(orders);
            case 'annually':
                return aggregateAnnuallySales(orders);
            case 'monthly':
            default:
                return aggregateMonthlySales(orders);
        }
    };

    const getTopProductsByStock = (products) => {
        // Get top 12 products by stock quantity or all products if less than 12
        const topProducts = products
            .sort((a, b) => (b.totalProducts || 0) - (a.totalProducts || 0))
            .slice(0, 12)
            .map(p => ({
                name: p.name || 'Unknown',
                quantity: p.totalProducts || 0
            }));
        return topProducts;
    };

    const initCharts = () => {
        // Destroy existing charts if they exist
        if (salesChartInstance.current) {
            salesChartInstance.current.destroy();
        }
        if (stockChartInstance.current) {
            stockChartInstance.current.destroy();
        }

        const monthlySales = getSalesData(orders);
        const topProducts = getTopProductsByStock(products);

        if (salesRef.current) {
            const ctx = salesRef.current.getContext('2d');
            salesChartInstance.current = new ChartJS(ctx, {
                type: 'line',
                data: {
                    labels: monthlySales.labels,
                    datasets: [{
                        label: 'Sales',
                        data: monthlySales.data,
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
                    animation: { duration: 400 },
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
                                        label += new Intl.NumberFormat('en-IN', {
                                            style: 'currency',
                                            currency: 'INR',
                                            maximumFractionDigits: 0
                                        }).format(context.parsed.y);
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
                                callback: value => value >= 1000 ? `₹${value / 1000}K` : `₹${value}`
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

        if (stockRef.current) {
            const ctx = stockRef.current.getContext('2d');
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
                    animation: { duration: 400 },
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

        // Disconnect previous observer if it exists
        if (resizeObserver.current) {
            resizeObserver.current.disconnect();
        }

        resizeObserver.current = new ResizeObserver(() => {
            try {
                if (salesChartInstance.current && 
                    salesChartInstance.current.canvas && 
                    salesChartInstance.current.canvas.parentElement &&
                    document.body.contains(salesChartInstance.current.canvas)) {
                    salesChartInstance.current.resize();
                }
                if (stockChartInstance.current && 
                    stockChartInstance.current.canvas && 
                    stockChartInstance.current.canvas.parentElement &&
                    document.body.contains(stockChartInstance.current.canvas)) {
                    stockChartInstance.current.resize();
                }
            } catch (error) {
                // Silently ignore errors when resizing unmounted charts
                console.debug('Chart resize error (harmless):', error.message);
            }
        });

        document.querySelectorAll('.chart-container').forEach(container => {
            if (container && resizeObserver.current && document.body.contains(container)) {
                resizeObserver.current.observe(container);
            }
        });
    };

    useEffect(() => {
        return () => {
            // Properly destroy and null out chart instances
            if (salesChartInstance.current) {
                salesChartInstance.current.destroy();
                salesChartInstance.current = null;
            }
            if (stockChartInstance.current) {
                stockChartInstance.current.destroy();
                stockChartInstance.current = null;
            }
            // Disconnect and null out resize observer
            if (resizeObserver.current) {
                resizeObserver.current.disconnect();
                resizeObserver.current = null;
            }
        };
    }, []);

    return (
        <div className="container-fluid px-5 mt-4 mb-5">
            {loading && (
                <div className="text-center p-5">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            )}
            
            {!loading && (
                <>
                    {/* Dashboard Cards */}
                    <div className="row g-3 my-2">
                        {/* Products */}
                        <div className="col-md-4">
                            <a href="/dashboard/products" className="text-decoration-none">
                                <div className="dashboard-card p-3 bg-white shadow border border-3 border-primary d-flex justify-content-around align-items-center rounded-4">
                                    <div className="dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3">
                                        <i className="bi bi-box-seam-fill"></i>
                                    </div>
                                    <div className="mt-3">
                                        <h3 className="fs-2">{stats.totalProducts}</h3>
                                        <p className="fs-5">Total Products</p>
                                    </div>
                                </div>
                            </a>
                        </div>
                        {/* Orders */}
                        <div className="col-md-4">
                            <a href="/dashboard/orders" className="text-decoration-none">
                                <div className="dashboard-card p-3 bg-white shadow border border-3 border-primary d-flex justify-content-around align-items-center rounded-4">
                                    <div className="dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3">
                                        <i className="bi bi-cart"></i>
                                    </div>
                                    <div className="mt-3">
                                        <h3 className="fs-2">{stats.totalOrders}</h3>
                                        <p className="fs-5">Total Orders</p>
                                    </div>
                                </div>
                            </a>
                        </div>
                        {/* Employees */}
                        <div className="col-md-4">
                            <a href="/dashboard/employee" className="text-decoration-none">
                                <div className="dashboard-card p-3 bg-white shadow border border-3 border-primary d-flex justify-content-around align-items-center rounded-4">
                                    <div className="dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3">
                                        <i className="bi bi-people"></i>
                                    </div>
                                    <div className="mt-3">
                                        <h3 className="fs-2">{stats.totalEmployees}</h3>
                                        <p className="fs-5">Total Employees</p>
                                    </div>
                                </div>
                            </a>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="row my-5 mb-5">
                        <div className="col-12">
                            <div className="p-4 bg-white shadow rounded-4 border border-4">
                                <div className="d-flex justify-content-between mb-5">
                                    <h1>Sales</h1>
                                    <select className="form-select w-auto pe-5" value={salesView} onChange={(e) => setSalesView(e.target.value)}>
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="annually">Annually</option>
                                    </select>
                                </div>
                                {orders.length === 0 ? (
                                    <div className="alert alert-info m-4" role="alert">
                                        <i className="bi bi-info-circle me-2"></i>
                                        No order data available to display sales chart. Please add orders to see the chart.
                                    </div>
                                ) : (
                                    <div className="chart-container" style={{ height: '400px' }}>
                                        <canvas ref={salesRef} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="row g-3">
                        <div className="col-md-6 me-5">
                            <div className="p-4 bg-white shadow rounded-4 border border-4">
                                <h3 className="fs-4 mb-4 mt-2">Stock Numbers</h3>
                                <table className="table">
                                    <tbody>
                                        <tr 
                                            className=''
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => navigate('/dashboard/products?filter=lowStock')}
                                        >
                                            <td className="fs-6 fw-medium">Low Stock Items</td>
                                            <td className="fs-6 fw-medium">{stats.lowStockItems}</td>
                                        </tr>
                                        <tr 
                                            className=''
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => navigate('/dashboard/category')}
                                        >
                                            <td className="fs-6 fw-medium">Items Categories</td>
                                            <td className="fs-6 fw-medium">{stats.totalCategories}</td>
                                        </tr>
                                        <tr 
                                            className=''
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => navigate('/dashboard/products')}
                                        >
                                            <td className="fs-6 fw-medium">Total Products</td>
                                            <td className="fs-6 fw-medium">{stats.totalProducts}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="col-md-5 ms-5">
                            <div className="p-3 bg-white shadow border border-4 rounded-4">
                                <h3 className="fs-4 mb-3 ms-2 mt-2 d-flex justify-content-between align-items-baseline">
                                    Your Warehouses
                                    <a href="/dashboard/warehouses" className="text-decoration-none me-3 text-violet fs-6 fw-normal">View All</a>
                                </h3>
                                <table className="table table-borderless align-middle mb-0">
                                    <thead className="text-secondary">
                                        <tr>
                                            <th scope="col">Warehouse</th>
                                            <th scope="col">Location</th>
                                            <th scope="col">Manager</th>
                                            <th scope="col">City</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {warehouses.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="text-center text-muted">No warehouses found</td>
                                            </tr>
                                        ) : (
                                            warehouses.slice(0, 3).map((warehouse, index) => (
                                                <tr 
                                                    key={index} 
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => {
                                                        setSelectedWarehouse(warehouse);
                                                        setShowWarehouseModal(true);
                                                        navigate('/dashboard/warehouses');
                                                    }}
                                                >
                                                    <td>{warehouse.wName}</td>
                                                    <td>{warehouse.wAddress || 'N/A'}</td>
                                                    <td>{warehouse.wManager || 'N/A'}</td>
                                                    <td>{warehouse.city || 'N/A'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* <div className="row g-3 mt-3">
                        <div className="col-md-12">
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
                                            products.slice(0, 5).map((product, index) => (
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
                                                    <td>{product.categoryName || product.category || 'N/A'}</td>
                                                    <td>{product.totalProducts || 0} Units</td>
                                                    <td>₹{product.salePrice || 0}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div> */}

                    <div className="row my-5 mb-5">
                        <div className="col-12">
                            <div className="p-4 bg-white shadow rounded-4 border border-4">
                                <div className="d-flex justify-content-between mb-5">
                                    <h1>Stock Overview</h1>
                                </div>
                                {products.length === 0 ? (
                                    <div className="alert alert-info m-4" role="alert">
                                        <i className="bi bi-info-circle me-2"></i>
                                        No product data available to display stock chart. Please add products to see the chart.
                                    </div>
                                ) : (
                                    <div className="chart-container" style={{ height: '400px' }}>
                                        <canvas ref={stockRef} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Warehouse Details Modal */}
                    {showWarehouseModal && selectedWarehouse && (
                        <div 
                            className="modal fade show d-block" 
                            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                        >
                            <div className="modal-dialog modal-dialog-centered">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h5 className="modal-title">Warehouse Details</h5>
                                        <button 
                                            type="button" 
                                            className="btn-close" 
                                            onClick={() => setShowWarehouseModal(false)}
                                        ></button>
                                    </div>
                                    <div className="modal-body">
                                        <div className="mb-3">
                                            <label className="form-label fw-bold text-muted">Warehouse Name</label>
                                            <p className="form-control-plaintext">{selectedWarehouse.wName}</p>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold text-muted">Location</label>
                                            <p className="form-control-plaintext">{selectedWarehouse.wAddress || 'N/A'}</p>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold text-muted">Manager</label>
                                            <p className="form-control-plaintext">{selectedWarehouse.wManager || 'N/A'}</p>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold text-muted">City</label>
                                            <p className="form-control-plaintext">{selectedWarehouse.city || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button 
                                            type="button" 
                                            className="btn btn-secondary" 
                                            onClick={() => setShowWarehouseModal(false)}
                                        >
                                            Close
                                        </button>
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
                                            <p className="form-control-plaintext">{selectedProduct.categoryName || selectedProduct.category || 'N/A'}</p>
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
                </>
            )}
        </div>
    );
};

export default BusinessOwner;


