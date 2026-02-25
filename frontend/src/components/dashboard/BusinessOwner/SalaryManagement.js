import { useState, useEffect } from 'react';
import '../../../styles/dashboard-elegant.css';
import { generateSalaryReportPDF, generateSalaryReportExcel, generateIndividualSalaryReportPDF } from '../../../utils/salaryReportHelper';

const SalaryManagement = (props) => {
    const [salaryData, setSalaryData] = useState([]);
    const [filteredSalaryData, setFilteredSalaryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paidSalaries, setPaidSalaries] = useState({});
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        baseSalary: '',
        currency: 'INR',
        paymentFrequency: 'monthly'
    });

    const [paymentFormData, setPaymentFormData] = useState({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'bank_transfer',
        description: '',
        paymentPeriod: ''
    });

    const [stats, setStats] = useState({
        totalEmployees: 0,
        employeesWithSalary: 0,
        avgSalary: 0,
        totalPayroll: 0
    });

    useEffect(() => {
        fetchSalaryData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        filterSalaryData();
        calculateStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [salaryData, searchTerm]);

    const fetchSalaryData = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/salary/getallsalaries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSalaryData(data);
                setFilteredSalaryData(data);

                // Fetch paid salaries for all employees
                data.forEach(emp => {
                    fetchPaidSalary(emp._id);
                });
            } else {
                props.showAlert('Failed to fetch salary data', 'danger');
            }
        } catch (error) {
            // console.error('Error fetching salary data:', error);
            props.showAlert('Error fetching salary data', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const fetchPaidSalary = async (employeeId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/salarypayment/totalpaid/${employeeId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const data = await response.json();
                setPaidSalaries(prev => ({
                    ...prev,
                    [employeeId]: data.totalPaid
                }));
            }
        } catch (error) {
            // console.error('Error fetching paid salary:', error);
        }
    };

    const filterSalaryData = () => {
        let filtered = salaryData;

        if (searchTerm) {
            filtered = filtered.filter(emp =>
                (emp.fullName && emp.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (emp.role && emp.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (emp.warehouse && emp.warehouse.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        setFilteredSalaryData(filtered);
    };

    const calculateStats = () => {
        if (salaryData.length === 0) {
            setStats({
                totalEmployees: 0,
                employeesWithSalary: 0,
                avgSalary: 0,
                totalPayroll: 0
            });
            return;
        }

        const employeesWithSalary = salaryData.filter(emp => emp.baseSalary > 0);
        const avgSalary = employeesWithSalary.length > 0
            ? (employeesWithSalary.reduce((sum, emp) => sum + emp.baseSalary, 0) / employeesWithSalary.length)
            : 0;
        const totalPayroll = employeesWithSalary.reduce((sum, emp) => sum + emp.baseSalary, 0);

        setStats({
            totalEmployees: salaryData.length,
            employeesWithSalary: employeesWithSalary.length,
            avgSalary: Math.round(avgSalary),
            totalPayroll: Math.round(totalPayroll)
        });
    };

    const handleOpenModal = (employee = null) => {
        if (employee) {
            setEditingId(employee._id);
            setSelectedEmployee(employee);
            setFormData({
                baseSalary: employee.baseSalary || '',
                currency: employee.currency || 'INR',
                paymentFrequency: employee.paymentFrequency || 'monthly'
            });
        } else {
            setEditingId(null);
            setSelectedEmployee(null);
            setFormData({
                baseSalary: '',
                currency: 'INR',
                paymentFrequency: 'monthly'
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingId(null);
        setSelectedEmployee(null);
        setFormData({
            baseSalary: '',
            currency: 'INR',
            paymentFrequency: 'monthly'
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.baseSalary || formData.baseSalary <= 0) {
            props.showAlert('Please enter a valid salary amount', 'warning');
            return;
        }

        try {
            const endpoint = editingId
                ? `http://localhost:5000/api/salary/updatesalary/${editingId}`
                : `http://localhost:5000/api/salary/assignsalary/${selectedEmployee._id}`;

            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(endpoint, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify({
                    baseSalary: parseFloat(formData.baseSalary),
                    currency: formData.currency,
                    paymentFrequency: formData.paymentFrequency
                })
            });

            if (response.ok) {
                const result = await response.json();
                props.showAlert(result.message, 'success');
                handleCloseModal();
                fetchSalaryData();
            } else {
                const errorData = await response.json();
                props.showAlert(errorData.error || 'Failed to save salary', 'danger');
            }
        } catch (error) {
            // console.error('Error saving salary:', error);
            props.showAlert('Error saving salary', 'danger');
        }
    };

    const handleDeleteSalary = async (employeeId) => {
        if (window.confirm('Are you sure you want to remove this employee\'s salary?')) {
            try {
                const response = await fetch(`http://localhost:5000/api/salary/deletesalary/${employeeId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    }
                });

                if (response.ok) {
                    const result = await response.json();
                    props.showAlert(result.message, 'success');
                    fetchSalaryData();
                } else {
                    const errorData = await response.json();
                    props.showAlert(errorData.error || 'Failed to delete salary', 'danger');
                }
            } catch (error) {
                // console.error('Error deleting salary:', error);
                props.showAlert('Error deleting salary', 'danger');
            }
        }
    };

    const handleOpenPaymentModal = (employee) => {
        setSelectedEmployee(employee);
        setPaymentFormData({
            amount: '',
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'bank_transfer',
            description: '',
            paymentPeriod: ''
        });
        setShowPaymentModal(true);
    };

    const handleClosePaymentModal = () => {
        setShowPaymentModal(false);
        setSelectedEmployee(null);
        setPaymentFormData({
            amount: '',
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'bank_transfer',
            description: '',
            paymentPeriod: ''
        });
    };

    const handlePaymentInputChange = (e) => {
        const { name, value } = e.target;
        setPaymentFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();

        if (!paymentFormData.amount || paymentFormData.amount <= 0) {
            props.showAlert('Please enter a valid payment amount', 'warning');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/salarypayment/recordpayment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify({
                    employeeId: selectedEmployee._id,
                    amount: parseFloat(paymentFormData.amount),
                    paymentDate: paymentFormData.paymentDate,
                    paymentMethod: paymentFormData.paymentMethod,
                    description: paymentFormData.description,
                    paymentPeriod: paymentFormData.paymentPeriod
                })
            });

            if (response.ok) {
                const result = await response.json();
                props.showAlert(result.message, 'success');
                handleClosePaymentModal();
                fetchSalaryData();
            } else {
                const errorData = await response.json();
                props.showAlert(errorData.error || 'Failed to record payment', 'danger');
            }
        } catch (error) {
            // console.error('Error recording payment:', error);
            props.showAlert('Error recording payment', 'danger');
        }
    };

    const formatCurrency = (amount, currency) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    if (loading) {
        return (
            <div className="container-fluid mt-4">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="container-fluid p-4">
                {/* Header Section */}
                <div className="row mb-3 mx-3">
                    <div className="col-8 py-3 me-5">
                        <h1 className="display-5 fw-normal mb-3">Salary Management</h1>
                        <p className="text-muted">Total Employees: {stats.totalEmployees}</p>
                    </div>
                    <div className="col-3 ms-5 d-flex justify-content-end align-items-end pb-3 gap-2">
                        <button
                            className="btn btn-link text-decoration-none"
                            onClick={() => generateSalaryReportPDF(filteredSalaryData, paidSalaries, formatCurrency)}
                            title="Export to PDF"
                        >
                            <i className="bi bi-file-earmark-pdf-fill text-danger fs-1 d-flex justify-content-center align-items-center"></i>
                        </button>
                        <button
                            className="btn btn-link text-decoration-none"
                            onClick={() => generateSalaryReportExcel(filteredSalaryData, paidSalaries)}
                            title="Export to Excel"
                        >
                            <i className="bi bi-file-earmark-excel-fill text-success fs-1 d-flex justify-content-center align-items-center"></i>
                        </button>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="row mb-4 g-3 justify-content-center align-items-stretch">
                    <div className="col-5 mb-3">
                        <div className="stat-card stat-card-primary">
                            <div className="stat-icon">
                                <i className="fas fa-users"></i>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.totalEmployees}</div>
                                <div className="stat-label">Total Employees</div>
                            </div>
                        </div>
                    </div>
                    <div className="col-5 mb-3">
                        <div className="stat-card stat-card-success">
                            <div className="stat-icon">
                                <i className="fas fa-check-circle"></i>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.employeesWithSalary}</div>
                                <div className="stat-label">With Salary Assigned</div>
                            </div>
                        </div>
                    </div>
                    <div className="col-5 mb-3">
                        <div className="stat-card stat-card-info">
                            <div className="stat-icon">
                                <i className="fas fa-chart-line"></i>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{formatCurrency(stats.avgSalary, 'INR')}</div>
                                <div className="stat-label">Average Salary</div>
                            </div>
                        </div>
                    </div>
                    <div className="col-5 mb-3">
                        <div className="stat-card stat-card-warning">
                            <div className="stat-icon">
                                <i className="fas fa-wallet"></i>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{formatCurrency(stats.totalPayroll, 'INR')}</div>
                                <div className="stat-label">Total Payroll</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="row mb-4 mx-3">
                    <div className="col-12">
                        <div className="input-group input-group-lg search-bar shadow border-3 rounded-pill">
                            <span className="input-group-text bg-white border-0 ps-3"><i className="bi bi-search"></i></span>
                            <input
                                type="text"
                                className="form-control text-secondary border-0 rounded-pill shadow-none"
                                placeholder="Search by name, email or warehouse..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Salary Table */}
                <div className="table-responsive mt-5 mx-3">
                    {loading ? (
                        <div className="text-center">
                            <div className="spinner-border" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : filteredSalaryData.length === 0 ? (
                        <div className="alert alert-info">No employees found</div>
                    ) : (
                        <table className="table table-hover align-middle">
                            <thead className="border-top border-0 border-3 border-primary">
                                <tr>
                                    <th scope="col" className="py-2">Employee Name</th>
                                    <th scope="col" className="py-2">Email</th>
                                    <th scope="col" className="py-2">Role</th>
                                    <th scope="col" className="py-2">Warehouse</th>
                                    <th scope="col" className="py-2">Base Salary</th>
                                    <th scope="col" className="py-2">Paid Salary</th>
                                    <th scope="col" className="py-2">Frequency</th>
                                    <th scope="col" className="py-2">Last Updated</th>
                                    <th scope="col" className="py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSalaryData.map((emp) => (
                                    <tr key={emp._id}>
                                        <td>{emp.fullName}</td>
                                        <td>{emp.email}</td>
                                        <td><span className="badge bg-info rounded-pill px-3 py-2">{emp.role}</span></td>
                                        <td><span className="badge bg-success rounded-pill px-3 py-2">{emp.warehouse || 'N/A'}</span></td>
                                        <td>
                                            {emp.baseSalary > 0 ? (
                                                <span className="fw-bold text-success">{formatCurrency(emp.baseSalary, emp.currency)}</span>
                                            ) : (
                                                <span className="text-muted">Not Assigned</span>
                                            )}
                                        </td>
                                        <td className="fw-bold text-info">{formatCurrency(paidSalaries[emp._id] || 0, 'INR')}</td>
                                        <td className="text-capitalize">{emp.paymentFrequency}</td>
                                        <td>{emp.lastUpdated ? formatDate(emp.lastUpdated) : 'N/A'}</td>
                                        <td className='d-flex gap-2'>
                                            <button
                                                className="btn btn-sm btn-info"
                                                onClick={() => handleOpenModal(emp)}
                                                title="Edit Salary"
                                            >
                                                <i className="bi bi-pencil"></i>
                                            </button>
                                            {emp.baseSalary > 0 && (
                                                <>
                                                    <button
                                                        className="btn btn-sm btn-success"
                                                        onClick={() => handleOpenPaymentModal(emp)}
                                                        title="Record Payment"
                                                    >
                                                        <i className="bi bi-cash-coin"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-warning"
                                                        onClick={async () => {
                                                            try {
                                                                const response = await fetch(`http://localhost:5000/api/salarypayment/getpayments/${emp._id}`, {
                                                                    method: 'GET',
                                                                    headers: {
                                                                        'Content-Type': 'application/json',
                                                                        'auth-token': localStorage.getItem('token')
                                                                    }
                                                                });
                                                                const payments = response.ok ? await response.json() : [];
                                                                await generateIndividualSalaryReportPDF(emp, payments, paidSalaries[emp._id] || 0, formatCurrency);
                                                            } catch (error) {
                                                                // console.error('Error downloading report:', error);
                                                                props.showAlert('Error generating report', 'danger');
                                                            }
                                                        }}
                                                        title="Download Report"
                                                    >
                                                        <i className="bi bi-download"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => handleDeleteSalary(emp._id)}
                                                        title="Delete Salary"
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Salary Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    animation: 'fadeIn 0.3s ease'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '1rem',
                        padding: '2rem',
                        maxWidth: '500px',
                        width: '90%',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                        animation: 'slideUp 0.3s ease',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h5 className="modal-title fw-bold fs-5" style={{ margin: 0 }}>
                                {editingId ? 'Update Salary' : 'Assign Salary'}
                            </h5>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={handleCloseModal}
                                style={{ position: 'relative' }}
                            ></button>
                        </div>

                        {selectedEmployee && (
                            <div className="mb-4 p-3 bg-light rounded-3">
                                <p className="mb-2 text-secondary" style={{ margin: 0 }}>Employee:</p>
                                <p className="mb-0 fw-600 text-dark" style={{ margin: 0 }}>{selectedEmployee.fullName}</p>
                                <p className="mb-0 text-secondary small" style={{ margin: 0 }}>{selectedEmployee.email}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label htmlFor="baseSalary" className="form-label fw-500">
                                    Base Salary <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="baseSalary"
                                    name="baseSalary"
                                    value={formData.baseSalary}
                                    onChange={handleInputChange}
                                    placeholder="Enter base salary"
                                    min="0"
                                    step="0.01"
                                    required
                                    style={{
                                        border: '1px solid #dee2e6',
                                        padding: '0.75rem',
                                        fontSize: '0.95rem',
                                        borderRadius: '0.375rem'
                                    }}
                                />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="currency" className="form-label fw-500">
                                    Currency <span className="text-danger">*</span>
                                </label>
                                <select
                                    className="form-select"
                                    id="currency"
                                    name="currency"
                                    value={formData.currency}
                                    onChange={handleInputChange}
                                    required
                                    style={{
                                        border: '1px solid #dee2e6',
                                        padding: '0.75rem',
                                        fontSize: '0.95rem',
                                        borderRadius: '0.375rem'
                                    }}
                                >
                                    <option value="INR">Indian Rupee (INR)</option>
                                </select>
                            </div>

                            <div className="mb-4">
                                <label htmlFor="paymentFrequency" className="form-label fw-500">
                                    Payment Frequency <span className="text-danger">*</span>
                                </label>
                                <select
                                    className="form-select"
                                    id="paymentFrequency"
                                    name="paymentFrequency"
                                    value={formData.paymentFrequency}
                                    onChange={handleInputChange}
                                    required
                                    style={{
                                        border: '1px solid #dee2e6',
                                        padding: '0.75rem',
                                        fontSize: '0.95rem',
                                        borderRadius: '0.375rem'
                                    }}
                                >
                                    <option value="monthly">Monthly</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="daily">Daily</option>
                                </select>
                            </div>

                            <div className="d-flex gap-2">
                                <button
                                    type="submit"
                                    className="btn btn-primary flex-grow-1"
                                    style={{
                                        background: 'linear-gradient(135deg, #af50ff, #7b2cbf)',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        padding: '0.75rem',
                                        fontWeight: '600',
                                        color: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {editingId ? 'Update Salary' : 'Assign Salary'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary flex-grow-1"
                                    onClick={handleCloseModal}
                                    style={{
                                        borderRadius: '0.5rem',
                                        padding: '0.75rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        border: '1px solid #dee2e6',
                                        backgroundColor: 'white',
                                        color: '#6c757d'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    animation: 'fadeIn 0.3s ease'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '1rem',
                        padding: '2rem',
                        maxWidth: '500px',
                        width: '90%',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                        animation: 'slideUp 0.3s ease',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h5 className="modal-title fw-bold fs-5" style={{ margin: 0 }}>
                                Record Salary Payment
                            </h5>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={handleClosePaymentModal}
                                style={{ position: 'relative' }}
                            ></button>
                        </div>

                        {selectedEmployee && (
                            <div className="mb-4 p-3 bg-light rounded-3">
                                <p className="mb-2 text-secondary" style={{ margin: 0 }}>Employee:</p>
                                <p className="mb-0 fw-600 text-dark" style={{ margin: 0 }}>{selectedEmployee.fullName}</p>
                                <p className="mb-0 text-secondary small" style={{ margin: 0 }}>{selectedEmployee.email}</p>
                            </div>
                        )}

                        <form onSubmit={handleRecordPayment}>
                            <div className="mb-3">
                                <label htmlFor="paymentAmount" className="form-label fw-500">
                                    Payment Amount <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="paymentAmount"
                                    name="amount"
                                    value={paymentFormData.amount}
                                    onChange={handlePaymentInputChange}
                                    placeholder="Enter payment amount"
                                    min="0"
                                    step="0.01"
                                    required
                                    style={{
                                        border: '1px solid #dee2e6',
                                        padding: '0.75rem',
                                        fontSize: '0.95rem',
                                        borderRadius: '0.375rem'
                                    }}
                                />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="paymentDate" className="form-label fw-500">
                                    Payment Date <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="date"
                                    className="form-control"
                                    id="paymentDate"
                                    name="paymentDate"
                                    value={paymentFormData.paymentDate}
                                    onChange={handlePaymentInputChange}
                                    required
                                    style={{
                                        border: '1px solid #dee2e6',
                                        padding: '0.75rem',
                                        fontSize: '0.95rem',
                                        borderRadius: '0.375rem'
                                    }}
                                />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="paymentMethod" className="form-label fw-500">
                                    Payment Method <span className="text-danger">*</span>
                                </label>
                                <select
                                    className="form-select"
                                    id="paymentMethod"
                                    name="paymentMethod"
                                    value={paymentFormData.paymentMethod}
                                    onChange={handlePaymentInputChange}
                                    required
                                    style={{
                                        border: '1px solid #dee2e6',
                                        padding: '0.75rem',
                                        fontSize: '0.95rem',
                                        borderRadius: '0.375rem'
                                    }}
                                >
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cash">Cash</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="digital_wallet">Digital Wallet</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="mb-3">
                                <label htmlFor="paymentPeriod" className="form-label fw-500">
                                    Payment Period (e.g., January 2024)
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="paymentPeriod"
                                    name="paymentPeriod"
                                    value={paymentFormData.paymentPeriod}
                                    onChange={handlePaymentInputChange}
                                    placeholder="e.g., January 2024, Week 1 Jan"
                                    style={{
                                        border: '1px solid #dee2e6',
                                        padding: '0.75rem',
                                        fontSize: '0.95rem',
                                        borderRadius: '0.375rem'
                                    }}
                                />
                            </div>

                            <div className="mb-4">
                                <label htmlFor="paymentDescription" className="form-label fw-500">
                                    Description/Notes
                                </label>
                                <textarea
                                    className="form-control"
                                    id="paymentDescription"
                                    name="description"
                                    value={paymentFormData.description}
                                    onChange={handlePaymentInputChange}
                                    placeholder="Add any notes about this payment"
                                    rows="2"
                                    style={{
                                        border: '1px solid #dee2e6',
                                        padding: '0.75rem',
                                        fontSize: '0.95rem',
                                        borderRadius: '0.375rem',
                                        resize: 'vertical'
                                    }}
                                ></textarea>
                            </div>

                            <div className="d-flex gap-2">
                                <button
                                    type="submit"
                                    className="btn btn-success flex-grow-1"
                                    style={{
                                        background: 'linear-gradient(135deg, #28a745, #20c997)',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        padding: '0.75rem',
                                        fontWeight: '600',
                                        color: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Record Payment
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary flex-grow-1"
                                    onClick={handleClosePaymentModal}
                                    style={{
                                        borderRadius: '0.5rem',
                                        padding: '0.75rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        border: '1px solid #dee2e6',
                                        backgroundColor: 'white',
                                        color: '#6c757d'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default SalaryManagement;
