import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';
import { generateSalaryReportPDF, generateSalaryReportExcel } from '../../utils/salaryReportHelper';
import '../../styles/reports.css';

const Reports = ({ showAlert }) => {
    const navigate = useNavigate();
    const { hasPermission, role } = useRole();
    const [loading, setLoading] = useState(false);
    const [reportPermissions, setReportPermissions] = useState(null);
    const [reportConfig, setReportConfig] = useState({
        reportType: '',
        format: 'excel',
        month: '',
        year: new Date().getFullYear().toString(),
        specificId: 'all'
    });

    // Check permission on component mount and fetch report-level permissions
    useEffect(() => {
        if (!hasPermission('canExportReports')) {
            showAlert('You do not have permission to access reports', 'danger');
            navigate('/dashboard');
            return;
        }

        const fetchReportPermissions = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:5000/api/reports/report-permissions', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': token
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setReportPermissions(data);
                }
            } catch (error) {
                // Fallback: business owner sees all, others see none of restricted reports
                setReportPermissions({
                    canExportReports: true,
                    employees: role === 'businessowner',
                    products: true,
                    orders: true,
                    supplierOrders: role === 'businessowner',
                    suppliers: role === 'businessowner',
                    salary: role === 'businessowner'
                });
            }
        };
        fetchReportPermissions();
    }, [navigate]);

    const [availableItems, setAvailableItems] = useState({
        employees: [],
        products: [],
        orders: [],
        supplierOrders: [],
        suppliers: []
    });

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
    const months = [
        { value: '1', label: 'January' },
        { value: '2', label: 'February' },
        { value: '3', label: 'March' },
        { value: '4', label: 'April' },
        { value: '5', label: 'May' },
        { value: '6', label: 'June' },
        { value: '7', label: 'July' },
        { value: '8', label: 'August' },
        { value: '9', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' }
    ];

    useEffect(() => {
        fetchAvailableItems();
    }, [reportConfig.reportType]);

    const fetchAvailableItems = async () => {
        try {
            const token = localStorage.getItem('token');
            let endpoint = '';

            switch (reportConfig.reportType) {
                case 'employees':
                    endpoint = '/api/reports/employees/list';
                    break;
                case 'products':
                    endpoint = '/api/reports/products/list';
                    break;
                case 'orders':
                    endpoint = '/api/reports/orders/list';
                    break;
                case 'supplierOrders':
                    endpoint = '/api/reports/supplier-orders/list';
                    break;
                case 'suppliers':
                    endpoint = '/api/reports/suppliers/list';
                    break;
                default:
                    return;
            }

            const response = await fetch(`http://localhost:5000${endpoint}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token
                }
            });

            if (response.ok) {
                const data = await response.json();
                setAvailableItems(prev => ({
                    ...prev,
                    [reportConfig.reportType]: data
                }));
            }
        } catch (error) {
            // console.error('Error fetching items:', error);
        }
    };

    const handleConfigChange = (field, value) => {
        setReportConfig(prev => ({
            ...prev,
            [field]: value,
            ...(field === 'reportType' ? { specificId: 'all' } : {})
        }));
    };

    const handleDownloadReport = async () => {
        try {
            setLoading(true);

            // Verify the user has permission for this report type
            const selectedType = allReportTypes.find(t => t.value === reportConfig.reportType);
            if (reportPermissions && selectedType && !reportPermissions[selectedType.permKey]) {
                showAlert('You do not have permission to export this report type', 'danger');
                return;
            }

            const token = localStorage.getItem('token');
            
            // Handle salary report separately
            if (reportConfig.reportType === 'salary') {
                const response = await fetch('http://localhost:5000/api/salary/getallsalaries', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': token
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch salary data');
                }

                const salaryData = await response.json();

                // Fetch paid salaries for all employees
                const paidSalaries = {};
                for (const emp of salaryData) {
                    const paidResponse = await fetch(`http://localhost:5000/api/salarypayment/totalpaid/${emp._id}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'auth-token': token
                        }
                    });

                    if (paidResponse.ok) {
                        const data = await paidResponse.json();
                        paidSalaries[emp._id] = data.totalPaid;
                    }
                }

                if (reportConfig.format === 'excel') {
                    generateSalaryReportExcel(salaryData, paidSalaries);
                } else {
                    const formatCurrency = (amount, currency) => {
                        return new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: currency,
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        }).format(amount);
                    };
                    await generateSalaryReportPDF(salaryData, paidSalaries, formatCurrency);
                }

                showAlert('Salary report downloaded successfully!', 'success');
                return;
            }
            
            // Build query parameters
            const params = new URLSearchParams();
            if (reportConfig.month) params.append('month', reportConfig.month);
            if (reportConfig.year) params.append('year', reportConfig.year);
            
            let endpoint = '';
            let idParam = '';

            switch (reportConfig.reportType) {
                case 'employees':
                    endpoint = `/api/reports/employees/${reportConfig.format}`;
                    idParam = 'employeeId';
                    break;
                case 'products':
                    endpoint = `/api/reports/products/${reportConfig.format}`;
                    idParam = 'productId';
                    break;
                case 'orders':
                    endpoint = `/api/reports/orders/${reportConfig.format}`;
                    idParam = 'orderId';
                    break;
                case 'supplierOrders':
                    endpoint = `/api/reports/supplier-orders/${reportConfig.format}`;
                    idParam = 'orderId';
                    break;
                case 'suppliers':
                    endpoint = `/api/reports/suppliers/${reportConfig.format}`;
                    idParam = 'supplierId';
                    break;
                default:
                    return;
            }

            if (reportConfig.specificId) {
                params.append(idParam, reportConfig.specificId);
            }

            const url = `http://localhost:5000${endpoint}?${params.toString()}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'auth-token': token
                }
            });

            if (!response.ok) {
                throw new Error('Failed to generate report');
            }

            // Get filename from response headers or generate one
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `report-${Date.now()}.${reportConfig.format === 'excel' ? 'xlsx' : 'pdf'}`;
            
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            // Download the file
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            showAlert('Report downloaded successfully!', 'success');
        } catch (error) {
            // console.error('Error downloading report:', error);
            showAlert('Failed to download report', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const getItemLabel = (item) => {
        switch (reportConfig.reportType) {
            case 'employees':
                return `${item.fname} ${item.lname || ''} (${item.email})`;
            case 'products':
                return `${item.name} (${item.category})`;
            case 'orders':
                return `${item.cName} - ${new Date(item.oDate).toLocaleDateString()}`;
            case 'supplierOrders':
                const supplierName = item.supplier?.companyName || 
                                     (item.supplier?.fname ? `${item.supplier.fname} ${item.supplier.lname || ''}` : 'N/A');
                return `${supplierName} - ${new Date(item.oDate).toLocaleDateString()}`;
            case 'suppliers':
                return `${item.fname} ${item.lname || ''} (${item.companyName || item.email || 'N/A'})`.trim();
            default:
                return '';
        }
    };

    const allReportTypes = [
        { value: 'employees', label: 'Employees', icon: '👥', permKey: 'employees' },
        { value: 'products', label: 'Products', icon: '📦', permKey: 'products' },
        { value: 'orders', label: 'Customer Orders', icon: '🛒', permKey: 'orders' },
        { value: 'supplierOrders', label: 'Supplier Orders', icon: '🚚', permKey: 'supplierOrders' },
        { value: 'suppliers', label: 'Suppliers', icon: '🏢', permKey: 'suppliers' },
        { value: 'salary', label: 'Salary Management', icon: '💼', permKey: 'salary' }
    ];

    // Filter report types based on user's permissions
    const reportTypes = reportPermissions
        ? allReportTypes.filter(type => reportPermissions[type.permKey])
        : [];

    // Set default report type once permissions are loaded
    useEffect(() => {
        if (reportTypes.length > 0 && !reportConfig.reportType) {
            setReportConfig(prev => ({ ...prev, reportType: reportTypes[0].value }));
        }
    }, [reportPermissions]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="reports-container">
            <div className="reports-header">
                <div className="reports-header-content">
                    <h1 className="reports-title">
                        <span className="reports-icon">📊</span>
                        Generate Reports
                    </h1>
                    <p className="reports-subtitle">
                        Download comprehensive reports in Excel or PDF format
                    </p>
                </div>
            </div>

            <div className="reports-content">
                <div className="reports-card">
                    <div className="reports-card-header">
                        <h2>Configure Report</h2>
                        <p>Select your report preferences below</p>
                    </div>

                    <div className="reports-form">
                        {/* Report Type Selection */}
                        <div className="form-section">
                            <label className="form-label">Report Type</label>
                            {!reportPermissions ? (
                                <div className="text-center py-3">
                                    <span className="spinner"></span> Loading available reports...
                                </div>
                            ) : reportTypes.length === 0 ? (
                                <div className="info-note" style={{ marginTop: '10px' }}>
                                    <strong>No reports available.</strong> You do not have permission to export any report types. Contact your Business Owner to update your permissions.
                                </div>
                            ) : (
                            <div className="report-type-grid">
                                {reportTypes.map((type) => (
                                    <div
                                        key={type.value}
                                        className={`report-type-card ${
                                            reportConfig.reportType === type.value ? 'active' : ''
                                        }`}
                                        onClick={() => handleConfigChange('reportType', type.value)}
                                    >
                                        <span className="report-type-icon">{type.icon}</span>
                                        <span className="report-type-label">{type.label}</span>
                                    </div>
                                ))}
                            </div>
                            )}
                        </div>

                        {/* Format Selection */}
                        <div className="form-section">
                            <label className="form-label">Format</label>
                            <div className="format-selection">
                                <div
                                    className={`format-option ${
                                        reportConfig.format === 'excel' ? 'active' : ''
                                    }`}
                                    onClick={() => handleConfigChange('format', 'excel')}
                                >
                                    <span className="format-icon">📊</span>
                                    <span className="format-label">Excel (.xlsx)</span>
                                </div>
                                <div
                                    className={`format-option ${
                                        reportConfig.format === 'pdf' ? 'active' : ''
                                    }`}
                                    onClick={() => handleConfigChange('format', 'pdf')}
                                >
                                    <span className="format-icon">📄</span>
                                    <span className="format-label">PDF (.pdf)</span>
                                </div>
                            </div>
                        </div>

                        {/* Date Range Selection */}
                        <div className="form-section">
                            <label className="form-label">Time Period (Optional)</label>
                            <div className="date-range-grid">
                                <div className="form-group">
                                    <label htmlFor="month">Month</label>
                                    <select
                                        id="month"
                                        className="form-select"
                                        value={reportConfig.month}
                                        onChange={(e) => handleConfigChange('month', e.target.value)}
                                    >
                                        <option value="">All Months</option>
                                        {months.map((month) => (
                                            <option key={month.value} value={month.value}>
                                                {month.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="year">Year</label>
                                    <select
                                        id="year"
                                        className="form-select"
                                        value={reportConfig.year}
                                        onChange={(e) => handleConfigChange('year', e.target.value)}
                                    >
                                        <option value="">All Years</option>
                                        {years.map((year) => (
                                            <option key={year} value={year}>
                                                {year}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Specific Item Selection */}
                        <div className="form-section">
                            <label className="form-label" htmlFor="specificItem">
                                Select Specific Item (Optional)
                            </label>
                            <select
                                id="specificItem"
                                className="form-select"
                                value={reportConfig.specificId}
                                onChange={(e) => handleConfigChange('specificId', e.target.value)}
                            >
                                <option value="all">All Items</option>
                                {availableItems[reportConfig.reportType]?.map((item) => (
                                    <option key={item._id} value={item._id}>
                                        {getItemLabel(item)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Action Buttons */}
                        <div className="form-actions">
                            <button
                                className="btn-secondary"
                                onClick={() => navigate(-1)}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleDownloadReport}
                                disabled={loading || !reportConfig.reportType || reportTypes.length === 0}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner"></span>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <span className="download-icon">⬇</span>
                                        Download Report
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info Card */}
                <div className="reports-info-card">
                    <h3>Report Features</h3>
                    <ul className="info-list">
                        <li>
                            <span className="info-icon">✓</span>
                            Download reports in Excel or PDF format
                        </li>
                        <li>
                            <span className="info-icon">✓</span>
                            Filter by specific month and year
                        </li>
                        <li>
                            <span className="info-icon">✓</span>
                            Generate reports for individual or all items
                        </li>
                        <li>
                            <span className="info-icon">✓</span>
                            Comprehensive data for all entities
                        </li>
                        <li>
                            <span className="info-icon">✓</span>
                            Professional formatting and layout
                        </li>
                    </ul>

                    <div className="info-note">
                        <strong>Note:</strong> Reports include all relevant data based on your selected filters. 
                        Leave date filters empty to generate reports for all time periods.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
