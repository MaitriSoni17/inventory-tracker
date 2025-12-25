const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const Order = require('../models/Orders');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { notifyEmployeesAboutOrder, notifyBusinessOwnerAboutOrder } = require('../utils/notificationHelper');
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
        
        // Send notification to business owner if created by employee
        if (req.role === 'employee') {

            
            notifyBusinessOwnerAboutOrder(
                order.businessowner,
                req.user._id,
                'created',
                order._id,
                { orderId: order._id, customerName: order.customerName }
            ).catch(notifError => {

            });
        } else if (req.role === 'businessowner') {
            // Send notification to employees if created by business owner

            
            notifyEmployeesAboutOrder(
                req.user._id,
                'created',
                order._id,
                { orderId: order._id, customerName: order.customerName }
            ).catch(notifError => {

            });
        }
        
        res.json({order, success: true});
    } catch (err) {

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

        res.status(500).send("Internal Server error occurred");
    }
});

// Update Order — accessible by BusinessOwner or Employee
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




    
    if (!['businessowner', 'employee'].includes(req.role)) {
        return res.status(401).send("Unauthorized access");
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { customerName, productName, productCategory, totalAmt, orderDate, deliveryDeadline, productStatus, deliveryStatus, pAvailability, address, additionalNotes } = req.body;
    try {


        
        let order = await Order.findById(req.params.id);
        if (!order) {

            return res.status(404).send("Order not found");
        }
        

        
        // Build update object - only update fields that are explicitly provided
        const newOrder = {};
        if (customerName !== undefined) newOrder.customerName = customerName;
        if (productName !== undefined) newOrder.productName = productName;
        if (productCategory !== undefined) newOrder.productCategory = productCategory;
        if (totalAmt !== undefined) newOrder.totalAmt = totalAmt;
        if (orderDate !== undefined) newOrder.orderDate = orderDate;
        if (deliveryDeadline !== undefined) newOrder.deliveryDeadline = deliveryDeadline;
        if (productStatus !== undefined) newOrder.productStatus = productStatus;
        if (deliveryStatus !== undefined) newOrder.deliveryStatus = deliveryStatus;
        if (pAvailability !== undefined) newOrder.pAvailability = pAvailability;
        if (address !== undefined) newOrder.address = address;
        if (additionalNotes !== undefined) newOrder.additionalNotes = additionalNotes;
        

        
        if (Object.keys(newOrder).length === 0) {

            return res.json({ order, success: true, message: 'No changes provided' });
        }
        
        // Check access - business owner or the employee who created/is assigned to the order
        if (req.role === 'businessowner') {
            if (order.businessowner.toString() !== req.user._id.toString()) {
                return res.status(401).send("Not Allowed");
            }
        } else if (req.role === 'employee') {
            if (order.businessowner.toString() !== req.user.businessowner.toString()) {
                return res.status(401).send("Not Allowed");
            }
        }
        

        
        order = await Order.findByIdAndUpdate(req.params.id, { $set: newOrder }, { new: true, runValidators: false });
        


        if (!order) {

            return res.status(500).send("Error updating order");
        }
        
        // Send notification to business owner if updated by employee
        if (req.role === 'employee') {




            
            // Send notification and log result
            try {
                await notifyBusinessOwnerAboutOrder(
                    order.businessowner,
                    req.user._id,
                    'updated',
                    order._id.toString(),
                    { 
                        orderId: order._id, 
                        customerName: order.customerName,
                        updatedFields: newOrder
                    }
                );

            } catch (notifError) {


            }
        } else if (req.role === 'businessowner') {
            // Send notification to employees if updated by business owner

            
            try {
                await notifyEmployeesAboutOrder(
                    req.user._id,
                    'updated',
                    order._id.toString(),
                    { 
                        orderId: order._id, 
                        customerName: order.customerName,
                        updatedFields: newOrder
                    }
                );

            } catch (notifError) {


            }
        }
        
        res.json({ order });
    } catch (err) {




        res.status(500).json({ success: false, error: err.message });
    }
});
// Delete Order — accessible by BusinessOwner or Employee
router.delete('/deleteorder/:id', fetchuser, async (req, res) => {
    if (!['businessowner', 'employee'].includes(req.role)) {
        return res.status(401).send("Unauthorized access");
    }
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).send("Order not found"); 
        
        // Check access - business owner or the employee who created/is assigned to the order
        if (req.role === 'businessowner') {
            if (order.businessowner.toString() !== req.user._id.toString()) {
                return res.status(401).send("Not Allowed");
            }
        } else if (req.role === 'employee') {
            if (order.businessowner.toString() !== req.user.businessowner.toString()) {
                return res.status(401).send("Not Allowed");
            }
        }
        
        const orderId = order._id;
        const businessOwnerId = order.businessowner;
        
        await Order.findByIdAndDelete(req.params.id);
        
        // Send notification to business owner if deleted by employee
        if (req.role === 'employee') {

            
            notifyBusinessOwnerAboutOrder(
                businessOwnerId,
                req.user._id,
                'deleted',
                orderId,
                { orderId: orderId }
            ).catch(notifError => {

            });
        } else if (req.role === 'businessowner') {
            // Send notification to employees if deleted by business owner

            
            notifyEmployeesAboutOrder(
                businessOwnerId,
                'deleted',
                orderId,
                { orderId: orderId }
            ).catch(notifError => {

            });
        }
        
        res.json({ "Success": "Order has been deleted" });
    } catch (err) {

        res.status(500).send("Internal Server error occurred");
    }   
});

module.exports = router;


