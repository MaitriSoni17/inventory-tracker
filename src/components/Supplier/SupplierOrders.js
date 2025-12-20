import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

const SupplierOrders = (props) => {
    const navigate = useNavigate();
    const [supplierOrders, setSupplierOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchSupplierOrders = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:5000/api/supplierorders/getorders', {
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
                props.showAlert?.('Orders loaded successfully', 'success');
            } else {
                props.showAlert?.('Failed to fetch supplier orders', 'danger');
            }
        } catch (error) {
            console.error('Error fetching supplier orders:', error);
            props.showAlert?.('Error fetching supplier orders', 'danger');
        } finally {
            setLoading(false);
        }
    }, [props]);

    useEffect(() => {
        fetchSupplierOrders();
    }, [fetchSupplierOrders]);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const filterOrders = useCallback(() => {
        let filtered = supplierOrders;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(order =>
                order.pName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.businessowner?.fname && order.businessowner.fname.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (order.businessowner?.lname && order.businessowner.lname.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Status filter
        if (filterStatus) {
            filtered = filtered.filter(order => order.status === filterStatus);
        }

        // Payment Status filter
        if (filterPaymentStatus) {
            filtered = filtered.filter(order => order.paymentStatus === filterPaymentStatus);
        }

        setFilteredOrders(filtered);
    }, [supplierOrders, searchTerm, filterStatus, filterPaymentStatus]);

    useEffect(() => {
        filterOrders();
    }, [filterOrders]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setFilterStatus('');
        setFilterPaymentStatus('');
        setFilteredOrders(supplierOrders);
        props.showAlert?.('Filters reset successfully', 'info');
    };

    const handleOrderClick = (orderId) => {
        navigate(`/dashboard/supplierorderdetail/${orderId}`);
    };

    const getBusinessOwnerName = (businessowner) => {
        if (!businessowner) return 'N/A';
        if (typeof businessowner === 'object' && businessowner !== null) {
            const fname = businessowner.fname || '';
            const lname = businessowner.lname || '';
            const fullName = `${fname} ${lname}`.trim();
            return fullName || 'N/A';
        }
        return 'N/A';
    };

    const exportToExcel = () => {
        if (filteredOrders.length === 0) {
            props.showAlert?.('No orders to export', 'warning');
            return;
        }

        try {
            const exportData = filteredOrders.map(order => ({
                'Order ID': order._id.slice(-6),
                'Product Name': order.pName,
                'Category': order.category,
                'Units': order.ounits,
                'Amount': `₹${order.amount}`,
                'Order Date': formatDate(order.oDate),
                'Delivery Date': formatDate(order.dDate),
                'Order Status': order.status,
                'Payment Status': order.paymentStatus || 'Pending',
                'Business Owner': getBusinessOwnerName(order.businessowner),
                'Description': order.desc || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Supplier Orders');

            // Auto-size columns
            const colWidths = [
                { wch: 12 },
                { wch: 18 },
                { wch: 15 },
                { wch: 10 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 15 },
                { wch: 18 },
                { wch: 20 }
            ];
            worksheet['!cols'] = colWidths;

            const fileName = `Supplier_Orders_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            props.showAlert?.('Orders exported to Excel successfully', 'success');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            props.showAlert?.('Error exporting to Excel', 'danger');
        }
    };

    const exportToPDF = () => {
        if (filteredOrders.length === 0) {
            props.showAlert?.('No orders to export', 'warning');
            return;
        }

        try {
            const element = document.createElement('div');
            element.innerHTML = `
                <div style="padding: 20px; font-family: Arial, sans-serif;">
                    <h1 style="text-align: center; margin-bottom: 30px;">Supplier Orders Report</h1>
                    <p style="text-align: center; margin-bottom: 20px; color: #666;">Generated on: ${new Date().toLocaleString('en-IN')}</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <thead>
                            <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Order ID</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Product</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Amount</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Order Date</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Delivery Date</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Status</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Payment Status</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Business Owner</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredOrders.map(order => `
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${order._id.slice(-6)}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${order.pName}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">₹${order.amount}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${formatDate(order.oDate)}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${formatDate(order.dDate)}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${order.status}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${order.paymentStatus || 'Pending'}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${getBusinessOwnerName(order.businessowner)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <p style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">Total Orders: ${filteredOrders.length}</p>
                </div>
            `;

            const opt = {
                margin: 10,
                filename: `Supplier_Orders_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
            };

            html2pdf().set(opt).from(element).save();
            props.showAlert?.('Orders exported to PDF successfully', 'success');
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            props.showAlert?.('Error exporting to PDF', 'danger');
        }
    };

    return (
        <>
            <div className="container-fluid">
                <div className="row mb-3 mx-3">
                    <div className="col-8 py-3 me-5">
                        <h1 className="display-5 fw-normal mb-3">Supplier Orders</h1>
                        <p className="text-muted">Total Orders: {filteredOrders.length}</p>
                    </div>
                    <div className="col-3 d-flex justify-content-end align-items-end ms-5 pb-3">
                        <button className="btn btn-link text-decoration-none" onClick={exportToPDF} title="Export to PDF">
                            <i className="bi bi-file-earmark-pdf-fill text-danger fs-1 d-flex justify-content-center align-items-center"></i>
                        </button>
                        <button className="btn btn-link text-decoration-none" onClick={exportToExcel} title="Export to Excel">
                            <i className="bi bi-file-earmark-excel-fill text-success fs-1 d-flex justify-content-center align-items-center"></i>
                        </button>
                    </div>
                </div>

                <div className="row mb-4 mx-3">
                    <div className="col-12">
                        <div className="input-group input-group-lg search-bar shadow border-3 rounded-pill">
                            <span className="input-group-text bg-white border-0 ps-3"><i className="bi bi-search"></i></span>
                            <input type="text" className="form-control border-0 rounded-pill shadow-none"
                                placeholder="Search by product name or business owner" value={searchTerm} onChange={handleSearchChange} />
                        </div>
                    </div>
                </div>

                <div className="row mb-4 align-items-start ms-3 mb-4">
                    <div className="col-auto me-3 border-end border-secondary-subtle border-2 pe-3">
                        <small className="text-secondary fs-4">Filters</small>
                    </div>
                    <div className="col-auto">
                        <select className="shadow border border-2 pe-5 form-select custom-select-filter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="">All Order Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>
                    <div className="col-auto">
                        <select className="shadow border border-2 pe-5 form-select custom-select-filter" value={filterPaymentStatus} onChange={(e) => setFilterPaymentStatus(e.target.value)}>
                            <option value="">All Payment Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Partial">Partial</option>
                            <option value="Completed">Completed</option>
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
                                    <th scope="col" className="py-2">Category</th>
                                    <th scope="col" className="py-2">Units</th>
                                    <th scope="col" className="py-2">Total Amount</th>
                                    <th scope="col" className="py-2">Order Date</th>
                                    <th scope="col" className="py-2">Delivery Date</th>
                                    <th scope="col" className="py-2">Order Status</th>
                                    <th scope="col" className="py-2">Payment Status</th>
                                    <th scope="col" className="py-2">Business Owner</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((order) => (
                                    <tr key={order._id} onClick={() => handleOrderClick(order._id)} style={{ cursor: 'pointer' }}>
                                        <td>{order._id.slice(-6)}</td>
                                        <td>{order.pName}</td>
                                        <td>{order.category}</td>
                                        <td>{order.ounits}</td>
                                        <td>₹{order.amount.toLocaleString()}</td>
                                        <td>{formatDate(order.oDate)}</td>
                                        <td>{formatDate(order.dDate)}</td>
                                        <td>
                                            <span className={`badge ${order.status === 'Completed' ? 'bg-success' : order.status === 'Shipped' ? 'bg-info' : 'bg-warning'} rounded-pill px-3 py-2`}>
                                                {order.status || 'Pending'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${order.paymentStatus === 'Completed' ? 'bg-success' : order.paymentStatus === 'Partial' ? 'bg-warning' : 'bg-danger'} rounded-pill px-3 py-2`}>
                                                {order.paymentStatus || 'Pending'}
                                            </span>
                                        </td>
                                        <td>{getBusinessOwnerName(order.businessowner)}</td>
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

export default SupplierOrders
