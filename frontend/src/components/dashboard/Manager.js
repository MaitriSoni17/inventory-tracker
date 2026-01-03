import React, { useEffect, useRef, useState } from 'react';
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
    const { userDetails } = useRole();
    const salesRef = useRef(null);
    const stockRef = useRef(null);
    const salesChartInstance = useRef(null);
    const stockChartInstance = useRef(null);

    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [managerWarehouse, setManagerWarehouse] = useState(null);
    const [stats, setStats] = useState({
        totalEmployees: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalWarehouses: 0,
        lowStockItems: 0
    });

    // Fetch all data on mount
    useEffect(() => {
        // Extract warehouse from user details
        if (userDetails && userDetails.warehouse) {
            // warehouse can be an object {_id, wName, wAddress} or string
            const warehouseName = typeof userDetails.warehouse === 'string' 
                ? userDetails.warehouse 
                : userDetails.warehouse.wName || userDetails.warehouse.name;
            setManagerWarehouse(warehouseName);
        }
        fetchAllData();
    }, [userDetails]);

    const fetchAllData = async () => {
        try {
            const headers = {
                'Content-Type': 'application/json',
                'auth-token': localStorage.getItem('token')
            };

            // Fetch employees
            const employeesRes = await fetch('http://localhost:5000/api/employee/getallemployees', {
                method: 'POST',
                headers
            });
            const employeesData = employeesRes.ok ? await employeesRes.json() : [];
            setEmployees(employeesData);

            // Fetch orders
            const ordersRes = await fetch('http://localhost:5000/api/customerorders/getcustomerorder', {
                method: 'POST',
                headers
            });
            const ordersData = ordersRes.ok ? await ordersRes.json() : [];
            setOrders(ordersData);

            // Fetch products
            const productsRes = await fetch('http://localhost:5000/api/products/getproduct', {
                method: 'POST',
                headers
            });
            const productsData = productsRes.ok ? await productsRes.json() : [];
            setProducts(productsData);

            // Fetch warehouses
            const warehousesRes = await fetch('http://localhost:5000/api/warehouse/getwarehouse', {
                method: 'POST',
                headers
            });
            const warehousesData = warehousesRes.ok ? await warehousesRes.json() : [];
            setWarehouses(warehousesData);

            // Fetch categories
            const categoriesRes = await fetch('http://localhost:5000/api/category/getcategories', {
                method: 'POST',
                headers
            });
            const categoriesData = categoriesRes.ok ? await categoriesRes.json() : [];
            setCategories(categoriesData);

            // Calculate statistics
            const lowStockCount = productsData.filter(p => p.totalProducts <= 10).length;

            setStats({
                totalEmployees: employeesData.length,
                totalOrders: ordersData.length,
                totalProducts: productsData.length,
                totalWarehouses: warehousesData.length,
                lowStockItems: lowStockCount
            });

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
                <div className="stat-card employees-stat">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <h3>Total Employees</h3>
                        <p className="stat-number">{stats.totalEmployees}</p>
                        <span className="stat-label">Team Members</span>
                    </div>
                </div>

                <div className="stat-card orders-stat">
                    <div className="stat-icon">📦</div>
                    <div className="stat-content">
                        <h3>Orders</h3>
                        <p className="stat-number">{stats.totalOrders}</p>
                        <span className="stat-label">Total Orders</span>
                    </div>
                </div>

                <div className="stat-card products-stat">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <h3>Products</h3>
                        <p className="stat-number">{stats.totalProducts}</p>
                        <span className="stat-label">In Inventory</span>
                    </div>
                </div>

                <div className="stat-card warehouse-stat">
                    <div className="stat-icon">🏢</div>
                    <div className="stat-content">
                        <h3>Warehouses</h3>
                        <p className="stat-number">{stats.totalWarehouses}</p>
                        <span className="stat-label">Storage Units</span>
                    </div>
                </div>

                <div className="stat-card alert-stat">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-content">
                        <h3>Low Stock</h3>
                        <p className="stat-number">{stats.lowStockItems}</p>
                        <span className="stat-label">Items</span>
                    </div>
                </div>
            </div>

            {/* Action Cards */}
            <div className="action-cards">
                <div className="action-card" onClick={() => navigate('/employee')}>
                    <h3>👥 Manage Employees</h3>
                    <p>Create, update, and manage team members</p>
                    <button className="action-btn">Go to Employees</button>
                </div>

                <div className="action-card" onClick={() => navigate('/products')}>
                    <h3>📦 Manage Products</h3>
                    <p>Create and manage product inventory</p>
                    <button className="action-btn">Go to Products</button>
                </div>

                <div className="action-card" onClick={() => navigate('/warehouse')}>
                    <h3>🏢 Warehouse Management</h3>
                    <p>Manage warehouse operations</p>
                    <button className="action-btn">Go to Warehouses</button>
                </div>

                <div className="action-card" onClick={() => navigate('/customerorders')}>
                    <h3>📋 Orders</h3>
                    <p>Track and manage customer orders</p>
                    <button className="action-btn">View Orders</button>
                </div>

                <div className="action-card" onClick={() => navigate('/category')}>
                    <h3>🏷️ Categories</h3>
                    <p>Manage product categories</p>
                    <button className="action-btn">Manage Categories</button>
                </div>

                <div className="action-card" onClick={() => navigate('/notifications')}>
                    <h3>🔔 Notifications</h3>
                    <p>View system notifications</p>
                    <button className="action-btn">View Notifications</button>
                </div>
            </div>

            {/* Team Overview */}
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

            {/* Warehouse Overview */}
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

            {/* Recent Orders */}
            <div className="dashboard-section">
                <h2>Recent Orders</h2>
                {orders.length > 0 ? (
                    <div className="orders-list">
                        {orders.slice(0, 5).map(order => (
                            <div key={order._id} className="order-item">
                                <div className="order-details">
                                    <h4>{order.customerName}</h4>
                                    <p>{order.productName}</p>
                                </div>
                                <div className="order-status">
                                    <span className={`status-badge ${order.deliveryStatus}`}>
                                        {order.deliveryStatus}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="empty-state">No orders yet</p>
                )}
            </div>
        </div>
    );
}

export default Manager;
