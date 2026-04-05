const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const CustomerOrders = require('../models/CustomerOrders');
const Product = require('../models/Products');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { notifyEmployeesAboutOrder, notifyBusinessOwnerAboutOrderByEmployee, checkAndNotifyLowStock } = require('../utils/notificationHelper');
const { recordStockMovement } = require('../utils/stockMovementHelper');
const { logAuditEvent } = require('../utils/auditLogger');

const isValidPhoneNumber = (value) => {
  if (!value) return false;
  const cleanValue = String(value).replace(/[^\d+]/g, '');

  // India: +91 followed by 10 digits, first digit 6,7,8,9
  const indiaRegex = /^\+91[6789]\d{9}$/;

  // USA/Canada: +1 followed by 10 digits, area code not starting with 0 or 1
  const usCanadaRegex = /^\+1[2-9]\d{2}\d{6}$/;

  // UK: +44 followed by 10-11 digits
  // Mobile: +447 followed by 9 digits (11 total)
  // Landline: +44 followed by 10 digits
  const ukMobileRegex = /^\+447\d{9}$/;
  const ukLandlineRegex = /^\+44\d{10}$/;

  // China: +86 followed by 11 digits, mobile starts with 1
  const chinaMobileRegex = /^\+861\d{10}$/;

  // Germany: +49 followed by 10-11 digits
  // Mobile: +49 followed by 10-11 digits starting with 15,16,17
  const germanyMobileRegex = /^\+49(15|16|17)\d{8,9}$/;
  const germanyLandlineRegex = /^\+49\d{10,11}$/;

  // Australia: +61 followed by 9 digits, mobile starts with 4
  const australiaMobileRegex = /^\+614\d{8}$/;
  const australiaLandlineRegex = /^\+61\d{9}$/;

  // Plain 10-digit Indian number (legacy support)
  const plainIndianRegex = /^[6789]\d{9}$/;

  return indiaRegex.test(cleanValue) ||
         usCanadaRegex.test(cleanValue) ||
         ukMobileRegex.test(cleanValue) ||
         ukLandlineRegex.test(cleanValue) ||
         chinaMobileRegex.test(cleanValue) ||
         germanyMobileRegex.test(cleanValue) ||
         germanyLandlineRegex.test(cleanValue) ||
         australiaMobileRegex.test(cleanValue) ||
         australiaLandlineRegex.test(cleanValue) ||
         plainIndianRegex.test(cleanValue);
};

// Create Customer Order — accessible by BusinessOwner or Employee
router.post('/createcustomerorder', fetchuser, [
    body('cName', 'Enter Customer Name').exists(),
    body('cEmail', 'Enter valid Email').isEmail(),
    body('cPhone').exists().custom((value) => {
        if (!isValidPhoneNumber(value)) {
            throw new Error('Enter a valid 10-digit phone number');
        }
        return true;
    }),
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
        let hasPendingProducts = false;
        const pendingReasons = [];

        for (const item of products) {
            const productDoc = await Product.findById(item.product);
            if (!productDoc) {
                return res.status(400).json({ error: `Product not found: ${item.product}` });
            }

            // Check if sufficient stock is available
            if (productDoc.totalProducts < item.quantity) {
                hasPendingProducts = true;
                pendingReasons.push(`Insufficient stock for "${productDoc.name}" (Available: ${productDoc.totalProducts}, Requested: ${item.quantity})`);
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

        // Only deduct stock if NOT pending
        if (!hasPendingProducts) {
            for (const item of products) {
                const previousProduct = await Product.findById(item.product);
                const updatedProduct = await Product.findByIdAndUpdate(item.product, {
                    $inc: { totalProducts: -item.quantity }
                }, { new: true });

                if (previousProduct && updatedProduct) {
                    await recordStockMovement({
                        businessowner: updatedProduct.businessowner,
                        product: updatedProduct._id,
                        orderId: null,
                        quantityChange: -item.quantity,
                        previousStock: previousProduct.totalProducts,
                        newStock: updatedProduct.totalProducts,
                        source: 'customer_order_create',
                        reason: `Stock deducted for customer order (${cName})`,
                        actorId: req.user._id,
                        actorRole: req.role,
                        direction: 'OUT',
                        metadata: { customer: cName, requestedQuantity: item.quantity }
                    });
                }
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
        }

        let customerorderData = {
            cName, cEmail, cPhone, cAddress,
            products: processedProducts,
            // For backward compatibility and quick display
            pName: productNames.join(', '),
            category: processedProducts.length > 0 ? processedProducts[0].category : '',
            ounits: products.reduce((sum, p) => sum + p.quantity, 0),
            amount: totalAmount,
            oDate, dDate, status, pAvail, dStatus, desc,
            isPending: hasPendingProducts,
            pendingReason: hasPendingProducts ? pendingReasons.join('; ') : ''
        };

        if (req.role === 'businessowner') {
            customerorderData.businessowner = req.user._id;
            if (warehouse) {
                customerorderData.warehouse = warehouse;
            }
        } else {
            // All employee-type roles (including custom roles)
            customerorderData.businessowner = req.user.businessowner;
            customerorderData.employee = req.user._id;
            const employee = await require('../models/Employee').findById(req.user._id);
            if (employee && employee.warehouse) {
                customerorderData.warehouse = employee.warehouse;
            }
        }

        const customerorder = await CustomerOrders.create(customerorderData);

        await logAuditEvent({
            req,
            businessowner: customerorder.businessowner,
            action: 'customer_order.create',
            entityType: 'customer_order',
            entityId: customerorder._id,
            summary: `Created customer order for ${cName}`,
            metadata: {
                amount: totalAmount,
                totalUnits: customerorderData.ounits,
                isPending: hasPendingProducts
            }
        });

        // Send notification to employees if created by business owner
        if (req.role === 'businessowner') {
            await notifyEmployeesAboutOrder(
                req.user._id,
                hasPendingProducts ? 'created (pending - low stock)' : 'created',
                customerorder._id,
                { orderId: customerorder._id, customer: cName, product: productNames.join(', '), amount: totalAmount }
            );
        } else {
            // All employee-type roles
            await notifyBusinessOwnerAboutOrderByEmployee(
                req.user.businessowner,
                req.user._id,
                hasPendingProducts ? 'created (pending - low stock)' : 'created',
                customerorder._id,
                { orderId: customerorder._id, customer: cName, product: productNames.join(', '), amount: totalAmount }
            );
        }

        res.json({ 
            ...customerorder.toObject(), 
            isPending: hasPendingProducts,
            pendingReason: hasPendingProducts ? pendingReasons.join('; ') : '',
            message: hasPendingProducts 
                ? 'Order saved as pending due to insufficient stock. It will be automatically fulfilled when stock is available.' 
                : 'Order created successfully'
        });
    } catch (err) {
        // console.error(err);
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Customer Orders (non-pending only) — accessible by BusinessOwner or Employee
router.post('/getcustomerorder', fetchuser, async (req, res) => {
    try {
        let customerorder = [];

        if (req.role === 'businessowner') {
            // Business owner sees all non-pending orders in their organization
            customerorder = await CustomerOrders.find({ businessowner: req.user._id, isPending: { $ne: true } })
                .populate('warehouse')
                .populate('products.product');
        } else {
            // All employee-type roles - see non-pending orders in their business
            const staffMember = await require('../models/Employee').findById(req.user._id);
            const businessOwnerId = req.businessowner || (staffMember && staffMember.businessowner);
            
            if (businessOwnerId) {
                customerorder = await CustomerOrders.find({
                    businessowner: businessOwnerId,
                    isPending: { $ne: true }
                })
                    .populate('warehouse')
                    .populate('products.product');
            } else {
                customerorder = [];
            }
        }

        res.json(customerorder);
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Pending Orders — accessible by BusinessOwner or Employee
router.post('/getpendingorders', fetchuser, async (req, res) => {
    try {
        let pendingOrders = [];

        if (req.role === 'businessowner') {
            pendingOrders = await CustomerOrders.find({ businessowner: req.user._id, isPending: true })
                .populate('warehouse')
                .populate('products.product');
        } else {
            // All employee-type roles
            const staffMember = await require('../models/Employee').findById(req.user._id);
            const businessOwnerId = req.businessowner || (staffMember && staffMember.businessowner);
            
            if (businessOwnerId) {
                pendingOrders = await CustomerOrders.find({
                    businessowner: businessOwnerId,
                    isPending: true
                })
                    .populate('warehouse')
                    .populate('products.product');
            }
        }

        res.json(pendingOrders);
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Update Customer Order — BusinessOwner can update all, warehouse staff can update status
router.put('/updatecustomerorder/:id', fetchuser, [
    body('cName', 'Enter Customer Name').exists(),
    body('cEmail', 'Enter valid Email').isEmail(),
    body('cPhone').exists().custom((value) => {
        if (!isValidPhoneNumber(value)) {
            throw new Error('Enter a valid 10-digit phone number');
        }
        return true;
    }),
    body('cAddress', 'Enter Address').exists(),
    body('products', 'At least one product is required').isArray({ min: 1 }),
    body('products.*.product', 'Product ID is required').exists(),
    body('products.*.quantity', 'Quantity must be a positive number').isInt({ min: 1 }),
    body('oDate', 'Enter Order Date').exists().isDate(),
    body('dDate', 'Enter Delivery Date').exists().isDate(),
], async (req, res) => {
    // Authorization: Only businessowner or employee-type roles can update
    if (req.role === 'supplier') {
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
        } else {
            // All employee-type roles - can only update orders assigned to their warehouse
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
        let hasPendingProducts = false;
        const pendingReasons = [];

        for (const item of products) {
            const productDoc = await Product.findById(item.product);
            if (!productDoc) {
                return res.status(400).json({ error: `Product not found: ${item.product}` });
            }

            // Calculate the difference: new quantity minus what was already ordered
            const previousQty = oldQuantityMap[item.product.toString()] || 0;
            const diff = item.quantity - previousQty;
            const requiredFromStock = customerorder.isPending ? item.quantity : Math.max(diff, 0);

            // For pending orders, check full quantity (nothing was reserved before).
            // For active orders, check only the additional quantity needed.
            if (requiredFromStock > 0 && productDoc.totalProducts < requiredFromStock) {
                hasPendingProducts = true;
                pendingReasons.push(`Insufficient stock for "${productDoc.name}" (Available: ${productDoc.totalProducts}, Needed: ${requiredFromStock})`);
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

        // Adjust stock only when required by pending/non-pending transitions.
        // Restore old stock only if the existing order had already reserved stock.
        if (!customerorder.isPending) {
            for (const oldItem of customerorder.products) {
                const previousProduct = await Product.findById(oldItem.product);
                const updatedProduct = await Product.findByIdAndUpdate(oldItem.product, {
                    $inc: { totalProducts: oldItem.quantity }
                }, { new: true });

                if (previousProduct && updatedProduct) {
                    await recordStockMovement({
                        businessowner: updatedProduct.businessowner,
                        product: updatedProduct._id,
                        orderId: customerorder._id,
                        quantityChange: oldItem.quantity,
                        previousStock: previousProduct.totalProducts,
                        newStock: updatedProduct.totalProducts,
                        source: 'customer_order_update_restore',
                        reason: `Restored stock before editing order ${customerorder._id}`,
                        actorId: req.user._id,
                        actorRole: req.role,
                        direction: 'IN',
                        metadata: { quantity: oldItem.quantity }
                    });
                }
            }
        }

        // Deduct stock only when updated order is not pending.
        if (!hasPendingProducts) {
            for (const item of products) {
                const previousProduct = await Product.findById(item.product);
                const updatedProduct = await Product.findByIdAndUpdate(item.product, {
                    $inc: { totalProducts: -item.quantity }
                }, { new: true });

                if (previousProduct && updatedProduct) {
                    await recordStockMovement({
                        businessowner: updatedProduct.businessowner,
                        product: updatedProduct._id,
                        orderId: customerorder._id,
                        quantityChange: -item.quantity,
                        previousStock: previousProduct.totalProducts,
                        newStock: updatedProduct.totalProducts,
                        source: 'customer_order_update_deduct',
                        reason: `Deducted stock after editing order ${customerorder._id}`,
                        actorId: req.user._id,
                        actorRole: req.role,
                        direction: 'OUT',
                        metadata: { quantity: item.quantity }
                    });
                }
            }
        }

        // Check for low stock alerts only when stock is actually deducted.
        const businessOwnerId = req.role === 'businessowner' ? req.user._id : req.user.businessowner;
        if (!hasPendingProducts) {
            try {
                for (const item of products) {
                    const updatedProduct = await Product.findById(item.product);
                    if (updatedProduct) {
                        await checkAndNotifyLowStock(updatedProduct, businessOwnerId);
                    }
                }
            } catch (e) {}
        }

        // Prepare update data
        let newCustomerOrder = {
            cName, cEmail, cPhone, cAddress,
            products: processedProducts,
            pName: productNames.join(', '),
            category: processedProducts.length > 0 ? processedProducts[0].category : '',
            ounits: products.reduce((sum, p) => sum + p.quantity, 0),
            amount: totalAmount,
            oDate, dDate, status, pAvail, dStatus, desc
            ,isPending: hasPendingProducts,
            pendingReason: hasPendingProducts ? pendingReasons.join('; ') : ''
        };
        
        // Only business owner can change warehouse
        if (req.role === 'businessowner' && warehouse) {
            newCustomerOrder.warehouse = warehouse;
        }

        customerorder = await CustomerOrders.findByIdAndUpdate(req.params.id, { $set: newCustomerOrder }, { new: true });

        await logAuditEvent({
            req,
            businessowner: customerorder.businessowner,
            action: 'customer_order.update',
            entityType: 'customer_order',
            entityId: customerorder._id,
            summary: `Updated customer order for ${cName}`,
            metadata: {
                amount: totalAmount,
                totalUnits: newCustomerOrder.ounits,
                isPending: hasPendingProducts
            }
        });

        // Send notification to employees if updated by business owner
        if (req.role === 'businessowner') {
            await notifyEmployeesAboutOrder(
                req.user._id,
                hasPendingProducts ? 'updated (pending - low stock)' : 'updated',
                customerorder._id,
                { orderId: customerorder._id, customer: cName, product: productNames.join(', '), amount: totalAmount }
            );
        } else {
            // Send notification to business owner if updated by any employee-type role
            await notifyBusinessOwnerAboutOrderByEmployee(
                customerorder.businessowner,
                req.user._id,
                hasPendingProducts ? 'updated (pending - low stock)' : 'updated',
                customerorder._id,
                { orderId: customerorder._id, customer: cName, product: productNames.join(', '), amount: totalAmount }
            );
        }

        res.json({
            customerorder,
            isPending: hasPendingProducts,
            pendingReason: hasPendingProducts ? pendingReasons.join('; ') : '',
            message: hasPendingProducts
                ? 'Order updated and moved to pending due to insufficient stock. It will be fulfilled when stock is available.'
                : 'Order updated successfully'
        });
    } catch (err) {

        res.status(500).send("Internal Server error occurred");
    }
});

// Delete Customer Order — only BusinessOwner can delete
router.delete('/deletecustomerorder/:id', fetchuser, async (req, res) => {
    // if (req.role !== 'businessowner') {
    //     return res.status(403).send("Only BusinessOwner can delete products");
    // }

    if (req.role === 'supplier') {
        return res.status(403).send("Only BusinessOwner or Employee can delete customer orders");
    }

    try {
        const customerorder = await CustomerOrders.findById(req.params.id);
        if (!customerorder) return res.status(404).send("Not Found");

        // if (customerorder.businessowner.toString() !== req.user._id.toString()) {
        //     return res.status(401).send("Not Allowed");
        // }

        const businessOwnerId = customerorder.businessowner;

        // Only restore stock if the order was NOT pending (pending orders never deducted stock)
        if (!customerorder.isPending) {
            for (const item of customerorder.products) {
                const previousProduct = await Product.findById(item.product);
                const updatedProduct = await Product.findByIdAndUpdate(item.product, {
                    $inc: { totalProducts: item.quantity }
                }, { new: true });

                if (previousProduct && updatedProduct) {
                    await recordStockMovement({
                        businessowner: updatedProduct.businessowner,
                        product: updatedProduct._id,
                        orderId: customerorder._id,
                        quantityChange: item.quantity,
                        previousStock: previousProduct.totalProducts,
                        newStock: updatedProduct.totalProducts,
                        source: 'customer_order_delete_restore',
                        reason: `Restored stock after deleting order ${customerorder._id}`,
                        actorId: req.user._id,
                        actorRole: req.role,
                        direction: 'IN',
                        metadata: { quantity: item.quantity }
                    });
                }
            }
        }

        await CustomerOrders.findByIdAndDelete(req.params.id);

        await logAuditEvent({
            req,
            businessowner: businessOwnerId,
            action: 'customer_order.delete',
            entityType: 'customer_order',
            entityId: req.params.id,
            summary: `Deleted customer order for ${customerorder.cName}`,
            metadata: {
                amount: customerorder.amount,
                wasPending: customerorder.isPending
            }
        });

        // Send notification to employees if deleted by business owner
        if (req.role === 'businessowner') {
            await notifyEmployeesAboutOrder(
                businessOwnerId,
                'deleted',
                req.params.id,
                { orderId: req.params.id }
            );
        } else {
            // Send notification to business owner if deleted by any employee-type role
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


