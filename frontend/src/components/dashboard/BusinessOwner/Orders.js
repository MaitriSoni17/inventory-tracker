import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import { apiCall, parseResponse } from '../../../utils/apiClient';
import '../../../styles/dashboard-elegant.css';
import { CanEditOrders, CanDeleteOrders, CanCreateOrders, CanExportReports } from '../../auth/RoleGuards';
import { generateIndividualOrderReportPDF } from '../../../utils/individualReportHelper';

const Orders = (props) => {
    // const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [pendingOrders, setPendingOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDeliveryStatus, setFilterDeliveryStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [categoryMap, setCategoryMap] = useState({});
    const [warehouseMap, setWarehouseMap] = useState({});
    const [activeTab, setActiveTab] = useState('orders');

    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetchCategories();
        fetchWarehouses();
        fetchOrders();
        fetchPendingOrders();
    }, []);

    const fetchWarehouses = async () => {
        try {
            const response = await apiCall('/api/warehouse/getwarehouse', {
                method: 'POST'
            });
            if (response.isUnauthorized) return;
            if (response.ok) {
                const warehouses = await parseResponse(response);
                const map = {};
                warehouses.forEach(warehouse => {
                    map[warehouse._id] = warehouse.wName;
                });
                setWarehouseMap(map);
            }
        } catch (error) {
        }
    };

    const filterOrders = useCallback(() => {
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
    }, [orders, searchTerm, filterStatus, filterDeliveryStatus]);

    useEffect(() => {
        filterOrders();
    }, [filterOrders]);

    const fetchOrders = async () => {
        try {
            const response = await apiCall('/api/customerorders/getcustomerorder', {
                method: 'POST'
            });

            if (response.isUnauthorized) {
                setLoading(false);
                return;
            }

            if (response.ok) {
                const data = await parseResponse(response);
                setOrders(data);
                setFilteredOrders(data);
            } else {
                props.showAlert('Failed to fetch orders', 'danger');
            }
        } catch (error) {
            props.showAlert('Error fetching orders', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await apiCall('/api/category/getcategory', {
                method: 'POST'
            });
            if (response.isUnauthorized) return;
            if (response.ok) {
                const categories = await parseResponse(response);
                const map = {};
                categories.forEach(cat => {
                    map[cat._id] = cat.cName;
                });
                setCategoryMap(map);
            }
        } catch (error) {
        }
    };

    const fetchPendingOrders = async () => {
        try {
            const response = await apiCall('/api/customerorders/getpendingorders', {
                method: 'POST'
            });
            if (response.isUnauthorized) return;
            if (response.ok) {
                const data = await parseResponse(response);
                setPendingOrders(data);
            }
        } catch (error) {
        }
    };

    const handleDeletePending = async (id) => {
        if (window.confirm('Are you sure you want to delete this pending order?')) {
            try {
                const response = await apiCall(`/api/customerorders/deletecustomerorder/${id}`, {
                    method: 'DELETE'
                });

                if (response.isUnauthorized) {
                    props.showAlert('Your session has expired. Please login again.', 'danger');
                    return;
                }

                if (response.ok) {
                    props.showAlert('Pending order deleted successfully', 'success');
                    setPendingOrders(pendingOrders.filter(order => order._id !== id));
                } else {
                    props.showAlert('Failed to delete pending order', 'danger');
                }
            } catch (error) {
                props.showAlert('Error deleting pending order', 'danger');
            }
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this order?')) {
            try {
                const response = await apiCall(`/api/customerorders/deletecustomerorder/${id}`, {
                    method: 'DELETE'
                });

                if (response.isUnauthorized) {
                    props.showAlert('Your session has expired. Please login again.', 'danger');
                    return;
                }

                if (response.ok) {
                    props.showAlert('Order deleted successfully', 'success');
                    setOrders(orders.filter(order => order._id !== id));
                } else {
                    props.showAlert('Failed to delete order', 'danger');
                }
            } catch (error) {
                props.showAlert('Error deleting order', 'danger');
            }
        }
    };

    const downloadIndividualOrderReport = async (order) => {
        try {
            const success = await generateIndividualOrderReportPDF(order, categoryMap, warehouseMap);
            if (success) {
                props.showAlert(`Report downloaded for Order ${order.orderNumber || order._id.slice(-6)}`, 'success');
            } else {
                props.showAlert('Failed to generate report', 'danger');
            }
        } catch (error) {
            props.showAlert('Error downloading report: ' + error.message, 'danger');
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
                'Category': categoryMap[order.category] || order.categoryName || order.category || '-',
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
            props.showAlert('Error exporting to PDF', 'danger');
        }
    };

    const exportPendingToExcel = () => {
        if (pendingOrders.length === 0) {
            props.showAlert('No pending orders to export', 'warning');
            return;
        }

        try {
            const exportData = pendingOrders.map(order => ({
                'Order ID': order._id.slice(-6),
                'Customer Name': order.cName,
                'Customer Email': order.cEmail,
                'Customer Phone': order.cPhone,
                'Product Name': order.pName,
                'Category': categoryMap[order.category] || order.categoryName || order.category || '-',
                'Units': order.ounits,
                'Amount': `₹${order.amount}`,
                'Order Date': formatDate(order.oDate),
                'Delivery Date': formatDate(order.dDate),
                'Status': order.status || 'Pending',
                'Delivery Status': order.dStatus || '-',
                'Stock Status': order.pendingReason ? 'Low Stock' : 'Pending',
                'Pending Reason': order.pendingReason || '-',
                'Address': order.cAddress,
                'Notes': order.desc || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Pending Orders');

            worksheet['!cols'] = [
                { wch: 12 }, { wch: 15 }, { wch: 22 }, { wch: 15 },
                { wch: 16 }, { wch: 14 }, { wch: 8 }, { wch: 12 },
                { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
                { wch: 12 }, { wch: 40 }, { wch: 25 }, { wch: 20 }
            ];

            const fileName = `Pending_Orders_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            props.showAlert('Pending orders exported to Excel successfully', 'success');
        } catch (error) {
            props.showAlert('Error exporting pending orders to Excel', 'danger');
        }
    };

    const exportPendingToPDF = () => {
        if (pendingOrders.length === 0) {
            props.showAlert('No pending orders to export', 'warning');
            return;
        }

        try {
            const element = document.createElement('div');
            element.innerHTML = `
                <div style="padding: 20px; font-family: Arial, sans-serif;">
                    <h1 style="text-align: center; margin-bottom: 30px;">Pending Orders Report</h1>
                    <p style="text-align: center; margin-bottom: 20px; color: #666;">Generated on: ${new Date().toLocaleString('en-IN')}</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <thead>
                            <tr style="background-color: #fff3cd; border-bottom: 2px solid #dee2e6;">
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Order ID</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Customer Name</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Product</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Amount</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Order Date</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Delivery Date</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Status</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Pending Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pendingOrders.map(order => `
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${order._id.slice(-6)}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${order.cName}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${order.pName}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">₹${order.amount}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${formatDate(order.oDate)}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${formatDate(order.dDate)}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${order.status || 'Pending'}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${order.pendingReason || 'Low stock / pending state'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <p style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">Total Pending Orders: ${pendingOrders.length}</p>
                </div>
            `;

            const opt = {
                margin: 10,
                filename: `Pending_Orders_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
            };

            html2pdf().set(opt).from(element).save();
            props.showAlert('Pending orders exported to PDF successfully', 'success');
        } catch (error) {
            props.showAlert('Error exporting pending orders to PDF', 'danger');
        }
    };

    return (
        <>
            <div className="container-fluid">
                <div className="row mb-3 mx-3">
                    <div className="col-8 py-3 me-5">
                        <h1 className="display-5 fw-normal mb-3">Orders</h1>
                        <p className="text-muted">
                            {activeTab === 'orders' 
                                ? `Total Orders: ${filteredOrders.length}` 
                                : `Pending Orders: ${pendingOrders.length}`
                            }
                        </p>
                    </div>
                    <div className="col-3 d-flex justify-content-end align-items-end ms-5 pb-3">
                        {activeTab === 'orders' && (
                            <CanExportReports>
                                <button className="btn btn-link text-decoration-none" onClick={exportToPDF} title="Export to PDF">
                                    <i className="bi bi-file-earmark-pdf-fill text-danger fs-1 d-flex justify-content-center align-items-center"></i>
                                </button>
                                <button className="btn btn-link text-decoration-none" onClick={exportToExcel} title="Export to Excel">
                                    <i className="bi bi-file-earmark-excel-fill text-success fs-1 d-flex justify-content-center align-items-center"></i>
                                </button>
                            </CanExportReports>
                        )}

                        {activeTab === 'pending' && (
                            <CanExportReports>
                                <button className="btn btn-link text-decoration-none" onClick={exportPendingToPDF} title="Export Pending to PDF">
                                    <i className="bi bi-file-earmark-pdf-fill text-danger fs-1 d-flex justify-content-center align-items-center"></i>
                                </button>
                                <button className="btn btn-link text-decoration-none" onClick={exportPendingToExcel} title="Export Pending to Excel">
                                    <i className="bi bi-file-earmark-excel-fill text-success fs-1 d-flex justify-content-center align-items-center"></i>
                                </button>
                            </CanExportReports>
                        )}

                        <CanCreateOrders>
                            <Link to="/dashboard/addorder" className="btn btn-custom-purple shadow-sm text-decoration-none mb-2">
                                <i className="bi bi-plus-lg me-1"></i> Add Order
                            </Link>
                        </CanCreateOrders>
                    </div>
                </div>

                {/* Tabs for Customer Orders and Pending Orders */}
                <div className="row mx-3 mb-3">
                    <div className="col-12">
                        <ul className="nav nav-tabs" role="tablist">
                            <li className="nav-item" role="presentation">
                                <button 
                                    className={`nav-link ${activeTab === 'orders' ? 'active' : ''}`} 
                                    onClick={() => setActiveTab('orders')}
                                    type="button"
                                    role="tab"
                                >
                                    <i className="bi bi-bag-check me-2"></i>
                                    Customer Orders
                                    <span className="badge bg-primary ms-2">{filteredOrders.length}</span>
                                </button>
                            </li>
                            <li className="nav-item" role="presentation">
                                <button 
                                    className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`} 
                                    onClick={() => setActiveTab('pending')}
                                    type="button"
                                    role="tab"
                                >
                                    <i className="bi bi-hourglass-split me-2"></i>
                                    Pending Orders
                                    {pendingOrders.length > 0 && (
                                        <span className="badge bg-warning text-dark ms-2">{pendingOrders.length}</span>
                                    )}
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Customer Orders Tab */}
                {activeTab === 'orders' && (
                    <>
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
                                <select className="shadow border border-2 pe-5 form-select custom-select-filter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                    <option value="">All Status</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Not Paid">Not Paid</option>
                                </select>
                            </div>
                            <div className="col-auto">
                                <select className="shadow border border-2 pe-5 form-select custom-select-filter" value={filterDeliveryStatus} onChange={(e) => setFilterDeliveryStatus(e.target.value)}>
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
                                            <th scope="col" className="py-2">Warehouse</th>
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
                                                <td>{order.warehouse ? warehouseMap[order.warehouse._id] || order.warehouse._id : '-'}</td>
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
                                                <td className='d-flex'>
                                                    <CanExportReports>
                                                        <button className="btn btn-success me-2" onClick={() => downloadIndividualOrderReport(order)} title="Download Report">
                                                            <i className="bi bi-download"></i>
                                                        </button>
                                                    </CanExportReports>
                                                    <CanEditOrders>
                                                        <Link to={`/dashboard/editorder/${order._id}`} className="btn btn-info me-2" title="Edit">
                                                            <i className="bi bi-pencil"></i>
                                                        </Link>
                                                    </CanEditOrders>
                                                    <CanDeleteOrders>
                                                        <button className="btn btn-danger" onClick={() => handleDelete(order._id)} title="Delete">
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </CanDeleteOrders>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}

                {/* Pending Orders Tab */}
                {activeTab === 'pending' && (
                    <div className="mx-3 mt-3">
                        <div className="alert alert-warning d-flex align-items-center mb-4" role="alert">
                            <i className="bi bi-exclamation-triangle-fill me-3 fs-4"></i>
                            <div>
                                <strong>Pending Orders</strong> — These orders have insufficient stock and cannot be fulfilled yet. 
                                They will be <strong>automatically transferred to Customer Orders</strong> when stock becomes sufficient.
                            </div>
                        </div>

                        {pendingOrders.length === 0 ? (
                            <div className="alert alert-info d-flex align-items-center">
                                <i className="bi bi-info-circle me-2"></i>
                                No pending orders. All orders have sufficient stock!
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle">
                                    <thead className="border-top border-0 border-3 border-warning">
                                        <tr>
                                            <th scope="col" className="py-2">ID</th>
                                            <th scope="col" className="py-2">Customer Name</th>
                                            <th scope="col" className="py-2">Product Name</th>
                                            <th scope="col" className="py-2">Total Amount</th>
                                            <th scope="col" className="py-2">Order Date</th>
                                            <th scope="col" className="py-2">Delivery Date</th>
                                            <th scope="col" className="py-2">Warehouse</th>
                                            <th scope="col" className="py-2">Stock Status</th>
                                            <th scope="col" className="py-2">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingOrders.map((order) => (
                                            <tr key={order._id} className="table-warning" style={{ opacity: 0.95 }}>
                                                <td>{order._id.slice(-6)}</td>
                                                <td>{order.cName}</td>
                                                <td>{order.pName}</td>
                                                <td>₹{order.amount}</td>
                                                <td>{formatDate(order.oDate)}</td>
                                                <td>{formatDate(order.dDate)}</td>
                                                <td>{order.warehouse ? warehouseMap[order.warehouse._id] || order.warehouse._id : '-'}</td>
                                                <td>
                                                    <span className="badge bg-danger rounded-pill px-3 py-2" title={order.pendingReason}>
                                                        <i className="bi bi-exclamation-circle me-1"></i>
                                                        Low Stock
                                                    </span>
                                                    {order.pendingReason && (
                                                        <div className="small text-danger mt-1" style={{ maxWidth: '200px', fontSize: '0.75rem' }}>
                                                            {order.pendingReason}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <CanEditOrders>
                                                        <Link to={`/dashboard/editorder/${order._id}`} className="btn btn-info btn-sm me-2" title="Edit Pending Order">
                                                            <i className="bi bi-pencil"></i>
                                                        </Link>
                                                    </CanEditOrders>
                                                    <CanDeleteOrders>
                                                        <button className="btn btn-danger btn-sm" onClick={() => handleDeletePending(order._id)} title="Delete Pending Order">
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </CanDeleteOrders>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </>
    )
}

export default Orders

