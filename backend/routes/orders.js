const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const Order = require('../models/Orders');
const { body, validationResult } = require('express-validator');
const router = express.Router();
// Create Order — accessible by BusinessOwner or Employee
router.post('/createorder', fetchuser, [
    body('customerName', 'Enter Customer Name').exists(),
    body('productName', 'Enter Product Name').exists(),
    body('productCategory', 'Enter Product Category').exists(),
    body('totalAmt', 'Enter Total Amount').isNumeric(),
    body('orderDate', 'Enter Order Date').isISO8601(),
    body('deliveryDeadline', 'Enter Delivery Deadline').isISO8601(),
    body('productStatus', 'Enter Product Status').exists(),
    body('deliveryStatus', 'Enter Delivery Status').exists(),
    body('pAvailability', 'Enter Product Availability').exists(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { customerName, productName, productCategory, totalAmt, orderDate, deliveryDeadline, productStatus, deliveryStatus, pAvailability, address, additionalNotes } = req.body;
    try {
        let orderData = { customerName, productName, productCategory, totalAmt, orderDate, deliveryDeadline, productStatus, deliveryStatus, pAvailability, address, additionalNotes };
        if (req.role === 'businessowner') {
            orderData.businessowner = req.user._id;
        } else if (req.role === 'employee') {
            orderData.businessowner = req.user.businessowner;
            orderData.employee = req.user._id;
        }
        const order = await Order.create(orderData);
        res.json({order, success: true});
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});
// Get Orders — accessible by BusinessOwner or Employee
router.post('/getorders', fetchuser, async (req, res) => {
    try {
        let orders = [];
        if (req.role === 'businessowner') {
            orders = await Order.find({ businessowner: req.user._id });
        } else if (req.role === 'employee') {
            const businessownerID = req.user.businessowner;
            const employeeID = req.user._id;
            orders = await Order.find({
                $or: [
                    { businessowner: businessownerID },
                    { employee: employeeID }
                ]
            });
        }   
        res.json(orders);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Update Order — only BusinessOwner can update
router.put('/updateorder/:id', fetchuser, [
    body('customerName', 'Enter Customer Name').optional().exists(),
    body('productName', 'Enter Product Name').optional().exists(),
    body('productCategory', 'Enter Product Category').optional().exists(),
    body('totalAmt', 'Enter Total Amount').optional().isNumeric(),
    body('orderDate', 'Enter Order Date').optional().isISO8601(),
    body('deliveryDeadline', 'Enter Delivery Deadline').optional().isISO8601(),
    body('productStatus', 'Enter Product Status').optional().exists(),
    body('deliveryStatus', 'Enter Delivery Status').optional().exists(),
    body('pAvailability', 'Enter Product Availability').optional().exists(),
], async (req, res) => {
    if (req.role !== 'businessowner') {
        return res.status(401).send("Unauthorized access");
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { customerName, productName, productCategory, totalAmt, orderDate, deliveryDeadline, productStatus, deliveryStatus, pAvailability, address, additionalNotes } = req.body;
    try {
        let order = await Order.findById(req.params.id);
        if (!order) return res.status(404).send("Order not found");
        const newOrder = {};
        if (customerName) newOrder.customerName = customerName;
        if (productName) newOrder.productName = productName;
        if (productCategory) newOrder.productCategory = productCategory;
        if (totalAmt) newOrder.totalAmt = totalAmt;
        if (orderDate) newOrder.orderDate = orderDate;
        if (deliveryDeadline) newOrder.deliveryDeadline = deliveryDeadline;
        if (productStatus) newOrder.productStatus = productStatus;
        if (deliveryStatus) newOrder.deliveryStatus = deliveryStatus;
        if (pAvailability) newOrder.pAvailability = pAvailability;
        if (address) newOrder.address = address;
        if (additionalNotes) newOrder.additionalNotes = additionalNotes;
        if (order.businessowner.toString() !== req.user._id.toString()) {
            return res.status(401).send("Not Allowed");
        }
        order = await Order.findByIdAndUpdate(req.params.id, { $set: newOrder }, { new: true });
        res.json({ order });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});
// Delete Order — only BusinessOwner can delete
router.delete('/deleteorder/:id', fetchuser, async (req, res) => {
    if (req.role !== 'businessowner') {
        return res.status(401).send("Unauthorized access");
    }
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).send("Order not found"); 
        if (order.businessowner.toString() !== req.user._id.toString()) {
            return res.status(401).send("Not Allowed");
        }
        await Order.findByIdAndDelete(req.params.id);
        res.json({ "Success": "Order has been deleted" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }   
});

module.exports = router;