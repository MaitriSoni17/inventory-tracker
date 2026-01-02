/**
 * Comprehensive Testing Script for Hierarchy-based Notification System
 * Tests all three employee roles: Employee, Supervisor, Manager
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

let businessOwnerToken = '';
let employeeToken = '';
let supervisorToken = '';
let managerToken = '';

let businessOwnerId = '';
let employeeId = '';
let supervisorId = '';
let managerId = '';

const businessOwnerData = {
    fname: 'Owner',
    lname: 'Test',
    email: `owner_${Date.now()}@test.com`,
    password: 'password123'
};

const employeeData = {
    fname: 'Employee',
    lname: 'One',
    email: `employee_${Date.now()}@test.com`,
    password: 'password123',
    role: 'employee'
};

const supervisorData = {
    fname: 'Supervisor',
    lname: 'One',
    email: `supervisor_${Date.now()}@test.com`,
    password: 'password123',
    role: 'supervisor'
};

const managerData = {
    fname: 'Manager',
    lname: 'One',
    email: `manager_${Date.now()}@test.com`,
    password: 'password123',
    role: 'manager'
};

/**
 * Test 1: Create BusinessOwner and Login
 */
async function testCreateAndLoginBusinessOwner() {
    console.log('\n========== TEST 1: Create and Login BusinessOwner ==========');
    try {
        // Create business owner
        const createRes = await axios.post(
            `${BASE_URL}/businessowner/createbusinessowner`,
            businessOwnerData
        );
        businessOwnerToken = createRes.data.authToken;
        businessOwnerId = createRes.data.businessowner._id;
        console.log('✅ Business Owner Created:', businessOwnerData.email);
        console.log('   ID:', businessOwnerId);
        console.log('   Token:', businessOwnerToken.substring(0, 20) + '...');

        return true;
    } catch (error) {
        console.error('❌ Error creating business owner:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test 2: Create Employee, Supervisor, and Manager
 */
async function testCreateEmployees() {
    console.log('\n========== TEST 2: Create Employees with Different Roles ==========');
    try {
        const headers = { 'auth-token': businessOwnerToken };

        // Create Employee
        const empRes = await axios.post(
            `${BASE_URL}/employee/createemployee`,
            employeeData,
            { headers }
        );
        employeeToken = empRes.data.authToken;
        employeeId = empRes.data.employee._id;
        console.log('✅ Employee Created:', employeeData.email);
        console.log('   ID:', employeeId);
        console.log('   Role:', 'employee');

        // Create Supervisor
        const supRes = await axios.post(
            `${BASE_URL}/employee/createemployee`,
            supervisorData,
            { headers }
        );
        supervisorToken = supRes.data.authToken;
        supervisorId = supRes.data.employee._id;
        console.log('✅ Supervisor Created:', supervisorData.email);
        console.log('   ID:', supervisorId);
        console.log('   Role:', 'supervisor');

        // Create Manager
        const mgrRes = await axios.post(
            `${BASE_URL}/employee/createemployee`,
            managerData,
            { headers }
        );
        managerToken = mgrRes.data.authToken;
        managerId = mgrRes.data.employee._id;
        console.log('✅ Manager Created:', managerData.email);
        console.log('   ID:', managerId);
        console.log('   Role:', 'manager');

        return true;
    } catch (error) {
        console.error('❌ Error creating employees:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test 3: Check Notifications for BusinessOwner
 */
async function testBusinessOwnerNotifications() {
    console.log('\n========== TEST 3: BusinessOwner Notifications ==========');
    try {
        const headers = { 'auth-token': businessOwnerToken };
        const res = await axios.get(
            `${BASE_URL}/notifications/getnotifications`,
            { headers }
        );

        const notifications = res.data;
        console.log(`✅ Fetched ${notifications.length} notifications for Business Owner`);
        
        notifications.forEach((notif, index) => {
            console.log(`\n   Notification ${index + 1}:`);
            console.log(`   - Type: ${notif.type}`);
            console.log(`   - Title: ${notif.title}`);
            console.log(`   - Message: ${notif.message}`);
            console.log(`   - Read: ${notif.isRead}`);
            console.log(`   - Sender Role: ${notif.senderRole}`);
        });

        return notifications.length > 0;
    } catch (error) {
        console.error('❌ Error fetching notifications:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test 4: Create Product and Check Notifications
 */
async function testProductNotifications() {
    console.log('\n========== TEST 4: Product Creation Notifications ==========');
    try {
        const productData = {
            name: `Test Product ${Date.now()}`,
            category: 'Electronics',
            price: 100,
            totalProducts: 50,
            mDate: new Date().toISOString().split('T')[0],
            eDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            warehouse: 'Main Warehouse',
            desc: 'Test product for notification system'
        };

        // Employee creates product
        console.log('\n   → Employee creating product...');
        const empHeaders = { 'auth-token': employeeToken };
        const empProdRes = await axios.post(
            `${BASE_URL}/products/createproduct`,
            productData,
            { headers: empHeaders }
        );
        console.log('✅ Product created by Employee');

        // Wait a moment
        await new Promise(r => setTimeout(r, 500));

        // Check notifications for business owner
        const ownerHeaders = { 'auth-token': businessOwnerToken };
        const ownerNotifRes = await axios.get(
            `${BASE_URL}/notifications/getnotifications`,
            { headers: ownerHeaders }
        );

        const productNotifs = ownerNotifRes.data.filter(n => n.type.includes('product'));
        console.log(`✅ Found ${productNotifs.length} product notifications for Business Owner`);
        productNotifs.forEach(notif => {
            console.log(`   - ${notif.title}: ${notif.message}`);
        });

        // Manager creates product
        console.log('\n   → Manager creating product...');
        const mgrHeaders = { 'auth-token': managerToken };
        const mgrProdRes = await axios.post(
            `${BASE_URL}/products/createproduct`,
            { ...productData, name: `Manager Product ${Date.now()}` },
            { headers: mgrHeaders }
        );
        console.log('✅ Product created by Manager');

        // Wait a moment
        await new Promise(r => setTimeout(r, 500));

        // Check notifications for business owner again
        const ownerNotifRes2 = await axios.get(
            `${BASE_URL}/notifications/getnotifications`,
            { headers: ownerHeaders }
        );

        console.log(`✅ Business Owner now has ${ownerNotifRes2.data.length} total notifications`);

        return true;
    } catch (error) {
        console.error('❌ Error testing product notifications:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test 5: Create Order and Check Notifications
 */
async function testOrderNotifications() {
    console.log('\n========== TEST 5: Order Creation Notifications ==========');
    try {
        const orderData = {
            customerName: 'Test Customer',
            productName: 'Test Product',
            productCategory: 'Electronics',
            totalAmt: 500,
            orderDate: new Date().toISOString(),
            deliveryDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            productStatus: 'available',
            deliveryStatus: 'pending',
            pAvailability: 'yes'
        };

        // Employee creates order
        console.log('\n   → Employee creating order...');
        const empHeaders = { 'auth-token': employeeToken };
        const empOrderRes = await axios.post(
            `${BASE_URL}/orders/createorder`,
            orderData,
            { headers: empHeaders }
        );
        console.log('✅ Order created by Employee');

        // Wait a moment
        await new Promise(r => setTimeout(r, 500));

        // Check notifications
        const ownerHeaders = { 'auth-token': businessOwnerToken };
        const notifRes = await axios.get(
            `${BASE_URL}/notifications/getnotifications`,
            { headers: ownerHeaders }
        );

        const orderNotifs = notifRes.data.filter(n => n.type.includes('order'));
        console.log(`✅ Found ${orderNotifs.length} order notifications for Business Owner`);

        return true;
    } catch (error) {
        console.error('❌ Error testing order notifications:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test 6: Check Unread Notification Count
 */
async function testUnreadCount() {
    console.log('\n========== TEST 6: Unread Notification Count ==========');
    try {
        const headers = { 'auth-token': businessOwnerToken };
        const res = await axios.get(
            `${BASE_URL}/notifications/unreadcount`,
            { headers }
        );

        console.log(`✅ Unread notification count: ${res.data.unreadCount}`);
        return true;
    } catch (error) {
        console.error('❌ Error fetching unread count:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test 7: Mark Notification as Read
 */
async function testMarkAsRead() {
    console.log('\n========== TEST 7: Mark Notification as Read ==========');
    try {
        const headers = { 'auth-token': businessOwnerToken };
        const notifRes = await axios.get(
            `${BASE_URL}/notifications/getnotifications`,
            { headers }
        );

        if (notifRes.data.length === 0) {
            console.log('⚠️ No notifications to mark as read');
            return true;
        }

        const firstNotif = notifRes.data[0];
        const markRes = await axios.put(
            `${BASE_URL}/notifications/markasread/${firstNotif._id}`,
            {},
            { headers }
        );

        console.log(`✅ Marked notification as read: ${markRes.data.title}`);
        return true;
    } catch (error) {
        console.error('❌ Error marking notification as read:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  HIERARCHY-BASED NOTIFICATION SYSTEM - COMPREHENSIVE TEST      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');

    const results = [];

    results.push(await testCreateAndLoginBusinessOwner());
    if (!results[results.length - 1]) return console.error('\n❌ Initial setup failed. Stopping tests.');

    results.push(await testCreateEmployees());
    if (!results[results.length - 1]) return console.error('\n❌ Employee creation failed. Stopping tests.');

    await new Promise(r => setTimeout(r, 1000)); // Wait for notifications to be created

    results.push(await testBusinessOwnerNotifications());
    results.push(await testProductNotifications());
    results.push(await testOrderNotifications());
    results.push(await testUnreadCount());
    results.push(await testMarkAsRead());

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  TEST SUMMARY                                                  ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    const passed = results.filter(r => r).length;
    const total = results.length;
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);

    if (passed === total) {
        console.log('\n🎉 All tests passed successfully!');
    } else {
        console.log('\n⚠️ Some tests failed. Review the output above.');
    }
}

// Run tests
runAllTests().catch(console.error);
