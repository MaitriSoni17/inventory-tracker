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

function Supervisor(props) {
    const navigate = useNavigate();
    const { userDetails } = useRole();
    const salesRef = useRef(null);
    const stockRef = useRef(null);
    const salesChartInstance = useRef(null);
    const stockChartInstance = useRef(null);

    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [subordinates, setSubordinates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [supervisorWarehouse, setSupervisorWarehouse] = useState(null);
    const [stats, setStats] = useState({
        teamSize: 0,
        ordersPlaced: 0,
        productsManaged: 0,
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
            setSupervisorWarehouse(warehouseName);
        }
        fetchAllData();
    }, [userDetails]);

    const fetchAllData = async () => {
        try {
            const headers = {
                'Content-Type': 'application/json',
                'auth-token': localStorage.getItem('token')
            };

            // Fetch orders (supervisor's team orders)
            const ordersRes = await fetch('http://localhost:5000/api/customerorders/getcustomerorder', {
                method: 'POST',
                headers
            });
            const ordersData = ordersRes.ok ? await ordersRes.json() : [];
            setOrders(ordersData);

            // Fetch products (supervisor's team products)
            const productsRes = await fetch('http://localhost:5000/api/products/getproduct', {
                method: 'POST',
                headers
            });
            const productsData = productsRes.ok ? await productsRes.json() : [];
            setProducts(productsData);

            // Fetch subordinates (direct reports)
            const subordinatesRes = await fetch('http://localhost:5000/api/employee/getallemployees', {
                method: 'POST',
                headers
            });
            const subordinatesData = subordinatesRes.ok ? await subordinatesRes.json() : [];
            setSubordinates(subordinatesData);

            // Calculate statistics
            const lowStockCount = productsData.filter(p => p.totalProducts <= 10).length;

            setStats({
                teamSize: subordinatesData.length,
                ordersPlaced: ordersData.length,
                productsManaged: productsData.length,
                lowStockItems: lowStockCount
            });

            setLoading(false);
        } catch (error) {
            props.showAlert?.('Failed to load dashboard data', 'danger');
            setLoading(false);
        }
    };

    const handleViewTeam = () => {
        navigate('/employee');
    };

    const handleManageProducts = () => {
        navigate('/products');
    };

    const handleViewOrders = () => {
        navigate('/customerorders');
    };

    if (loading) {
        return <div className="dashboard-container"><p>Loading dashboard...</p></div>;
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <h1>Supervisor Dashboard</h1>
                        <p>Manage your team and operations</p>
                    </div>
                    {supervisorWarehouse && (
                        <div style={{ 
                            backgroundColor: '#e7f3ff', 
                            padding: '12px 20px', 
                            borderRadius: '8px', 
                            border: '2px solid #0056b3',
                            textAlign: 'right'
                        }}>
                            <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666' }}>Assigned Warehouse</p>
                            <h3 style={{ margin: 0, color: '#0056b3', fontSize: '18px' }}>{supervisorWarehouse}</h3>
                        </div>
                    )}
                    {!supervisorWarehouse && (
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
                <div className="stat-card team-stat">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <h3>Team Size</h3>
                        <p className="stat-number">{stats.teamSize}</p>
                        <span className="stat-label">Direct Reports</span>
                    </div>
                </div>

                <div className="stat-card orders-stat">
                    <div className="stat-icon">📦</div>
                    <div className="stat-content">
                        <h3>Orders Placed</h3>
                        <p className="stat-number">{stats.ordersPlaced}</p>
                        <span className="stat-label">Team Orders</span>
                    </div>
                </div>

                <div className="stat-card products-stat">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <h3>Products Managed</h3>
                        <p className="stat-number">{stats.productsManaged}</p>
                        <span className="stat-label">Total Products</span>
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
                <div className="action-card" onClick={handleViewTeam}>
                    <h3>👥 Manage Team</h3>
                    <p>View and manage your direct reports</p>
                    <button className="action-btn">View Team</button>
                </div>

                <div className="action-card" onClick={handleManageProducts}>
                    <h3>📦 Products</h3>
                    <p>Monitor team products and inventory</p>
                    <button className="action-btn">Manage Products</button>
                </div>

                <div className="action-card" onClick={handleViewOrders}>
                    <h3>📋 Orders</h3>
                    <p>Track team orders and delivery status</p>
                    <button className="action-btn">View Orders</button>
                </div>

                <div className="action-card" onClick={() => navigate('/notifications')}>
                    <h3>🔔 Notifications</h3>
                    <p>Stay updated with team activities</p>
                    <button className="action-btn">View Notifications</button>
                </div>
            </div>

            {/* Team Overview */}
            <div className="dashboard-section">
                <h2>Team Overview</h2>
                {subordinates.length > 0 ? (
                    <div className="team-list">
                        {subordinates.slice(0, 5).map(emp => (
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
                    <p className="empty-state">No team members yet</p>
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

export default Supervisor;
