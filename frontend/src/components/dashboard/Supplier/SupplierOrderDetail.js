import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const SupplierOrderDetail = (props) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [canExportReports, setCanExportReports] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [formData, setFormData] = useState({
        pName: '',
        category: '',
        amount: '',
        ounits: '',
        oDate: '',
        dDate: '',
        status: '',
        paymentStatus: '',
        desc: ''
    });

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

    const fetchOrderDetail = useCallback(async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/supplierorders/getorders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const data = await response.json();
                const selectedOrder = data.find(order => order._id === id);
                if (selectedOrder) {
                    setOrder(selectedOrder);
                    setFormData({
                        pName: selectedOrder.pName,
                        category: selectedOrder.category,
                        amount: selectedOrder.amount,
                        ounits: selectedOrder.ounits,
                        oDate: selectedOrder.oDate.split('T')[0],
                        dDate: selectedOrder.dDate.split('T')[0],
                        status: selectedOrder.status || 'Pending',
                        paymentStatus: selectedOrder.paymentStatus || 'Pending',
                        desc: selectedOrder.desc || ''
                    });
                } else {
                    if (props.showAlert) {
                        props.showAlert('Order not found', 'danger');
                    }
                    navigate('/dashboard/suppliersorders');
                }
            } else {
                if (props.showAlert) {
                    props.showAlert('Failed to fetch order details', 'danger');
                }
            }
        } catch (error) {
            if (props.showAlert) {
                props.showAlert('Error fetching order details', 'danger');
            }
        } finally {
            setLoading(false);
        }
    }, [id]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetchOrderDetail();
        checkExportPermission();
    }, [id]);

    // Download individual order report
    const downloadOrderReport = async (format = 'pdf') => {
        if (!canExportReports) {
            props.showAlert?.('You do not have permission to export reports. Please contact your Business Owner to enable this feature.', 'warning');
            return;
        }

        setExportLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/api/reports/supplier/my-orders/individual/${id}/${format}`, {
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
                const ext = format === 'excel' ? 'xlsx' : 'pdf';
                a.download = `Order_${id.slice(-6)}_Report_${new Date().toISOString().split('T')[0]}.${ext}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                props.showAlert?.(`Order ${format.toUpperCase()} report downloaded successfully`, 'success');
            } else {
                const errorData = await response.json();
                props.showAlert?.(errorData.error || 'Error downloading report', 'danger');
            }
        } catch (error) {
            props.showAlert?.('Error downloading report', 'danger');
        } finally {
            setExportLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleUpdateStatus = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/supplierorders/updateorderstatus/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify({
                    status: formData.status
                })
            });

            if (response.ok) {
                const updatedOrder = await response.json();
                setOrder(updatedOrder);
                props.showAlert?.('Order status updated successfully', 'success');
            } else {
                props.showAlert?.('Failed to update order status', 'danger');
            }
        } catch (error) {
            props.showAlert?.('Error updating order status', 'danger');
        }
    };

    const handleUpdatePaymentStatus = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/supplierorders/updatepaymentstatus/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify({
                    paymentStatus: formData.paymentStatus
                })
            });

            if (response.ok) {
                const updatedOrder = await response.json();
                setOrder(updatedOrder);
                props.showAlert?.('Payment status updated successfully', 'success');
            } else {
                props.showAlert?.('Failed to update payment status', 'danger');
            }
        } catch (error) {
            props.showAlert?.('Error updating payment status', 'danger');
        }
    };

    const handleGoBack = () => {
        navigate('/dashboard/suppliersorders');
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

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="container mt-5">
                <div className="alert alert-danger">Order not found</div>
            </div>
        );
    }

    return (
        <div className="container-fluid">
            <div className="row mb-4 mx-3 mt-4">
                <div className="col-12 d-flex justify-content-between align-items-start">
                    <div>
                        <button className="btn btn-secondary mb-3" onClick={handleGoBack}>
                            <i className="bi bi-arrow-left"></i> Back to Orders
                        </button>
                        <h1 className="display-5 fw-normal">Order Details</h1>
                        <p className="text-muted">Order ID: {order._id.slice(-6)}</p>
                    </div>
                    <div>
                        {canExportReports ? (
                            <div className="dropdown">
                                <button 
                                    className="btn btn-success dropdown-toggle" 
                                    type="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                    disabled={exportLoading}
                                    title="Download Order Report"
                                >
                                    {exportLoading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Downloading...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-download me-2"></i>
                                            Download Report
                                        </>
                                    )}
                                </button>
                                <ul className="dropdown-menu">
                                    <li>
                                        <button 
                                            className="dropdown-item" 
                                            onClick={() => downloadOrderReport('pdf')}
                                            disabled={exportLoading}
                                        >
                                            <i className="bi bi-file-earmark-pdf me-2 text-danger"></i>
                                            Download as PDF
                                        </button>
                                    </li>
                                    <li>
                                        <button 
                                            className="dropdown-item" 
                                            onClick={() => downloadOrderReport('excel')}
                                            disabled={exportLoading}
                                        >
                                            <i className="bi bi-file-earmark-excel me-2 text-success"></i>
                                            Download as Excel
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        ) : (
                            <span className="text-muted" title="Contact your Business Owner to enable report exports">
                                <i className="bi bi-lock-fill me-1"></i> Report download disabled
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="row mx-3">
                <div className="col-12">
                    <div className="card shadow-sm border-0">
                        <div className="card-body p-5">
                            <h1 className="card-title mb-4">Order Information</h1>

                            <div className="row mb-4 px-3">
                                <div className="col-md-4">
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Product Name</label>
                                        <input type="text" className="form-control" value={formData.pName} disabled />
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Category</label>
                                        <input type="text" className="form-control" value={formData.category} disabled />
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Units</label>
                                        <input type="number" className="form-control" value={formData.ounits} disabled />
                                    </div>
                                </div>
                            </div>

                            <div className="row mb-4 px-3">
                                <div className="col-md-4">
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Amount (₹)</label>
                                        <input type="number" className="form-control" value={formData.amount} disabled />
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Order Date</label>
                                        <input type="date" className="form-control" value={formData.oDate} disabled />
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Delivery Date</label>
                                        <input type="date" className="form-control" value={formData.dDate} disabled />
                                    </div>
                                </div>
                            </div>

                            <div className="row mb-4 px-3">
                                <div className="col-md-5">
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Business Owner</label>
                                        <input type="text" className="form-control" value={getBusinessOwnerName(order.businessowner)} disabled />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Description</label>
                                        <textarea className="form-control" value={formData.desc} disabled rows="1"></textarea>
                                    </div>
                                </div>
                            </div>

                            <hr className="my-4" />

                            <h1 className="card-title mb-4">Status Updates</h1>

                            <div className="row mb-4 px-3">
                                <div className="col-md-5">
                                    <label className="form-label fw-bold">Order Status</label>
                                    <div className="input-group gap-0">
                                        <select className="form-select" name="status" value={formData.status} onChange={handleInputChange}>
                                            <option value="Pending">Pending</option>
                                            <option value="Confirmed">Confirmed</option>
                                            <option value="Shipped">Shipped</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                        <button className="btn btn-primary" onClick={handleUpdateStatus}>
                                            <i className="bi bi-check-circle"></i> Update Status
                                        </button>
                                    </div>
                                    <small className="text-muted">
                                        Current Status: 
                                        <span className={`badge ms-2 ${order.status === 'Completed' ? 'bg-success' : order.status === 'Shipped' ? 'bg-info' : 'bg-warning'}`}>
                                            {order.status || 'Pending'}
                                        </span>
                                    </small>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label fw-bold">Payment Status</label>
                                    <div className="input-group gap-0">
                                        <select className="form-select" name="paymentStatus" value={formData.paymentStatus} onChange={handleInputChange}>
                                            <option value="Pending">Pending</option>
                                            <option value="Partial">Partial</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                        <button className="btn btn-primary" onClick={handleUpdatePaymentStatus}>
                                            <i className="bi bi-check-circle"></i> Update Payment
                                        </button>
                                    </div>
                                    <small className="text-muted">
                                        Current Payment Status: 
                                        <span className={`badge ms-2 ${order.paymentStatus === 'Completed' ? 'bg-success' : order.paymentStatus === 'Partial' ? 'bg-warning' : 'bg-danger'}`}>
                                            {order.paymentStatus || 'Pending'}
                                        </span>
                                    </small>
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-12">
                                    <button className="btn btn-secondary" onClick={handleGoBack}>
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupplierOrderDetail;


