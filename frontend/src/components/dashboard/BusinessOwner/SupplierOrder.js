import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

const SupplierOrder = (props) => {
    const { id } = useParams();
    const [supplierOrders, setSupplierOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPAvail, setFilterPAvail] = useState('');
    const [filterDStatus, setFilterDStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [supplierName, setSupplierName] = useState('');
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalAmount: 0
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetchSupplierOrders();
    }, [id]);

    useEffect(() => {
        filterOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supplierOrders, searchTerm, filterStatus, filterPAvail, filterDStatus]);

    const fetchSupplierOrders = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/supplierorders/getsupplierorder/' + id, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSupplierOrders(data);
                setFilteredOrders(data);
                
                // Calculate stats
                const total = data.reduce((sum, order) => sum + order.amount, 0);
                setStats({
                    totalOrders: data.length,
                    totalAmount: total
                });

                // Fetch supplier name
                const supplierResponse = await fetch('http://localhost:5000/api/supplier/getsupplier/' + id, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    }
                });
                
                if (supplierResponse.ok) {
                    const supplierData = await supplierResponse.json();
                    setSupplierName(`${supplierData.fname} ${supplierData.lname || ''}`);
                }
            } else {
                props.showAlert('Failed to fetch supplier orders', 'danger');
            }
        } catch (error) {
            props.showAlert('Error fetching supplier orders', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const filterOrders = () => {
        let filtered = supplierOrders;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(order =>
                (order.pName && order.pName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (order.category && order.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (order._id && order._id.includes(searchTerm))
            );
        }

        // Status filter
        if (filterStatus) {
            filtered = filtered.filter(order => order.status === filterStatus);
        }

        // Product Availability filter
        if (filterPAvail) {
            filtered = filtered.filter(order => order.pAvail === filterPAvail);
        }

        // Delivery Status filter
        if (filterDStatus) {
            filtered = filtered.filter(order => order.dStatus === filterDStatus);
        }

        setFilteredOrders(filtered);
    };

    const handleDelete = async (orderId) => {
        if (window.confirm('Are you sure you want to delete this order?')) {
            try {
                const response = await fetch(`http://localhost:5000/api/supplierorders/deletesupplierorder/${orderId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    }
                });

                if (response.ok) {
                    props.showAlert('Order deleted successfully', 'success');
                    setSupplierOrders(supplierOrders.filter(order => order._id !== orderId));
                } else {
                    props.showAlert('Failed to delete order', 'danger');
                }
            } catch (error) {
                props.showAlert('Error deleting order', 'danger');
            }
        }
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setFilterStatus('');
        setFilterPAvail('');
        setFilterDStatus('');
        setFilteredOrders(supplierOrders);
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
                'Product Name': order.pName,
                'Category': order.categoryName || order.category || '-',
                'Amount': order.amount,
                'Units': order.ounits,
                'Order Date': new Date(order.oDate).toLocaleDateString('en-IN'),
                'Delivery Date': new Date(order.dDate).toLocaleDateString('en-IN'),
                'Status': order.status || 'N/A',
                'Product Availability': order.pAvail || 'N/A',
                'Delivery Status': order.dStatus || 'N/A',
                'Description': order.desc || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Supplier Orders');

            const colWidths = [
                { wch: 12 },
                { wch: 15 },
                { wch: 12 },
                { wch: 10 },
                { wch: 8 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 15 },
                { wch: 15 },
                { wch: 20 }
            ];
            worksheet['!cols'] = colWidths;

            const fileName = `SupplierOrders_${supplierName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            props.showAlert('Orders exported to Excel successfully', 'success');
        } catch (error) {
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
                    <h1 style="text-align: center; margin-bottom: 10px;">Supplier Orders Report</h1>
                    <p style="text-align: center; margin-bottom: 5px; font-weight: bold;">Supplier: ${supplierName}</p>
                    <p style="text-align: center; margin-bottom: 20px; color: #666;">Generated on: ${new Date().toLocaleString('en-IN')}</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <thead>
                            <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Order ID</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Product</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Amount</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Units</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Order Date</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Delivery Date</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Status</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Availability</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Delivery</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredOrders.map(order => `
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${order._id.slice(-6)}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${order.pName}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">₹${order.amount}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${order.ounits}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${new Date(order.oDate).toLocaleDateString('en-IN')}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${new Date(order.dDate).toLocaleDateString('en-IN')}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${order.status || 'N/A'}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${order.pAvail || 'N/A'}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${order.dStatus || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <p style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">Total Orders: ${filteredOrders.length} | Total Amount: ₹${filteredOrders.reduce((sum, o) => sum + o.amount, 0)}</p>
                </div>
            `;

            const opt = {
                margin: 10,
                filename: `SupplierOrders_${supplierName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
            };

            html2pdf().set(opt).from(element).save();
            props.showAlert('Orders exported to PDF successfully', 'success');
        } catch (error) {
            props.showAlert('Error exporting to PDF', 'danger');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN');
    };

    return (
        <>
            <div className="container-fluid">
                <div className="row mb-3 mx-3">
                    <div className="col-8 py-3 me-5">
                        <h1 className="display-5 fw-normal mb-3">{supplierName}</h1>
                        <p className="text-muted">
                            Total Orders: {stats.totalOrders} | Total Amount: ₹{stats.totalAmount.toLocaleString('en-IN')}
                        </p>
                    </div>
                    <div className="col-3 d-flex justify-content-end align-items-end pb-3 ms-5">
                        <button className="btn btn-link text-decoration-none" onClick={exportToPDF} title="Export to PDF">
                            <i className="bi bi-file-earmark-pdf-fill text-danger fs-1 d-flex justify-content-center align-items-center"></i>
                        </button>
                        <button className="btn btn-link text-decoration-none" onClick={exportToExcel} title="Export to Excel">
                            <i className="bi bi-file-earmark-excel-fill text-success fs-1 d-flex justify-content-center align-items-center"></i>
                        </button>
                        <Link to={`/dashboard/addsupplierorder/${id}`} className="btn btn-custom-purple shadow-sm mb-2 text-decoration-none">
                            <i className="bi bi-plus-lg me-1"></i> Add Order
                        </Link>
                    </div>
                </div>

                <div className="row mb-4 mx-3">
                    <div className="col-12">
                        <div className="input-group input-group-lg search-bar shadow border-3 rounded-pill">
                            <span className="input-group-text bg-white border-0 ps-3"><i className="bi bi-search"></i></span>
                            <input type="text" className="form-control text-secondary border-0 rounded-pill shadow-none"
                                placeholder="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="row mb-4 align-items-start ms-3">
                    <div className="col-auto me-3 border-end border-secondary-subtle border-2 pe-3">
                        <small className="text-secondary fs-4">Filters</small>
                    </div>
                    <div className="col-auto">
                        <select className="shadow border border-2 form-select custom-select-filter pe-5" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Paid">Paid</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div className="col-auto">
                        <select className="shadow border border-2 form-select custom-select-filter pe-5" value={filterPAvail} onChange={(e) => setFilterPAvail(e.target.value)}>
                            <option value="">All Availability</option>
                            <option value="Available">Available</option>
                            <option value="Out of Stock">Out of Stock</option>
                            <option value="Coming Soon">Coming Soon</option>
                        </select>
                    </div>
                    <div className="col-auto">
                        <select className="shadow border border-2 form-select custom-select-filter pe-5" value={filterDStatus} onChange={(e) => setFilterDStatus(e.target.value)}>
                            <option value="">All Delivery Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Packed">Packed</option>
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
                                    <th scope="col" className="py-2">Product Name</th>
                                    <th scope="col" className="py-2">Amount</th>
                                    <th scope="col" className="py-2">Units</th>
                                    <th scope="col" className="py-2">Order Date</th>
                                    <th scope="col" className="py-2">Delivery Date</th>
                                    <th scope="col" className="py-2">Status</th>
                                    <th scope="col" className="py-2">Availability</th>
                                    <th scope="col" className="py-2">Delivery</th>
                                    <th scope="col" className="py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((order) => (
                                    <tr key={order._id}>
                                        <td>{order._id.slice(-6)}</td>
                                        <td>{order.pName}</td>
                                        <td>₹{order.amount.toLocaleString('en-IN')}</td>
                                        <td>{order.ounits}</td>
                                        <td>{formatDate(order.oDate)}</td>
                                        <td>{formatDate(order.dDate)}</td>
                                        <td>
                                            <span className={`badge rounded-pill px-3 py-2 ${order.status === 'Paid' ? 'bg-success' : order.status === 'Pending' ? 'bg-warning' : 'bg-danger'}`}>
                                                {order.status || 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge rounded-pill px-3 py-2 ${order.pAvail === 'Available' ? 'bg-success' : 'bg-warning'}`}>
                                                {order.pAvail || 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge rounded-pill px-3 py-2 ${order.dStatus === 'Delivered' ? 'bg-success' : 'bg-info'}`}>
                                                {order.dStatus || 'N/A'}
                                            </span>
                                        </td>
                                        <td className='d-flex'>
                                            <Link to={`/dashboard/editsupplierorder/${order._id}`} className="btn btn-sm btn-info me-2" title="Edit">
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

export default SupplierOrder

