import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

const Orders = (props) => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDeliveryStatus, setFilterDeliveryStatus] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    useEffect(() => {
        filterOrders();
    }, [orders, searchTerm, filterStatus, filterDeliveryStatus]);

    const fetchOrders = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/customerorders/getcustomerorder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const data = await response.json();
                setOrders(data);
                setFilteredOrders(data);
            } else {
                props.showAlert('Failed to fetch orders', 'danger');
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            props.showAlert('Error fetching orders', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const filterOrders = () => {
        let filtered = orders;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(order =>
                order.cName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.pName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.cEmail.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Status filter
        if (filterStatus) {
            filtered = filtered.filter(order => order.status === filterStatus);
        }

        // Delivery Status filter
        if (filterDeliveryStatus) {
            filtered = filtered.filter(order => order.dStatus === filterDeliveryStatus);
        }

        setFilteredOrders(filtered);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this order?')) {
            try {
                const response = await fetch(`http://localhost:5000/api/customerorders/deletecustomerorder/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    }
                });

                if (response.ok) {
                    props.showAlert('Order deleted successfully', 'success');
                    setOrders(orders.filter(order => order._id !== id));
                } else {
                    props.showAlert('Failed to delete order', 'danger');
                }
            } catch (error) {
                console.error('Error deleting order:', error);
                props.showAlert('Error deleting order', 'danger');
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleFilterApply = () => {
        filterOrders();
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setFilterStatus('');
        setFilterDeliveryStatus('');
        setFilteredOrders(orders);
        props.showAlert('Filters reset successfully', 'info');
    };

    const exportToExcel = () => {
        if (filteredOrders.length === 0) {
            props.showAlert('No orders to export', 'warning');
            return;
        }

        try {
            const exportData = filteredOrders.map(order => ({
                'Order ID': order._id.slice(-6),
                'Customer Name': order.cName,
                'Customer Email': order.cEmail,
                'Customer Phone': order.cPhone,
                'Product Name': order.pName,
                'Category': order.category,
                'Units': order.ounits,
                'Amount': `₹${order.amount}`,
                'Order Date': formatDate(order.oDate),
                'Delivery Date': formatDate(order.dDate),
                'Status': order.status,
                'Delivery Status': order.dStatus,
                'Product Availability': order.pAvail,
                'Address': order.cAddress,
                'Notes': order.desc || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

            // Auto-size columns
            const colWidths = [
                { wch: 12 },
                { wch: 15 },
                { wch: 20 },
                { wch: 15 },
                { wch: 15 },
                { wch: 12 },
                { wch: 8 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 15 },
                { wch: 18 },
                { wch: 25 },
                { wch: 20 }
            ];
            worksheet['!cols'] = colWidths;

            const fileName = `Orders_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            props.showAlert('Orders exported to Excel successfully', 'success');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            props.showAlert('Error exporting to Excel', 'danger');
        }
    };

    const exportToPDF = () => {
        if (filteredOrders.length === 0) {
            props.showAlert('No orders to export', 'warning');
            return;
        }

        try {
            const element = document.createElement('div');
            element.innerHTML = `
                <div style="padding: 20px; font-family: Arial, sans-serif;">
                    <h1 style="text-align: center; margin-bottom: 30px;">Orders Report</h1>
                    <p style="text-align: center; margin-bottom: 20px; color: #666;">Generated on: ${new Date().toLocaleString('en-IN')}</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <thead>
                            <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Order ID</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Customer Name</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Product</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Amount</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Order Date</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Delivery Date</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Status</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Delivery Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredOrders.map(order => `
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${order._id.slice(-6)}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${order.cName}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${order.pName}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">₹${order.amount}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${formatDate(order.oDate)}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${formatDate(order.dDate)}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${order.status}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${order.dStatus}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <p style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">Total Orders: ${filteredOrders.length}</p>
                </div>
            `;

            const opt = {
                margin: 10,
                filename: `Orders_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
            };

            html2pdf().set(opt).from(element).save();
            props.showAlert('Orders exported to PDF successfully', 'success');
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            props.showAlert('Error exporting to PDF', 'danger');
        }
    };

    return (
        <>
            <div className="container-fluid">
                <div className="row mb-3 mx-3">
                    <div className="col-9 py-3">
                        <h1 className="display-5 fw-normal mb-3">Orders</h1>
                        <p className="text-muted">Total Orders: {filteredOrders.length}</p>
                    </div>
                    <div className="col-3 d-flex justify-content-end align-items-end pb-3">
                        <button className="btn btn-link text-decoration-none me-3" onClick={exportToPDF} title="Export to PDF">
                            <i className="bi bi-file-earmark-pdf-fill text-danger fs-1 d-flex justify-content-center align-items-center"></i>
                        </button>
                        <button className="btn btn-link text-decoration-none me-3" onClick={exportToExcel} title="Export to Excel">
                            <i className="bi bi-file-earmark-excel-fill text-success fs-1 d-flex justify-content-center align-items-center"></i>
                        </button>

                        <Link to="/dashboard/addorder" className="btn btn-custom-purple shadow-sm text-decoration-none">
                            <i className="bi bi-plus-lg me-1"></i> Add Order
                        </Link>
                    </div>
                </div>

                <div className="row mb-4 mx-3">
                    <div className="col-12">
                        <div className="input-group input-group-lg search-bar shadow border-3 rounded-pill">
                            <span className="input-group-text bg-white border-0 ps-3"><i className="bi bi-search"></i></span>
                            <input type="text" className="form-control border-0 rounded-pill shadow-none"
                                placeholder="Search" value={searchTerm} onChange={handleSearchChange} />
                        </div>
                    </div>
                </div>

                <div className="row mb-4 align-items-start ms-3 mb-4">
                    <div className="col-auto me-3 border-end border-secondary-subtle border-2 pe-3">
                        <small className="text-secondary fs-4">Filters</small>
                    </div>
                    <div className="col-auto">
                        <select className="shadow border border-2 form-select custom-select-filter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="">All Status</option>
                            <option value="Paid">Paid</option>
                            <option value="Not Paid">Not Paid</option>
                        </select>
                    </div>
                    <div className="col-auto">
                        <select className="shadow border border-2 form-select custom-select-filter" value={filterDeliveryStatus} onChange={(e) => setFilterDeliveryStatus(e.target.value)}>
                            <option value="">All Delivery Status</option>
                            <option value="Packed">Packed</option>
                            <option value="Not Packed">Not Packed</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                        </select>
                    </div>
                    <div className="col-auto">
                        <button className="shadow border border-2 border-primary px-5 btn btn-custom-purple" onClick={handleResetFilters}>Reset</button>
                    </div>
                </div>

                <div className="table-responsive mt-5 mx-3">
                    {loading ? (
                        <div className="text-center">
                            <div className="spinner-border" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="alert alert-info">No orders found</div>
                    ) : (
                        <table className="table table-hover align-middle">
                            <thead className="border-top border-0 border-3 border-primary">
                                <tr>
                                    <th scope="col" className="py-2">ID</th>
                                    <th scope="col" className="py-2">Customer Name</th>
                                    <th scope="col" className="py-2">Product Name</th>
                                    <th scope="col" className="py-2">Total Amount</th>
                                    <th scope="col" className="py-2">Order Date</th>
                                    <th scope="col" className="py-2">Delivery Date</th>
                                    <th scope="col" className="py-2">Status</th>
                                    <th scope="col" className="py-2">Delivery Status</th>
                                    <th scope="col" className="py-2">Product Availability</th>
                                    <th scope="col" className="py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((order) => (
                                    <tr key={order._id}>
                                        <td>{order._id.slice(-6)}</td>
                                        <td>{order.cName}</td>
                                        <td>{order.pName}</td>
                                        <td>₹{order.amount}</td>
                                        <td>{formatDate(order.oDate)}</td>
                                        <td>{formatDate(order.dDate)}</td>
                                        <td>
                                            <span className={`badge ${order.status === 'Paid' ? 'bg-success' : 'bg-warning'} rounded-pill px-3 py-2`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${order.dStatus === 'Delivered' ? 'bg-success' : order.dStatus === 'Shipped' ? 'bg-info' : 'bg-warning'} rounded-pill px-3 py-2`}>
                                                {order.dStatus}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${order.pAvail === 'Available' ? 'bg-success' : 'bg-danger'} rounded-pill px-3 py-2`}>
                                                {order.pAvail}
                                            </span>
                                        </td>
                                        <td>
                                            <Link to={`/dashboard/editorder/${order._id}`} className="btn btn-sm btn-info me-2" title="Edit">
                                                <i className="bi bi-pencil"></i>
                                            </Link>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(order._id)} title="Delete">
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

            </div>
        </>
    )
}

export default Orders