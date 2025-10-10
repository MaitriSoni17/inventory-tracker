const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const { body, validationResult } = require('express-validator');
const SupplierOrders = require('../models/SupplierOrders');
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

        if (req.role === 'businessowner') {
            supplierorderdata.businessowner = req.user._id;
        }

        const supplierorder = await SupplierOrders.create(supplierorderdata);
        res.json(supplierorder);
    } catch (err) {
        console.error(err.message);
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
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Supplier Order by ID — accessible by BusinessOwner or Supplier
router.post('/getorders', fetchuser, async (req, res) => {
    try {
        let supplierorder = await SupplierOrders.find({ supplier: req.user._id }).populate('businessowner', 'fname lname email phone address');
        if (!supplierorder) return res.status(404).send("Not Found");

        if (req.role === 'supplier' && supplierorder.supplier.toString() !== req.user._id.toString()) {
            return res.status(401).send("Not Allowed");
        }
        res.json(supplierorder);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
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
        res.json({ supplierorder });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Delete Supplier Order — only BusinessOwner can delete
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

        await SupplierOrders.findByIdAndDelete(req.params.id);
        res.json({ message: "Supplier Order deleted successfully" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

module.exports = router;