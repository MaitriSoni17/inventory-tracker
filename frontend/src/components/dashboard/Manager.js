import React, { useEffect, useState, useRef, useCallback } from 'react';
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

function Manager(props) {
    const navigate = useNavigate();
    const { userDetails, hasPermission, loading: roleLoading, permissions } = useRole();

    // Chart refs
    const ordersChartRef = useRef(null);
    const stockChartRef = useRef(null);
    const ordersChartInstance = useRef(null);
    const stockChartInstance = useRef(null);
    const chartTimerRef = useRef(null);

    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    // eslint-disable-next-line no-unused-vars
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [managerWarehouse, setManagerWarehouse] = useState(null);
    const [ordersView, setOrdersView] = useState('monthly');
    const [stats, setStats] = useState({
        totalEmployees: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalWarehouses: 0,
        totalCategories: 0,
        lowStockItems: 0
    });

    // Chart data aggregation functions
    const aggregateMonthlyOrders = useCallback((ordersData) => {
        const monthlyData = {};
        const currentYear = new Date().getFullYear();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        monthNames.forEach(month => { monthlyData[month] = 0; });

        ordersData.forEach(order => {
            if (order.oDate) {
                const orderDate = new Date(order.oDate);
                if (orderDate.getFullYear() === currentYear) {
                    const monthName = monthNames[orderDate.getMonth()];
                    monthlyData[monthName] += 1;
                }
            }
        });

        return { labels: monthNames, data: monthNames.map(month => monthlyData[month]) };
    }, []);

    const aggregateQuarterlyOrders = useCallback((ordersData) => {
        const quarterlyData = { 'Q1': 0, 'Q2': 0, 'Q3': 0, 'Q4': 0 };
        const currentYear = new Date().getFullYear();

        ordersData.forEach(order => {
            if (order.oDate) {
                const orderDate = new Date(order.oDate);
                if (orderDate.getFullYear() === currentYear) {
                    const quarter = Math.floor(orderDate.getMonth() / 3) + 1;
                    quarterlyData[`Q${quarter}`] += 1;
                }
            }
        });

        return { labels: ['Q1', 'Q2', 'Q3', 'Q4'], data: ['Q1', 'Q2', 'Q3', 'Q4'].map(q => quarterlyData[q]) };
    }, []);

    const aggregateAnnuallyOrders = useCallback((ordersData) => {
        const annualData = {};
        const currentYear = new Date().getFullYear();
        for (let i = currentYear - 4; i <= currentYear; i++) { annualData[i] = 0; }

        ordersData.forEach(order => {
            if (order.oDate) {
                const year = new Date(order.oDate).getFullYear();
                if (annualData.hasOwnProperty(year)) { annualData[year] += 1; }
            }
        });

        const years = Object.keys(annualData).map(Number).sort((a, b) => a - b);
        return { labels: years.map(y => y.toString()), data: years.map(y => annualData[y]) };
    }, []);

    const getOrdersData = useCallback((ordersData) => {
        switch (ordersView) {
            case 'quarterly': return aggregateQuarterlyOrders(ordersData);
            case 'annually': return aggregateAnnuallyOrders(ordersData);
            default: return aggregateMonthlyOrders(ordersData);
        }
    }, [ordersView, aggregateMonthlyOrders, aggregateQuarterlyOrders, aggregateAnnuallyOrders]);

    const getTopProductsByStock = useCallback((productsData) => {
        return [...productsData]
            .sort((a, b) => b.totalProducts - a.totalProducts)
            .slice(0, 8)
            .map(p => ({
                name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
                quantity: p.totalProducts
            }));
    }, []);

    // Initialize charts
    const initCharts = useCallback(() => {
        // Clear any pending chart creation timeout
        if (chartTimerRef.current) {
            clearTimeout(chartTimerRef.current);
            chartTimerRef.current = null;
        }

        if (ordersChartInstance.current) { ordersChartInstance.current.destroy(); ordersChartInstance.current = null; }
        if (stockChartInstance.current) { stockChartInstance.current.destroy(); stockChartInstance.current = null; }

        const ordersChartData = getOrdersData(orders);
        const topProducts = getTopProductsByStock(products);

        chartTimerRef.current = setTimeout(() => {
            if (ordersChartRef.current && orders.length > 0) {
                try {
                    const ctx = ordersChartRef.current.getContext('2d');
                    if (ctx) {
                        ordersChartInstance.current = new ChartJS(ctx, {
                            type: 'line',
                            data: {
                                labels: ordersChartData.labels,
                                datasets: [{
                                    label: 'Orders',
                                    data: ordersChartData.data,
                                    backgroundColor: 'rgba(0, 123, 255, 0.2)',
                                    borderColor: '#007bff',
                                    borderWidth: 3,
                                    tension: 0.4,
                                    fill: true,
                                    pointBackgroundColor: '#007bff',
                                    pointBorderColor: '#fff'
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
                                    x: { grid: { display: false } }
                                }
                            }
                        });
                    }
                } catch (error) { // console.error('Error creating orders chart:', error); 
                }
            }

            if (stockChartRef.current && products.length > 0) {
                try {
                    const ctx = stockChartRef.current.getContext('2d');
                    if (ctx) {
                        stockChartInstance.current = new ChartJS(ctx, {
                            type: 'bar',
                            data: {
                                labels: topProducts.map(p => p.name),
                                datasets: [{
                                    label: 'Stock Quantity',
                                    data: topProducts.map(p => p.quantity),
                                    backgroundColor: '#007bff',
                                    borderRadius: 5
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
                                    x: { grid: { display: false } }
                                }
                            }
                        });
                    }
                } catch (error) { // console.error('Error creating stock chart:', error); 
                }
            }
        }, 100);
    }, [orders, products, getOrdersData, getTopProductsByStock]);

    // Initialize charts when data changes
    useEffect(() => {
        if (!loading && (orders.length > 0 || products.length > 0)) {
            initCharts();
        }
        return () => {
            if (chartTimerRef.current) { clearTimeout(chartTimerRef.current); chartTimerRef.current = null; }
            if (ordersChartInstance.current) { ordersChartInstance.current.destroy(); ordersChartInstance.current = null; }
            if (stockChartInstance.current) { stockChartInstance.current.destroy(); stockChartInstance.current = null; }
        };
    }, [loading, orders, products, ordersView, initCharts]);

    // Fetch all data on mount
    useEffect(() => {
        // Don't fetch until role/permissions are fully loaded
        if (roleLoading) return;

        // Extract warehouse from user details
        if (userDetails && userDetails.warehouse) {
            // warehouse can be an object {_id, wName, wAddress} or string
            const warehouseName = typeof userDetails.warehouse === 'string'
                ? userDetails.warehouse
                : userDetails.warehouse.wName || userDetails.warehouse.name;
            setManagerWarehouse(warehouseName);
        }
        fetchAllData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userDetails, roleLoading, permissions]);

    const fetchAllData = async () => {
        try {
            const headers = {
                'Content-Type': 'application/json',
                'auth-token': localStorage.getItem('token')
            };

            let employeesData = [];
            let ordersData = [];
            let productsData = [];
            let warehousesData = [];
            let categoriesData = [];

            // Only fetch employees if user has permission
            if (hasPermission('canViewEmployees')) {
                const employeesRes = await fetch('http://localhost:5000/api/employee/getallemployees', {
                    method: 'POST',
                    headers
                });
                employeesData = employeesRes.ok ? await employeesRes.json() : [];
            }
            setEmployees(employeesData);

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

            // Only fetch warehouses if user has permission
            if (hasPermission('canViewWarehouses')) {
                const warehousesRes = await fetch('http://localhost:5000/api/warehouse/getwarehouse', {
                    method: 'POST',
                    headers
                });
                warehousesData = warehousesRes.ok ? await warehousesRes.json() : [];
            }
            setWarehouses(warehousesData);

            // Only fetch categories if user has permission
            if (hasPermission('canViewCategories')) {
                const categoriesRes = await fetch('http://localhost:5000/api/category/getcategories', {
                    method: 'POST',
                    headers
                });
                categoriesData = categoriesRes.ok ? await categoriesRes.json() : [];
            }
            setCategories(categoriesData);

            // Calculate statistics
            const lowStockCount = productsData.filter(p => p.totalProducts <= 10).length;

            setStats({
                totalEmployees: employeesData.length,
                totalOrders: ordersData.length,
                totalProducts: productsData.length,
                totalWarehouses: warehousesData.length,
                totalCategories: categoriesData.length,
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

    if (loading) {
        return <div className="dashboard-container"><p>Loading dashboard...</p></div>;
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <h1>Manager Dashboard</h1>
                        <p>Oversee operations and manage resources</p>
                    </div>
                    {managerWarehouse && (
                        <div style={{
                            backgroundColor: '#e7f3ff',
                            padding: '12px 20px',
                            borderRadius: '8px',
                            border: '2px solid #0056b3',
                            textAlign: 'right'
                        }}>
                            <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666' }}>Assigned Warehouse</p>
                            <h3 style={{ margin: 0, color: '#0056b3', fontSize: '18px' }}>{managerWarehouse}</h3>
                        </div>
                    )}
                    {!managerWarehouse && (
                        <div style={{
                            backgroundColor: '#fff3cd',
                            padding: '12px 20px',
                            borderRadius: '8px',
                            border: '2px solid #856404',
                            textAlign: 'right'
                        }}>
                            <p style={{ margin: 0, color: '#856404', fontWeight: 'bold' }}>⚠️ No Warehouse Assigned</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Key Statistics */}
            <div className="stats-grid">
                {hasPermission('canViewEmployees') && (
                    <div className="stat-card employees-stat">
                        <div className="stat-icon">👥</div>
                        <div className="stat-content">
                            <h3>Total Employees</h3>
                            <p className="stat-number">{stats.totalEmployees}</p>
                            <span className="stat-label">Team Members</span>
                        </div>
                    </div>
                )}

                {hasPermission('canViewOrders') && (
                    <div className="stat-card orders-stat">
                        <div className="stat-icon">📦</div>
                        <div className="stat-content">
                            <h3>Orders</h3>
                            <p className="stat-number">{stats.totalOrders}</p>
                            <span className="stat-label">Total Orders</span>
                        </div>
                    </div>
                )}

                {hasPermission('canViewProducts') && (
                    <div className="stat-card products-stat">
                        <div className="stat-icon">📊</div>
                        <div className="stat-content">
                            <h3>Products</h3>
                            <p className="stat-number">{stats.totalProducts}</p>
                            <span className="stat-label">In Inventory</span>
                        </div>
                    </div>
                )}

                {hasPermission('canViewWarehouses') && (
                    <div className="stat-card warehouse-stat">
                        <div className="stat-icon">🏢</div>
                        <div className="stat-content">
                            <h3>Warehouses</h3>
                            <p className="stat-number">{stats.totalWarehouses}</p>
                            <span className="stat-label">Storage Units</span>
                        </div>
                    </div>
                )}

                {hasPermission('canViewCategories') && (
                    <div className="stat-card" style={{ borderLeft: '4px solid #17a2b8' }}>
                        <div className="stat-icon">🏷️</div>
                        <div className="stat-content">
                            <h3>Categories</h3>
                            <p className="stat-number">{stats.totalCategories}</p>
                            <span className="stat-label">Product Groups</span>
                        </div>
                    </div>
                )}

                {hasPermission('canViewProducts') && (
                    <div className="stat-card alert-stat">
                        <div className="stat-icon">⚠️</div>
                        <div className="stat-content">
                            <h3>Low Stock</h3>
                            <p className="stat-number">{stats.lowStockItems}</p>
                            <span className="stat-label">Items</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Charts Section */}
            {hasPermission('canViewOrders') && (
                <div className="row my-4">
                    <div className="col-12">
                        <div className="p-4 bg-white shadow rounded-4 border">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h2 className="mb-0">Orders Overview</h2>
                                <select
                                    className="form-select w-auto"
                                    value={ordersView}
                                    onChange={(e) => setOrdersView(e.target.value)}
                                >
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="annually">Annually</option>
                                </select>
                            </div>
                            <div style={{ height: '300px' }}>
                                {orders.length === 0 ? (
                                    <div className="alert alert-info" role="alert">
                                        <i className="bi bi-info-circle me-2"></i>
                                        No order data available to display chart.
                                    </div>
                                ) : (
                                    <canvas ref={ordersChartRef} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {hasPermission('canViewProducts') && (
                <div className="row my-4">
                    <div className="col-12">
                        <div className="p-4 bg-white shadow rounded-4 border">
                            <h2 className="mb-4">Stock Overview - Top Products</h2>
                            <div style={{ height: '300px' }}>
                                {products.length === 0 ? (
                                    <div className="alert alert-info" role="alert">
                                        <i className="bi bi-info-circle me-2"></i>
                                        No product data available to display chart.
                                    </div>
                                ) : (
                                    <canvas ref={stockChartRef} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Cards */}
            <div className="action-cards">
                {hasPermission('canViewEmployees') && (
                    <div className="action-card" onClick={() => navigate('/dashboard/employee')}>
                        <h3>👥 Manage Employees</h3>
                        <p>Create, update, and manage team members</p>
                        <button className="action-btn">Go to Employees</button>
                    </div>
                )}

                {hasPermission('canViewProducts') && (
                    <div className="action-card" onClick={() => navigate('/dashboard/products')}>
                        <h3>📦 Manage Products</h3>
                        <p>Create and manage product inventory</p>
                        <button className="action-btn">Go to Products</button>
                    </div>
                )}

                {hasPermission('canViewWarehouses') && (
                    <div className="action-card" onClick={() => navigate('/dashboard/warehouses')}>
                        <h3>🏢 Warehouse Management</h3>
                        <p>Manage warehouse operations</p>
                        <button className="action-btn">Go to Warehouses</button>
                    </div>
                )}

                {hasPermission('canViewOrders') && (
                    <div className="action-card" onClick={() => navigate('/dashboard/orders')}>
                        <h3>📋 Orders</h3>
                        <p>Track and manage customer orders</p>
                        <button className="action-btn">View Orders</button>
                    </div>
                )}

                {hasPermission('canViewCategories') && (
                    <div className="action-card" onClick={() => navigate('/dashboard/category')}>
                        <h3>🏷️ Categories</h3>
                        <p>Manage product categories</p>
                        <button className="action-btn">Manage Categories</button>
                    </div>
                )}

                {hasPermission('canViewNotifications') && (
                    <div className="action-card" onClick={() => navigate('/dashboard/notifications')}>
                        <h3>🔔 Notifications</h3>
                        <p>View system notifications</p>
                        <button className="action-btn">View Notifications</button>
                    </div>
                )}
            </div>

            {/* Categories Overview */}
            {hasPermission('canViewCategories') && (
                <div className="dashboard-section">
                    <h2>Categories Overview</h2>
                    {categories.length > 0 ? (
                        <div className="row g-3">
                            {categories.slice(0, 6).map((cat, index) => (
                                <div key={cat._id || index} className="col-md-4">
                                    <div className="p-3 border rounded-3 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/category')}>
                                        <h5 className="mb-1">🏷️ {cat.cName}</h5>
                                        {cat.cDescription && <p className="text-muted mb-0 small">{cat.cDescription}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="empty-state">No categories defined yet</p>
                    )}
                </div>
            )}

            {/* Team Overview */}
            {hasPermission('canViewEmployees') && (
                <div className="dashboard-section">
                    <h2>Team Overview</h2>
                    {employees.length > 0 ? (
                        <div className="team-list">
                            {employees.slice(0, 8).map(emp => (
                                <div key={emp._id} className="team-member">
                                    <div className="member-info">
                                        <h4>{emp.fname} {emp.lname}</h4>
                                        <p>{emp.email}</p>
                                    </div>
                                    <span className="member-role">{emp.role}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="empty-state">No employees yet</p>
                    )}
                </div>
            )}

            {/* Warehouse Overview */}
            {hasPermission('canViewWarehouses') && (
                <div className="dashboard-section">
                    <h2>Warehouses</h2>
                    {warehouses.length > 0 ? (
                        <div className="warehouses-list">
                            {warehouses.slice(0, 5).map(warehouse => (
                                <div key={warehouse._id} className="warehouse-item">
                                    <h4>{warehouse.wName}</h4>
                                    <p>Manager: {warehouse.wManager}</p>
                                    <p>Location: {warehouse.city}, {warehouse.state}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="empty-state">No warehouses configured</p>
                    )}
                </div>
            )}

            {/* Recent Orders */}
            {hasPermission('canViewOrders') && (
                <div className="dashboard-section">
                    <h2>Recent Orders</h2>
                    {orders.length > 0 ? (
                        <div className="orders-list">
                            {orders.slice(0, 5).map(order => (
                                <div key={order._id} className="order-item">
                                    <div className="order-details">
                                        <h4>{order.cName || 'N/A'}</h4>
                                        <p>{order.pName || (order.products && order.products.length > 0 ? order.products[0].productName : 'N/A')}</p>
                                    </div>
                                    <div className="order-status">
                                        <span className={`status-badge ${order.dStatus || ''}`}>
                                            {order.dStatus || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="empty-state">No orders yet</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default Manager;
