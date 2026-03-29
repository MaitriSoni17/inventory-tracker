import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import '../../../styles/dashboard-elegant.css'
import { CanManageEmployees, CanEditEmployees, CanExportReports } from '../../../components/auth/RoleGuards';
import { generateIndividualEmployeeReportPDF } from '../../../utils/individualReportHelper';
const Employees = (props) => {
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterWarehouse, setFilterWarehouse] = useState('');
    const [filterJoiningDate, setFilterJoiningDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [warehouseMap, setWarehouseMap] = useState({});
    const [customRoles, setCustomRoles] = useState({});
    const [stats, setStats] = useState({
        totalEmployees: 0,
        activeEmployees: 0
    });

    useEffect(() => {
        fetchWarehouses();
        fetchEmployees();
        fetchCustomRoles();
    }, []);

    useEffect(() => {
        filterEmployees();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employees, searchTerm, filterRole, filterWarehouse, filterJoiningDate, warehouseMap]);

    const fetchWarehouses = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/warehouse/getwarehouse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });
            if (response.ok) {
                const warehouseList = await response.json();
                const map = {};
                warehouseList.forEach(wh => {
                    map[wh._id] = wh.wName;
                });
                setWarehouseMap(map);
            }
        } catch (error) {
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/employee/getallemployees', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const data = await response.json();
                setEmployees(data);
                setFilteredEmployees(data);
                setStats({
                    totalEmployees: data.length,
                    activeEmployees: data.length
                });
            } else {
                props.showAlert('Failed to fetch employees', 'danger');
            }
        } catch (error) {
            props.showAlert('Error fetching employees', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomRoles = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/permissions/custom-roles', {
                method: 'GET',
                headers: {
                    'auth-token': localStorage.getItem('token')
                }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.customRoles) {
                    setCustomRoles(data.customRoles);
                }
            }
        } catch (error) {
            // Custom roles are optional
        }
    };

    const filterEmployees = () => {
        let filtered = employees;

        const getEmployeeWarehouseName = (emp) => {
            if (!emp.warehouse) return '';
            if (typeof emp.warehouse === 'string') {
                return warehouseMap[emp.warehouse] || emp.warehouse;
            }
            return emp.warehouse.wName || '';
        };

        const toLocalDateString = (dateValue) => {
            if (!dateValue) return '';
            const date = new Date(dateValue);
            if (Number.isNaN(date.getTime())) return '';
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(emp =>
                (emp.fname && emp.fname.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (emp.lname && emp.lname.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (emp.phone && emp.phone.toString().includes(searchTerm))
            );
        }

        // Role filter
        if (filterRole) {
            filtered = filtered.filter(emp => emp.role === filterRole);
        }

        // Warehouse filter
        if (filterWarehouse) {
            filtered = filtered.filter(emp => getEmployeeWarehouseName(emp) === filterWarehouse);
        }

        // Joining date filter
        if (filterJoiningDate) {
            filtered = filtered.filter(emp => toLocalDateString(emp.jDate) === filterJoiningDate);
        }

        setFilteredEmployees(filtered);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this employee?')) {
            try {
                const response = await fetch(`http://localhost:5000/api/employee/deleteemployee/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    }
                });

                if (response.ok) {
                    props.showAlert('Employee deleted successfully', 'success');
                    setEmployees(employees.filter(emp => emp._id !== id));
                } else {
                    props.showAlert('Failed to delete employee', 'danger');
                }
            } catch (error) {
                props.showAlert('Error deleting employee', 'danger');
            }
        }
    };

    const handleReactivate = async (id, name) => {
        if (window.confirm(`Are you sure you want to reactivate ${name}?`)) {
            try {
                const response = await fetch(`http://localhost:5000/api/employee/reactivate/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    }
                });

                if (response.ok) {
                    props.showAlert(`${name} has been reactivated successfully`, 'success');
                    // Update the employee's active status in the list
                    setEmployees(employees.map(emp => emp._id === id ? { ...emp, isActive: true } : emp));
                } else {
                    const errorData = await response.json();
                    props.showAlert(errorData.error || 'Failed to reactivate employee', 'danger');
                }
            } catch (error) {
                props.showAlert('Error reactivating employee: ' + error.message, 'danger');
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatLastLogin = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;
        // Extract just the filename if path contains /
        const filename = imagePath.includes('/') ? imagePath.split('/').pop() : imagePath;
        return `http://localhost:5000/uploads/${filename}`;
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setFilterRole('');
        setFilterWarehouse('');
        setFilterJoiningDate('');
        setFilteredEmployees(employees);
        props.showAlert('Filters reset successfully', 'info');
    };

    const getEmployeeWarehouseName = (emp) => {
        if (!emp.warehouse) return '';
        if (typeof emp.warehouse === 'string') {
            return warehouseMap[emp.warehouse] || emp.warehouse;
        }
        return emp.warehouse.wName || '';
    };

    const warehouseFilterOptions = [...new Set(
        employees
            .map((emp) => getEmployeeWarehouseName(emp))
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    const exportToExcel = () => {
        if (filteredEmployees.length === 0) {
            props.showAlert('No employees to export', 'warning');
            return;
        }

        try {
            const exportData = filteredEmployees.map(emp => ({
                'Employee ID': emp._id.slice(-6),
                'First Name': emp.fname,
                'Last Name': emp.lname || '',
                'Email': emp.email,
                'Phone': emp.phone || '',
                'Role': emp.role,
                'Hire Location': warehouseMap[emp.hireAt] || emp.hireAt || '',
                'Joining Date': formatDate(emp.jDate),
                'Birth Date': formatDate(emp.birthDate),
                'Gender': emp.gender || '',
                'Nationality': emp.nationality || '',
                'Country': emp.country || '',
                'State': emp.state || '',
                'City': emp.city || '',
                'Address': emp.address || '',
                'About': emp.about || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');

            const colWidths = [
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 20 },
                { wch: 12 },
                { wch: 10 },
                { wch: 15 },
                { wch: 12 },
                { wch: 12 },
                { wch: 10 },
                { wch: 12 },
                { wch: 12 },
                { wch: 10 },
                { wch: 10 },
                { wch: 25 },
                { wch: 20 }
            ];
            worksheet['!cols'] = colWidths;

            const fileName = `Employees_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            props.showAlert('Employees exported to Excel successfully', 'success');
        } catch (error) {
            props.showAlert('Error exporting to Excel', 'danger');
        }
    };

    const exportToPDF = () => {
        if (filteredEmployees.length === 0) {
            props.showAlert('No employees to export', 'warning');
            return;
        }

        try {
            const element = document.createElement('div');
            element.innerHTML = `
                <div style="padding: 20px; font-family: Arial, sans-serif;">
                    <h1 style="text-align: center; margin-bottom: 30px;">Employees Report</h1>
                    <p style="text-align: center; margin-bottom: 20px; color: #666;">Generated on: ${new Date().toLocaleString('en-IN')}</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <thead>
                            <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Employee ID</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Name</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Email</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Phone</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Role</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Hire Location</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Joining Date</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredEmployees.map(emp => `
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${emp._id.slice(-6)}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${emp.fname} ${emp.lname || ''}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${emp.email}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${emp.phone || 'N/A'}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${emp.role}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${emp.hireAt || 'N/A'}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${formatDate(emp.jDate)}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${emp.city || ''}, ${emp.country || ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <p style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">Total Employees: ${filteredEmployees.length}</p>
                </div>
            `;

            const opt = {
                margin: 10,
                filename: `Employees_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
            };

            html2pdf().set(opt).from(element).save();
            props.showAlert('Employees exported to PDF successfully', 'success');
        } catch (error) {
            props.showAlert('Error exporting to PDF', 'danger');
        }
    };

    const downloadIndividualEmployeeReport = async (employee) => {
        try {
            const success = await generateIndividualEmployeeReportPDF(employee, formatDate, (phone) => {
                if (!phone) return 'N/A';
                return phone.length === 10 ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : phone;
            });
            if (success) {
                props.showAlert(`Report downloaded for ${employee.fname} ${employee.lname || ''}`, 'success');
            } else {
                props.showAlert('Failed to generate report', 'danger');
            }
        } catch (error) {
            props.showAlert('Error downloading report: ' + error.message, 'danger');
        }
    };

    return (
        <>
            <div className="container-fluid p-4">
                <div className="row mb-3 mx-3">
                    <div className="col-8 py-3 me-5">
                        <h1 className="display-5 fw-normal mb-3">Employees</h1>
                        <p className="text-muted">Total Employees: {stats.totalEmployees}</p>
                    </div>
                    <div className="col-3 ms-5 d-flex justify-content-end align-items-end pb-3">
                        <CanExportReports>
                            <button className="btn btn-link text-decoration-none" onClick={exportToPDF} title="Export to PDF">
                                <i className="bi bi-file-earmark-pdf-fill text-danger fs-1 d-flex justify-content-center align-items-center"></i>
                            </button>
                            <button className="btn btn-link text-decoration-none" onClick={exportToExcel} title="Export to Excel">
                                <i className="bi bi-file-earmark-excel-fill text-success fs-1 d-flex justify-content-center align-items-center"></i>
                            </button>
                        </CanExportReports>

                        <CanManageEmployees>
                            <Link className="btn btn-custom-purple shadow-sm mb-2 text-decoration-none" to="/dashboard/createemployee">
                                <i className="bi bi-plus-lg me-1"></i> Add Employee
                            </Link>
                        </CanManageEmployees>
                    </div>
                </div>

                <div className="row mb-4 mx-3">
                    <div className="col-12">
                        <div className="input-group input-group-lg search-bar shadow border-3 rounded-pill">
                            <span className="input-group-text bg-white border-0 ps-3"><i className="bi bi-search"></i></span>
                            <input type="text" className="form-control text-secondary border-0 rounded-pill shadow-none"
                                placeholder="Search" value={searchTerm} onChange={handleSearchChange} />
                        </div>
                    </div>
                </div>

                <div className="row mb-4 align-items-start ms-3 mb-4">
                    <div className="col-auto me-3 border-end border-secondary-subtle border-2 pe-3">
                        <small className="text-secondary fs-4">Filters</small>
                    </div>
                    <div className="col-auto">
                        <select className="shadow border border-2 pe-4 form-select custom-select-filter" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                            <option value="">All Roles</option>
                            <option value="employee">Employee</option>
                            <option value="manager">Manager</option>
                            <option value="supervisor">Supervisor</option>
                            {Object.entries(customRoles).map(([key, role]) => (
                                <option key={key} value={key}>{role.displayName}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-auto">
                        <select className="shadow border border-2 pe-4 form-select custom-select-filter" value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)}>
                            <option value="">All Warehouses</option>
                            {warehouseFilterOptions.map((warehouseName) => (
                                <option key={warehouseName} value={warehouseName}>{warehouseName}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-auto">
                        <input
                            type="date"
                            className="shadow border border-2 form-control custom-select-filter"
                            value={filterJoiningDate}
                            onChange={(e) => setFilterJoiningDate(e.target.value)}
                            title="Filter by joining date"
                        />
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
                    ) : filteredEmployees.length === 0 ? (
                        <div className="alert alert-info">No employees found</div>
                    ) : (
                        <table className="table table-hover align-middle">
                            <thead className="border-top border-0 border-3 border-primary">
                                <tr>
                                    <th scope="col" className="py-2">Image</th>
                                    <th scope="col" className="py-2">ID</th>
                                    <th scope="col" className="py-2">Name</th>
                                    <th scope="col" className="py-2">Email</th>
                                    <th scope="col" className="py-2">Phone</th>
                                    <th scope="col" className="py-2">Role</th>
                                    <th scope="col" className="py-2">Warehouse</th>
                                    <th scope="col" className="py-2">Joining Date</th>
                                    <th scope="col" className="py-2">Last Login</th>
                                    <th scope="col" className="py-2">Status</th>
                                    <CanEditEmployees><th scope="col" className="py-2">Actions</th></CanEditEmployees>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.map((emp) => (
                                    <tr key={emp._id}>
                                        <td>
                                            {emp.image ? (
                                                <img src={getImageUrl(emp.image)} alt={emp.fname} className="rounded-circle" width="40" height="40" style={{ objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                            ) : (
                                                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#e9ecef' }}>
                                                    <i className="bi bi-person-fill text-secondary"></i>
                                                </div>
                                            )}
                                        </td>
                                        <td>{emp._id.slice(-6)}</td>
                                        <td>{emp.fname} {emp.lname || ''}</td>
                                        <td>{emp.email}</td>
                                        <td>{emp.phone || 'N/A'}</td>
                                        <td><span className="badge bg-info rounded-pill px-3 py-2">{customRoles[emp.role] ? customRoles[emp.role].displayName : emp.role.charAt(0).toUpperCase() + emp.role.slice(1)}</span></td>
                                        <td>
                                            {emp.warehouse ? (
                                                <span className="badge bg-success rounded-pill px-3 py-2">
                                                    {typeof emp.warehouse === 'string'
                                                        ? warehouseMap[emp.warehouse] || emp.warehouse
                                                        : emp.warehouse.wName || 'N/A'
                                                    }
                                                </span>
                                            ) : (
                                                <span className="badge bg-warning rounded-pill px-3 py-2">Unassigned</span>
                                            )}
                                        </td>
                                        <td>{formatDate(emp.jDate)}</td>
                                        <td>
                                            <small className="text-muted" title={emp.lastLogin ? new Date(emp.lastLogin).toLocaleString('en-IN') : 'Never'}>
                                                {formatLastLogin(emp.lastLogin)}
                                            </small>
                                        </td>
                                        <td>
                                            {emp.isActive !== false ? (
                                                <span className="badge bg-success rounded-pill px-3 py-2">
                                                    <i className="bi bi-check-circle me-1"></i>Active
                                                </span>
                                            ) : (
                                                <span className="badge bg-danger rounded-pill px-3 py-2">
                                                    <i className="bi bi-x-circle me-1"></i>Inactive
                                                </span>
                                            )}
                                        </td>
                                        <CanEditEmployees>
                                            <td className='d-flex'>
                                                <button className="btn btn-sm btn-success me-2" onClick={() => downloadIndividualEmployeeReport(emp)} title="Download Report">
                                                    <i className="bi bi-download"></i>
                                                </button>
                                                {emp.isActive !== false ? (
                                                    <Link to={`/dashboard/editemployee/${emp._id}`} className="btn btn-sm btn-info me-2" title="Edit">
                                                        <i className="bi bi-pencil"></i>
                                                    </Link>
                                                ) : null}
                                                {emp.isActive === false ? (
                                                    <button className="btn btn-sm btn-warning me-2" onClick={() => handleReactivate(emp._id, `${emp.fname} ${emp.lname || ''}`)} title="Reactivate Account">
                                                        <i className="bi bi-arrow-counterclockwise"></i>
                                                    </button>
                                                ) : null}
                                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(emp._id)} title="Delete">
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </td>
                                        </CanEditEmployees>
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


export default Employees;

