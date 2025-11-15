import React, { useEffect, useRef } from 'react';
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
function Employee() {
    const salesRef = useRef(null);
    const stockRef = useRef(null);
    const salesChartInstance = useRef(null);
    const stockChartInstance = useRef(null);
    const resizeObserver = useRef(null);

    useEffect(() => {
        if (salesRef.current) {
            const ctx = salesRef.current.getContext('2d');
            salesChartInstance.current = new ChartJS(ctx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                        label: 'Sales',
                        data: [15000, 22000, 28000, 18000, 35000, 30000, 42000, 38000, 50000, 45000, 60000, 75000],
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
                                        label += new Intl.NumberFormat('en-US', {
                                            style: 'currency',
                                            currency: 'USD',
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

        if (stockRef.current) {
            const ctx = stockRef.current.getContext('2d');
            stockChartInstance.current = new ChartJS(ctx, {
                type: 'bar',
                data: {
                    labels: ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5', 'Item 6', 'Item 7', 'Item 8', 'Item 9', 'Item 10', 'Item 11', 'Item 12'],
                    datasets: [{
                        label: 'Stock Quantity',
                        data: [35000, 20000, 45000, 28000, 55000, 38000, 48000, 60000, 30000, 40000, 52000, 25000],
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

        return () => {
            salesChartInstance.current?.destroy();
            stockChartInstance.current?.destroy();
            resizeObserver.current?.disconnect();
        };
    }, []);

    return (
        <div className="container-fluid px-5 mt-4 mb-5">
            {/* Dashboard Cards */}
            <div className="row g-3 my-2">
                <div className="col-md-4">
                    <a href="products.html" className="text-decoration-none"> <div
                        className="p-3 bg-white shadow border border-3 border-primary d-flex justify-content-around align-items-center rounded-4 dashboard-card">
                        <i
                            className="fas fa-box dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3"></i>
                        <div className="mt-3">
                            <h3 className="fs-2">100</h3>
                            <p className="fs-5">Total Products</p>
                        </div>
                    </div></a>
                </div>

                <div className="col-md-4">
                    <a href="orders.html" className="text-decoration-none"><div
                        className="p-3 bg-white shadow border border-3 border-primary d-flex justify-content-around align-items-center rounded-4 dashboard-card">
                        <i
                            className="bi bi-cart dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3"></i>
                        <div className="mt-3">
                            <h3 className="fs-2">100</h3>
                            <p className="fs-5">Total Orders</p>
                        </div>
                    </div></a>
                </div>

                <div className="col-md-4">
                    <a href="category.html" className="text-decoration-none"><div
                        className="p-3 bg-white shadow border border-3 border-primary d-flex justify-content-around align-items-center rounded-4 dashboard-card">
                        <i
                            className="bi bi-boxes dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3"></i>
                        <div className="mt-3">
                            <h3 className="fs-2">100</h3>
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
                        <div className="chart-container">
                            <canvas ref={salesRef} className="m-4" />
                        </div>
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
                                    <td><span className="fw-bold">100</span></td>
                                </tr>
                                <tr>
                                    <td>Items Categories</td>
                                    <td><span className="fw-bold">100</span></td>
                                </tr>
                                <tr>
                                    <td>Total Stocks</td>
                                    <td><span className="fw-bold">100</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="col-md-6">
                    <div className="p-3 bg-white shadow border border-4 rounded-4">
                        <h3 className="fs-4 mb-3 ms-2 mt-2 d-flex justify-content-between align-items-baseline">
                            Products
                            <a href="products.html" className="text-decoration-none me-3 text-violet fs-6 fw-normal">View All</a>
                        </h3>
                        <table className="table table-borderless align-middle mb-0">
                            <thead className="text-secondary">
                                <tr>
                                    <th scope="col">Product Name</th>
                                    <th scope="col">Location</th>
                                    <th scope="col">Total Products</th>
                                    <th scope="col">Total Orders</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Product1</td>
                                    <td>Location</td>
                                    <td>10 Products</td>
                                    <td>20 Orders</td>
                                </tr>
                                <tr>
                                    <td>Product1</td>
                                    <td>Location</td>
                                    <td>10 Products</td>
                                    <td>20 Orders</td>
                                </tr>
                                <tr>
                                    <td>Product1</td>
                                    <td>Location</td>
                                    <td>10 Products</td>
                                    <td>20 Orders</td>
                                </tr>
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
                        <div className="chart-container">
                            <canvas ref={stockRef} className="m-4" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Employee