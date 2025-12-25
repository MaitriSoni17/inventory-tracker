import React, { useState, useEffect } from 'react'
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import '../styles/dashboard-elegant.css'

const Warehouses = (props) => {
    const [warehouses, setWarehouses] = useState([]);
    const [filteredWarehouses, setFilteredWarehouses] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCity, setFilterCity] = useState('');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalWarehouses: 0
    });
    const [cities, setCities] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [warehouseForm, setWarehouseForm] = useState({
        wName: '',
        wManager: '',
        wAddress: '',
        wContact: '',
        wEmail: '',
        city: '',
        state: '',
        country: ''
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetchWarehouses();
    }, []);

    useEffect(() => {
        filterWarehouses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [warehouses, searchTerm, filterCity]);

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
                const data = await response.json();
                setWarehouses(data);
                setFilteredWarehouses(data);
                setStats({
                    totalWarehouses: data.length
                });
                const uniqueCities = [...new Set(data.map(w => w.city).filter(Boolean))];
                setCities(uniqueCities);
            } else {
                props.showAlert('Failed to fetch warehouses', 'danger');
            }
        } catch (error) {
            props.showAlert('Error fetching warehouses', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const filterWarehouses = () => {
        let filtered = warehouses;

        if (searchTerm) {
            filtered = filtered.filter(warehouse =>
                (warehouse.wName && warehouse.wName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (warehouse.wManager && warehouse.wManager.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (warehouse.wEmail && warehouse.wEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (warehouse.wContact && warehouse.wContact.toString().includes(searchTerm))
            );
        }

        if (filterCity) {
            filtered = filtered.filter(warehouse => warehouse.city === filterCity);
        }

        setFilteredWarehouses(filtered);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setWarehouseForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const resetForm = () => {
        setWarehouseForm({
            wName: '',
            wManager: '',
            wAddress: '',
            wContact: '',
            wEmail: '',
            city: '',
            state: '',
            country: ''
        });
        setEditingId(null);
    };

    const handleAddWarehouse = async (e) => {
        e.preventDefault();

        if (!warehouseForm.wName || !warehouseForm.wManager || !warehouseForm.wAddress || 
            !warehouseForm.wContact || !warehouseForm.wEmail) {
            props.showAlert('Please fill in all required fields', 'danger');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/warehouse/createwarehouse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify(warehouseForm)
            });

            if (response.ok) {
                props.showAlert('Warehouse added successfully', 'success');
                setShowAddModal(false);
                resetForm();
                fetchWarehouses();
            } else {
                const errorData = await response.json();
                props.showAlert(errorData.errors?.[0]?.msg || 'Failed to add warehouse', 'danger');
            }
        } catch (error) {
            props.showAlert('Error adding warehouse', 'danger');
        }
    };

    const handleEditWarehouse = async (e) => {
        e.preventDefault();

        if (!warehouseForm.wName || !warehouseForm.wManager || !warehouseForm.wAddress || 
            !warehouseForm.wContact || !warehouseForm.wEmail) {
            props.showAlert('Please fill in all required fields', 'danger');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/warehouse/updatewarehouse/${editingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify(warehouseForm)
            });

            if (response.ok) {
                props.showAlert('Warehouse updated successfully', 'success');
                setShowEditModal(false);
                resetForm();
                fetchWarehouses();
            } else {
                const errorData = await response.json();
                props.showAlert(errorData.errors?.[0]?.msg || 'Failed to update warehouse', 'danger');
            }
        } catch (error) {
            props.showAlert('Error updating warehouse', 'danger');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this warehouse?')) {
            try {
                const response = await fetch(`http://localhost:5000/api/warehouse/deletewarehouse/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    }
                });

                if (response.ok) {
                    props.showAlert('Warehouse deleted successfully', 'success');
                    setWarehouses(warehouses.filter(w => w._id !== id));
                } else {
                    props.showAlert('Failed to delete warehouse', 'danger');
                }
            } catch (error) {
                props.showAlert('Error deleting warehouse', 'danger');
            }
        }
    };

    const handleEdit = (warehouse) => {
        setWarehouseForm({
            wName: warehouse.wName,
            wManager: warehouse.wManager,
            wAddress: warehouse.wAddress,
            wContact: warehouse.wContact,
            wEmail: warehouse.wEmail,
            city: warehouse.city || '',
            state: warehouse.state || '',
            country: warehouse.country || ''
        });
        setEditingId(warehouse._id);
        setShowEditModal(true);
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setFilterCity('');
        setFilteredWarehouses(warehouses);
        props.showAlert('Filters reset successfully', 'info');
    };

    const exportToExcel = () => {
        if (filteredWarehouses.length === 0) {
            props.showAlert('No warehouses to export', 'warning');
            return;
        }

        try {
            const exportData = filteredWarehouses.map(warehouse => ({
                'Warehouse ID': warehouse._id.slice(-6),
                'Name': warehouse.wName,
                'Manager': warehouse.wManager || '',
                'Email': warehouse.wEmail,
                'Contact': warehouse.wContact || '',
                'Address': warehouse.wAddress || '',
                'City': warehouse.city || '',
                'State': warehouse.state || '',
                'Country': warehouse.country || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Warehouses');

            const colWidths = [
                { wch: 12 },
                { wch: 15 },
                { wch: 12 },
                { wch: 20 },
                { wch: 12 },
                { wch: 25 },
                { wch: 10 },
                { wch: 10 },
                { wch: 12 }
            ];
            worksheet['!cols'] = colWidths;

            const fileName = `Warehouses_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            props.showAlert('Warehouses exported to Excel successfully', 'success');
        } catch (error) {
            props.showAlert('Error exporting to Excel', 'danger');
        }
    };

    const exportToPDF = () => {
        if (filteredWarehouses.length === 0) {
            props.showAlert('No warehouses to export', 'warning');
            return;
        }

        try {
            const element = document.createElement('div');
            element.innerHTML = `
                <div style="padding: 20px; font-family: Arial, sans-serif;">
                    <h1 style="text-align: center; margin-bottom: 30px;">Warehouses Report</h1>
                    <p style="text-align: center; margin-bottom: 20px; color: #666;">Generated on: ${new Date().toLocaleString('en-IN')}</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <thead>
                            <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Warehouse ID</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Name</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Manager</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Email</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Contact</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">City</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Address</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredWarehouses.map(warehouse => `
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${warehouse._id.slice(-6)}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${warehouse.wName}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${warehouse.wManager || 'N/A'}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${warehouse.wEmail}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${warehouse.wContact || 'N/A'}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${warehouse.city || 'N/A'}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${warehouse.wAddress || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <p style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">Total Warehouses: ${filteredWarehouses.length}</p>
                </div>
            `;

            const opt = {
                margin: 10,
                filename: `Warehouses_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
            };

            html2pdf().set(opt).from(element).save();
            props.showAlert('Warehouses exported to PDF successfully', 'success');
        } catch (error) {
            props.showAlert('Error exporting to PDF', 'danger');
        }
    };

    return (
        <>
            <div id="page-main" className="container-fluid bg-light p-5">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="header-left">
                        <h1 className="categories-title mb-3">Warehouses</h1>
                        <p className="text-muted last-update-text">Total Warehouses: {stats.totalWarehouses}</p>
                    </div>
                    <div className="col-3 d-flex justify-content-end align-items-end pb-3">
                        <button className="btn btn-link text-decoration-none" onClick={exportToPDF} title="Export to PDF">
                            <i className="bi bi-file-earmark-pdf-fill text-danger fs-1 d-flex justify-content-center align-items-center"></i>
                        </button>
                        <button className="btn btn-link text-decoration-none" onClick={exportToExcel} title="Export to Excel">
                            <i className="bi bi-file-earmark-excel-fill text-success fs-1 d-flex justify-content-center align-items-center"></i>
                        </button>

                        <button className="btn btn-custom-purple shadow-sm mb-2" onClick={() => { resetForm(); setShowAddModal(true); }}>
                            <i className="bi bi-plus-lg me-1"></i> Add Warehouse
                        </button>
                    </div>
                </div>

                {/* Add Warehouse Modal */}
                {showAddModal && (
                    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h1 className="modal-title fs-3">Add Warehouse</h1>
                                    <button type="button" className="btn-close" onClick={() => { setShowAddModal(false); resetForm(); }}></button>
                                </div>
                                <div className="modal-body p-4">
                                    <form onSubmit={handleAddWarehouse}>
                                        <div className="row g-3">
                                            <div className="col-12">
                                                <label htmlFor="wName" className="form-label fw-semibold mb-2">Warehouse Name *</label>
                                                <input type="text" className="form-control rounded-3 shadow-sm" id="wName" name="wName" 
                                                    value={warehouseForm.wName} onChange={handleInputChange} required />
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="wManager" className="form-label fw-semibold mb-2">Warehouse Manager *</label>
                                                <input type="text" className="form-control rounded-3 shadow-sm" id="wManager" name="wManager"
                                                    value={warehouseForm.wManager} onChange={handleInputChange} required />
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="wContact" className="form-label fw-semibold mb-2">Contact Number *</label>
                                                <input type="tel" className="form-control rounded-3 shadow-sm" id="wContact" name="wContact"
                                                    value={warehouseForm.wContact} onChange={handleInputChange} required />
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="wEmail" className="form-label fw-semibold mb-2">Email *</label>
                                                <input type="email" className="form-control rounded-3 shadow-sm" id="wEmail" name="wEmail"
                                                    value={warehouseForm.wEmail} onChange={handleInputChange} required />
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="city" className="form-label fw-semibold mb-2">City</label>
                                                <input type="text" className="form-control rounded-3 shadow-sm" id="city" name="city"
                                                    value={warehouseForm.city} onChange={handleInputChange} />
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="state" className="form-label fw-semibold mb-2">State</label>
                                                <input type="text" className="form-control rounded-3 shadow-sm" id="state" name="state"
                                                    value={warehouseForm.state} onChange={handleInputChange} />
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="country" className="form-label fw-semibold mb-2">Country</label>
                                                <input type="text" className="form-control rounded-3 shadow-sm" id="country" name="country"
                                                    value={warehouseForm.country} onChange={handleInputChange} />
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="wAddress" className="form-label fw-semibold mb-2">Warehouse Address *</label>
                                                <input type="text" className="form-control rounded-3 shadow-sm" id="wAddress" name="wAddress"
                                                    value={warehouseForm.wAddress} onChange={handleInputChange} required />
                                            </div>
                                        </div>
                                        <div className="d-flex gap-2 mt-4">
                                            <button type="submit" className="btn btn-custom-purple btn-lg">Add Warehouse</button>
                                            <button type="button" className="btn btn-outline-secondary btn-lg" onClick={() => { setShowAddModal(false); resetForm(); }}>Close</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Warehouse Modal */}
                {showEditModal && (
                    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h1 className="modal-title fs-3">Edit Warehouse</h1>
                                    <button type="button" className="btn-close" onClick={() => { setShowEditModal(false); resetForm(); }}></button>
                                </div>
                                <div className="modal-body p-4">
                                    <form onSubmit={handleEditWarehouse}>
                                        <div className="row g-3">
                                            <div className="col-12">
                                                <label htmlFor="wName" className="form-label fw-semibold mb-2">Warehouse Name *</label>
                                                <input type="text" className="form-control rounded-3 shadow-sm" id="wName" name="wName" 
                                                    value={warehouseForm.wName} onChange={handleInputChange} required />
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="wManager" className="form-label fw-semibold mb-2">Warehouse Manager *</label>
                                                <input type="text" className="form-control rounded-3 shadow-sm" id="wManager" name="wManager"
                                                    value={warehouseForm.wManager} onChange={handleInputChange} required />
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="wContact" className="form-label fw-semibold mb-2">Contact Number *</label>
                                                <input type="tel" className="form-control rounded-3 shadow-sm" id="wContact" name="wContact"
                                                    value={warehouseForm.wContact} onChange={handleInputChange} required />
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="wEmail" className="form-label fw-semibold mb-2">Email *</label>
                                                <input type="email" className="form-control rounded-3 shadow-sm" id="wEmail" name="wEmail"
                                                    value={warehouseForm.wEmail} onChange={handleInputChange} required />
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="city" className="form-label fw-semibold mb-2">City</label>
                                                <input type="text" className="form-control rounded-3 shadow-sm" id="city" name="city"
                                                    value={warehouseForm.city} onChange={handleInputChange} />
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="state" className="form-label fw-semibold mb-2">State</label>
                                                <input type="text" className="form-control rounded-3 shadow-sm" id="state" name="state"
                                                    value={warehouseForm.state} onChange={handleInputChange} />
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="country" className="form-label fw-semibold mb-2">Country</label>
                                                <input type="text" className="form-control rounded-3 shadow-sm" id="country" name="country"
                                                    value={warehouseForm.country} onChange={handleInputChange} />
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="wAddress" className="form-label fw-semibold mb-2">Warehouse Address *</label>
                                                <input type="text" className="form-control rounded-3 shadow-sm" id="wAddress" name="wAddress"
                                                    value={warehouseForm.wAddress} onChange={handleInputChange} required />
                                            </div>
                                        </div>
                                        <div className="d-flex gap-2 mt-4">
                                            <button type="submit" className="btn btn-custom-purple btn-lg">Update Warehouse</button>
                                            <button type="button" className="btn btn-outline-secondary btn-lg" onClick={() => { setShowEditModal(false); resetForm(); }}>Close</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* <div className="row mb-4">
                    <div className="col-12">
                        <input 
                            type="text" 
                            className="form-control rounded-3 shadow-sm" 
                            placeholder="Search" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>
                </div> */}

                <div className="row mb-4 mx-3">
                    <div className="col-12">
                        <div className="input-group input-group-lg search-bar shadow border-3 rounded-pill">
                            <span className="input-group-text bg-white border-0 ps-3"><i className="bi bi-search"></i></span>
                            <input type="text" className="form-control text-secondary border-0 rounded-pill shadow-none"
                                placeholder="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="row mb-4 align-items-start ms-1 mb-4">
                    <div className="col-auto me-3 border-end border-secondary-subtle border-2 pe-3">
                        <small className="text-secondary fs-4">Filters</small>
                    </div>
                    <div className="col-auto">
                        <select className="shadow border border-2 form-select custom-select-filter pe-5" value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
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

                {loading ? (
                    <div className="text-center p-5">
                        <div className="spinner-border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : filteredWarehouses.length === 0 ? (
                    <div className="alert alert-info">No warehouses found</div>
                ) : (
                    <div className="row g-4 mt-5">
                        {filteredWarehouses.map((warehouse) => (
                            <div key={warehouse._id} className="col-12 col-md-4 col-lg-4">
                                <div className="card warehouse-card h-100">
                                    <div className="card-img-top warehouse-image-container" style={{ height: '200px', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <i className="bi bi-building" style={{ fontSize: '3rem', color: '#7B3EBC' }}></i>
                                    </div>
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <h5 className="card-title">{warehouse.wName}</h5>
                                            <div>
                                                <button className="btn btn-sm btn-link text-primary" onClick={() => handleEdit(warehouse)} title="Edit">
                                                    <i className="bi bi-pencil-square fs-5"></i>
                                                </button>
                                                <button className="btn btn-sm btn-link text-danger" onClick={() => handleDelete(warehouse._id)} title="Delete">
                                                    <i className="bi bi-trash3-fill fs-5"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <ul className="list-unstyled contact-list">
                                            <li><i className="bi bi-geo-alt me-2"></i> {warehouse.wAddress || 'N/A'}</li>
                                            <li><i className="bi bi-person me-2"></i> {warehouse.wManager || 'N/A'}</li>
                                            <li><i className="bi bi-envelope me-2"></i> {warehouse.wEmail || 'N/A'}</li>
                                            <li><i className="bi bi-telephone me-2"></i> {warehouse.wContact || 'N/A'}</li>
                                            <li><i className="bi bi-building me-2"></i> {warehouse.city || 'N/A'}</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}

export default Warehouses

