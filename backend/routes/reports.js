const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const stream = require('stream');
const fetchuser = require('../middleware/fetchuser');
const fetchbusinessowner = require('../middleware/fetchbusinessowner');
const { requireExportReports } = require('../middleware/roleBasedAccess');
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
router.get('/employees/excel', fetchuser, requireExportReports, async (req, res) => {
    try {
        const { month, year, employeeId } = req.query;
        
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;
        
        console.log('Report Request - User ID:', req.user._id);
        console.log('Report Request - BusinessOwnerId:', businessOwnerId);
        console.log('Report Request - Role:', req.role);

        let query = { businessowner: businessOwnerId };
        if (employeeId && employeeId !== 'all') {
            query._id = employeeId;
        }

        console.log('Query:', JSON.stringify(query));

        let employees = await Employee.find(query)
            .populate('businessowner', 'name')
            .populate('warehouse', 'wName wAddress');

        console.log('Employees found:', employees.length);
        if (employees.length > 0) {
            console.log('First employee:', employees[0].name);
        }

        // Filter by month/year if provided
        if (month && year) {
            employees = filterByMonthYear(employees, month, year);
            console.log('After date filter:', employees.length);
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
        console.log('Adding data rows:', employees.length);
        employees.forEach((emp, idx) => {
            const fullName = `${emp.fname || ''} ${emp.lname || ''}`.trim() || 'N/A';
            console.log(`Row ${idx + 1}:`, fullName, emp.email);
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

        console.log('Data added to worksheet');

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
        console.log('Writing workbook to response');
        res.statusCode = 200;
        await workbook.xlsx.write(res);
        console.log('Report generation completed successfully');
    } catch (error) {
        console.error('Error generating employee Excel report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report', details: error.message });
        }
    }
});

// GET: Generate Employee Report (PDF)
router.get('/employees/pdf', fetchuser, requireExportReports, async (req, res) => {
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
        console.error('Error generating employee PDF report:', error);
        res.status(500).json({ error: 'Error generating report' });
    }
});

// ==================== PRODUCT REPORTS ====================

// GET: Generate Product Report (Excel)
router.get('/products/excel', fetchuser, requireExportReports, async (req, res) => {
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
        console.error('Error generating product Excel report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report' });
        }
    }
});

// GET: Generate Product Report (PDF)
router.get('/products/pdf', fetchuser, requireExportReports, async (req, res) => {
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
        console.error('Error generating product PDF report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report' });
        }
    }
});

// ==================== CUSTOMER ORDER REPORTS ====================

// GET: Generate Customer Order Report (Excel)
router.get('/orders/excel', fetchuser, requireExportReports, async (req, res) => {
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
                console.error('Error processing order row:', rowError);
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
        console.error('Error generating order Excel report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report' });
        }
    }
});

// GET: Generate Customer Order Report (PDF)
router.get('/orders/pdf', fetchuser, requireExportReports, async (req, res) => {
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
                    console.error('Error processing order row in PDF:', rowError);
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
        console.error('Error generating order PDF report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report' });
        }
    }
});

// ==================== SUPPLIER ORDER REPORTS ====================

// GET: Generate Supplier Order Report (Excel)
router.get('/supplier-orders/excel', fetchuser, requireExportReports, async (req, res) => {
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
                console.error('Error processing supplier order row:', rowError);
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
        console.error('Error generating supplier order Excel report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report' });
        }
    }
});

// GET: Generate Supplier Order Report (PDF)
router.get('/supplier-orders/pdf', fetchuser, requireExportReports, async (req, res) => {
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
                    console.error('Error processing supplier order row in PDF:', rowError);
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
        console.error('Error generating supplier order PDF report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report' });
        }
    }
});

// ==================== HELPER ROUTES ====================

// GET: Get all employees for dropdown
router.get('/employees/list', fetchuser, async (req, res) => {
    try {
        console.log('\n=== EMPLOYEES LIST ENDPOINT ===');
        console.log('req.user:', req.user ? { _id: req.user._id, name: req.user.name || req.user.username } : 'null');
        console.log('req.user.businessowner:', req.user.businessowner);
        console.log('req.user.businessOwner:', req.user.businessOwner);
        console.log('req.businessowner:', req.businessowner);
        
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;
        console.log('DROPDOWN: Using businessOwnerId:', businessOwnerId);
        console.log('DROPDOWN: Fetching employees for businessOwnerId:', businessOwnerId);
        const employees = await Employee.find({ businessowner: businessOwnerId })
            .select('_id name email role');
        console.log('DROPDOWN: Found employees:', employees.length);
        console.log('DROPDOWN: Employee data:', employees);
        res.json(employees);
    } catch (error) {
        console.error('Error fetching employees list:', error);
        res.status(500).json({ error: 'Error fetching employees' });
    }
});

// GET: Get all products for dropdown
router.get('/products/list', fetchuser, async (req, res) => {
    try {
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;
        const products = await Products.find({ businessowner: businessOwnerId })
            .select('_id productname sku');
        res.json(products);
    } catch (error) {
        console.error('Error fetching products list:', error);
        res.status(500).json({ error: 'Error fetching products' });
    }
});

// GET: Get all orders for dropdown
router.get('/orders/list', fetchuser, async (req, res) => {
    try {
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;
        const orders = await Orders.find({ businessowner: businessOwnerId })
            .select('_id customername orderdate');
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders list:', error);
        res.status(500).json({ error: 'Error fetching orders' });
    }
});

// GET: Get all supplier orders for dropdown
router.get('/supplier-orders/list', fetchuser, async (req, res) => {
    try {
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;
        const supplierOrders = await SupplierOrders.find({ businessowner: businessOwnerId })
            .populate('supplier', 'name')
            .select('_id orderdate');
        res.json(supplierOrders);
    } catch (error) {
        console.error('Error fetching supplier orders list:', error);
        res.status(500).json({ error: 'Error fetching supplier orders' });
    }
});

// ==================== SUPPLIER REPORTS ====================

// GET: Get Suppliers List
router.get('/suppliers/list', fetchuser, async (req, res) => {
    try {
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;
        const suppliers = await Supplier.find({ businessowner: businessOwnerId })
            .select('_id fname lname email companyName');
        res.json(suppliers);
    } catch (error) {
        console.error('Error fetching suppliers list:', error);
        res.status(500).json({ error: 'Error fetching suppliers' });
    }
});

// GET: Generate Supplier Report (Excel)
router.get('/suppliers/excel', fetchuser, requireExportReports, async (req, res) => {
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
                console.error('Error processing supplier row:', rowError);
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
        console.error('Error generating supplier Excel report:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating report' });
        }
    }
});

// GET: Generate Supplier Report (PDF)
router.get('/suppliers/pdf', fetchuser, requireExportReports, async (req, res) => {
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
                    console.error('Error processing supplier row in PDF:', rowError);
                }
            });
        }

        // Add footer
        doc.fontSize(8).text(`Generated on: ${new Date().toLocaleString()}`, 50, doc.page.height - 50, {
            align: 'center'
        });

        doc.end();
    } catch (error) {
        console.error('Error generating supplier PDF report:', error);
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

module.exports = router;
