const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const { body, validationResult } = require('express-validator');
const SupplierOrders = require('../models/SupplierOrders');
const { createNotification } = require('../utils/notificationHelper');
const { hasPermission } = require('../middleware/roleBasedAccess');
const { logAuditEvent } = require('../utils/auditLogger');
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
        } else {
            // All employee-type roles (including custom roles)
            const staffMember = await require('../models/Employee').findById(req.user._id);
            supplierorderdata.businessowner = req.user.businessowner || (staffMember && staffMember.businessowner);
            supplierorderdata.employee = req.user._id;
            if (staffMember && staffMember.warehouse) {
                supplierorderdata.warehouse = staffMember.warehouse;
            }
        }

        const supplierorder = await SupplierOrders.create(supplierorderdata);

        await logAuditEvent({
            req,
            businessowner: supplierorder.businessowner,
            action: 'supplier_order.create',
            entityType: 'supplier_order',
            entityId: supplierorder._id,
            summary: `Created supplier order for ${pName}`,
            metadata: {
                supplier: req.params.id,
                amount,
                units: ounits
            }
        });

        // Send notification to supplier
        try {
            const senderRole = req.role === 'businessowner' ? 'BusinessOwner' : 'Employee';
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
            // Business owner sees orders for the selected supplier only
            supplierorder = await SupplierOrders.find({ businessowner: req.user._id, supplier: req.params.id })
                .populate('businessowner', 'fname lname email phone address')
                .populate('warehouse');
        } else if (req.role !== 'supplier') {
            // All employee-type roles see orders from their warehouse
            const staffMember = await require('../models/Employee').findById(req.user._id).populate('warehouse');
            
            if (staffMember && staffMember.warehouse) {
                supplierorder = await SupplierOrders.find({
                    warehouse: staffMember.warehouse._id,
                    supplier: req.params.id
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
        // console.error('Error in /getorders:', err);
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
        } else {
            if (supplierorder.businessowner.toString() !== req.user.businessowner.toString()) {
                return res.status(403).json({ error: "Access denied" });
            }
        }

        supplierorder = await SupplierOrders.findByIdAndUpdate(req.params.id, { $set: newSupplierOrder }, { new: true });

        await logAuditEvent({
            req,
            businessowner: supplierorder.businessowner,
            action: 'supplier_order.update',
            entityType: 'supplier_order',
            entityId: supplierorder._id,
            summary: `Updated supplier order for ${pName}`,
            metadata: {
                amount,
                units: ounits,
                status
            }
        });
        
        // Send notification to supplier
        try {
            const senderRole = req.role === 'businessowner' ? 'BusinessOwner' : 'Employee';
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

        await logAuditEvent({
            req,
            businessowner: supplierorder.businessowner,
            action: 'supplier_order.status_update',
            entityType: 'supplier_order',
            entityId: supplierorder._id,
            summary: `Updated supplier order status to ${status}`,
            metadata: { status }
        });
        
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

        await logAuditEvent({
            req,
            businessowner: supplierorder.businessowner,
            action: 'supplier_order.payment_status_update',
            entityType: 'supplier_order',
            entityId: supplierorder._id,
            summary: `Updated supplier order payment status to ${paymentStatus}`,
            metadata: { paymentStatus }
        });
        
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
        } else {
            if (supplierorder.businessowner.toString() !== req.user.businessowner.toString()) {
                return res.status(403).json({ error: "Access denied" });
            }
        }

        // Send notification to supplier before deletion
        try {
            const senderRole = req.role === 'businessowner' ? 'BusinessOwner' : 'Employee';
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

        await logAuditEvent({
            req,
            businessowner: supplierorder.businessowner,
            action: 'supplier_order.delete',
            entityType: 'supplier_order',
            entityId: supplierorder._id,
            summary: `Deleted supplier order for ${supplierorder.pName}`,
            metadata: {
                amount: supplierorder.amount,
                units: supplierorder.ounits
            }
        });

        res.json({ message: "Supplier Order deleted successfully", success: true });
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

module.exports = router;
