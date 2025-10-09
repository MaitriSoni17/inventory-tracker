const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const CustomerOrders = require('../models/CustomerOrders');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Create Customer Order — accessible by BusinessOwner or Employee
router.post('/createcustomerorder', fetchuser, [
    body('cName', 'Enter Product Name').exists(),
    body('cEmail', 'Enter valid Email').isEmail(),
    body('cPhone', 'Enter Price').exists().isNumeric(),
    body('cAddress', 'Enter Address').exists(),
    body('pName', 'Enter Product Name').exists(),
    body('category', 'Enter Product Category').exists(),
    body('amount', 'Enter Price').exists().isNumeric(),
    body('ounits', 'Enter Price').exists().isNumeric(),
    body('oDate', 'Enter Order Date').exists().isDate(),
    body('dDate', 'Enter Delivery Date').exists().isDate(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { cName, cEmail, cPhone, cAddress, pName, category, amount, ounits, oDate, dDate } = req.body;

    try {
        let customerorderData = {
            cName, cEmail, cPhone, cAddress, pName, category, amount, ounits, oDate, dDate
        };

        if (req.role === 'businessowner') {
            customerorderData.businessowner = req.user._id;
        } else if (req.role === 'employee') {
            customerorderData.businessowner = req.user.businessowner;
            customerorderData.employee = req.user._id;
        }

        const customerorder = await CustomerOrders.create(customerorderData);
        res.json(customerorder);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Cstomer Orders — accessible by BusinessOwner or Employee
router.post('/getcustomerorder', fetchuser, async (req, res) => {
    try {
        let customerorder = [];
        console.log(req.user, req.role);

        if (req.role === 'businessowner') {
            customerorder = await CustomerOrders.find({ businessowner: req.user._id });
        } else if (req.role === 'employee') {
            const businessownerID = req.user.businessowner;
            const employeeID = req.user._id;
            customerorder = await CustomerOrders.find({ $or: [
                    { businessowner: businessownerID },
                    { employee: employeeID }
                ] });
        }

        res.json(customerorder);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Update Customer Order — only BusinessOwner can update
router.put('/updatecustomerorder/:id', fetchuser, [
    body('cName', 'Enter Product Name').exists(),
    body('cEmail', 'Enter valid Email').isEmail(),
    body('cPhone', 'Enter Price').exists().isNumeric(),
    body('cAddress', 'Enter Address').exists(),
    body('pName', 'Enter Product Name').exists(),
    body('category', 'Enter Product Category').exists(),
    body('amount', 'Enter Price').exists().isNumeric(),
    body('ounits', 'Enter Price').exists().isNumeric(),
    body('oDate', 'Enter Order Date').exists().isDate(),
    body('dDate', 'Enter Delivery Date').exists().isDate(),
], async (req, res) => {
    // if (req.role !== 'businessowner' || req.role !== 'employee') {
    //     return res.status(403).send("Only BusinessOwner or Employee can update products");
    // }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { cName, cEmail, cPhone, cAddress, pName, category, amount, ounits, oDate, dDate } = req.body;

    try {
        const newCustomerOrder = { cName, cEmail, cPhone, cAddress, pName, category, amount, ounits, oDate, dDate };

        let customerorder = await CustomerOrders.findById(req.params.id);
        if (!customerorder) return res.status(404).send("Not Found");

        if (customerorder.businessowner.toString() !== req.user._id.toString() || (req.role === 'employee' && customerorder.employee.toString() !== req.user._id.toString())) {
            return res.status(401).send("Not Allowed");
        }

        customerorder = await CustomerOrders.findByIdAndUpdate(req.params.id, { $set: newCustomerOrder }, { new: true });
        res.json({ customerorder });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Delete Customer Order — only BusinessOwner can delete
router.delete('/deletecustomerorder/:id', fetchuser, async (req, res) => {
    if (req.role !== 'businessowner') {
        return res.status(403).send("Only BusinessOwner can delete products");
    }

    try {
        const customerorder = await CustomerOrders.findById(req.params.id);
        if (!customerorder) return res.status(404).send("Not Found");

        if (customerorder.businessowner.toString() !== req.user._id.toString()) {
            return res.status(401).send("Not Allowed");
        }

        await CustomerOrders.findByIdAndDelete(req.params.id);
        res.json({ message: "Customer Order deleted successfully" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

module.exports = router;