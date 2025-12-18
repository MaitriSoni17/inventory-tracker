/**
 * HTTP API Test for Order Update Notification
 * Run from backend: node testOrderUpdateAPI.js
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const http = require('http');

const API_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'ThisisaSecretKey';

// Helper to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + path);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['auth-token'] = token;
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Generate a valid JWT token manually
function generateToken(userId, role) {
  return jwt.sign({ id: userId, role }, JWT_SECRET);
}

async function testOrderUpdateAPI() {
  try {
    console.log('\n=== ORDER UPDATE API TEST ===\n');

    // IDs from your database
    const businessOwnerId = '6943e3b14b4f49758a38874f'; // maitri
    const employeeId = '6943e4004b4f49758a388b56'; // Rudra Soni

    // Generate tokens
    const employeeToken = generateToken(employeeId, 'employee');
    const boToken = generateToken(businessOwnerId, 'businessowner');

    console.log(`Employee Token: ${employeeToken.substring(0, 20)}...`);
    console.log(`BO Token: ${boToken.substring(0, 20)}...\n`);

    // Step 1: Get all orders as employee
    console.log('Step 1: Fetching orders as employee...');
    const getOrdersResponse = await makeRequest('POST', '/orders/getorders', {}, employeeToken);
    
    if (getOrdersResponse.status !== 200) {
      console.error('Error fetching orders:', getOrdersResponse);
      process.exit(1);
    }

    const orders = getOrdersResponse.data;
    console.log(`Found ${orders.length} orders`);
    
    if (orders.length === 0) {
      console.log('\n⚠️  No orders found in database');
      process.exit(0);
    }

    const orderId = orders[0]._id;
    console.log(`Using order: ${orderId}\n`);

    // Step 2: Update order as employee
    console.log('Step 2: Updating order as employee...');
    const updateBody = {
      deliveryStatus: 'In Transit',
      productStatus: 'Processing'
    };

    console.log(`Sending update: ${JSON.stringify(updateBody)}`);
    const updateResponse = await makeRequest('PUT', `/orders/updateorder/${orderId}`, updateBody, employeeToken);
    
    if (updateResponse.status !== 200) {
      console.error('Error updating order:', updateResponse);
      process.exit(1);
    }
    console.log(`✓ Order updated successfully\n`);

    // Step 3: Wait a moment for async notification to complete
    console.log('Step 3: Waiting for notification to be processed...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Step 4: Check notifications as business owner
    console.log('\nStep 4: Fetching notifications as business owner...');
    const notifResponse = await makeRequest('GET', '/notifications/getnotifications', null, boToken);

    if (notifResponse.status !== 200) {
      console.error('Error fetching notifications:', notifResponse);
      process.exit(1);
    }

    const notifications = notifResponse.data;
    console.log(`✓ Found ${notifications.length} notifications`);

    if (notifications.length > 0) {
      console.log('\n✓✓✓ SUCCESS! NOTIFICATION RECEIVED ✓✓✓');
      const latestNotif = notifications[0];
      console.log(`Type: ${latestNotif.type}`);
      console.log(`Title: ${latestNotif.title}`);
      console.log(`Message: ${latestNotif.message}`);
      console.log(`Created: ${latestNotif.createdAt}`);
    } else {
      console.log('\n✗ No notifications found for business owner');
    }

    // Step 5: Check debug endpoint for all notifications
    console.log('\nStep 5: Checking all notifications in database...');
    const debugResponse = await makeRequest('GET', '/notifications/debug/allnotifications', null, boToken);

    if (debugResponse.status === 200) {
      const allNotifications = Array.isArray(debugResponse.data) ? debugResponse.data : [];
      console.log(`Total notifications in DB: ${allNotifications.length}`);
      
      // Filter for order update notifications
      const orderUpdateNotifs = allNotifications.filter(n => n.type === 'order_updated_by_employee');
      console.log(`Order update notifications: ${orderUpdateNotifs.length}`);
      
      if (orderUpdateNotifs.length > 0) {
        orderUpdateNotifs.forEach((n, i) => {
          console.log(`  ${i+1}. ${n.title} (${n.type})`);
        });
      }
    } else {
      console.log('Could not fetch all notifications');
    }

    console.log('\n=== TEST COMPLETE ===\n');
    process.exit(0);

  } catch (error) {
    console.error('\n✗ ERROR:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testOrderUpdateAPI();
