const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const Order = require('../models/Orders');
const Employee = require('../models/Employee');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { 
  notifyEmployeesAboutOrder, 
  notifyBusinessOwnerAboutOrder,
  notifySubordinatesAboutOrder,
  notifyReportingManager
} = require('../utils/notificationHelper');
const {
  canEditItem,
  canDeleteItem,
  getSubordinates,
  hasPermission
} = require('../middleware/roleBasedAccess');
// Create Order — permission-based access
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
    // Check permission to create orders
    if (!hasPermission(req.user, 'canCreateOrders')) {
        return res.status(403).json({ error: "You do not have permission to create orders" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { customerName, productName, productCategory, totalAmt, orderDate, deliveryDeadline, productStatus, deliveryStatus, pAvailability, address, additionalNotes, warehouse } = req.body;
    try {
        let orderData = { customerName, productName, productCategory, totalAmt, orderDate, deliveryDeadline, productStatus, deliveryStatus, pAvailability, address, additionalNotes };
        if (req.role === 'businessowner') {
            orderData.businessowner = req.user._id;
            // Business owner can assign to specific warehouse
            if (warehouse) {
                orderData.warehouse = warehouse;
            }
        } else if (req.role === 'employee') {
            orderData.businessowner = req.user.businessowner;
            orderData.employee = req.user._id;
            // Employee's order goes to their warehouse
            const employee = await Employee.findById(req.user._id);
            if (employee && employee.warehouse) {
                orderData.warehouse = employee.warehouse;
            }
        } else if (['manager', 'supervisor'].includes(req.role)) {
            orderData.businessowner = req.user.businessowner;
            orderData.employee = req.user._id;
            // Manager/Supervisor can assign to their warehouse
            const staffMember = await Employee.findById(req.user._id);
            if (staffMember && staffMember.warehouse) {
                orderData.warehouse = staffMember.warehouse;
            }
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
            ).catch(notifError => {});
            
            // Notify reporting manager if exists
            if (req.user.reportingTo) {
              await notifyReportingManager(
                req.user._id,
                'order_created',
                order._id,
                'order',
                { orderId: order._id, customerName: order.customerName }
              );
            }
        } else if (req.role === 'businessowner') {
            // Send notification to employees if created by business owner
            notifyEmployeesAboutOrder(
                req.user._id,
                'created',
                order._id,
                { orderId: order._id, customerName: order.customerName }
            ).catch(notifError => {});
        } else if (['manager', 'supervisor'].includes(req.role)) {
            // Manager/Supervisor creates order - notify business owner and subordinates
            notifyBusinessOwnerAboutOrder(
                req.user.businessowner,
                req.user._id,
                'created',
                order._id,
                { orderId: order._id, customerName: order.customerName, createdBy: req.user.role }
            ).catch(notifError => {});
            
            // Notify subordinates
            notifySubordinatesAboutOrder(
                req.user._id,
                req.user.role,
                'created',
                order._id,
                { orderId: order._id, customerName: order.customerName }
            ).catch(notifError => {});
        }
        
        res.json({order, success: true});
    } catch (err) {

        res.status(500).send("Internal Server error occurred");
    }
});
// Get Orders — permission-based access with hierarchy awareness and warehouse filtering
router.post('/getorders', fetchuser, async (req, res) => {
    // Check permission to view orders
    if (!hasPermission(req.user, 'canViewOrders')) {
        return res.status(403).json({ error: "You do not have permission to view orders" });
    }

    try {
        let orders = [];
        
        if (req.role === 'businessowner') {
            // Business owner sees all orders in their business
            orders = await Order.find({ businessowner: req.user._id }).populate('warehouse');
        } else if (req.role === 'manager') {
            // Manager sees orders from their warehouse
            const manager = await Employee.findById(req.user._id).populate('warehouse');
            
            if (manager && manager.warehouse) {
                // Get orders assigned to their warehouse
                orders = await Order.find({
                    warehouse: manager.warehouse._id
                }).populate('warehouse');
            } else {
                // If no warehouse assigned, show no orders
                orders = [];
            }
        } else if (req.role === 'supervisor') {
            // Supervisor sees orders from their warehouse
            const supervisor = await Employee.findById(req.user._id).populate('warehouse');
            
            if (supervisor && supervisor.warehouse) {
                // Get orders assigned to their warehouse
                orders = await Order.find({
                    warehouse: supervisor.warehouse._id
                }).populate('warehouse');
            } else {
                // If no warehouse assigned, show no orders
                orders = [];
            }
        } else if (req.role === 'employee') {
            // Employees see only their own orders from their warehouse
            const employee = await Employee.findById(req.user._id).populate('warehouse');
            
            if (employee && employee.warehouse) {
                orders = await Order.find({
                    businessowner: req.user.businessowner,
                    warehouse: employee.warehouse._id,
                    employee: req.user._id
                }).populate('warehouse');
            } else {
                // If no warehouse assigned, show no orders
                orders = [];
            }
        }
        
        res.json(orders);
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Update Order — permission-based access with hierarchy checking and warehouse filtering
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
    // Check permission to edit orders
    if (!hasPermission(req.user, 'canEditOrders')) {
        return res.status(403).json({ error: "You do not have permission to update orders" });
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const { customerName, productName, productCategory, totalAmt, orderDate, deliveryDeadline, productStatus, deliveryStatus, pAvailability, address, additionalNotes, warehouse } = req.body;
    
    try {
        let order = await Order.findById(req.params.id).populate('warehouse');
        if (!order) {
            return res.status(404).send("Order not found");
        }
        
        // Authorization checks
        if (req.role === 'businessowner') {
            // Business owner can update any order
            if (order.businessowner.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: "You do not have permission to update this order" });
            }
        } else if (['manager', 'supervisor', 'employee'].includes(req.role)) {
            // Warehouse staff can only update orders in their warehouse
            const staffMember = await Employee.findById(req.user._id).populate('warehouse');
            
            if (!staffMember || !staffMember.warehouse) {
                return res.status(401).send("Not assigned to any warehouse");
            }
            
            if (!order.warehouse || order.warehouse._id.toString() !== staffMember.warehouse._id.toString()) {
                return res.status(403).json({ error: "You can only update orders in your warehouse" });
            }
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
        
        // Only business owner can change warehouse
        if (req.role === 'businessowner' && warehouse !== undefined) {
            newOrder.warehouse = warehouse;
        }
        
        if (Object.keys(newOrder).length === 0) {
            return res.json({ order, success: true, message: 'No changes provided' });
        }
        
        order = await Order.findByIdAndUpdate(req.params.id, { $set: newOrder }, { new: true, runValidators: false });
        
        if (!order) {
            return res.status(500).send("Error updating order");
        }
        
        // Send notifications based on who updated it
        if (req.role === 'employee') {
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
                
                if (req.user.reportingTo) {
                    await notifyReportingManager(
                        req.user._id,
                        'order_updated',
                        order._id,
                        'order',
                        { orderId: order._id, customerName: order.customerName }
                    );
                }
            } catch (notifError) {}
        } else if (req.role === 'businessowner') {
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
            } catch (notifError) {}
        } else if (['manager', 'supervisor'].includes(req.role)) {
            try {
                await notifyBusinessOwnerAboutOrder(
                    order.businessowner,
                    req.user._id,
                    'updated',
                    order._id.toString(),
                    { 
                        orderId: order._id, 
                        customerName: order.customerName,
                        updatedBy: req.user.role,
                        updatedFields: newOrder
                    }
                );
            } catch (notifError) {}
        }
        
        res.json({ order, success: true });
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Delete Order — permission-based access with hierarchy checking
router.delete('/deleteorder/:id', fetchuser, async (req, res) => {
    // Check permission to delete orders
    if (!hasPermission(req.user, 'canDeleteOrders')) {
        return res.status(403).json({ error: "You do not have permission to delete orders" });
    }
    
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).send("Order not found");
        
        // Check if user can delete this order based on hierarchy
        const canDelete = await canDeleteItem(req.user, order.employee);
        if (!canDelete) {
            return res.status(403).json({ error: "You do not have permission to delete this order" });
        }
        
        const orderId = order._id;
        const businessOwnerId = order.businessowner;
        const orderEmployee = order.employee;
        
        await Order.findByIdAndDelete(req.params.id);
        
        // Send notifications based on who deleted it
        if (req.role === 'employee') {
            try {
                await notifyBusinessOwnerAboutOrder(
                    businessOwnerId,
                    req.user._id,
                    'deleted',
                    orderId,
                    { orderId: orderId }
                );
                
                if (req.user.reportingTo) {
                    await notifyReportingManager(
                        req.user._id,
                        'order_deleted',
                        orderId,
                        'order',
                        { orderId: orderId }
                    );
                }
            } catch (notifError) {}
        } else if (req.role === 'businessowner') {
            try {
                await notifyEmployeesAboutOrder(
                    businessOwnerId,
                    'deleted',
                    orderId,
                    { orderId: orderId }
                );
            } catch (notifError) {}
        } else if (['manager', 'supervisor'].includes(req.role)) {
            try {
                await notifyBusinessOwnerAboutOrder(
                    businessOwnerId,
                    req.user._id,
                    'deleted',
                    orderId,
                    { orderId: orderId, deletedBy: req.user.role }
                );
                
                await notifySubordinatesAboutOrder(
                    req.user._id,
                    req.user.role,
                    'deleted',
                    orderId,
                    { orderId: orderId }
                );
            } catch (notifError) {}
        }
        
        res.json({ message: "Order deleted successfully" });
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }   
});

module.exports = router;


