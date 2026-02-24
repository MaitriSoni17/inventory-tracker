import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/dashboard-elegant.css';
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

import { DoughnutController, ArcElement } from 'chart.js';

ChartJS.register(DoughnutController, ArcElement, Tooltip, Legend);

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
function Supplier(props) {
    const navigate = useNavigate();
    const salesRef = useRef(null);
    const salesChartInstance = useRef(null);
    const resizeObserver = useRef(null);
    const orderRef = useRef(null);
    const orderInstance = useRef(null);
    const centerTextRef = useRef(null);

    const [supplierOrders, setSupplierOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timePeriod, setTimePeriod] = useState('monthly');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [stats, setStats] = useState({
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0
    });

    // Fetch supplier orders on mount
    useEffect(() => {
        fetchSupplierOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Initialize charts when data changes or time period changes
    useEffect(() => {
        if (supplierOrders && supplierOrders.length > 0) {
            initCharts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supplierOrders, timePeriod]);
    const fetchSupplierOrders = async () => {
        try {
            setLoading(true);
            const headers = {
                'Content-Type': 'application/json',
                'auth-token': localStorage.getItem('token')
            };

            // Fetch supplier orders
            const response = await fetch('http://localhost:5000/api/supplierorders/getorders', {
                method: 'POST',
                headers
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('role');
                    window.location.href = '/';
                    return;
                }
                setSupplierOrders([]);
                setStats({
                    totalOrders: 0,
                    pendingOrders: 0,
                    completedOrders: 0
                });
                setLoading(false);
                return;
            }

            const data = await response.json();
            setSupplierOrders(Array.isArray(data) ? data : []);

            // Calculate statistics
            const orders = Array.isArray(data) ? data : [];
            const completed = orders.filter(o => o.status?.toLowerCase() === 'completed').length;
            const pending = orders.filter(o => o.status?.toLowerCase() === 'pending').length;

            setStats({
                totalOrders: orders.length,
                pendingOrders: pending,
                completedOrders: completed
            });

            setLoading(false);
        } catch (error) {
            props.showAlert?.('Failed to load supplier orders', 'danger');
            setSupplierOrders([]);
            setStats({
                totalOrders: 0,
                pendingOrders: 0,
                completedOrders: 0
            });
            setLoading(false);
        }
    };

    // Handle card clicks to navigate to filtered orders page
    const handleCardClick = (filterType) => {
        navigate('/dashboard/suppliersorders', { 
            state: { filterType } 
        });
    };

    const aggregateOrdersByPeriod = (orders, period = 'monthly') => {
        const currentYear = new Date().getFullYear();
        let aggregatedData = {};
        let labels = [];

        if (period === 'monthly') {
            // Monthly aggregation
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            monthNames.forEach(month => {
                aggregatedData[month] = 0;
            });

            orders.forEach(order => {
                if (order.oDate) {
                    const orderDate = new Date(order.oDate);
                    if (orderDate.getFullYear() === currentYear) {
                        const monthIndex = orderDate.getMonth();
                        const monthName = monthNames[monthIndex];
                        aggregatedData[monthName] += 1;
                    }
                }
            });
            labels = Object.keys(aggregatedData);
        } else if (period === 'quarterly') {
            // Quarterly aggregation
            const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
            quarters.forEach(quarter => {
                aggregatedData[quarter] = 0;
            });

            orders.forEach(order => {
                if (order.oDate) {
                    const orderDate = new Date(order.oDate);
                    if (orderDate.getFullYear() === currentYear) {
                        const monthIndex = orderDate.getMonth();
                        const quarterIndex = Math.floor(monthIndex / 3);
                        const quarter = quarters[quarterIndex];
                        aggregatedData[quarter] += 1;
                    }
                }
            });
            labels = Object.keys(aggregatedData);
        } else if (period === 'annually') {
            // Annually aggregation - show last 5 years
            const startYear = currentYear - 4;
            for (let year = startYear; year <= currentYear; year++) {
                aggregatedData[year.toString()] = 0;
            }

            orders.forEach(order => {
                if (order.oDate) {
                    const orderDate = new Date(order.oDate);
                    const year = orderDate.getFullYear();
                    if (year >= startYear && year <= currentYear) {
                        aggregatedData[year.toString()] += 1;
                    }
                }
            });
            labels = Object.keys(aggregatedData);
        }

        return {
            labels: labels,
            data: labels.map(label => aggregatedData[label])
        };
    };

    const initCharts = () => {
        // Destroy existing charts if they exist
        try {
            if (salesChartInstance.current) {
                salesChartInstance.current.destroy();
                salesChartInstance.current = null;
            }
        } catch (error) {
        }

        try {
            if (orderInstance.current) {
                orderInstance.current.destroy();
                orderInstance.current = null;
            }
        } catch (error) {
        }

        // Validate refs exist and canvas elements are in DOM before creating charts
        if (!salesRef.current || !orderRef.current) {
            return;
        }

        const monthlyOrders = aggregateOrdersByPeriod(supplierOrders, timePeriod);
        // eslint-disable-next-line no-unused-vars
        const completedOrders = stats.completedOrders;
        // eslint-disable-next-line no-unused-vars
        const pendingOrders = stats.pendingOrders;
        const totalOrders = stats.totalOrders;

        // eslint-disable-next-line no-unused-vars
        const colors = {
            completed: '#6a1b9a',
            pending: '#7a96ff'
        };

        if (salesRef.current) {
            const ctx = salesRef.current.getContext('2d');
            if (!ctx) {
                return;
            }
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

        if (centerTextRef.current) {
            centerTextRef.current.innerText = totalOrders;
        }

        if (orderRef.current) {
            const ctx = orderRef.current.getContext('2d');
            if (!ctx) {
                return;
            }

            // Build distribution data dynamically based on actual order statuses
            const statusCounts = {};
            const statusColors = {
                'completed': '#6a1b9a',
                'pending': '#7a96ff',
                'confirmed': '#17a2b8',
                'shipped': '#ffc107'
            };

            supplierOrders.forEach(order => {
                const status = order.status?.toLowerCase() || 'pending';
                statusCounts[status] = (statusCounts[status] || 0) + 1;
            });

            // Filter out statuses with 0 count and create labels and data arrays
            const labels = Object.keys(statusCounts)
                .map(status => status.charAt(0).toUpperCase() + status.slice(1) + ' Orders');
            const data = Object.values(statusCounts);
            const backgroundColor = Object.keys(statusCounts)
                .map(status => statusColors[status] || '#999999');

            orderInstance.current = new ChartJS(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: backgroundColor,
                        hoverOffset: 4,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                boxWidth: 6,
                                padding: 20
                            }
                        },
                        tooltip: {
                            backgroundColor: '#333',
                            titleColor: '#fff',
                            bodyColor: '#fff'
                        }
                    }
                }
            });
        }

        resizeObserver.current = new ResizeObserver(() => {
            if (salesChartInstance.current && salesChartInstance.current.ctx) {
                try {
                    salesChartInstance.current.resize();
                } catch (error) {
                }
            }
            if (orderInstance.current && orderInstance.current.ctx) {
                try {
                    orderInstance.current.resize();
                } catch (error) {
                }
            }
        });

        const chartContainers = document.querySelectorAll('.chart-container');
        if (chartContainers && chartContainers.length > 0) {
            chartContainers.forEach(container => {
                if (container && resizeObserver.current) {
                    resizeObserver.current.observe(container);
                }
            });
        }
    };

    useEffect(() => {
        return () => {
            // Properly cleanup charts and observer
            try {
                if (salesChartInstance.current) {
                    salesChartInstance.current.destroy();
                    salesChartInstance.current = null;
                }
            } catch (error) {
            }

            try {
                if (orderInstance.current) {
                    orderInstance.current.destroy();
                    orderInstance.current = null;
                }
            } catch (error) {
            }

            try {
                if (resizeObserver.current) {
                    resizeObserver.current.disconnect();
                    resizeObserver.current = null;
                }
            } catch (error) {
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
                        <div className="col-md-4">
                            <div
                                onClick={() => handleCardClick('all')}
                                style={{ cursor: 'pointer' }}
                                className="p-3 bg-white shadow border border-3 border-primary d-flex justify-content-around align-items-center rounded-4 dashboard-card"
                                title="Click to view all orders">
                                <div className="dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3">
                                    <i className="bi bi-box-seam-fill"></i>
                                </div>
                                <div className="mt-3">
                                    <h3 className="fs-2">{stats.totalOrders}</h3>
                                    <p className="fs-5">Total Orders</p>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-4">
                            <div
                                onClick={() => handleCardClick('pending')}
                                style={{ cursor: 'pointer' }}
                                className="p-3 bg-white shadow border border-3 border-primary d-flex justify-content-around align-items-center rounded-4 dashboard-card"
                                title="Click to view pending orders">
                                <div className="dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3">
                                    <i className="bi bi-clock"></i>
                                </div>
                                <div className="mt-3">
                                    <h3 className="fs-2">{stats.pendingOrders}</h3>
                                    <p className="fs-5">Pending Orders</p>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-4">
                            <div
                                onClick={() => handleCardClick('completed')}
                                style={{ cursor: 'pointer' }}
                                className="p-3 bg-white shadow border border-3 border-primary d-flex justify-content-around align-items-center rounded-4 dashboard-card"
                                title="Click to view completed orders">
                               <div className="dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3">
                                    <i className="bi bi-send-check"></i>
                                </div>
                                <div className="mt-3">
                                    <h3 className="fs-2">{stats.completedOrders}</h3>
                                    <p className="fs-5">Completed Orders</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="row my-5 mb-5">
                        <div className="col-12">
                            <div className="p-4 bg-white shadow rounded-4 border border-4">
                                <div className="d-flex justify-content-between mb-3">
                                    <h3 className="fs-4">Orders Overview</h3>
                                    <select 
                                        className="form-select w-auto pe-5"
                                        value={timePeriod}
                                        onChange={(e) => setTimePeriod(e.target.value)}>
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="annually">Annually</option>
                                    </select>
                                </div>
                                {supplierOrders.length === 0 ? (
                                    <div className="alert alert-info m-4" role="alert">
                                        <i className="bi bi-info-circle me-2"></i>
                                        No supplier order data available to display orders overview chart. Please add supplier orders to see the chart.
                                    </div>
                                ) : (
                                    <div className="chart-container" style={{ height: '400px' }}>
                                        <canvas ref={salesRef} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="row my-4 g-3">
                        <div className="col-md-5 me-5">
                            <div className="p-3 bg-white shadow rounded-4 border border-4">
                                <h3 className="fs-4 mb-4 mt-2 ms-2">Order Numbers</h3>
                                <table className="table align-middle mt-4">
                                    <tbody>
                                        <tr 
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => navigate('/dashboard/suppliersorders')}
                                        >
                                            <td>Total Orders</td>
                                            <td><span className="fw-bold">{stats.totalOrders}</span></td>
                                        </tr>
                                        <tr 
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => navigate('/dashboard/suppliersorders?filter=pending')}
                                        >
                                            <td>Pending Orders</td>
                                            <td><span className="fw-bold">{stats.pendingOrders}</span></td>
                                        </tr>
                                        <tr 
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => navigate('/dashboard/suppliersorders?filter=completed')}
                                        >
                                            <td>Completed Orders</td>
                                            <td><span className="fw-bold">{stats.completedOrders}</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="p-3 bg-white shadow border border-4 rounded-4">
                                <h3 className="fs-4 mb-3 ms-2 mt-2 d-flex justify-content-between align-items-baseline">
                                    Recent Orders
                                    <a href="/dashboard/supplierorders" className="text-decoration-none me-3 text-violet fs-6 fw-normal">View All</a>
                                </h3>
                                <table className="table table-borderless align-middle mb-0">
                                    <thead className="text-secondary">
                                        <tr>
                                            <th scope="col">Product Name</th>
                                            <th scope="col">Order Date</th>
                                            <th scope="col">Status</th>
                                            <th scope="col">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {supplierOrders.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="text-center text-muted">No orders found</td>
                                            </tr>
                                        ) : (
                                            supplierOrders.slice(0, 3).map((order, index) => (
                                                <tr 
                                                    key={index}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => {
                                                        setSelectedOrder(order);
                                                        setShowOrderModal(true);
                                                        navigate('/dashboard/suppliersorders');
                                                    }}
                                                >
                                                    <td>{order.pName || 'N/A'}</td>
                                                    <td>{order.oDate ? new Date(order.oDate).toLocaleDateString() : 'N/A'}</td>
                                                    <td><span className={`badge ${order.status?.toLowerCase() === 'completed' ? 'bg-success' : 'bg-warning'}`}>{order.status || 'Pending'}</span></td>
                                                    <td>₹{order.amount || 0}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="row my-5 mb-5">
                        <div className="col-12">
                            <div className="p-4 bg-white shadow rounded-4 border border-4">
                                <div className="d-flex justify-content-between mb-3">
                                    <h3 className="fs-4">Orders Distribution</h3>
                                </div>
                                {supplierOrders.length === 0 ? (
                                    <div className="alert alert-info m-4" role="alert">
                                        <i className="bi bi-info-circle me-2"></i>
                                        No supplier order data available to display orders distribution chart. Please add supplier orders to see the chart.
                                    </div>
                                ) : (
                                    <div className="chart-container position-relative" style={{ height: '400px' }}>
                                        <div
                                            ref={centerTextRef}
                                            className="position-absolute top-50 start-50 translate-middle fw-bold fs-1"
                                            style={{ zIndex: 1 }}
                                        ></div>
                                        <canvas ref={orderRef} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Order Details Modal */}
                    {showOrderModal && selectedOrder && (
                        <div 
                            className="modal fade show d-block" 
                            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                        >
                            <div className="modal-dialog modal-dialog-centered">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h5 className="modal-title">Order Details</h5>
                                        <button 
                                            type="button" 
                                            className="btn-close" 
                                            onClick={() => setShowOrderModal(false)}
                                        ></button>
                                    </div>
                                    <div className="modal-body">
                                        <div className="mb-3">
                                            <label className="form-label fw-bold text-muted">Product Name</label>
                                            <p className="form-control-plaintext">{selectedOrder.pName || 'N/A'}</p>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold text-muted">Order Date</label>
                                            <p className="form-control-plaintext">{selectedOrder.oDate ? new Date(selectedOrder.oDate).toLocaleDateString() : 'N/A'}</p>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold text-muted">Status</label>
                                            <p className="form-control-plaintext">
                                                <span className={`badge ${selectedOrder.status?.toLowerCase() === 'completed' ? 'bg-success' : 'bg-warning'}`}>
                                                    {selectedOrder.status || 'Pending'}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold text-muted">Amount</label>
                                            <p className="form-control-plaintext">₹{selectedOrder.amount || 0}</p>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold text-muted">Quantity</label>
                                            <p className="form-control-plaintext">{selectedOrder.quantity || 'N/A'}</p>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold text-muted">Supplier Name</label>
                                            <p className="form-control-plaintext">{selectedOrder.sName || 'N/A'}</p>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold text-muted">Notes</label>
                                            <p className="form-control-plaintext">{selectedOrder.notes || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button 
                                            type="button" 
                                            className="btn btn-secondary" 
                                            onClick={() => setShowOrderModal(false)}
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
    )
}

export default Supplier

