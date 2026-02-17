const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const stream = require('stream');
const fetchuser = require('../middleware/fetchuser');
const fetchbusinessowner = require('../middleware/fetchbusinessowner');
const { requireExportReports, requireBusinessOwnerForReport, requireViewPermissionForReport, hasPermissionAsync } = require('../middleware/roleBasedAccess');
const Employee = require('../models/Employee');
const Products = require('../models/Products');
const Orders = require('../models/CustomerOrders');
const SupplierOrders = require('../models/SupplierOrders');
const Category = require('../models/Category');
const Warehouse = require('../models/Warehouse');
const Supplier = require('../models/Supplier');

// Helper function to filter data by month and year
const filterByMonthYear = (data, month, year, dateField = 'createdAt') => {
    if (!month || !year) return data;
    
    return data.filter(item => {
        const itemDate = new Date(item[dateField]);
        return itemDate.getMonth() + 1 === parseInt(month) && 
               itemDate.getFullYear() === parseInt(year);
    });
};

// ==================== EMPLOYEE REPORTS ====================

// GET: Generate Employee Report (Excel)
router.get('/employees/excel', fetchuser, requireExportReports, requireViewPermissionForReport('canDownloadEmployeeReport', 'employee'), async (req, res) => {
    try {
        const { month, year, employeeId } = req.query;
        
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;
        
        // console.log('Report Request - User ID:', req.user._id);
        // console.log('Report Request - BusinessOwnerId:', businessOwnerId);
        // console.log('Report Request - Role:', req.role);

        let query = { businessowner: businessOwnerId };
        if (employeeId && employeeId !== 'all') {
            query._id = employeeId;
        }

        // console.log('Query:', JSON.stringify(query));

        let employees = await Employee.find(query)
            .populate('businessowner', 'name')
            .populate('warehouse', 'wName wAddress');

        // console.log('Employees found:', employees.length);
        if (employees.length > 0) {
            // console.log('First employee:', employees[0].name);
        }

        // Filter by month/year if provided
        if (month && year) {
            employees = filterByMonthYear(employees, month, year);
            // console.log('After date filter:', employees.length);
        }

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Employees Report');

        // Add title
        worksheet.mergeCells('A1:G1');
        worksheet.getCell('A1').value = 'Employee Report';
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        // Add report info
        worksheet.mergeCells('A2:G2');
        const reportInfo = month && year 
            ? `Report for ${getMonthName(month)} ${year}` 
            : 'All Time Report';
        worksheet.getCell('A2').value = reportInfo;
        worksheet.getCell('A2').alignment = { horizontal: 'center' };

        // Add blank row
        worksheet.addRow([]);

        // Add headers
        const headerRow = worksheet.addRow(['Name', 'Email', 'Phone', 'Role', 'Warehouse', 'Joining Date', 'Status']);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        // Add data
        // console.log('Adding data rows:', employees.length);
        employees.forEach((emp, idx) => {
            const fullName = `${emp.fname || ''} ${emp.lname || ''}`.trim() || 'N/A';
            // console.log(`Row ${idx + 1}:`, fullName, emp.email);
            worksheet.addRow([
                fullName,
                emp.email || 'N/A',
                emp.phone || 'N/A',
                emp.role || 'N/A',
                emp.warehouse ? emp.warehouse.wName : 'Unassigned',
                emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : 'N/A',
                emp.isActive ? 'Active' : 'Inactive'
            ]);
        });

        // console.log('Data added to worksheet');

        // Set column widths with proper sizing
        worksheet.columns = [
            { width: 18 }, // Name
            { width: 25 }, // Email
            { width: 16 }, // Phone
            { width: 14 }, // Role
            { width: 18 }, // Warehouse
            { width: 14 }, // Joining Date
            { width: 12 }  // Status
        ];
        
        // Enable text wrapping for all cells
        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { wrapText: true, vertical: 'middle' };
            });
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=employees-report-${Date.now()}.xlsx`);

        // Write to response
        // console.log('Writing workbook to response');
        res.statusCode = 200;
        await workbook.xlsx.write(res);
        // console.log('Report generation completed successfully');
    } catch (error) {
        // console.error('Error generating employee Excel report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report', details: error.message });
        }
    }
});

// GET: Generate Employee Report (PDF)
router.get('/employees/pdf', fetchuser, requireExportReports, requireViewPermissionForReport('canDownloadEmployeeReport', 'employee'), async (req, res) => {
    try {
        const { month, year, employeeId } = req.query;
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;

        let query = { businessowner: businessOwnerId };
        if (employeeId && employeeId !== 'all') {
            query._id = employeeId;
        }

        let employees = await Employee.find(query)
            .populate('businessowner', 'name')
            .populate('warehouse', 'wName wAddress');

        // Filter by month/year if provided
        if (month && year) {
            employees = filterByMonthYear(employees, month, year);
        }

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=employees-report-${Date.now()}.pdf`);

        doc.pipe(res);

        // Add title
        doc.fontSize(20).text('Employee Report', { align: 'center' });
        doc.moveDown();

        // Add report info
        const reportInfo = month && year 
            ? `Report for ${getMonthName(month)} ${year}` 
            : 'All Time Report';
        doc.fontSize(12).text(reportInfo, { align: 'center' });
        doc.moveDown(2);

        // Add employee data
        employees.forEach((emp, index) => {
            const fullName = `${emp.fname || ''} ${emp.lname || ''}`.trim() || 'N/A';
            doc.fontSize(14).text(`${index + 1}. ${fullName}`, { underline: true });
            doc.fontSize(10);
            doc.text(`Email: ${emp.email || 'N/A'}`);
            doc.text(`Phone: ${emp.phone || 'N/A'}`);
            doc.text(`Role: ${emp.role || 'N/A'}`);
            doc.text(`Warehouse: ${emp.warehouse ? emp.warehouse.wName : 'Unassigned'}`);
            doc.text(`Joining Date: ${emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : 'N/A'}`);
            doc.text(`Status: ${emp.isActive ? 'Active' : 'Inactive'}`);
            doc.moveDown();
        });

        // Add footer
        doc.fontSize(8).text(`Generated on: ${new Date().toLocaleString()}`, 50, doc.page.height - 50, {
            align: 'center'
        });

        doc.end();
    } catch (error) {
        // console.error('Error generating employee PDF report:', error);
        res.status(500).json({ error: 'Error generating report' });
    }
});

// ==================== PRODUCT REPORTS ====================

// GET: Generate Product Report (Excel)
router.get('/products/excel', fetchuser, requireExportReports, requireViewPermissionForReport('canDownloadProductReport', 'product'), async (req, res) => {
    try {
        const { month, year, productId } = req.query;
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;

        let query = { businessowner: businessOwnerId };
        if (productId && productId !== 'all') {
            query._id = productId;
        }

        let products = await Products.find(query);

        // Fetch all categories and warehouses for mapping
        const categories = await Category.find({ businessowner: businessOwnerId });
        const warehouses = await Warehouse.find({ businessowner: businessOwnerId });

        // Create lookup maps
        const categoryMap = {};
        const warehouseMap = {};
        
        categories.forEach(cat => {
            categoryMap[cat._id.toString()] = cat.cName;
        });
        
        warehouses.forEach(wh => {
            warehouseMap[wh._id.toString()] = wh.wName;
        });

        // Filter by month/year if provided
        if (month && year) {
            products = filterByMonthYear(products, month, year);
        }

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Products Report');

        // Add title
        worksheet.mergeCells('A1:I1');
        worksheet.getCell('A1').value = 'Products Report';
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        // Add report info
        worksheet.mergeCells('A2:I2');
        const reportInfo = month && year 
            ? `Report for ${getMonthName(month)} ${year}` 
            : 'All Time Report';
        worksheet.getCell('A2').value = reportInfo;
        worksheet.getCell('A2').alignment = { horizontal: 'center' };

        // Add blank row
        worksheet.addRow([]);

        // Add headers
        const headerRow = worksheet.addRow([
            'Product Name', 'Category', 'SKU', 'Quantity', 'Unit Price', 
            'Selling Price', 'Warehouse', 'Status', 'Added Date'
        ]);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        // Add data
        products.forEach((product) => {
            const categoryName = categoryMap[product.category] || product.category || 'N/A';
            const warehouseNames = Array.isArray(product.warehouse) 
                ? product.warehouse.map(wId => warehouseMap[wId] || wId).join(', ') 
                : 'N/A';
            worksheet.addRow([
                product.name || 'N/A',
                categoryName,
                product.sku || 'N/A',
                product.totalProducts || 0,
                `$${product.price || 0}`,
                `$${product.price || 0}`,
                warehouseNames,
                product.totalProducts > 10 ? 'In Stock' : 'Low Stock',
                product.mDate ? new Date(product.mDate).toLocaleDateString() : 'N/A'
            ]);
        });

        // Set column widths with proper sizing
        worksheet.columns = [
            { width: 20 }, // Product Name
            { width: 15 }, // Category
            { width: 12 }, // SKU
            { width: 12 }, // Quantity
            { width: 14 }, // Unit Price
            { width: 14 }, // Selling Price
            { width: 15 }, // Warehouse
            { width: 12 }, // Status
            { width: 14 }  // Added Date
        ];
        
        // Enable text wrapping for all cells
        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { wrapText: true, vertical: 'middle' };
            });
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=products-report-${Date.now()}.xlsx`);

        // Write to response
        res.statusCode = 200;
        await workbook.xlsx.write(res);
    } catch (error) {
        // console.error('Error generating product Excel report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report' });
        }
    }
});

// GET: Generate Product Report (PDF)
router.get('/products/pdf', fetchuser, requireExportReports, requireViewPermissionForReport('canDownloadProductReport', 'product'), async (req, res) => {
    try {
        const { month, year, productId } = req.query;
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;

        let query = { businessowner: businessOwnerId };
        if (productId && productId !== 'all') {
            query._id = productId;
        }

        let products = await Products.find(query);

        // Fetch all categories and warehouses for mapping
        const categories = await Category.find({ businessowner: businessOwnerId });
        const warehouses = await Warehouse.find({ businessowner: businessOwnerId });

        // Create lookup maps
        const categoryMap = {};
        const warehouseMap = {};
        
        categories.forEach(cat => {
            categoryMap[cat._id.toString()] = cat.cName;
        });
        
        warehouses.forEach(wh => {
            warehouseMap[wh._id.toString()] = wh.wName;
        });

        // Filter by month/year if provided
        if (month && year) {
            products = filterByMonthYear(products, month, year);
        }

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=products-report-${Date.now()}.pdf`);

        doc.pipe(res);

        // Add title
        doc.fontSize(20).text('Products Report', { align: 'center' });
        doc.moveDown();

        // Add report info
        const reportInfo = month && year 
            ? `Report for ${getMonthName(month)} ${year}` 
            : 'All Time Report';
        doc.fontSize(12).text(reportInfo, { align: 'center' });
        doc.moveDown(2);

        // Add product data
        if (products.length === 0) {
            doc.fontSize(11).text('No products found for the selected criteria.', { align: 'center' });
        } else {
            products.forEach((product, index) => {
                const categoryName = categoryMap[product.category] || product.category || 'N/A';
                const warehouseNames = Array.isArray(product.warehouse) 
                    ? product.warehouse.map(wId => warehouseMap[wId] || wId).join(', ') 
                    : 'N/A';
                doc.fontSize(14).text(`${index + 1}. ${product.name || 'N/A'}`, { underline: true });
                doc.fontSize(10);
                doc.text(`Category: ${categoryName}`);
                doc.text(`SKU: ${product.sku || 'N/A'}`);
                doc.text(`Quantity: ${product.totalProducts || 0}`);
                doc.text(`Price: $${product.price || 0}`);
                doc.text(`Warehouse: ${warehouseNames}`);
                doc.text(`Status: ${product.totalProducts > 10 ? 'In Stock' : 'Low Stock'}`);
                doc.text(`Added Date: ${product.mDate ? new Date(product.mDate).toLocaleDateString() : 'N/A'}`);
                doc.moveDown();
            });
        }

        // Add footer
        doc.fontSize(8).text(`Generated on: ${new Date().toLocaleString()}`, 50, doc.page.height - 50, {
            align: 'center'
        });

        doc.end();
    } catch (error) {
        // console.error('Error generating product PDF report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report' });
        }
    }
});

// ==================== CUSTOMER ORDER REPORTS ====================

// GET: Generate Customer Order Report (Excel)
router.get('/orders/excel', fetchuser, requireExportReports, requireViewPermissionForReport('canDownloadOrderReport', 'customer order'), async (req, res) => {
    try {
        const { month, year, orderId } = req.query;
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;

        let query = { businessowner: businessOwnerId };
        if (orderId && orderId !== 'all') {
            query._id = orderId;
        }

        let orders = await Orders.find(query)
            .populate('warehouse', 'wName');

        // Filter by month/year if provided
        if (month && year) {
            orders = filterByMonthYear(orders, month, year, 'oDate');
        }

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Orders Report');

        // Add title
        worksheet.mergeCells('A1:H1');
        worksheet.getCell('A1').value = 'Customer Orders Report';
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        // Add report info
        worksheet.mergeCells('A2:H2');
        const reportInfo = month && year 
            ? `Report for ${getMonthName(month)} ${year}` 
            : 'All Time Report';
        worksheet.getCell('A2').value = reportInfo;
        worksheet.getCell('A2').alignment = { horizontal: 'center' };

        // Add blank row
        worksheet.addRow([]);

        // Add headers
        const headerRow = worksheet.addRow([
            'Customer Name', 'Email', 'Phone', 'Order Date', 
            'Total Amount', 'Status', 'Availability', 'Warehouse'
        ]);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        // Add data
        orders.forEach((order) => {
            try {
                const warehouseName = order.warehouse && typeof order.warehouse === 'object' && order.warehouse.wName ? order.warehouse.wName : 'N/A';
                worksheet.addRow([
                    order.cName || 'N/A',
                    order.cEmail || 'N/A',
                    order.cPhone || 'N/A',
                    order.oDate ? new Date(order.oDate).toLocaleDateString() : 'N/A',
                    `$${order.amount || 0}`,
                    order.status || 'N/A',
                    order.pAvail || 'N/A',
                    warehouseName
                ]);
            } catch (rowError) {
                // console.error('Error processing order row:', rowError);
                // Continue with next row even if current one fails
            }
        });

        // Set column widths with proper sizing
        worksheet.columns = [
            { width: 18 }, // Customer Name
            { width: 25 }, // Email
            { width: 16 }, // Phone
            { width: 14 }, // Order Date
            { width: 14 }, // Total Amount
            { width: 12 }, // Status
            { width: 16 }, // Payment Method
            { width: 15 }  // Warehouse
        ];
        
        // Enable text wrapping for all cells
        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { wrapText: true, vertical: 'middle' };
            });
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=orders-report-${Date.now()}.xlsx`);

        // Write to response
        res.statusCode = 200;
        await workbook.xlsx.write(res);
    } catch (error) {
        // console.error('Error generating order Excel report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report' });
        }
    }
});

// GET: Generate Customer Order Report (PDF)
router.get('/orders/pdf', fetchuser, requireExportReports, requireViewPermissionForReport('canDownloadOrderReport', 'customer order'), async (req, res) => {
    try {
        const { month, year, orderId } = req.query;
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;

        let query = { businessowner: businessOwnerId };
        if (orderId && orderId !== 'all') {
            query._id = orderId;
        }

        let orders = await Orders.find(query)
            .populate('warehouse', 'wName');

        // Filter by month/year if provided
        if (month && year) {
            orders = filterByMonthYear(orders, month, year, 'oDate');
        }

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=orders-report-${Date.now()}.pdf`);

        doc.pipe(res);

        // Add title
        doc.fontSize(20).text('Customer Orders Report', { align: 'center' });
        doc.moveDown();

        // Add report info
        const reportInfo = month && year 
            ? `Report for ${getMonthName(month)} ${year}` 
            : 'All Time Report';
        doc.fontSize(12).text(reportInfo, { align: 'center' });
        doc.moveDown(2);

        // Add order data
        if (orders.length === 0) {
            doc.fontSize(11).text('No orders found for the selected criteria.', { align: 'center' });
        } else {
            orders.forEach((order, index) => {
                try {
                    const warehouseName = order.warehouse && typeof order.warehouse === 'object' && order.warehouse.wName ? order.warehouse.wName : 'N/A';
                    doc.fontSize(14).text(`${index + 1}. Order from ${order.cName || 'N/A'}`, { underline: true });
                    doc.fontSize(10);
                    doc.text(`Customer Email: ${order.cEmail || 'N/A'}`);
                    doc.text(`Customer Phone: ${order.cPhone || 'N/A'}`);
                    doc.text(`Customer Address: ${order.cAddress || 'N/A'}`);
                    doc.text(`Order Date: ${order.oDate ? new Date(order.oDate).toLocaleDateString() : 'N/A'}`);
                    doc.text(`Delivery Date: ${order.dDate ? new Date(order.dDate).toLocaleDateString() : 'N/A'}`);
                    doc.text(`Total Amount: $${order.amount || 0}`);
                    doc.text(`Status: ${order.status || 'N/A'}`);
                    doc.text(`Delivery Status: ${order.dStatus || 'N/A'}`);
                    doc.text(`Warehouse: ${warehouseName}`);
                    
                    // Add product info
                    doc.text(`Product: ${order.pName || 'N/A'}`);
                    doc.text(`Quantity: ${order.ounits || 0}`);
                    
                    doc.moveDown();
                } catch (rowError) {
                    // console.error('Error processing order row in PDF:', rowError);
                    // Continue with next row even if current one fails
                }
            });
        }

        // Add footer
        doc.fontSize(8).text(`Generated on: ${new Date().toLocaleString()}`, 50, doc.page.height - 50, {
            align: 'center'
        });

        doc.end();
    } catch (error) {
        // console.error('Error generating order PDF report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report' });
        }
    }
});

// ==================== SUPPLIER ORDER REPORTS ====================

// GET: Generate Supplier Order Report (Excel)
router.get('/supplier-orders/excel', fetchuser, requireExportReports, requireViewPermissionForReport('canDownloadSupplierOrderReport', 'supplier order'), async (req, res) => {
    try {
        const { month, year, orderId } = req.query;
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;

        let query = { businessowner: businessOwnerId };
        if (orderId && orderId !== 'all') {
            query._id = orderId;
        }

        let supplierOrders = await SupplierOrders.find(query)
            .populate('supplier', 'name email phone');

        // Filter by month/year if provided
        if (month && year) {
            supplierOrders = filterByMonthYear(supplierOrders, month, year, 'oDate');
        }

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Supplier Orders Report');

        // Add title
        worksheet.mergeCells('A1:H1');
        worksheet.getCell('A1').value = 'Supplier Orders Report';
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        // Add report info
        worksheet.mergeCells('A2:H2');
        const reportInfo = month && year 
            ? `Report for ${getMonthName(month)} ${year}` 
            : 'All Time Report';
        worksheet.getCell('A2').value = reportInfo;
        worksheet.getCell('A2').alignment = { horizontal: 'center' };

        // Add blank row
        worksheet.addRow([]);

        // Add headers
        const headerRow = worksheet.addRow([
            'Supplier Name', 'Email', 'Phone', 'Order Date', 
            'Expected Delivery', 'Total Amount', 'Status', 'Payment Status'
        ]);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        // Add data
        supplierOrders.forEach((order) => {
            try {
                worksheet.addRow([
                    order.supplier ? order.supplier.name : 'N/A',
                    order.supplier ? order.supplier.email : 'N/A',
                    order.supplier ? order.supplier.phone : 'N/A',
                    order.oDate ? new Date(order.oDate).toLocaleDateString() : 'N/A',
                    order.dDate ? new Date(order.dDate).toLocaleDateString() : 'N/A',
                    `$${order.amount || 0}`,
                    order.status || 'N/A',
                    order.paymentStatus || 'N/A'
                ]);
            } catch (rowError) {
                // console.error('Error processing supplier order row:', rowError);
                // Continue with next row even if current one fails
            }
        });

        // Set column widths with proper sizing
        worksheet.columns = [
            { width: 18 }, // Supplier Name
            { width: 25 }, // Email
            { width: 16 }, // Phone
            { width: 14 }, // Order Date
            { width: 18 }, // Expected Delivery
            { width: 14 }, // Total Amount
            { width: 12 }, // Status
            { width: 16 }  // Payment Status
        ];
        
        // Enable text wrapping for all cells
        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { wrapText: true, vertical: 'middle' };
            });
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=supplier-orders-report-${Date.now()}.xlsx`);

        // Write to response
        res.statusCode = 200;
        await workbook.xlsx.write(res);
    } catch (error) {
        // console.error('Error generating supplier order Excel report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report' });
        }
    }
});

// GET: Generate Supplier Order Report (PDF)
router.get('/supplier-orders/pdf', fetchuser, requireExportReports, requireViewPermissionForReport('canDownloadSupplierOrderReport', 'supplier order'), async (req, res) => {
    try {
        const { month, year, orderId } = req.query;
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;

        let query = { businessowner: businessOwnerId };
        if (orderId && orderId !== 'all') {
            query._id = orderId;
        }

        let supplierOrders = await SupplierOrders.find(query)
            .populate('supplier', 'name email phone');

        // Filter by month/year if provided
        if (month && year) {
            supplierOrders = filterByMonthYear(supplierOrders, month, year, 'oDate');
        }

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=supplier-orders-report-${Date.now()}.pdf`);

        doc.pipe(res);

        // Add title
        doc.fontSize(20).text('Supplier Orders Report', { align: 'center' });
        doc.moveDown();

        // Add report info
        const reportInfo = month && year 
            ? `Report for ${getMonthName(month)} ${year}` 
            : 'All Time Report';
        doc.fontSize(12).text(reportInfo, { align: 'center' });
        doc.moveDown(2);

        // Add supplier order data
        if (supplierOrders.length === 0) {
            doc.fontSize(11).text('No supplier orders found for the selected criteria.', { align: 'center' });
        } else {
            supplierOrders.forEach((order, index) => {
                try {
                    doc.fontSize(14).text(`${index + 1}. Order from ${order.supplier ? order.supplier.name : 'N/A'}`, { underline: true });
                    doc.fontSize(10);
                    doc.text(`Supplier Email: ${order.supplier ? order.supplier.email : 'N/A'}`);
                    doc.text(`Supplier Phone: ${order.supplier ? order.supplier.phone : 'N/A'}`);
                    doc.text(`Product: ${order.pName || 'N/A'}`);
                    doc.text(`Category: ${order.category || 'N/A'}`);
                    doc.text(`Order Date: ${order.oDate ? new Date(order.oDate).toLocaleDateString() : 'N/A'}`);
                    doc.text(`Expected Delivery: ${order.dDate ? new Date(order.dDate).toLocaleDateString() : 'N/A'}`);
                    doc.text(`Total Amount: $${order.amount || 0}`);
                    doc.text(`Quantity: ${order.ounits || 0}`);
                    doc.text(`Status: ${order.status || 'N/A'}`);
                    doc.text(`Payment Status: ${order.paymentStatus || 'N/A'}`);
                    
                    doc.moveDown();
                } catch (rowError) {
                    // console.error('Error processing supplier order row in PDF:', rowError);
                    // Continue with next row even if current one fails
                }
            });
        }

        // Add footer
        doc.fontSize(8).text(`Generated on: ${new Date().toLocaleString()}`, 50, doc.page.height - 50, {
            align: 'center'
        });

        doc.end();
    } catch (error) {
        // console.error('Error generating supplier order PDF report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report' });
        }
    }
});

// ==================== HELPER ROUTES ====================

// GET: Get all employees for dropdown
router.get('/employees/list', fetchuser, async (req, res) => {
    try {
        const businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;
        const allowed = await hasPermissionAsync(req.user, 'canViewEmployees', businessOwnerId);
        if (!allowed) {
            return res.status(403).json({ error: 'You do not have permission to view employee data' });
        }
        const employees = await Employee.find({ businessowner: businessOwnerId })
            .select('_id fname lname email role');
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching employees' });
    }
});

// GET: Get all products for dropdown
router.get('/products/list', fetchuser, async (req, res) => {
    try {
        const businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;
        const allowed = await hasPermissionAsync(req.user, 'canViewProducts', businessOwnerId);
        if (!allowed) {
            return res.status(403).json({ error: 'You do not have permission to view product data' });
        }
        const products = await Products.find({ businessowner: businessOwnerId })
            .select('_id name category price');
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching products' });
    }
});

// GET: Get all orders for dropdown
router.get('/orders/list', fetchuser, async (req, res) => {
    try {
        const businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;
        const allowed = await hasPermissionAsync(req.user, 'canViewOrders', businessOwnerId);
        if (!allowed) {
            return res.status(403).json({ error: 'You do not have permission to view order data' });
        }
        const orders = await Orders.find({ businessowner: businessOwnerId })
            .select('_id cName oDate');
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching orders' });
    }
});

// GET: Get all supplier orders for dropdown
router.get('/supplier-orders/list', fetchuser, async (req, res) => {
    try {
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;
        if (req.role !== 'businessowner') {
            const allowed = await hasPermissionAsync(req.user, 'canDownloadSupplierOrderReport', businessOwnerId);
            if (!allowed) {
                return res.status(403).json({ error: 'You do not have permission to view supplier order data' });
            }
        }
        const supplierOrders = await SupplierOrders.find({ businessowner: businessOwnerId })
            .populate('supplier', 'fname lname companyName')
            .select('_id pName oDate supplier');
        res.json(supplierOrders);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching supplier orders' });
    }
});

// ==================== SUPPLIER REPORTS ====================

// GET: Get Suppliers List
router.get('/suppliers/list', fetchuser, async (req, res) => {
    try {
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;
        if (req.role !== 'businessowner') {
            const allowed = await hasPermissionAsync(req.user, 'canDownloadSupplierReport', businessOwnerId);
            if (!allowed) {
                return res.status(403).json({ error: 'You do not have permission to view supplier data' });
            }
        }
        const suppliers = await Supplier.find({ businessowner: businessOwnerId })
            .select('_id fname lname email companyName');
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching suppliers' });
    }
});

// GET: Get report permissions for the current user
// Returns which report types the user is allowed to export
router.get('/report-permissions', fetchuser, async (req, res) => {
    try {
        const businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;
        const isBusinessOwner = req.role === 'businessowner';

        const canExport = await hasPermissionAsync(req.user, 'canExportReports', businessOwnerId);
        if (!canExport && !isBusinessOwner) {
            return res.json({
                canExportReports: false,
                employees: false,
                products: false,
                orders: false,
                supplierOrders: false,
                suppliers: false,
                salary: false
            });
        }

        // Business owner gets all report types
        if (isBusinessOwner) {
            return res.json({
                canExportReports: true,
                employees: true,
                products: true,
                orders: true,
                supplierOrders: true,
                suppliers: true,
                salary: true
            });
        }

        // For non-business-owner users, check report download permissions
        const canDownloadEmployeeReport = await hasPermissionAsync(req.user, 'canDownloadEmployeeReport', businessOwnerId);
        const canDownloadProductReport = await hasPermissionAsync(req.user, 'canDownloadProductReport', businessOwnerId);
        const canDownloadOrderReport = await hasPermissionAsync(req.user, 'canDownloadOrderReport', businessOwnerId);
        const canDownloadSupplierOrderReport = await hasPermissionAsync(req.user, 'canDownloadSupplierOrderReport', businessOwnerId);
        const canDownloadSupplierReport = await hasPermissionAsync(req.user, 'canDownloadSupplierReport', businessOwnerId);
        const canDownloadSalaryReport = await hasPermissionAsync(req.user, 'canDownloadSalaryReport', businessOwnerId);

        res.json({
            canExportReports: true,
            employees: canDownloadEmployeeReport,
            products: canDownloadProductReport,
            orders: canDownloadOrderReport,
            supplierOrders: canDownloadSupplierOrderReport,
            suppliers: canDownloadSupplierReport,
            salary: canDownloadSalaryReport
        });
    } catch (error) {
        res.status(500).json({ error: 'Error checking report permissions' });
    }
});

// GET: Generate Supplier Report (Excel)
router.get('/suppliers/excel', fetchuser, requireExportReports, requireViewPermissionForReport('canDownloadSupplierReport', 'supplier'), async (req, res) => {
    try {
        const { supplierId } = req.query;
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;

        let query = { businessowner: businessOwnerId };
        if (supplierId && supplierId !== 'all') {
            query._id = supplierId;
        }

        let suppliers = await Supplier.find(query);

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Suppliers Report');

        // Add title
        worksheet.mergeCells('A1:G1');
        worksheet.getCell('A1').value = 'Suppliers Report';
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        // Add blank row
        worksheet.addRow([]);

        // Add headers
        const headerRow = worksheet.addRow([
            'First Name', 'Last Name', 'Email', 'Phone', 'Company Name', 'Company Email', 'Joining Date'
        ]);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        // Add data
        suppliers.forEach((supplier) => {
            try {
                worksheet.addRow([
                    supplier.fname || 'N/A',
                    supplier.lname || 'N/A',
                    supplier.email || 'N/A',
                    supplier.phone || 'N/A',
                    supplier.companyName || 'N/A',
                    supplier.companyEmail || 'N/A',
                    supplier.jDate ? new Date(supplier.jDate).toLocaleDateString() : 'N/A'
                ]);
            } catch (rowError) {
                // console.error('Error processing supplier row:', rowError);
            }
        });

        // Set column widths
        worksheet.columns = [
            { width: 15 }, // First Name
            { width: 15 }, // Last Name
            { width: 25 }, // Email
            { width: 16 }, // Phone
            { width: 20 }, // Company Name
            { width: 25 }, // Company Email
            { width: 16 }  // Joining Date
        ];

        // Enable text wrapping
        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { wrapText: true, vertical: 'middle' };
            });
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=suppliers-report-${Date.now()}.xlsx`);

        // Write to response
        res.statusCode = 200;
        await workbook.xlsx.write(res);
    } catch (error) {
        // console.error('Error generating supplier Excel report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report' });
        }
    }
});

// GET: Generate Supplier Report (PDF)
router.get('/suppliers/pdf', fetchuser, requireExportReports, requireViewPermissionForReport('canDownloadSupplierReport', 'supplier'), async (req, res) => {
    try {
        const { supplierId } = req.query;
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;

        let query = { businessowner: businessOwnerId };
        if (supplierId && supplierId !== 'all') {
            query._id = supplierId;
        }

        let suppliers = await Supplier.find(query);

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=suppliers-report-${Date.now()}.pdf`);

        doc.pipe(res);

        // Add title
        doc.fontSize(20).text('Suppliers Report', { align: 'center' });
        doc.moveDown(2);

        // Add supplier data
        if (suppliers.length === 0) {
            doc.fontSize(11).text('No suppliers found.', { align: 'center' });
        } else {
            suppliers.forEach((supplier, index) => {
                try {
                    doc.fontSize(14).text(`${index + 1}. ${supplier.fname} ${supplier.lname}`, { underline: true });
                    doc.fontSize(10);
                    doc.text(`Email: ${supplier.email || 'N/A'}`);
                    doc.text(`Phone: ${supplier.phone || 'N/A'}`);
                    doc.text(`Company Name: ${supplier.companyName || 'N/A'}`);
                    doc.text(`Company Email: ${supplier.companyEmail || 'N/A'}`);
                    doc.text(`Company Phone: ${supplier.companyPhone || 'N/A'}`);
                    doc.text(`Company Address: ${supplier.companyAddress || 'N/A'}`);
                    doc.text(`City: ${supplier.companyCity || 'N/A'}`);
                    doc.text(`State: ${supplier.companyState || 'N/A'}`);
                    doc.text(`Country: ${supplier.companyCountry || 'N/A'}`);
                    doc.text(`Joining Date: ${supplier.jDate ? new Date(supplier.jDate).toLocaleDateString() : 'N/A'}`);
                    
                    doc.moveDown();
                } catch (rowError) {
                    // console.error('Error processing supplier row in PDF:', rowError);
                }
            });
        }

        // Add footer
        doc.fontSize(8).text(`Generated on: ${new Date().toLocaleString()}`, 50, doc.page.height - 50, {
            align: 'center'
        });

        doc.end();
    } catch (error) {
        // console.error('Error generating supplier PDF report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report' });
        }
    }
});

// Helper function to get month name
function getMonthName(month) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[parseInt(month) - 1];
}

// ==================== SUPPLIER SELF-SERVICE REPORTS ====================

// Middleware to check if supplier has export permission
const requireSupplierExportPermission = async (req, res, next) => {
    try {
        if (req.role !== 'supplier') {
            return res.status(403).json({ error: "This route is only accessible to suppliers" });
        }
        
        const supplier = await Supplier.findById(req.user._id);
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }
        
        if (!supplier.canExportReports) {
            return res.status(403).json({ error: "You do not have permission to export reports. Please contact your Business Owner to enable this feature." });
        }
        
        next();
    } catch (error) {
        // console.error('Error checking supplier export permission:', error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// GET: Check supplier's export permission
router.get('/supplier/check-permission', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'supplier') {
            return res.status(403).json({ error: "This route is only accessible to suppliers" });
        }
        
        const supplier = await Supplier.findById(req.user._id);
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }
        
        res.json({ canExportReports: supplier.canExportReports || false });
    } catch (error) {
        // console.error('Error checking supplier permission:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET: Supplier's Own Orders Report (Excel)
router.get('/supplier/my-orders/excel', fetchuser, requireSupplierExportPermission, async (req, res) => {
    try {
        const { month, year, orderId } = req.query;
        
        let query = { supplier: req.user._id };
        if (orderId && orderId !== 'all') {
            query._id = orderId;
        }

        let orders = await SupplierOrders.find(query)
            .populate('businessowner', 'fname lname email phone');

        // Filter by month/year if provided
        if (month && year) {
            orders = filterByMonthYear(orders, month, year, 'oDate');
        }

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('My Orders Report');

        // Add title
        worksheet.mergeCells('A1:I1');
        worksheet.getCell('A1').value = 'Supplier Orders Report';
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        // Add supplier info
        const supplier = await Supplier.findById(req.user._id);
        worksheet.mergeCells('A2:I2');
        worksheet.getCell('A2').value = `Supplier: ${supplier.fname} ${supplier.lname || ''} | Company: ${supplier.companyName || 'N/A'}`;
        worksheet.getCell('A2').alignment = { horizontal: 'center' };

        // Add report info
        worksheet.mergeCells('A3:I3');
        const reportInfo = month && year 
            ? `Report for ${getMonthName(month)} ${year}` 
            : 'All Time Report';
        worksheet.getCell('A3').value = reportInfo;
        worksheet.getCell('A3').alignment = { horizontal: 'center' };

        // Add blank row
        worksheet.addRow([]);

        // Add headers
        const headerRow = worksheet.addRow([
            'Order ID', 'Product Name', 'Category', 'Units', 'Amount', 
            'Order Date', 'Delivery Date', 'Status', 'Payment Status'
        ]);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        // Add data
        orders.forEach((order) => {
            try {
                worksheet.addRow([
                    order._id.toString().slice(-6),
                    order.pName || 'N/A',
                    order.category || 'N/A',
                    order.ounits || 0,
                    `₹${order.amount || 0}`,
                    order.oDate ? new Date(order.oDate).toLocaleDateString('en-IN') : 'N/A',
                    order.dDate ? new Date(order.dDate).toLocaleDateString('en-IN') : 'N/A',
                    order.status || 'Pending',
                    order.paymentStatus || 'Pending'
                ]);
            } catch (rowError) {
                // console.error('Error processing supplier order row:', rowError);
            }
        });

        // Add summary row
        worksheet.addRow([]);
        const totalAmount = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
        worksheet.addRow(['', '', '', '', `Total: ₹${totalAmount}`, '', '', '', '']);

        // Set column widths
        worksheet.columns = [
            { width: 12 }, // Order ID
            { width: 20 }, // Product Name
            { width: 15 }, // Category
            { width: 10 }, // Units
            { width: 15 }, // Amount
            { width: 14 }, // Order Date
            { width: 14 }, // Delivery Date
            { width: 12 }, // Status
            { width: 15 }  // Payment Status
        ];

        // Enable text wrapping
        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { wrapText: true, vertical: 'middle' };
            });
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=my-orders-report-${Date.now()}.xlsx`);

        // Write to response
        res.statusCode = 200;
        await workbook.xlsx.write(res);
    } catch (error) {
        // console.error('Error generating supplier orders Excel report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report' });
        }
    }
});

// GET: Supplier's Own Orders Report (PDF)
router.get('/supplier/my-orders/pdf', fetchuser, requireSupplierExportPermission, async (req, res) => {
    try {
        const { month, year, orderId } = req.query;
        
        let query = { supplier: req.user._id };
        if (orderId && orderId !== 'all') {
            query._id = orderId;
        }

        let orders = await SupplierOrders.find(query)
            .populate('businessowner', 'fname lname email phone');

        // Filter by month/year if provided
        if (month && year) {
            orders = filterByMonthYear(orders, month, year, 'oDate');
        }

        // Get supplier info
        const supplier = await Supplier.findById(req.user._id);

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=my-orders-report-${Date.now()}.pdf`);

        doc.pipe(res);

        // Add title
        doc.fontSize(20).text('Supplier Orders Report', { align: 'center' });
        doc.moveDown(0.5);

        // Add supplier info
        doc.fontSize(12).text(`Supplier: ${supplier.fname} ${supplier.lname || ''}`, { align: 'center' });
        if (supplier.companyName) {
            doc.fontSize(10).text(`Company: ${supplier.companyName}`, { align: 'center' });
        }
        doc.moveDown();

        // Add report info
        const reportInfo = month && year 
            ? `Report for ${getMonthName(month)} ${year}` 
            : 'All Time Report';
        doc.fontSize(12).text(reportInfo, { align: 'center' });
        doc.moveDown(2);

        // Add orders data
        if (orders.length === 0) {
            doc.fontSize(11).text('No orders found for the selected criteria.', { align: 'center' });
        } else {
            orders.forEach((order, index) => {
                try {
                    const businessOwnerName = order.businessowner 
                        ? `${order.businessowner.fname || ''} ${order.businessowner.lname || ''}`.trim() 
                        : 'N/A';
                    
                    doc.fontSize(14).text(`${index + 1}. Order #${order._id.toString().slice(-6)}`, { underline: true });
                    doc.fontSize(10);
                    doc.text(`Product: ${order.pName || 'N/A'}`);
                    doc.text(`Category: ${order.category || 'N/A'}`);
                    doc.text(`Units: ${order.ounits || 0}`);
                    doc.text(`Amount: ₹${order.amount || 0}`);
                    doc.text(`Order Date: ${order.oDate ? new Date(order.oDate).toLocaleDateString('en-IN') : 'N/A'}`);
                    doc.text(`Delivery Date: ${order.dDate ? new Date(order.dDate).toLocaleDateString('en-IN') : 'N/A'}`);
                    doc.text(`Status: ${order.status || 'Pending'}`);
                    doc.text(`Payment Status: ${order.paymentStatus || 'Pending'}`);
                    doc.text(`Business Owner: ${businessOwnerName}`);
                    if (order.desc) {
                        doc.text(`Description: ${order.desc}`);
                    }
                    
                    doc.moveDown();
                } catch (rowError) {
                    // console.error('Error processing order row in PDF:', rowError);
                }
            });

            // Add summary
            doc.moveDown();
            const totalAmount = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
            doc.fontSize(12).text(`Total Orders: ${orders.length}`, { align: 'right' });
            doc.text(`Total Amount: ₹${totalAmount.toLocaleString('en-IN')}`, { align: 'right' });
        }

        // Add footer
        doc.fontSize(8).text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 50, doc.page.height - 50, {
            align: 'center'
        });

        doc.end();
    } catch (error) {
        // console.error('Error generating supplier orders PDF report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report' });
        }
    }
});

// GET: Supplier's Individual Order Report (PDF)
router.get('/supplier/my-orders/individual/:orderId/pdf', fetchuser, requireSupplierExportPermission, async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const order = await SupplierOrders.findOne({ 
            _id: orderId, 
            supplier: req.user._id 
        }).populate('businessowner', 'fname lname email phone');

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Get supplier info
        const supplier = await Supplier.findById(req.user._id);

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=order-${orderId.slice(-6)}-report-${Date.now()}.pdf`);

        doc.pipe(res);

        // Add header with styling
        doc.rect(0, 0, doc.page.width, 100).fill('#7b2cbf');
        doc.fontSize(24).fillColor('#ffffff').text('Order Report', 50, 35, { align: 'center' });
        doc.fontSize(10).text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, 50, 65, { align: 'center' });
        
        doc.fillColor('#000000');
        doc.moveDown(4);

        // Order Details Section
        doc.rect(50, 120, doc.page.width - 100, 4).fill('#7b2cbf');
        doc.moveDown();
        
        doc.fontSize(16).text(`Order #${order._id.toString().slice(-6)}`, 50, 140);
        doc.moveDown();

        // Order Information
        doc.fontSize(12).text('Order Information', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Product Name: ${order.pName || 'N/A'}`);
        doc.text(`Category: ${order.category || 'N/A'}`);
        doc.text(`Units: ${order.ounits || 0}`);
        doc.text(`Amount: ₹${(order.amount || 0).toLocaleString('en-IN')}`);
        doc.moveDown();

        // Dates
        doc.fontSize(12).text('Dates', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Order Date: ${order.oDate ? new Date(order.oDate).toLocaleDateString('en-IN') : 'N/A'}`);
        doc.text(`Expected Delivery: ${order.dDate ? new Date(order.dDate).toLocaleDateString('en-IN') : 'N/A'}`);
        doc.moveDown();

        // Status Information
        doc.fontSize(12).text('Status', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Order Status: ${order.status || 'Pending'}`);
        doc.text(`Payment Status: ${order.paymentStatus || 'Pending'}`);
        doc.text(`Delivery Status: ${order.dStatus || 'N/A'}`);
        doc.text(`Availability: ${order.pAvail || 'N/A'}`);
        doc.moveDown();

        // Business Owner Information
        if (order.businessowner) {
            doc.fontSize(12).text('Business Owner', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(10);
            doc.text(`Name: ${order.businessowner.fname || ''} ${order.businessowner.lname || ''}`);
            doc.text(`Email: ${order.businessowner.email || 'N/A'}`);
            doc.text(`Phone: ${order.businessowner.phone || 'N/A'}`);
            doc.moveDown();
        }

        // Description
        if (order.desc) {
            doc.fontSize(12).text('Description', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(10);
            doc.text(order.desc);
        }

        // Add footer
        doc.fontSize(8).text(`Supplier: ${supplier.fname} ${supplier.lname || ''} | ${supplier.companyName || ''}`, 50, doc.page.height - 50, {
            align: 'center'
        });

        doc.end();
    } catch (error) {
        // console.error('Error generating individual order PDF report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report' });
        }
    }
});

// GET: Supplier's Individual Order Report (Excel)
router.get('/supplier/my-orders/individual/:orderId/excel', fetchuser, requireSupplierExportPermission, async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const order = await SupplierOrders.findOne({ 
            _id: orderId, 
            supplier: req.user._id 
        }).populate('businessowner', 'fname lname email phone');

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Get supplier info
        const supplier = await Supplier.findById(req.user._id);

        // Create workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        workbook.creator = `${supplier.fname} ${supplier.lname || ''}`;
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Order Details');

        // Set column widths
        worksheet.columns = [
            { width: 25 },
            { width: 40 }
        ];

        // Add header
        worksheet.mergeCells('A1:B1');
        const headerCell = worksheet.getCell('A1');
        headerCell.value = 'ORDER REPORT';
        headerCell.font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
        headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7B2CBF' } };
        headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 35;

        // Order ID
        worksheet.mergeCells('A2:B2');
        const orderIdCell = worksheet.getCell('A2');
        orderIdCell.value = `Order #${order._id.toString().slice(-6)}`;
        orderIdCell.font = { size: 14, bold: true };
        orderIdCell.alignment = { horizontal: 'center' };
        worksheet.getRow(2).height = 25;

        // Generated date
        worksheet.mergeCells('A3:B3');
        const dateCell = worksheet.getCell('A3');
        dateCell.value = `Generated on ${new Date().toLocaleDateString('en-IN')}`;
        dateCell.font = { size: 10, italic: true };
        dateCell.alignment = { horizontal: 'center' };

        // Empty row
        worksheet.addRow([]);

        // Section: Order Information
        const orderInfoHeader = worksheet.addRow(['ORDER INFORMATION', '']);
        worksheet.mergeCells(`A${orderInfoHeader.number}:B${orderInfoHeader.number}`);
        orderInfoHeader.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF7B2CBF' } };
        orderInfoHeader.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };

        const addDataRow = (label, value) => {
            const row = worksheet.addRow([label, value]);
            row.getCell(1).font = { bold: true };
            row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
            row.getCell(2).alignment = { wrapText: true };
            return row;
        };

        addDataRow('Product Name', order.pName || 'N/A');
        addDataRow('Category', order.category || 'N/A');
        addDataRow('Units', order.ounits || 0);
        addDataRow('Amount', `₹${(order.amount || 0).toLocaleString('en-IN')}`);

        // Empty row
        worksheet.addRow([]);

        // Section: Dates
        const datesHeader = worksheet.addRow(['DATES', '']);
        worksheet.mergeCells(`A${datesHeader.number}:B${datesHeader.number}`);
        datesHeader.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF7B2CBF' } };
        datesHeader.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };

        addDataRow('Order Date', order.oDate ? new Date(order.oDate).toLocaleDateString('en-IN') : 'N/A');
        addDataRow('Expected Delivery', order.dDate ? new Date(order.dDate).toLocaleDateString('en-IN') : 'N/A');

        // Empty row
        worksheet.addRow([]);

        // Section: Status
        const statusHeader = worksheet.addRow(['STATUS', '']);
        worksheet.mergeCells(`A${statusHeader.number}:B${statusHeader.number}`);
        statusHeader.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF7B2CBF' } };
        statusHeader.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };

        addDataRow('Order Status', order.status || 'Pending');
        addDataRow('Payment Status', order.paymentStatus || 'Pending');
        addDataRow('Delivery Status', order.dStatus || 'N/A');
        addDataRow('Availability', order.pAvail || 'N/A');

        // Empty row
        worksheet.addRow([]);

        // Section: Business Owner
        if (order.businessowner) {
            const boHeader = worksheet.addRow(['BUSINESS OWNER', '']);
            worksheet.mergeCells(`A${boHeader.number}:B${boHeader.number}`);
            boHeader.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF7B2CBF' } };
            boHeader.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };

            addDataRow('Name', `${order.businessowner.fname || ''} ${order.businessowner.lname || ''}`);
            addDataRow('Email', order.businessowner.email || 'N/A');
            addDataRow('Phone', order.businessowner.phone || 'N/A');

            worksheet.addRow([]);
        }

        // Section: Description
        if (order.desc) {
            const descHeader = worksheet.addRow(['DESCRIPTION', '']);
            worksheet.mergeCells(`A${descHeader.number}:B${descHeader.number}`);
            descHeader.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF7B2CBF' } };
            descHeader.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };

            const descRow = worksheet.addRow([order.desc, '']);
            worksheet.mergeCells(`A${descRow.number}:B${descRow.number}`);
            descRow.getCell(1).alignment = { wrapText: true };
        }

        // Add borders to all cells with data
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 3) {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                    };
                });
            }
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=order-${orderId.slice(-6)}-report-${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        // console.error('Error generating individual order Excel report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report' });
        }
    }
});

module.exports = router;
