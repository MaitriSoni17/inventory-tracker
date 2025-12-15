import React, { useEffect, useRef, useState } from 'react';
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
import './styles/businessowner.css';

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
    const salesRef = useRef(null);
    const stockRef = useRef(null);
    const salesChartInstance = useRef(null);
    const stockChartInstance = useRef(null);
    const resizeObserver = useRef(null);

    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalOrders: 0,
        totalCategories: 0,
        lowStockItems: 0
    });

    // Fetch all data on mount
    useEffect(() => {
        fetchAllData();
    }, []);

    // Initialize or update charts when data changes
    useEffect(() => {
        if (orders.length > 0 && products.length > 0) {
            initCharts();
        }
    }, [orders, products]);

    const fetchAllData = async () => {
        try {
            const headers = {
                'Content-Type': 'application/json',
                'auth-token': localStorage.getItem('token')
            };

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

            // Calculate statistics
            const lowStockCount = productsData.filter(p => p.totalProducts <= 10).length;
            const uniqueCategories = [...new Set(productsData.map(p => p.category))].length;

            setStats({
                totalProducts: productsData.length,
                totalOrders: ordersData.length,
                totalCategories: uniqueCategories,
                lowStockItems: lowStockCount
            });

            setLoading(false);
        } catch (error) {
            console.error('Error fetching employee dashboard data:', error);
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
            if (order.orderDate) {
                const orderDate = new Date(order.orderDate);
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

    const initCharts = () => {
        // Destroy existing charts if they exist
        if (salesChartInstance.current) {
            salesChartInstance.current.destroy();
        }
        if (stockChartInstance.current) {
            stockChartInstance.current.destroy();
        }

        const monthlyOrders = aggregateMonthlyOrders(orders);
        const topProducts = getTopProductsByOrders(products);

        if (salesRef.current) {
            const ctx = salesRef.current.getContext('2d');
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

        resizeObserver.current = new ResizeObserver(() => {
            salesChartInstance.current?.resize();
            stockChartInstance.current?.resize();
        });

        document.querySelectorAll('.chart-container').forEach(container => {
            resizeObserver.current.observe(container);
        });
    };

    useEffect(() => {
        return () => {
            salesChartInstance.current?.destroy();
            stockChartInstance.current?.destroy();
            resizeObserver.current?.disconnect();
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
                            <a href="#products" className="text-decoration-none"> <div
                                className="p-3 bg-white shadow border border-3 border-primary d-flex justify-content-around align-items-center rounded-4 dashboard-card">
                                <i
                                    className="fas fa-box dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3"></i>
                                <div className="mt-3">
                                    <h3 className="fs-2">{stats.totalProducts}</h3>
                                    <p className="fs-5">Total Products</p>
                                </div>
                            </div></a>
                        </div>

                        <div className="col-md-4">
                            <a href="#orders" className="text-decoration-none"><div
                                className="p-3 bg-white shadow border border-3 border-primary d-flex justify-content-around align-items-center rounded-4 dashboard-card">
                                <i
                                    className="bi bi-cart dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3"></i>
                                <div className="mt-3">
                                    <h3 className="fs-2">{stats.totalOrders}</h3>
                                    <p className="fs-5">Total Orders</p>
                                </div>
                            </div></a>
                        </div>

                        <div className="col-md-4">
                            <a href="#categories" className="text-decoration-none"><div
                                className="p-3 bg-white shadow border border-3 border-primary d-flex justify-content-around align-items-center rounded-4 dashboard-card">
                                <i
                                    className="bi bi-boxes dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3"></i>
                                <div className="mt-3">
                                    <h3 className="fs-2">{stats.totalCategories}</h3>
                                    <p className="fs-5">Total Categories</p>
                                </div>
                            </div></a>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="row my-5 mb-5">
                        <div className="col-12">
                            <div className="p-4 bg-white shadow rounded-4 border border-4">
                                <div className="d-flex justify-content-between mb-3">
                                    <h3 className="fs-4">Orders Overview</h3>
                                    <select className="form-select w-auto">
                                        <option>Monthly</option>
                                        <option value="1">Quarterly</option>
                                        <option value="2">Annually</option>
                                    </select>
                                </div>
                                {orders.length === 0 ? (
                                    <div className="alert alert-info m-4" role="alert">
                                        <i className="bi bi-info-circle me-2"></i>
                                        No order data available to display orders overview chart. Please add orders to see the chart.
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
                        <div className="col-md-6">
                            <div className="p-3 bg-white shadow rounded-4 border border-4">
                                <h3 className="fs-4 mb-4 mt-2 ms-2">Stock Numbers</h3>
                                <table className="table align-middle mt-4">
                                    <tbody>
                                        <tr>
                                            <td>Low Stock Items</td>
                                            <td><span className="fw-bold">{stats.lowStockItems}</span></td>
                                        </tr>
                                        <tr>
                                            <td>Items Categories</td>
                                            <td><span className="fw-bold">{stats.totalCategories}</span></td>
                                        </tr>
                                        <tr>
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
                                    <a href="#products" className="text-decoration-none me-3 text-violet fs-6 fw-normal">View All</a>
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
                                                <tr key={index}>
                                                    <td>{product.name}</td>
                                                    <td>{product.category}</td>
                                                    <td>{product.totalProducts} Units</td>
                                                    <td>₹{product.price}</td>
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
                                    <h3 className="fs-4">Stock Overview</h3>
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
                </>
            )}
        </div>
    )
}

export default Employee