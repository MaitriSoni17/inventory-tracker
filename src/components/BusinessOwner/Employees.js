import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import '../styles/dashboard-elegant.css'
const Employees = (props) => {
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [loading, setLoading] = useState(true);
    const [warehouseMap, setWarehouseMap] = useState({});
    const [stats, setStats] = useState({
        totalEmployees: 0,
        activeEmployees: 0
    });

    useEffect(() => {
        fetchWarehouses();
        fetchEmployees();
    }, []);

    useEffect(() => {
        filterEmployees();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employees, searchTerm, filterRole]);

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
            console.error('Error fetching warehouses:', error);
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
            console.error('Error fetching employees:', error);
            props.showAlert('Error fetching employees', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const filterEmployees = () => {
        let filtered = employees;

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
                console.error('Error deleting employee:', error);
                props.showAlert('Error deleting employee', 'danger');
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
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
        setFilteredEmployees(employees);
        props.showAlert('Filters reset successfully', 'info');
    };

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
            console.error('Error exporting to Excel:', error);
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
            console.error('Error exporting to PDF:', error);
            props.showAlert('Error exporting to PDF', 'danger');
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
                        <button className="btn btn-link text-decoration-none" onClick={exportToPDF} title="Export to PDF">
                            <i className="bi bi-file-earmark-pdf-fill text-danger fs-1 d-flex justify-content-center align-items-center"></i>
                        </button>
                        <button className="btn btn-link text-decoration-none" onClick={exportToExcel} title="Export to Excel">
                            <i className="bi bi-file-earmark-excel-fill text-success fs-1 d-flex justify-content-center align-items-center"></i>
                        </button>

                        <Link className="btn btn-custom-purple shadow-sm mb-2 text-decoration-none" to="/dashboard/createemployee">
                            <i className="bi bi-plus-lg me-1"></i> Add Employee
                        </Link>
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
                                    <th scope="col" className="py-2">Hire Location</th>
                                    <th scope="col" className="py-2">Joining Date</th>
                                    <th scope="col" className="py-2">Location</th>
                                    <th scope="col" className="py-2">Actions</th>
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
                                        <td><span className="badge bg-info rounded-pill px-3 py-2">{emp.role}</span></td>
                                        <td>{warehouseMap[emp.hireAt] || emp.hireAt || 'N/A'}</td>
                                        <td>{formatDate(emp.jDate)}</td>
                                        <td>{emp.city || ''}{emp.city && emp.country ? ', ' : ''}{emp.country || ''}</td>
                                        <td>
                                            <Link to={`/dashboard/editemployee/${emp._id}`} className="btn btn-sm btn-info me-2" title="Edit">
                                                <i className="bi bi-pencil"></i>
                                            </Link>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(emp._id)} title="Delete">
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


export default Employees;