import React, { useEffect, useRef } from 'react';
import './styles/businessowner.css';
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
function Supplier() {
    const salesRef = useRef(null);
    const salesChartInstance = useRef(null);
    const resizeObserver = useRef(null);
    const orderRef = useRef(null);
    const orderInstance = useRef(null);
    const centerTextRef = useRef(null);

    const completedOrders = 80;
    const pendingOrders = 41;
    const totalOrders = completedOrders + pendingOrders;

    const colors = {
        completed: '#6a1b9a',
        pending: '#7a96ff'
    };

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

        if (centerTextRef.current) {
            centerTextRef.current.innerText = totalOrders;
        }

        if (orderRef.current) {
            const ctx = orderRef.current.getContext('2d');
            orderInstance.current = new ChartJS(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Completed Orders', 'Pending Orders'],
                    datasets: [{
                        data: [completedOrders, pendingOrders],
                        backgroundColor: [colors.completed, colors.pending],
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
            salesChartInstance.current?.resize();
            orderInstance.current?.resize();
        });

        document.querySelectorAll('.chart-container').forEach(container => {
            resizeObserver.current.observe(container);
        });

        return () => {
            salesChartInstance.current?.destroy();
            orderInstance.current?.destroy();
            resizeObserver.current?.disconnect();
        };
    });

    return (
        <div className="container-fluid px-5 mt-4 mb-5">
            {/* Dashboard Cards */}
            <div className="row g-3 my-2">
                <div className="col-md-4">
                    <div
                        className="p-3 bg-white shadow border border-3 border-primary d-flex justify-content-around align-items-center rounded-4 dashboard-card">
                        <i
                            className="bi bi-box-seam dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3"></i>
                        <div className="mt-3">
                            <h3 className="fs-2">100</h3>
                            <p className="fs-5">Total Orders</p>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div
                        className="p-3 bg-white shadow border border-3 border-primary d-flex justify-content-around align-items-center rounded-4 dashboard-card">
                        <i
                            className="bi bi-clock dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3"></i>
                        <div className="mt-3">
                            <h3 className="fs-2">100</h3>
                            <p className="fs-5">Pending Orders</p>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div
                        className="p-3 bg-white shadow border border-3 border-primary d-flex justify-content-around align-items-center rounded-4 dashboard-card">
                        <i
                            className="bi bi-send-check dashboard-card-icon h-25 w-25 p-4 text-white shadow-lg fs-1 rounded-3"></i>
                        <div className="mt-3">
                            <h3 className="fs-2">100</h3>
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
                        <h3 className="fs-4 mb-4 mt-2 ms-2">Order Numbers</h3>
                        <table className="table align-middle mt-4">
                            <tbody>
                                <tr>
                                    <td>Total Orders</td>
                                    <td><span className="fw-bold">100</span></td>
                                </tr>
                                <tr>
                                    <td>Pending Orders</td>
                                    <td><span className="fw-bold">100</span></td>
                                </tr>
                                <tr>
                                    <td>Completed Orders</td>
                                    <td><span className="fw-bold">100</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="col-md-6">
                    <div className="p-3 bg-white shadow border border-4 rounded-4">
                        <h3 className="fs-4 mb-3 ms-2 mt-2 d-flex justify-content-between align-items-baseline">
                            Orders
                            <a href="orders.html" className="text-decoration-none me-3 text-violet fs-6 fw-normal">View All</a>
                        </h3>
                        <table className="table table-borderless align-middle mb-0">
                            <thead className="text-secondary">
                                <tr>
                                    <th scope="col">Order Title</th>
                                    <th scope="col">Deadline</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Order1</td>
                                    <td>31/10/2025</td>
                                    <td>Paid</td>
                                    <td>₹100</td>
                                </tr>
                                <tr>
                                    <td>Order1</td>
                                    <td>31/10/2025</td>
                                    <td>Paid</td>
                                    <td>₹100</td>
                                </tr>
                                <tr>
                                    <td>Order1</td>
                                    <td>31/10/2025</td>
                                    <td>Paid</td>
                                    <td>₹100</td>
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
                            <h3 className="fs-4">Orders</h3>
                        </div>
                        <div className="chart-container position-relative">
                            <div
                                ref={centerTextRef}
                                className="position-absolute top-50 start-50 translate-middle fw-bold fs-1"
                                style={{ zIndex: 1 }}
                            ></div>

                            <canvas ref={orderRef}/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Supplier