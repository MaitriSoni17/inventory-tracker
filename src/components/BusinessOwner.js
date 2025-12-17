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

const BusinessOwner = (props) => {
    const salesRef = useRef(null);
    const stockRef = useRef(null);
    const salesChartInstance = useRef(null);
    const stockChartInstance = useRef(null);
    const resizeObserver = useRef(null);

    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [salesView, setSalesView] = useState('monthly');
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalOrders: 0,
        totalEmployees: 0,
        lowStockItems: 0,
        totalCategories: 0,
        totalWarehouses: 0
    });

    // Fetch all data on component mount
    useEffect(() => {
        fetchAllData();
    }, []);

    // Initialize or update charts when data changes
    useEffect(() => {
        if (orders.length > 0 || products.length > 0) {
            // Use setTimeout to ensure DOM is updated before accessing refs
            const timer = setTimeout(() => {
                initCharts();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [orders, products, salesView]);

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
            console.log('Products fetched:', productsData);
            setProducts(productsData);

            // Fetch warehouses
            const warehousesRes = await fetch('http://localhost:5000/api/warehouse/getwarehouse', {
                method: 'POST',
                headers
            });
            const warehousesData = warehousesRes.ok ? await warehousesRes.json() : [];
            setWarehouses(warehousesData);

            // Fetch employees
            const employeesRes = await fetch('http://localhost:5000/api/employee/getallemployees', {
                method: 'POST',
                headers
            });
            const employeesData = employeesRes.ok ? await employeesRes.json() : [];
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
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            props.showAlert?.('Failed to load dashboard data', 'danger');
            setLoading(false);
        }
    };

    const aggregateMonthlySales = (orders) => {
        const monthlyData = {};
        const currentYear = new Date().getFullYear();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Initialize all months with 0
        monthNames.forEach(month => {
            monthlyData[month] = 0;
        });

        // Aggregate order amounts by month (only paid orders)
        orders.forEach(order => {
            if (order.status === 'Paid' && order.oDate) {
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
        const quarterlyData = { 'Q1': 0, 'Q2': 0, 'Q3': 0, 'Q4': 0 };
        const currentYear = new Date().getFullYear();

        // Aggregate order amounts by quarter (only paid orders)
        orders.forEach(order => {
            if (order.status === 'Paid' && order.oDate) {
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
        const annualData = {};
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 4; // Show last 5 years

        // Initialize last 5 years with 0
        for (let i = startYear; i <= currentYear; i++) {
            annualData[i] = 0;
        }

        // Aggregate order amounts by year (only paid orders)
        orders.forEach(order => {
            if (order.status === 'Paid' && order.oDate) {
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
        console.log('Top products for chart:', topProducts);
        return topProducts;
    };

    const initCharts = () => {
        console.log('initCharts called');
        console.log('stockRef.current exists?', !!stockRef.current);
        console.log('salesRef.current exists?', !!salesRef.current);
        
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
            if (salesChartInstance.current && salesChartInstance.current.canvas && salesChartInstance.current.canvas.offsetParent) {
                salesChartInstance.current.resize();
            }
            if (stockChartInstance.current && stockChartInstance.current.canvas && stockChartInstance.current.canvas.offsetParent) {
                stockChartInstance.current.resize();
            }
        });

        document.querySelectorAll('.chart-container').forEach(container => {
            if (container && resizeObserver.current) {
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
                                    <i className="fas fa-box dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3"></i>
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
                                    <i className="bi bi-cart dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3"></i>
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
                                    <i className="bi bi-people dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3"></i>
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
                                <div className="d-flex justify-content-between mb-3">
                                    <h3 className="fs-4">Sales (Current Year)</h3>
                                    <select className="form-select w-auto" value={salesView} onChange={(e) => setSalesView(e.target.value)}>
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
                                                <tr key={index}>
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
    );
};

export default BusinessOwner;