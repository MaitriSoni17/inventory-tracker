/**
 * Direct test script for notification system
 * Run this from backend folder: node testNotifications.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Import models
const Order = require('./models/Orders');
const Employee = require('./models/Employee');
const BusinessOwner = require('./models/BusinessOwner');
const Notification = require('./models/Notification');
const { notifyBusinessOwnerAboutOrder } = require('./utils/notificationHelper');

const JWT_SECRET = process.env.JWT_SECRET || 'thisisasecretkey';

async function testNotificationFlow() {
  try {
    console.log('\n=== NOTIFICATION SYSTEM TEST ===\n');
    
    // Connect to MongoDB
    console.log('1. Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('   ✓ Connected');

    // Get IDs from your test data
    console.log('\n2. Fetching test data...');
    const businessOwnerId = '6943e3b14b4f49758a38874f'; // maitri@gmail.com
    const employeeId = '6943e4004b4f49758a388b56'; // Rudra Soni
    
    const bo = await BusinessOwner.findById(businessOwnerId);
    const emp = await Employee.findById(employeeId);
    
    console.log(`   Business Owner: ${bo.email}`);
    console.log(`   Employee: ${emp.fname} ${emp.lname}`);

    // Get an order or create one
    console.log('\n3. Finding test order...');
    let order = await Order.findOne({ businessowner: businessOwnerId });
    
    if (!order) {
      console.log('   ⚠️  No existing order found, creating test order...');
      order = await Order.create({
        businessowner: businessOwnerId,
        employee: employeeId,
        customerName: 'Test Customer',
        productName: 'Test Product',
        productCategory: 'Electronics',
        totalAmt: 5000,
        orderDate: new Date(),
        deliveryDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        productStatus: 'Pending',
        deliveryStatus: 'Not Shipped',
        pAvailability: 'Available',
        address: '123 Test St',
        additionalNotes: 'Test Order'
      });
      console.log(`   ✓ Order created: ${order._id}`);
    } else {
      console.log(`   ✓ Order found: ${order._id}`);
    }

    // Clear existing notifications for clean test
    console.log('\n4. Clearing existing test notifications...');
    await Notification.deleteMany({
      recipient: businessOwnerId,
      type: 'order_updated_by_employee'
    });
    console.log('   ✓ Cleared');

    // Trigger notification (simulating employee update)
    console.log('\n5. TRIGGERING NOTIFICATION...');
    console.log('   Employee updating order as if from frontend...');
    
    await notifyBusinessOwnerAboutOrder(
      businessOwnerId,
      employeeId,
      'updated',
      order._id.toString(),
      { 
        orderId: order._id, 
        customerName: order.customerName,
        updatedFields: { deliveryStatus: 'In Transit' }
      }
    );

    // Verify notification was created
    console.log('\n6. Verifying notification in database...');
    const notification = await Notification.findOne({
      recipient: businessOwnerId,
      type: 'order_updated_by_employee'
    }).populate('sender recipient');

    if (notification) {
      console.log('   ✓✓✓ NOTIFICATION FOUND! ✓✓✓');
      console.log(`   ID: ${notification._id}`);
      console.log(`   Title: ${notification.title}`);
      console.log(`   Message: ${notification.message}`);
      console.log(`   Recipient: ${notification.recipient.email}`);
      console.log(`   Sender: ${notification.sender.fname} ${notification.sender.lname}`);
      console.log(`   Type: ${notification.type}`);
      console.log(`   Data: ${JSON.stringify(notification.data)}`);
    } else {
      console.log('   ✗✗✗ NO NOTIFICATION FOUND! ✗✗✗');
    }

    // Check all notifications for BO
    console.log('\n7. All notifications for Business Owner:');
    const allNotifications = await Notification.find({
      recipient: businessOwnerId,
      recipientRole: 'businessowner'
    });
    console.log(`   Total: ${allNotifications.length}`);
    allNotifications.forEach((n, i) => {
      console.log(`   ${i+1}. ${n.type} - ${n.title} (${new Date(n.createdAt).toLocaleString()})`);
    });

    console.log('\n=== TEST COMPLETE ===\n');
    process.exit(0);

  } catch (error) {
    console.error('\n✗ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testNotificationFlow();
