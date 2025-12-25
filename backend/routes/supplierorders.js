const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const { body, validationResult } = require('express-validator');
const SupplierOrders = require('../models/SupplierOrders');
const { createNotification } = require('../utils/notificationHelper');
const router = express.Router();

// Create Supplier Order — accessible by BusinessOwner or Employee
router.post('/createsupplierorder/:id', fetchuser, [
    body('pName', 'Enter Product Name').exists(),
    body('category', 'Enter Product Category').exists(),
    body('amount', 'Enter Price').exists().isNumeric(),
    body('ounits', 'Enter total units').exists().isNumeric(),
    body('oDate', 'Enter Order Date').exists().isDate(),
    body('dDate', 'Enter Delivery Date').exists().isDate(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { pName, category, amount, ounits, oDate, dDate, status, pAvail, dStatus, desc } = req.body;

    try {
        let supplierorderdata = { pName, category, amount, ounits, oDate, dDate, status, pAvail, dStatus, desc, supplier: req.params.id };

        // Set businessowner for both businessowner and employee roles
        if (req.role === 'businessowner' || req.role === 'employee') {
            supplierorderdata.businessowner = req.user._id;
        }

        const supplierorder = await SupplierOrders.create(supplierorderdata);

        // Send notification to supplier
        try {
            const senderRole = req.role === 'businessowner' ? 'BusinessOwner' : (req.role === 'employee' ? 'Employee' : 'Supplier');
            await createNotification(
                req.params.id,
                'Supplier',
                req.user._id,
                senderRole,
                'supplier_order_created',
                'New Order Created',
                `New order for ${pName} has been created. Amount: ₹${amount}`,
                { orderId: supplierorder._id, productName: pName, amount }
            );
        } catch (notifyErr) {
        }

        res.json(supplierorder);
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Supplier Orders — accessible by BusinessOwner or Supplier
router.post('/getsupplierorder/:id', fetchuser, async (req, res) => {
    try {
        let supplierorder = [];

        if (req.role === 'businessowner') {
            supplierorder = await SupplierOrders.find({ businessowner: req.user._id });
        } else if (req.role === 'supplier') {
            supplierorder = await SupplierOrders.find({ supplier: req.user._id }).populate('businessowner', 'fname lname email phone address');
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

        let supplierorders = await SupplierOrders.find({ supplier: req.user._id })
            .populate('businessowner', 'fname lname email phone address')
            .lean()
            .exec();
        
        // Additional fallback: ensure businessowner is properly populated
        if (supplierorders && supplierorders.length > 0) {
            const BusinessOwner = require('../models/BusinessOwner');
            
            supplierorders = await Promise.all(supplierorders.map(async (order) => {
                if (!order.businessowner || (typeof order.businessowner === 'string')) {
                    if (order.businessowner) {
                        try {
                            const owner = await BusinessOwner.findById(order.businessowner)
                                .select('fname lname email phone address')
                                .lean();
                            order.businessowner = owner;
                        } catch (e) {
                            order.businessowner = null;
                        }
                    }
                }
                
                return order;
            }));
        }
        
        res.json(supplierorders || []);
    } catch (err) {
        res.status(500).json({ error: "Internal Server error occurred", details: err.message });
    }
});

// Update Supplier Order — only BusinessOwner can update
router.put('/updatesupplierorder/:id', fetchuser, [
    body('pName', 'Enter Product Name').exists(),
    body('category', 'Enter Product Category').exists(),
    body('amount', 'Enter Price').exists().isNumeric(),
    body('ounits', 'Enter total units').exists().isNumeric(),
    body('oDate', 'Enter Order Date').exists().isDate(),
    body('dDate', 'Enter Delivery Date').exists().isDate(),
], async (req, res) => {
    if (req.role !== 'businessowner') {
        return res.status(403).send("Only BusinessOwner or Employee can update products");
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { pName, category, amount, ounits, oDate, dDate, status, pAvail, dStatus, desc } = req.body;

    try {
        const newSupplierOrder = { pName, category, amount, ounits, oDate, dDate, status, pAvail, dStatus, desc };

        let supplierorder = await SupplierOrders.findById(req.params.id);
        if (!supplierorder) return res.status(404).send("Not Found");

        if (supplierorder.businessowner.toString() !== req.user._id.toString()) {
            return res.status(401).send("Not Allowed");
        }

        supplierorder = await SupplierOrders.findByIdAndUpdate(req.params.id, { $set: newSupplierOrder }, { new: true });
        
        // Send notification to supplier
        try {
            const senderRole = req.role === 'businessowner' ? 'BusinessOwner' : (req.role === 'employee' ? 'Employee' : 'Supplier');
            await createNotification(
                supplierorder.supplier,
                'Supplier',
                req.user._id,
                senderRole,
                'supplier_order_updated',
                'Order Updated',
                `Order for ${pName} has been updated. New amount: ₹${amount}`,
                { orderId: supplierorder._id, productName: pName, amount }
            );
        } catch (notifyErr) {
        }

        res.json({ supplierorder });
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
    if (req.role !== 'businessowner') {
        return res.status(403).send("Only BusinessOwner can delete products");
    }

    try {
        const supplierorder = await SupplierOrders.findById(req.params.id);
        if (!supplierorder) return res.status(404).send("Not Found");

        if (supplierorder.businessowner.toString() !== req.user._id.toString()) {
            return res.status(401).send("Not Allowed");
        }

        // Send notification to supplier before deletion
        try {
            const senderRole = req.role === 'businessowner' ? 'BusinessOwner' : (req.role === 'employee' ? 'Employee' : 'Supplier');
            await createNotification(
                supplierorder.supplier,
                'Supplier',
                req.user._id,
                senderRole,
                'supplier_order_deleted',
                'Order Deleted',
                `Order for ${supplierorder.pName} has been deleted.`,
                { orderId: supplierorder._id, productName: supplierorder.pName }
            );
        } catch (notifyErr) {
        }

        await SupplierOrders.findByIdAndDelete(req.params.id);
        res.json({ message: "Supplier Order deleted successfully" });
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

module.exports = router;

