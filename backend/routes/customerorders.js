const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const CustomerOrders = require('../models/CustomerOrders');
const Product = require('../models/Products');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { notifyEmployeesAboutOrder, notifyBusinessOwnerAboutOrderByEmployee, checkAndNotifyLowStock } = require('../utils/notificationHelper');

// Create Customer Order — accessible by BusinessOwner or Employee
router.post('/createcustomerorder', fetchuser, [
    body('cName', 'Enter Customer Name').exists(),
    body('cEmail', 'Enter valid Email').isEmail(),
    body('cPhone', 'Enter Phone Number').exists().isNumeric(),
    body('cAddress', 'Enter Address').exists(),
    body('products', 'At least one product is required').isArray({ min: 1 }),
    body('products.*.product', 'Product ID is required').exists(),
    body('products.*.quantity', 'Quantity must be a positive number').isInt({ min: 1 }),
    body('oDate', 'Enter Order Date').exists().isDate(),
    body('dDate', 'Enter Delivery Date').exists().isDate(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { cName, cEmail, cPhone, cAddress, products, oDate, dDate, status, pAvail, dStatus, desc, warehouse } = req.body;

    try {
        // Calculate total amount and populate product details
        let totalAmount = 0;
        const processedProducts = [];
        const productNames = [];

        for (const item of products) {
            const productDoc = await Product.findById(item.product);
            if (!productDoc) {
                return res.status(400).json({ error: `Product not found: ${item.product}` });
            }

            // Check if sufficient stock is available
            if (productDoc.totalProducts < item.quantity) {
                return res.status(400).json({ error: `Insufficient stock for "${productDoc.name}". Available: ${productDoc.totalProducts}, Requested: ${item.quantity}` });
            }
            
            const totalPrice = productDoc.price * item.quantity;
            totalAmount += totalPrice;
            productNames.push(productDoc.name);
            
            processedProducts.push({
                product: item.product,
                productName: productDoc.name,
                category: productDoc.category,
                quantity: item.quantity,
                unitPrice: productDoc.price,
                totalPrice: totalPrice
            });
        }

        // Deduct stock for each product
        for (const item of products) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { totalProducts: -item.quantity }
            });
        }

        // Check for low stock alerts after stock deduction
        const businessOwnerId = req.role === 'businessowner' ? req.user._id : req.user.businessowner;
        try {
            for (const item of products) {
                const updatedProduct = await Product.findById(item.product);
                if (updatedProduct) {
                    await checkAndNotifyLowStock(updatedProduct, businessOwnerId);
                }
            }
        } catch (e) {}

        let customerorderData = {
            cName, cEmail, cPhone, cAddress,
            products: processedProducts,
            // For backward compatibility and quick display
            pName: productNames.join(', '),
            category: processedProducts.length > 0 ? processedProducts[0].category : '',
            ounits: products.reduce((sum, p) => sum + p.quantity, 0),
            amount: totalAmount,
            oDate, dDate, status, pAvail, dStatus, desc
        };

        if (req.role === 'businessowner') {
            customerorderData.businessowner = req.user._id;
            if (warehouse) {
                customerorderData.warehouse = warehouse;
            }
        } else if (req.role === 'employee') {
            customerorderData.businessowner = req.user.businessowner;
            customerorderData.employee = req.user._id;
            const employee = await require('../models/Employee').findById(req.user._id);
            if (employee && employee.warehouse) {
                customerorderData.warehouse = employee.warehouse;
            }
        }

        const customerorder = await CustomerOrders.create(customerorderData);

        // Send notification to employees if created by business owner
        if (req.role === 'businessowner') {
            await notifyEmployeesAboutOrder(
                req.user._id,
                'created',
                customerorder._id,
                { orderId: customerorder._id, customer: cName, product: productNames.join(', '), amount: totalAmount }
            );
        } else if (req.role === 'employee') {
            await notifyBusinessOwnerAboutOrderByEmployee(
                req.user.businessowner,
                req.user._id,
                'created',
                customerorder._id,
                { orderId: customerorder._id, customer: cName, product: productNames.join(', '), amount: totalAmount }
            );
        }

        res.json(customerorder);
    } catch (err) {
        // console.error(err);
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Customer Orders — accessible by BusinessOwner or Employee
router.post('/getcustomerorder', fetchuser, async (req, res) => {
    try {
        let customerorder = [];

        if (req.role === 'businessowner') {
            // Business owner sees all orders in their organization
            customerorder = await CustomerOrders.find({ businessowner: req.user._id })
                .populate('warehouse')
                .populate('products.product');
        } else if (req.role === 'manager' || req.role === 'supervisor' || req.role === 'employee') {
            // Warehouse staff sees orders in their business
            const staffMember = await require('../models/Employee').findById(req.user._id);
            const businessOwnerId = req.businessowner || (staffMember && staffMember.businessowner);
            
            if (businessOwnerId) {
                customerorder = await CustomerOrders.find({
                    businessowner: businessOwnerId
                })
                    .populate('warehouse')
                    .populate('products.product');
            } else {
                customerorder = [];
            }
        } else {
            // Fallback for other roles
            customerorder = [];
        }

        res.json(customerorder);
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Update Customer Order — BusinessOwner can update all, warehouse staff can update status
router.put('/updatecustomerorder/:id', fetchuser, [
    body('cName', 'Enter Customer Name').exists(),
    body('cEmail', 'Enter valid Email').isEmail(),
    body('cPhone', 'Enter Phone Number').exists().isNumeric(),
    body('cAddress', 'Enter Address').exists(),
    body('products', 'At least one product is required').isArray({ min: 1 }),
    body('products.*.product', 'Product ID is required').exists(),
    body('products.*.quantity', 'Quantity must be a positive number').isInt({ min: 1 }),
    body('oDate', 'Enter Order Date').exists().isDate(),
    body('dDate', 'Enter Delivery Date').exists().isDate(),
], async (req, res) => {
    // Authorization: Only businessowner or warehouse staff can update
    if (!['businessowner', 'manager', 'supervisor', 'employee'].includes(req.role)) {
        return res.status(403).send("Only authorized personnel can update customer orders");
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { cName, cEmail, cPhone, cAddress, products, oDate, dDate, status, pAvail, dStatus, desc, warehouse } = req.body;

    try {
        let customerorder = await CustomerOrders.findById(req.params.id).populate('warehouse');
        if (!customerorder) return res.status(404).send("Not Found");

        // Permission check
        if (req.role === 'businessowner') {
            // Business owner can update everything
            if (customerorder.businessowner.toString() !== req.user._id.toString()) {
                return res.status(401).send("Not Allowed");
            }
        } else if (['manager', 'supervisor', 'employee'].includes(req.role)) {
            // Warehouse staff can only update orders assigned to their warehouse
            const staffMember = await require('../models/Employee').findById(req.user._id).populate('warehouse');
            
            if (!staffMember || !staffMember.warehouse) {
                return res.status(401).send("Not Assigned to any warehouse");
            }
            
            if (!customerorder.warehouse || customerorder.warehouse._id.toString() !== staffMember.warehouse._id.toString()) {
                return res.status(401).send("You can only update orders in your warehouse");
            }
        }

        // Build a map of old quantities from the existing order
        const oldQuantityMap = {};
        for (const oldItem of customerorder.products) {
            const pid = oldItem.product.toString();
            oldQuantityMap[pid] = (oldQuantityMap[pid] || 0) + oldItem.quantity;
        }

        // Calculate total amount and populate product details
        let totalAmount = 0;
        const processedProducts = [];
        const productNames = [];

        for (const item of products) {
            const productDoc = await Product.findById(item.product);
            if (!productDoc) {
                return res.status(400).json({ error: `Product not found: ${item.product}` });
            }

            // Calculate the difference: new quantity minus what was already ordered
            const previousQty = oldQuantityMap[item.product.toString()] || 0;
            const diff = item.quantity - previousQty;

            // If requesting more than before, check if additional stock is available
            if (diff > 0 && productDoc.totalProducts < diff) {
                return res.status(400).json({ error: `Insufficient stock for "${productDoc.name}". Available: ${productDoc.totalProducts}, Additional needed: ${diff}` });
            }
            
            const totalPrice = productDoc.price * item.quantity;
            totalAmount += totalPrice;
            productNames.push(productDoc.name);
            
            processedProducts.push({
                product: item.product,
                productName: productDoc.name,
                category: productDoc.category,
                quantity: item.quantity,
                unitPrice: productDoc.price,
                totalPrice: totalPrice
            });
        }

        // Adjust stock: restore old quantities then deduct new quantities
        // Restore stock for all old products
        for (const oldItem of customerorder.products) {
            await Product.findByIdAndUpdate(oldItem.product, {
                $inc: { totalProducts: oldItem.quantity }
            });
        }
        // Deduct stock for all new products
        for (const item of products) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { totalProducts: -item.quantity }
            });
        }

        // Check for low stock alerts after stock adjustment
        const businessOwnerId = req.role === 'businessowner' ? req.user._id : req.user.businessowner;
        try {
            for (const item of products) {
                const updatedProduct = await Product.findById(item.product);
                if (updatedProduct) {
                    await checkAndNotifyLowStock(updatedProduct, businessOwnerId);
                }
            }
        } catch (e) {}

        // Prepare update data
        let newCustomerOrder = {
            cName, cEmail, cPhone, cAddress,
            products: processedProducts,
            pName: productNames.join(', '),
            category: processedProducts.length > 0 ? processedProducts[0].category : '',
            ounits: products.reduce((sum, p) => sum + p.quantity, 0),
            amount: totalAmount,
            oDate, dDate, status, pAvail, dStatus, desc
        };
        
        // Only business owner can change warehouse
        if (req.role === 'businessowner' && warehouse) {
            newCustomerOrder.warehouse = warehouse;
        }

        customerorder = await CustomerOrders.findByIdAndUpdate(req.params.id, { $set: newCustomerOrder }, { new: true });

        // Send notification to employees if updated by business owner
        if (req.role === 'businessowner') {
            await notifyEmployeesAboutOrder(
                req.user._id,
                'updated',
                customerorder._id,
                { orderId: customerorder._id, customer: cName, product: productNames.join(', '), amount: totalAmount }
            );
        } else if (['manager', 'supervisor', 'employee'].includes(req.role)) {
            // Send notification to business owner if updated by warehouse staff
            await notifyBusinessOwnerAboutOrderByEmployee(
                customerorder.businessowner,
                req.user._id,
                'updated',
                customerorder._id,
                { orderId: customerorder._id, customer: cName, product: productNames.join(', '), amount: totalAmount }
            );
        }

        res.json({ customerorder });
    } catch (err) {

        res.status(500).send("Internal Server error occurred");
    }
});

// Delete Customer Order — only BusinessOwner can delete
router.delete('/deletecustomerorder/:id', fetchuser, async (req, res) => {
    // if (req.role !== 'businessowner') {
    //     return res.status(403).send("Only BusinessOwner can delete products");
    // }

    if (!['businessowner', 'employee'].includes(req.role)) {
        return res.status(403).send("Only BusinessOwner or Employee can delete category");
    }

    try {
        const customerorder = await CustomerOrders.findById(req.params.id);
        if (!customerorder) return res.status(404).send("Not Found");

        // if (customerorder.businessowner.toString() !== req.user._id.toString()) {
        //     return res.status(401).send("Not Allowed");
        // }

        const businessOwnerId = customerorder.businessowner;

        // Restore stock for each product in the deleted order
        for (const item of customerorder.products) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { totalProducts: item.quantity }
            });
        }

        await CustomerOrders.findByIdAndDelete(req.params.id);

        // Send notification to employees if deleted by business owner
        if (req.role === 'businessowner') {
            await notifyEmployeesAboutOrder(
                businessOwnerId,
                'deleted',
                req.params.id,
                { orderId: req.params.id }
            );
        } else if (req.role === 'employee') {
            // Send notification to business owner if deleted by employee
            await notifyBusinessOwnerAboutOrderByEmployee(
                businessOwnerId,
                req.user._id,
                'deleted',
                req.params.id,
                { orderId: req.params.id }
            );
        }

        res.json({ message: "Customer Order deleted successfully" });
    } catch (err) {

        res.status(500).send("Internal Server error occurred");
    }
});

module.exports = router;


