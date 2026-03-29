import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import '../../../styles/dashboard-elegant.css';
import { BusinessOwnerOnly } from '../../auth/RoleGuards';
import { generateIndividualSupplierReportPDF } from '../../../utils/individualReportHelper';

const Suppliers = (props) => {
    const [suppliers, setSuppliers] = useState([]);
    const [filteredSuppliers, setFilteredSuppliers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCity, setFilterCity] = useState('');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalSuppliers: 0
    });
    const [cities, setCities] = useState([]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetchSuppliers();
    }, []);

    useEffect(() => {
        filterSuppliers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [suppliers, searchTerm, filterCity]);

    const fetchSuppliers = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/supplier/getallsuppliers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSuppliers(data);
                setFilteredSuppliers(data);
                setStats({
                    totalSuppliers: data.length
                });
                // Extract unique cities for filter
                const uniqueCities = [...new Set(data.map(s => s.city).filter(Boolean))];
                setCities(uniqueCities);
            } else {
                props.showAlert('Failed to fetch suppliers', 'danger');
            }
        } catch (error) {
            props.showAlert('Error fetching suppliers', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const filterSuppliers = () => {
        let filtered = suppliers;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(sup =>
                (sup.fname && sup.fname.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (sup.lname && sup.lname.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (sup.email && sup.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (sup.phone && sup.phone.toString().includes(searchTerm))
            );
        }

        // City filter
        if (filterCity) {
            filtered = filtered.filter(sup => sup.city === filterCity);
        }

        setFilteredSuppliers(filtered);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this supplier?')) {
            try {
                const response = await fetch(`http://localhost:5000/api/supplier/deletesupplier/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    }
                });

                if (response.ok) {
                    props.showAlert('Supplier deleted successfully', 'success');
                    setSuppliers(suppliers.filter(sup => sup._id !== id));
                } else {
                    props.showAlert('Failed to delete supplier', 'danger');
                }
            } catch (error) {
                props.showAlert('Error deleting supplier', 'danger');
            }
        }
    };

    const handleReactivate = async (id, name) => {
        if (window.confirm(`Are you sure you want to reactivate ${name}?`)) {
            try {
                const response = await fetch(`http://localhost:5000/api/supplier/reactivate/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    }
                });

                if (response.ok) {
                    props.showAlert(`${name} has been reactivated successfully`, 'success');
                    // Update the supplier's active status in the list
                    setSuppliers(suppliers.map(sup => sup._id === id ? { ...sup, isActive: true } : sup));
                } else {
                    const errorData = await response.json();
                    props.showAlert(errorData.error || 'Failed to reactivate supplier', 'danger');
                }
            } catch (error) {
                props.showAlert('Error reactivating supplier: ' + error.message, 'danger');
            }
        }
    };

    const downloadIndividualSupplierReport = async (supplier) => {
        try {
            const success = await generateIndividualSupplierReportPDF(supplier);
            if (success) {
                props.showAlert(`Report downloaded for ${supplier.fname} ${supplier.lname || ''}`, 'success');
            } else {
                props.showAlert('Failed to generate report', 'danger');
            }
        } catch (error) {
            props.showAlert('Error downloading report: ' + error.message, 'danger');
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setFilterCity('');
        setFilteredSuppliers(suppliers);
        props.showAlert('Filters reset successfully', 'info');
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

    const exportToExcel = () => {
        if (filteredSuppliers.length === 0) {
            props.showAlert('No suppliers to export', 'warning');
            return;
        }

        try {
            const exportData = filteredSuppliers.map(sup => ({
                'Supplier ID': sup._id.slice(-6),
                'First Name': sup.fname,
                'Last Name': sup.lname || '',
                'Email': sup.email,
                'Phone': sup.phone || '',
                'Nationality': sup.nationality || '',
                'Country': sup.country || '',
                'State': sup.state || '',
                'City': sup.city || '',
                'Address': sup.address || '',
                'About': sup.about || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Suppliers');

            const colWidths = [
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 20 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 10 },
                { wch: 10 },
                { wch: 25 },
                { wch: 20 }
            ];
            worksheet['!cols'] = colWidths;

            const fileName = `Suppliers_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            props.showAlert('Suppliers exported to Excel successfully', 'success');
        } catch (error) {
            props.showAlert('Error exporting to Excel', 'danger');
        }
    };

    const exportToPDF = () => {
        if (filteredSuppliers.length === 0) {
            props.showAlert('No suppliers to export', 'warning');
            return;
        }

        try {
            const element = document.createElement('div');
            element.innerHTML = `
                <div style="padding: 20px; font-family: Arial, sans-serif;">
                    <h1 style="text-align: center; margin-bottom: 30px;">Suppliers Report</h1>
                    <p style="text-align: center; margin-bottom: 20px; color: #666;">Generated on: ${new Date().toLocaleString('en-IN')}</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <thead>
                            <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Supplier ID</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Name</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Email</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Phone</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">City</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Country</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Address</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredSuppliers.map(sup => `
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${sup._id.slice(-6)}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${sup.fname} ${sup.lname || ''}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${sup.email}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${sup.phone || 'N/A'}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${sup.city || 'N/A'}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${sup.country || 'N/A'}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${sup.address || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <p style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">Total Suppliers: ${filteredSuppliers.length}</p>
                </div>
            `;

            const opt = {
                margin: 10,
                filename: `Suppliers_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
            };

            html2pdf().set(opt).from(element).save();
            props.showAlert('Suppliers exported to PDF successfully', 'success');
        } catch (error) {
            props.showAlert('Error exporting to PDF', 'danger');
        }
    };

    return (
        <>
            <div className="container-fluid">
                <div className="row mb-3 mx-3">
                    <div className="col-8 py-3 me-5">
                        <h1 className="display-5 fw-normal mb-3">Suppliers</h1>
                        <p className="text-muted">Total Suppliers: {stats.totalSuppliers}</p>
                    </div>
                    <div className="col-3 d-flex justify-content-end align-items-end pb-3 ms-5">
                        <button className="btn btn-link text-decoration-none" onClick={exportToPDF} title="Export to PDF">
                            <i className="bi bi-file-earmark-pdf-fill text-danger fs-1 d-flex justify-content-center align-items-center"></i>
                        </button>
                        <button className="btn btn-link text-decoration-none" onClick={exportToExcel} title="Export to Excel">
                            <i className="bi bi-file-earmark-excel-fill text-success fs-1 d-flex justify-content-center align-items-center"></i>
                        </button>

                        <Link className="btn btn-custom-purple shadow-sm mb-2 text-decoration-none" to="/dashboard/createsupplier">
                            <i className="bi bi-plus-lg me-1"></i> Add Supplier
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
                        <select className="shadow border pe-5 border-2 form-select custom-select-filter" value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
                            <option value="">All Cities</option>
                            {cities.map(city => (
                                <option key={city} value={city}>{city}</option>
                            ))}
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
                    ) : filteredSuppliers.length === 0 ? (
                        <div className="alert alert-info">No suppliers found</div>
                    ) : (
                        <table className="table table-hover align-middle">
                            <thead className="border-top border-0 border-3 border-primary">
                                <tr>
                                    <th scope="col" className="py-2">ID</th>
                                    <th scope="col" className="py-2">Name</th>
                                    <th scope="col" className="py-2">Email</th>
                                    <th scope="col" className="py-2">Phone</th>
                                    <th scope="col" className="py-2">City</th>
                                    <th scope="col" className="py-2">Country</th>
                                    <th scope="col" className="py-2">Last Login</th>
                                    <th scope="col" className="py-2">Status</th>
                                    <th scope="col" className="py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSuppliers.map((sup) => (
                                    <tr key={sup._id}>
                                        <td>{sup._id.slice(-6)}</td>
                                        <td>{sup.fname} {sup.lname || ''}</td>
                                        <td>{sup.email}</td>
                                        <td>{sup.phone || 'N/A'}</td>
                                        <td>{sup.city || 'N/A'}</td>
                                        <td>{sup.country || 'N/A'}</td>
                                        <td>
                                            <small className="text-muted" title={sup.lastLogin ? new Date(sup.lastLogin).toLocaleString('en-IN') : 'Never'}>
                                                {formatLastLogin(sup.lastLogin)}
                                            </small>
                                        </td>
                                        <td>
                                            {sup.isActive !== false ? (
                                                <span className="badge bg-success rounded-pill px-3 py-2">
                                                    <i className="bi bi-check-circle me-1"></i>Active
                                                </span>
                                            ) : (
                                                <span className="badge bg-danger rounded-pill px-3 py-2">
                                                    <i className="bi bi-x-circle me-1"></i>Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className='d-flex'>
                                            <button className="btn btn-sm btn-success me-2" onClick={() => downloadIndividualSupplierReport(sup)} title="Download Report">
                                                <i className="bi bi-download"></i>
                                            </button>
                                            <Link to={`/dashboard/supplierordes/${sup._id}`} className="btn btn-sm btn-success me-2" title="View Orders">
                                                <i className="bi bi-box-seam"></i>
                                            </Link>
                                            <BusinessOwnerOnly>
                                                {sup.isActive !== false ? (
                                                    <Link to={`/dashboard/editsupplier/${sup._id}`} className="btn btn-sm btn-info me-2" title="Edit">
                                                        <i className="bi bi-pencil"></i>
                                                    </Link>
                                                ) : null}
                                                {sup.isActive === false ? (
                                                    <button className="btn btn-sm btn-warning me-2" onClick={() => handleReactivate(sup._id, `${sup.fname} ${sup.lname || ''}`)} title="Reactivate Account">
                                                        <i className="bi bi-arrow-counterclockwise"></i>
                                                    </button>
                                                ) : null}
                                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(sup._id)} title="Delete">
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </BusinessOwnerOnly>
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

export default Suppliers

