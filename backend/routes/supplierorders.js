const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const { body, validationResult } = require('express-validator');
const SupplierOrders = require('../models/SupplierOrders');
const { createNotification } = require('../utils/notificationHelper');
const { hasPermission } = require('../middleware/roleBasedAccess');
const router = express.Router();

// Create Supplier Order — permission-based access
router.post('/createsupplierorder/:id', fetchuser, [
    body('pName', 'Enter Product Name').exists(),
    body('category', 'Enter Product Category').exists(),
    body('amount', 'Enter Price').exists().isNumeric(),
    body('ounits', 'Enter total units').exists().isNumeric(),
    body('oDate', 'Enter Order Date').exists().isDate(),
    body('dDate', 'Enter Delivery Date').exists().isDate(),
], async (req, res) => {
    // Check permission to create orders
    if (!hasPermission(req.user, 'canCreateOrders')) {
        return res.status(403).json({ error: "You do not have permission to create supplier orders" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { pName, category, amount, ounits, oDate, dDate, status, pAvail, dStatus, desc, warehouse } = req.body;

    try {
        let supplierorderdata = { pName, category, amount, ounits, oDate, dDate, status, pAvail, dStatus, desc, supplier: req.params.id };

        // Set businessowner based on role - ensure it's always set
        if (req.role === 'businessowner') {
            supplierorderdata.businessowner = req.user._id;
            // Business owner can assign to specific warehouse
            if (warehouse) {
                supplierorderdata.warehouse = warehouse;
            }
        } else if (req.role === 'manager') {
            supplierorderdata.businessowner = req.user.businessowner;
            supplierorderdata.employee = req.user._id;
            // Manager's order goes to their warehouse
            const manager = await require('../models/Employee').findById(req.user._id);
            if (manager && manager.warehouse) {
                supplierorderdata.warehouse = manager.warehouse;
            }
        } else if (['supervisor', 'employee'].includes(req.role)) {
            // Supervisor and employee orders: find their business owner
            const staffMember = await require('../models/Employee').findById(req.user._id);
            if (staffMember && staffMember.businessowner) {
                supplierorderdata.businessowner = staffMember.businessowner;
            }
            // Assign to their warehouse
            if (staffMember && staffMember.warehouse) {
                supplierorderdata.warehouse = staffMember.warehouse;
            }
        }

        const supplierorder = await SupplierOrders.create(supplierorderdata);

        // Send notification to supplier
        try {
            const senderRole = req.role === 'businessowner' ? 'BusinessOwner' : 'Manager';
            await createNotification(
                req.params.id,
                'Supplier',
                req.user._id,
                senderRole,
                'supplier_order_created',
                'New Order Created',
                `New order for ${pName} has been created. Amount: ₹${amount}`,
                { orderId: supplierorder._id, productName: pName, amount, createdBy: senderRole }
            );
        } catch (notifyErr) {
        }

        res.json({ supplierorder, success: true });
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Supplier Orders — permission-based access
router.post('/getsupplierorder/:id', fetchuser, async (req, res) => {
    // Check permission to view orders (suppliers always have access to their own orders)
    if (req.role !== 'supplier' && !hasPermission(req.user, 'canViewOrders')) {
        return res.status(403).json({ error: "You do not have permission to view supplier orders" });
    }

    try {
        let supplierorder = [];

        if (req.role === 'businessowner') {
            // Business owner sees all orders
            supplierorder = await SupplierOrders.find({ businessowner: req.user._id })
                .populate('businessowner', 'fname lname email phone address')
                .populate('warehouse');
        } else if (['manager', 'supervisor', 'employee'].includes(req.role)) {
            // Warehouse staff sees orders from their warehouse
            const staffMember = await require('../models/Employee').findById(req.user._id).populate('warehouse');
            
            if (staffMember && staffMember.warehouse) {
                supplierorder = await SupplierOrders.find({
                    warehouse: staffMember.warehouse._id
                }).populate('businessowner', 'fname lname email phone address')
                 .populate('warehouse');
            } else {
                // If no warehouse assigned, show no orders
                supplierorder = [];
            }
        } else if (req.role === 'supplier') {
            // Suppliers see orders placed with them
            supplierorder = await SupplierOrders.find({ supplier: req.user._id })
                .populate('businessowner', 'fname lname email phone address')
                .populate('warehouse');
        }
        
        res.json(supplierorder);
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Supplier Orders — accessible by Supplier
router.post('/getorders', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'supplier') {
            return res.status(403).send("Only suppliers can access their orders");
        }

        if (!req.user || !req.user._id) {
            return res.status(401).send("User not authenticated properly");
        }

        // Fetch supplier orders with proper population
        let supplierorders = await SupplierOrders.find({ supplier: req.user._id })
            .populate({
                path: 'businessowner',
                select: 'fname lname email phone address',
                strictPopulate: false
            })
            .populate({
                path: 'employee',
                select: '_id businessowner',
                strictPopulate: false
            })
            .populate({
                path: 'warehouse',
                select: '_id businessowner',
                strictPopulate: false
            })
            .lean()
            .exec();
        
        // Handle cases where businessowner might still be missing/null
        if (supplierorders && supplierorders.length > 0) {
            const Employee = require('../models/Employee');
            const Warehouse = require('../models/Warehouse');
            const BusinessOwner = require('../models/BusinessOwner');
            
            supplierorders = await Promise.all(supplierorders.map(async (order) => {
                // If businessowner is missing or null, try to resolve it
                if (!order.businessowner || typeof order.businessowner !== 'object') {
                    let resolvedOwner = null;
                    
                    // Try to get from employee
                    if (order.employee && order.employee.businessowner) {
                        try {
                            resolvedOwner = await BusinessOwner.findById(order.employee.businessowner)
                                .select('fname lname email phone address')
                                .lean();
                        } catch (e) {
                            // ignore
                        }
                    }
                    
                    // Try to get from warehouse
                    if (!resolvedOwner && order.warehouse && order.warehouse.businessowner) {
                        try {
                            resolvedOwner = await BusinessOwner.findById(order.warehouse.businessowner)
                                .select('fname lname email phone address')
                                .lean();
                        } catch (e) {
                            // ignore
                        }
                    }
                    
                    order.businessowner = resolvedOwner || null;
                }
                
                return order;
            }));
        }
        
        res.json(supplierorders || []);
    } catch (err) {
        console.error('Error in /getorders:', err);
        res.status(500).json({ error: "Internal Server error occurred", details: err.message });
    }
});

// Update Supplier Order — permission-based access
router.put('/updatesupplierorder/:id', fetchuser, [
    body('pName', 'Enter Product Name').exists(),
    body('category', 'Enter Product Category').exists(),
    body('amount', 'Enter Price').exists().isNumeric(),
    body('ounits', 'Enter total units').exists().isNumeric(),
    body('oDate', 'Enter Order Date').exists().isDate(),
    body('dDate', 'Enter Delivery Date').exists().isDate(),
], async (req, res) => {
    // Check permission to edit orders
    if (!hasPermission(req.user, 'canEditOrders')) {
        return res.status(403).json({ error: "You do not have permission to update supplier orders" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { pName, category, amount, ounits, oDate, dDate, status, pAvail, dStatus, desc, warehouse } = req.body;

    try {
        const newSupplierOrder = { pName, category, amount, ounits, oDate, dDate, status, pAvail, dStatus, desc };

        let supplierorder = await SupplierOrders.findById(req.params.id);
        if (!supplierorder) return res.status(404).send("Not Found");

        // Verify ownership
        if (req.role === 'businessowner') {
            if (supplierorder.businessowner.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: "Access denied" });
            }
            // Business owner can change warehouse
            if (warehouse) {
                newSupplierOrder.warehouse = warehouse;
            }
        } else if (req.role === 'manager') {
            if (supplierorder.businessowner.toString() !== req.user.businessowner.toString()) {
                return res.status(403).json({ error: "Access denied" });
            }
        }

        supplierorder = await SupplierOrders.findByIdAndUpdate(req.params.id, { $set: newSupplierOrder }, { new: true });
        
        // Send notification to supplier
        try {
            const senderRole = req.role === 'businessowner' ? 'BusinessOwner' : 'Manager';
            await createNotification(
                supplierorder.supplier,
                'Supplier',
                req.user._id,
                senderRole,
                'supplier_order_updated',
                'Order Updated',
                `Order for ${pName} has been updated. New amount: ₹${amount}`,
                { orderId: supplierorder._id, productName: pName, amount, updatedBy: senderRole }
            );
        } catch (notifyErr) {
        }

        res.json({ supplierorder, success: true });
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Update Supplier Order Status — only Supplier can update status
router.put('/updateorderstatus/:id', fetchuser, [
    body('status', 'Enter Status').exists(),
], async (req, res) => {
    if (req.role !== 'supplier') {
        return res.status(403).send("Only Supplier can update order status");
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { status } = req.body;

    try {
        let supplierorder = await SupplierOrders.findById(req.params.id);
        if (!supplierorder) return res.status(404).send("Not Found");

        if (supplierorder.supplier.toString() !== req.user._id.toString()) {
            return res.status(401).send("Not Allowed");
        }

        supplierorder = await SupplierOrders.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
        
        // Send notification to business owner
        try {
            await createNotification(
                supplierorder.businessowner,
                'BusinessOwner',
                req.user._id,
                'Supplier',
                'supplier_order_status_updated',
                'Order Status Updated',
                `Order status for ${supplierorder.pName} has been updated to ${status}.`,
                { orderId: supplierorder._id, productName: supplierorder.pName, status }
            );
        } catch (notifyErr) {
        }
        
        res.json(supplierorder);
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Update Order Payment Status — only Supplier can update payment status
router.put('/updatepaymentstatus/:id', fetchuser, [
    body('paymentStatus', 'Enter Payment Status').exists(),
], async (req, res) => {
    if (req.role !== 'supplier') {
        return res.status(403).send("Only Supplier can update payment status");
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { paymentStatus } = req.body;

    try {
        let supplierorder = await SupplierOrders.findById(req.params.id);
        if (!supplierorder) return res.status(404).send("Not Found");

        if (supplierorder.supplier.toString() !== req.user._id.toString()) {
            return res.status(401).send("Not Allowed");
        }

        supplierorder = await SupplierOrders.findByIdAndUpdate(req.params.id, { $set: { paymentStatus } }, { new: true });
        
        // Send notification to business owner
        try {
            await createNotification(
                supplierorder.businessowner,
                'BusinessOwner',
                req.user._id,
                'Supplier',
                'supplier_order_payment_status_updated',
                'Payment Status Updated',
                `Payment status for ${supplierorder.pName} has been updated to ${paymentStatus}.`,
                { orderId: supplierorder._id, productName: supplierorder.pName, paymentStatus }
            );
        } catch (notifyErr) {
        }
        
        res.json(supplierorder);
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

router.delete('/deletesupplierorder/:id', fetchuser, async (req, res) => {
    // Check permission to delete orders
    if (!hasPermission(req.user, 'canDeleteOrders')) {
        return res.status(403).json({ error: "You do not have permission to delete supplier orders" });
    }

    try {
        const supplierorder = await SupplierOrders.findById(req.params.id);
        if (!supplierorder) return res.status(404).send("Not Found");

        // Verify ownership
        if (req.role === 'businessowner') {
            if (supplierorder.businessowner.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: "Access denied" });
            }
        } else if (req.role === 'manager') {
            if (supplierorder.businessowner.toString() !== req.user.businessowner.toString()) {
                return res.status(403).json({ error: "Access denied" });
            }
        }

        // Send notification to supplier before deletion
        try {
            const senderRole = req.role === 'businessowner' ? 'BusinessOwner' : 'Manager';
            await createNotification(
                supplierorder.supplier,
                'Supplier',
                req.user._id,
                senderRole,
                'supplier_order_deleted',
                'Order Deleted',
                `Order for ${supplierorder.pName} has been deleted.`,
                { orderId: supplierorder._id, productName: supplierorder.pName, deletedBy: senderRole }
            );
        } catch (notifyErr) {
        }

        await SupplierOrders.findByIdAndDelete(req.params.id);
        res.json({ message: "Supplier Order deleted successfully", success: true });
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Debug endpoint - Check supplier orders data
router.post('/debug/check-orders', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'supplier') {
            return res.status(403).json({ error: "Only suppliers can access this debug endpoint" });
        }

        // Get raw data without populate
        const rawOrders = await SupplierOrders.find({ supplier: req.user._id }).exec();
        
        // Get populated data
        const populatedOrders = await SupplierOrders.find({ supplier: req.user._id })
            .populate('businessowner', 'fname lname email')
            .exec();

        if (rawOrders.length === 0) {
            return res.json({
                status: "NO_ORDERS",
                message: "No supplier orders found for this supplier",
                supplierId: req.user._id
            });
        }

        // Detailed analysis
        const analysis = rawOrders.map((order, idx) => ({
            orderId: order._id,
            businessownerId: order.businessowner,
            employeeId: order.employee,
            warehouseId: order.warehouse,
            hasBusinessowner: !!order.businessowner,
            populatedData: populatedOrders[idx] ? {
                businessowner: populatedOrders[idx].businessowner,
                isPopulated: populatedOrders[idx].businessowner !== null && typeof populatedOrders[idx].businessowner === 'object'
            } : null
        }));

        res.json({
            status: "SUCCESS",
            totalOrders: rawOrders.length,
            analysis,
            rawData: rawOrders.map(o => ({ _id: o._id, businessowner: o.businessowner, employee: o.employee }))
        });
    } catch (err) {
        res.status(500).json({ error: "Debug check failed", details: err.message });
    }
});

// Migration endpoint - Fix missing businessowner in existing supplier orders
router.post('/migrate/fix-businessowner', fetchuser, async (req, res) => {
    try {
        // Only allow admin/businessowner to run this
        if (!req.user || !['businessowner', 'admin'].includes(req.role)) {
            return res.status(403).json({ error: "Unauthorized access" });
        }

        const Employee = require('../models/Employee');
        const BusinessOwner = require('../models/BusinessOwner');

        // Find all orders with null businessowner
        let ordersToFix = await SupplierOrders.find({ businessowner: null });

        if (ordersToFix.length === 0) {
            return res.json({ message: "No orders to fix", count: 0 });
        }

        let fixedCount = 0;
        let errors = [];

        for (let order of ordersToFix) {
            try {
                let businessownerToSet = null;

                // Try to find businessowner from employee
                if (order.employee) {
                    const employee = await Employee.findById(order.employee).select('businessowner');
                    if (employee && employee.businessowner) {
                        businessownerToSet = employee.businessowner;
                    }
                }

                // If still no businessowner, try to find from warehouse
                if (!businessownerToSet && order.warehouse) {
                    const Warehouse = require('../models/Warehouse');
                    const warehouse = await Warehouse.findById(order.warehouse).select('businessowner');
                    if (warehouse && warehouse.businessowner) {
                        businessownerToSet = warehouse.businessowner;
                    }
                }

                // If we found a businessowner, update the order
                if (businessownerToSet) {
                    await SupplierOrders.findByIdAndUpdate(order._id, { businessowner: businessownerToSet });
                    fixedCount++;
                } else {
                    errors.push({ orderId: order._id, reason: "Could not determine businessowner" });
                }
            } catch (err) {
                errors.push({ orderId: order._id, reason: err.message });
            }
        }

        res.json({
            message: "Migration completed",
            fixedCount,
            totalToFix: ordersToFix.length,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (err) {
        res.status(500).json({ error: "Migration failed", details: err.message });
    }
});

module.exports = router;
