const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const stream = require('stream');
const fetchuser = require('../middleware/fetchuser');
const fetchbusinessowner = require('../middleware/fetchbusinessowner');
const Employee = require('../models/Employee');
const Products = require('../models/Products');
const Orders = require('../models/CustomerOrders');
const SupplierOrders = require('../models/SupplierOrders');

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
router.get('/employees/excel', fetchuser, async (req, res) => {
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
            .populate('businessOwner', 'name')
            .populate('warehouse', 'name location');

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
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD9E1F2' }
        };

        // Add data
        console.log('Adding data rows:', employees.length);
        employees.forEach((emp, idx) => {
            console.log(`Row ${idx + 1}:`, emp.name, emp.email);
            worksheet.addRow([
                emp.name,
                emp.email,
                emp.phone || 'N/A',
                emp.role,
                emp.warehouse ? emp.warehouse.name : 'Unassigned',
                new Date(emp.createdAt).toLocaleDateString(),
                emp.isActive ? 'Active' : 'Inactive'
            ]);
        });

        console.log('Data added to worksheet');

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = 20;
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
router.get('/employees/pdf', fetchuser, async (req, res) => {
    try {
        const { month, year, employeeId } = req.query;
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;

        let query = { businessowner: businessOwnerId };
        if (employeeId && employeeId !== 'all') {
            query._id = employeeId;
        }

        let employees = await Employee.find(query)
            .populate('businessowner', 'name')
            .populate('warehouse', 'name location');

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
            doc.fontSize(14).text(`${index + 1}. ${emp.name}`, { underline: true });
            doc.fontSize(10);
            doc.text(`Email: ${emp.email}`);
            doc.text(`Phone: ${emp.phone || 'N/A'}`);
            doc.text(`Role: ${emp.role}`);
            doc.text(`Warehouse: ${emp.warehouse ? emp.warehouse.name : 'Unassigned'}`);
            doc.text(`Joining Date: ${new Date(emp.createdAt).toLocaleDateString()}`);
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
router.get('/products/excel', fetchuser, async (req, res) => {
    try {
        const { month, year, productId } = req.query;
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;

        let query = { businessowner: businessOwnerId };
        if (productId && productId !== 'all') {
            query._id = productId;
        }

        let products = await Products.find(query)
            .populate('category', 'name')
            .populate('warehouse', 'name');

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
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD9E1F2' }
        };

        // Add data
        products.forEach((product) => {
            worksheet.addRow([
                product.productname,
                product.category ? product.category.name : 'N/A',
                product.sku,
                product.quantity,
                `$${product.unitprice}`,
                `$${product.sellingprice}`,
                product.warehouse ? product.warehouse.name : 'N/A',
                product.quantity > 10 ? 'In Stock' : 'Low Stock',
                new Date(product.createdAt).toLocaleDateString()
            ]);
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = 18;
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
router.get('/products/pdf', fetchuser, async (req, res) => {
    try {
        const { month, year, productId } = req.query;
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;

        let query = { businessowner: businessOwnerId };
        if (productId && productId !== 'all') {
            query._id = productId;
        }

        let products = await Products.find(query)
            .populate('category', 'name')
            .populate('warehouse', 'name');

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
                doc.fontSize(14).text(`${index + 1}. ${product.productname}`, { underline: true });
                doc.fontSize(10);
                doc.text(`Category: ${product.category ? product.category.name : 'N/A'}`);
                doc.text(`SKU: ${product.sku}`);
                doc.text(`Quantity: ${product.quantity}`);
                doc.text(`Unit Price: $${product.unitprice}`);
                doc.text(`Selling Price: $${product.sellingprice}`);
                doc.text(`Warehouse: ${product.warehouse ? product.warehouse.name : 'N/A'}`);
                doc.text(`Status: ${product.quantity > 10 ? 'In Stock' : 'Low Stock'}`);
                doc.text(`Added Date: ${new Date(product.createdAt).toLocaleDateString()}`);
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
router.get('/orders/excel', fetchuser, async (req, res) => {
    try {
        const { month, year, orderId } = req.query;
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;

        let query = { businessowner: businessOwnerId };
        if (orderId && orderId !== 'all') {
            query._id = orderId;
        }

        let orders = await Orders.find(query)
            .populate('products.product', 'productname sku')
            .populate('warehouse', 'name');

        // Filter by month/year if provided
        if (month && year) {
            orders = filterByMonthYear(orders, month, year, 'orderdate');
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
            'Total Amount', 'Status', 'Payment Method', 'Warehouse'
        ]);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD9E1F2' }
        };

        // Add data
        orders.forEach((order) => {
            worksheet.addRow([
                order.customername,
                order.customeremail,
                order.customerphone,
                new Date(order.orderdate).toLocaleDateString(),
                `$${order.totalamount}`,
                order.status,
                order.paymentmethod,
                order.warehouse ? order.warehouse.name : 'N/A'
            ]);
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = 20;
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
router.get('/orders/pdf', fetchuser, async (req, res) => {
    try {
        const { month, year, orderId } = req.query;
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;

        let query = { businessowner: businessOwnerId };
        if (orderId && orderId !== 'all') {
            query._id = orderId;
        }

        let orders = await Orders.find(query)
            .populate('products.product', 'productname sku')
            .populate('warehouse', 'name');

        // Filter by month/year if provided
        if (month && year) {
            orders = filterByMonthYear(orders, month, year, 'orderdate');
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
                doc.fontSize(14).text(`${index + 1}. Order for ${order.customername}`, { underline: true });
                doc.fontSize(10);
                doc.text(`Customer Email: ${order.customeremail}`);
                doc.text(`Customer Phone: ${order.customerphone}`);
                doc.text(`Order Date: ${new Date(order.orderdate).toLocaleDateString()}`);
                doc.text(`Total Amount: $${order.totalamount}`);
                doc.text(`Status: ${order.status}`);
                doc.text(`Payment Method: ${order.paymentmethod}`);
                doc.text(`Warehouse: ${order.warehouse ? order.warehouse.name : 'N/A'}`);
                
                // Add products
                if (order.products && order.products.length > 0) {
                    doc.text('Products:');
                    order.products.forEach(item => {
                        doc.text(`  - ${item.product ? item.product.productname : 'N/A'} (Qty: ${item.quantity}, Price: $${item.price})`);
                    });
                }
                
                doc.moveDown();
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
router.get('/supplier-orders/excel', fetchuser, async (req, res) => {
    try {
        const { month, year, orderId } = req.query;
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;

        let query = { businessowner: businessOwnerId };
        if (orderId && orderId !== 'all') {
            query._id = orderId;
        }

        let supplierOrders = await SupplierOrders.find(query)
            .populate('supplier', 'name email phone')
            .populate('products.product', 'productname sku');

        // Filter by month/year if provided
        if (month && year) {
            supplierOrders = filterByMonthYear(supplierOrders, month, year, 'orderdate');
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
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD9E1F2' }
        };

        // Add data
        supplierOrders.forEach((order) => {
            worksheet.addRow([
                order.supplier ? order.supplier.name : 'N/A',
                order.supplier ? order.supplier.email : 'N/A',
                order.supplier ? order.supplier.phone : 'N/A',
                new Date(order.orderdate).toLocaleDateString(),
                order.expecteddeliverydate ? new Date(order.expecteddeliverydate).toLocaleDateString() : 'N/A',
                `$${order.totalamount}`,
                order.status,
                order.paymentstatus
            ]);
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = 20;
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
router.get('/supplier-orders/pdf', fetchuser, async (req, res) => {
    try {
        const { month, year, orderId } = req.query;
        let businessOwnerId = req.businessowner || req.user.businessowner || req.user.businessOwnerId || req.user._id;

        let query = { businessowner: businessOwnerId };
        if (orderId && orderId !== 'all') {
            query._id = orderId;
        }

        let supplierOrders = await SupplierOrders.find(query)
            .populate('supplier', 'name email phone')
            .populate('products.product', 'productname sku');

        // Filter by month/year if provided
        if (month && year) {
            supplierOrders = filterByMonthYear(supplierOrders, month, year, 'orderdate');
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
                doc.fontSize(14).text(`${index + 1}. Order from ${order.supplier ? order.supplier.name : 'N/A'}`, { underline: true });
                doc.fontSize(10);
                doc.text(`Supplier Email: ${order.supplier ? order.supplier.email : 'N/A'}`);
                doc.text(`Supplier Phone: ${order.supplier ? order.supplier.phone : 'N/A'}`);
                doc.text(`Order Date: ${new Date(order.orderdate).toLocaleDateString()}`);
                doc.text(`Expected Delivery: ${order.expecteddeliverydate ? new Date(order.expecteddeliverydate).toLocaleDateString() : 'N/A'}`);
                doc.text(`Total Amount: $${order.totalamount}`);
                doc.text(`Status: ${order.status}`);
                doc.text(`Payment Status: ${order.paymentstatus}`);
                
                // Add products
                if (order.products && order.products.length > 0) {
                    doc.text('Products:');
                    order.products.forEach(item => {
                        doc.text(`  - ${item.product ? item.product.productname : 'N/A'} (Qty: ${item.quantity}, Price: $${item.price})`);
                    });
                }
                
                doc.moveDown();
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

// Helper function to get month name
function getMonthName(month) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[parseInt(month) - 1];
}

module.exports = router;
