const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const Warehouse = require('../models/Warehouse');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Create Warehouse — accessible by BusinessOwner or Employee
router.post('/createwarehouse', fetchuser, [
    body('wName', 'Enter Warehouse Name').exists(),
    body('wManager', 'Enter Warehouse Manager Name').exists(),
    body('wAddress', 'Enter Warehouse Address').exists(),
    body('wContact', 'Enter Warehouse Contact Details').exists().isNumeric(),
    body('wEmail', 'Enter Warehouse Email').exists().isEmail(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { wName, wManager, wAddress, wContact, wEmail } = req.body;

    try {
        let warehouseData = { wName, wManager, wAddress, wContact, wEmail };

        if (req.role === 'businessowner') {
            warehouseData.businessowner = req.user._id;
        } else if (req.role === 'employee') {
            warehouseData.businessowner = req.user.businessowner;
            warehouseData.employee = req.user._id;
        }

        const warehouse = await Warehouse.create(warehouseData);
        res.json(warehouse);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Warehouse — accessible by BusinessOwner or Employee
router.get('/getwarehouse', fetchuser, async (req, res) => {
    try {
        let warehouse = [];

        if (req.role === 'businessowner') {
            warehouse = await Warehouse.find({ businessowner: req.user._id });
        } else if (req.role === 'employee') {
            warehouse = await Warehouse.find({ employee: req.user._id }).populate('businessowner', 'fname lname email phone address');
        }

        res.json(warehouse);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Update Warehouse — only BusinessOwner can update
router.put('/updatecategory/:id', fetchuser, [
    body('wName', 'Enter Warehouse Name').exists(),
    body('wManager', 'Enter Warehouse Manager Name').exists(),
    body('wAddress', 'Enter Warehouse Address').exists(),
    body('wContact', 'Enter Warehouse Contact Details').exists().isNumeric(),
    body('wEmail', 'Enter Warehouse Email').exists().isEmail(),
], async (req, res) => {
    if (req.role !== 'businessowner' || req.role !== 'employee') {
        return res.status(403).send("Only BusinessOwner or Employee can update category");
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { wName, wManager, wAddress, wContact, wEmail } = req.body;

    try {
        const newWarehouse = { wName, wManager, wAddress, wContact, wEmail };

        let warehouse = await Warehouse.findById(req.params.id);
        if (!warehouse) return res.status(404).send("Not Found");

        if (warehouse.businessowner.toString() !== req.user._id.toString() || (req.role === 'employee' && warehouse.employee.toString() !== req.user._id.toString())) {
            return res.status(401).send("Not Allowed");
        }

        warehouse = await Warehouse.findByIdAndUpdate(req.params.id, { $set: newWarehouse }, { new: true });
        res.json({ warehouse });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Delete Warehouse — only BusinessOwner can delete
router.delete('/deletewarehouse/:id', fetchuser, async (req, res) => {
    if (req.role !== 'businessowner' || req.role !== 'employee') {
        return res.status(403).send("Only BusinessOwner or Employee can delete warehouse");
    }

    try {
        const warehouse = await Warehouse.findById(req.params.id);
        if (!warehouse) return res.status(404).send("Not Found");

        if (warehouse.businessowner.toString() !== req.user._id.toString() || (req.role === 'employee' && warehouse.employee.toString() !== req.user._id.toString())) {
            return res.status(401).send("Not Allowed");
        }

        await warehouse.findByIdAndDelete(req.params.id);
        res.json({ message: "Warehouse deleted successfully" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

module.exports = router;