import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom';
import '../styles/dashboard-elegant.css';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Products = (props) => {

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedStock, setSelectedStock] = useState('');
    const [categories, setCategories] = useState([]);
    const [lastUpdateTime, setLastUpdateTime] = useState(new Date());

    const getImageFileName = (product) => {
        const fileName = (product.images && product.images.length > 0 ? product.images[0] : '');
        // Ensure the filename is a string and not null/undefined
        return fileName ? String(fileName) : '';
    };

    useEffect(() => {
        // Fetch products data from an API or database
        // For demonstration, we'll use static data
        const fetchProducts = async () => {
            try {
                const response = await fetch("http://localhost:5000/api/products/getproduct", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    }
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`API Error: Status ${response.status}`, errorText);
                    props.showAlert(`Failed to fetch products (Status ${response.status})`, "danger");
                    setLoading(false);
                    return;
                }
                const json = await response.json();
                setProducts(json);
                setLastUpdateTime(new Date());

                // Extract unique categories
                const uniqueCategories = [...new Set(json.map(p => p.category))];
                setCategories(uniqueCategories);

                setLoading(false);
            } catch (error) {
                console.error("Network or Parsing Error:", error);
                props.showAlert("Failed to fetch products", "danger");
                setLoading(false);
            }
        };

        fetchProducts();
    });

    const handleDelete = async (productId) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            try {
                const response = await fetch(`http://localhost:5000/api/products/deleteproduct/${productId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': localStorage.getItem('token')
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Delete Error: Status ${response.status}`, errorText);
                    props.showAlert(`Failed to delete product (Status ${response.status})`, "danger");
                    return;
                }

                setProducts(products.filter(product => product._id !== productId));
                props.showAlert("Product deleted successfully", "success");
            } catch (error) {
                console.error("Error deleting product:", error);
                props.showAlert("Failed to delete product", "danger");
            }
        }
    };

    // Filter products based on search and filter criteria
    const getFilteredProducts = () => {
        return products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.brand?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCategory = !selectedCategory || product.category === selectedCategory;

            const matchesStatus = !selectedStatus || selectedStatus === 'Active'; // All products shown as active for now

            let matchesStock = true;
            if (selectedStock === 'Low') {
                matchesStock = product.totalProducts <= 10;
            } else if (selectedStock === 'Medium') {
                matchesStock = product.totalProducts > 10 && product.totalProducts <= 50;
            } else if (selectedStock === 'High') {
                matchesStock = product.totalProducts > 50;
            }

            return matchesSearch && matchesCategory && matchesStatus && matchesStock;
        });
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedCategory('');
        setSelectedStatus('');
        setSelectedStock('');
    };

    const exportToExcel = () => {
        const filteredProducts = getFilteredProducts();

        if (filteredProducts.length === 0) {
            props.showAlert("No products to export", "warning");
            return;
        }

        const dataToExport = filteredProducts.map(product => ({
            'Product Name': product.name,
            'Category': product.category,
            'Brand': product.brand || '-',
            'Price': `₹${product.price}`,
            'Stock': product.totalProducts,
            'Warehouse': product.warehouse?.join(', ') || '-',
            'Status': 'Active',
            'Mfg Date': new Date(product.mDate).toLocaleDateString(),
            'Exp Date': new Date(product.eDate).toLocaleDateString(),
            'Description': product.desc || '-'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Products");

        // Adjust column widths
        ws['!cols'] = [
            { wch: 20 },
            { wch: 15 },
            { wch: 12 },
            { wch: 10 },
            { wch: 10 },
            { wch: 15 },
            { wch: 10 },
            { wch: 12 },
            { wch: 12 },
            { wch: 25 }
        ];

        XLSX.writeFile(wb, `Products_${new Date().toISOString().split('T')[0]}.xlsx`);
        props.showAlert("Products exported to Excel successfully", "success");
    };

    const exportToPDF = async () => {
        const filteredProducts = getFilteredProducts();

        if (filteredProducts.length === 0) {
            props.showAlert("No products to export", "warning");
            return;
        }

        const element = document.getElementById('products-table');
        if (!element) {
            props.showAlert("Table not found", "danger");
            return;
        }

        try {
            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 280;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
            pdf.save(`Products_${new Date().toISOString().split('T')[0]}.pdf`);
            props.showAlert("Products exported to PDF successfully", "success");
        } catch (error) {
            console.error("PDF Export Error:", error);
            props.showAlert("Failed to export PDF", "danger");
        }
    };

    return (
        <>
            <div className="container-fluid">
                <div className="row mb-3 my-2">
                    <div className="col-8 py-3 me-4">
                        <h1 className="display-5 fw-normal mb-3">Products</h1>
                        <p className="text-muted">Last Update {lastUpdateTime.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} at {lastUpdateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p>

                    </div>
                    <div className="col-3 ms-5 d-flex justify-content-end align-items-end pb-3">
                        <button
                            className="btn btn-link text-danger me-3 fs-2 p-0 border-0"
                            onClick={exportToPDF}
                            title="Export to PDF">
                            <i className="bi bi-file-earmark-pdf-fill"></i>
                        </button>
                        <button
                            className="btn btn-link text-success me-3 fs-2 p-0 border-0"
                            onClick={exportToExcel}
                            title="Export to Excel">
                            <i className="bi bi-file-earmark-excel-fill"></i>
                        </button>

                        <a className="btn btn-custom-purple shadow-sm text-decoration-none" href="/dashboard/addproduct">
                            <i className="bi bi-plus-lg me-1"></i> Add Product
                        </a>
                    </div>
                </div>

                <div className="row mb-4 mx-3">
                    <div className="col-12">
                        <div className="input-group input-group-lg search-bar shadow border-3 rounded-pill">
                            <span className="input-group-text bg-white border-0 ps-3"><i className="bi bi-search"></i></span>
                            <input
                                type="text"
                                className="form-control border-0 rounded-pill shadow-none text-muted"
                                placeholder="Search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="row mb-4 align-items-start ms-3 mb-4">
                    <div className="col-auto me-3 border-end border-secondary-subtle border-2 pe-3">
                        <small className="text-secondary fs-4">Filters</small>
                    </div>
                    <div className="col-auto">
                        <select
                            className="shadow border border-2 pe-4 form-select custom-select-filter"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="">Category</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-auto">
                        <select
                            className="shadow border border-2 pe-5 form-select custom-select-filter"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            <option value="">Status</option>
                            <option value="Active">Active</option>
                        </select>
                    </div>
                    <div className="col-auto">
                        <select
                            className="shadow border border-2 form-select custom-select-filter"
                            value={selectedStock}
                            onChange={(e) => setSelectedStock(e.target.value)}
                        >
                            <option value="">Stock</option>
                            <option value="Low">Low (≤10)</option>
                            <option value="Medium">Medium (11-50)</option>
                            <option value="High">High (50)</option>
                        </select>
                    </div>
                    <div className="col-auto">
                        <button
                            className="shadow border border-2 border-primary btn btn-custom-purple px-4"
                            onClick={handleResetFilters}
                        >
                            Reset
                        </button>
                    </div>
                </div>

                <div className="table-responsive mt-5">
                    {loading ? (
                        <div className="text-center">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-3">
                                <small className="text-muted">Showing {getFilteredProducts().length} of {products.length} products</small>
                            </div>
                            {getFilteredProducts().length === 0 ? (
                                <div className="alert alert-info" role="alert">
                                    No products found. {products.length === 0 && <><a href="/dashboard/addproduct" className="alert-link">Add a new product</a></>}
                                </div>
                            ) : (
                                <table className="table table-hover align-middle" id="products-table">
                                    <thead className="border-top border-0 border-3 border-primary">
                                        <tr>
                                            <th scope="col" className="py-2"></th>
                                            <th scope="col" className="py-2">Product Name</th>
                                            <th scope="col" className="py-2">Status</th>
                                            <th scope="col" className="py-2">Stock Info</th>
                                            <th scope="col" className="py-2">Category</th>
                                            <th scope="col" className="py-2">Price</th>
                                            <th scope="col" className="py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getFilteredProducts().map((product) => {
                                            // Get the first image from images array or use single image field
                                            const imageToDisplay = getImageFileName(product);
                                            const imageSrc = `http://localhost:5000/uploads/${imageToDisplay}`;

                                            return (
                                                <tr key={product._id} className='p-0'>
                                                    <td className="d-flex justify-content-center">
                                                        <img
                                                            src={imageSrc}
                                                            alt={product.name}
                                                            className="product-thumb-img rounded-3"
                                                            onError={(e) => { e.target.src = '../imgs/product1.jpg'; }}
                                                        />
                                                    </td>
                                                    <td className="fw-bold">{product.name}</td>
                                                    <td><span className="badge custom-badge-purple rounded-pill px-3 py-2">Active</span></td>
                                                    <td>{product.totalProducts} In Stock</td>
                                                    <td>{product.category}</td>
                                                    <td>₹{product.price}</td>
                                                    <td>
                                                        {/* <a href={`/dashboard/editproduct/${product._id}`} className="text-decoration-none text-info me-3"><i
                                                            className="bi bi-pencil-square fs-5"></i></a>
                                                        <button className="text-decoration-none text-danger fs-5 border-0 bg-transparent p-0" onClick={() => handleDelete(product._id)} style={{'cursor': 'pointer'}}><i className="bi bi-trash"></i></button> */}
                                                        <Link to={`/dashboard/editproduct/${product._id}`} className="btn btn-info me-2" title="Edit">
                                                            <i className="bi bi-pencil"></i>
                                                        </Link>
                                                        <button className="btn btn-danger" onClick={() => handleDelete(product._id)} title="Delete">
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    )
}

export default Products