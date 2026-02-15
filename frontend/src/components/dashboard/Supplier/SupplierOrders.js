import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../styles/dashboard-elegant.css';

const SupplierOrders = (props) => {
    const navigate = useNavigate();
    const [supplierOrders, setSupplierOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [canExportReports, setCanExportReports] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);

    // Check export permission
    const checkExportPermission = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:5000/api/reports/supplier/check-permission', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const data = await response.json();
                setCanExportReports(data.canExportReports || false);
            }
        } catch (error) {
            // console.error('Error checking export permission:', error);
        }
    }, []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                if (props.showAlert) {
                    props.showAlert('Orders loaded successfully', 'success');
                }
            } else {
                if (props.showAlert) {
                    props.showAlert('Failed to fetch supplier orders', 'danger');
                }
            }
        } catch (error) {
            if (props.showAlert) {
                props.showAlert('Error fetching supplier orders', 'danger');
            }
        } finally {
            setLoading(false);
        }
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetchSupplierOrders();
        checkExportPermission();
    }, []);

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
            // console.log('Business Owner:', fullName);
            return fullName || 'N/A';

        }
        return 'N/A';
    };

    const exportToExcel = async () => {
        if (!canExportReports) {
            props.showAlert?.('You do not have permission to export reports. Please contact your Business Owner to enable this feature.', 'warning');
            return;
        }

        if (filteredOrders.length === 0) {
            props.showAlert?.('No orders to export', 'warning');
            return;
        }

        setExportLoading(true);
        try {
            // Use server-side generation
            const response = await fetch('http://localhost:5000/api/reports/supplier/my-orders/excel', {
                method: 'GET',
                headers: {
                    'auth-token': localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Supplier_Orders_${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                props.showAlert?.('Orders exported to Excel successfully', 'success');
            } else {
                const errorData = await response.json();
                props.showAlert?.(errorData.error || 'Error exporting to Excel', 'danger');
            }
        } catch (error) {
            props.showAlert?.('Error exporting to Excel', 'danger');
        } finally {
            setExportLoading(false);
        }
    };

    const exportToPDF = async () => {
        if (!canExportReports) {
            props.showAlert?.('You do not have permission to export reports. Please contact your Business Owner to enable this feature.', 'warning');
            return;
        }

        if (filteredOrders.length === 0) {
            props.showAlert?.('No orders to export', 'warning');
            return;
        }

        setExportLoading(true);
        try {
            // Use server-side generation
            const response = await fetch('http://localhost:5000/api/reports/supplier/my-orders/pdf', {
                method: 'GET',
                headers: {
                    'auth-token': localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Supplier_Orders_${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                props.showAlert?.('Orders exported to PDF successfully', 'success');
            } else {
                const errorData = await response.json();
                props.showAlert?.(errorData.error || 'Error exporting to PDF', 'danger');
            }
        } catch (error) {
            props.showAlert?.('Error exporting to PDF', 'danger');
        } finally {
            setExportLoading(false);
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
                        {canExportReports ? (
                            <>
                                <button 
                                    className="btn btn-link text-decoration-none" 
                                    onClick={exportToPDF} 
                                    title="Export to PDF"
                                    disabled={exportLoading}
                                >
                                    {exportLoading ? (
                                        <div className="spinner-border spinner-border-sm text-danger" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                    ) : (
                                        <i className="bi bi-file-earmark-pdf-fill text-danger fs-1 d-flex justify-content-center align-items-center"></i>
                                    )}
                                </button>
                                <button 
                                    className="btn btn-link text-decoration-none" 
                                    onClick={exportToExcel} 
                                    title="Export to Excel"
                                    disabled={exportLoading}
                                >
                                    {exportLoading ? (
                                        <div className="spinner-border spinner-border-sm text-success" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                    ) : (
                                        <i className="bi bi-file-earmark-excel-fill text-success fs-1 d-flex justify-content-center align-items-center"></i>
                                    )}
                                </button>
                            </>
                        ) : (
                            <small className="text-muted" title="Contact your Business Owner to enable report exports">
                                <i className="bi bi-lock-fill me-1"></i>Report export disabled
                            </small>
                        )}
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


