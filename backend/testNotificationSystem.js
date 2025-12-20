/**
 * Test script to verify notification system
 * Run with: node testNotificationSystem.js
 */

const Notification = require('./models/Notification');
const BusinessOwner = require('./models/BusinessOwner');
const Employee = require('./models/Employee');
const Supplier = require('./models/Supplier');
const db = require('./db');

async function testNotificationSystem() {
  try {
    console.log('\n=== NOTIFICATION SYSTEM TEST ===\n');

    // Step 1: Fetch test data
    console.log('Step 1: Fetching test data...');
    const businessOwner = await BusinessOwner.findOne().limit(1);
    const supplier = await Supplier.findOne().limit(1);

    if (!businessOwner) {
      console.log('❌ No Business Owner found in database');
      return;
    }
    if (!supplier) {
      console.log('❌ No Supplier found in database');
      return;
    }

    console.log('✓ Business Owner found:', businessOwner._id);
    console.log('✓ Supplier found:', supplier._id);

    // Step 2: Create a test notification
    console.log('\nStep 2: Creating test notification...');
    const testNotification = new Notification({
      recipient: supplier._id,
      recipientRole: 'Supplier',
      sender: businessOwner._id,
      senderRole: 'BusinessOwner',
      type: 'supplier_order_created',
      title: 'Test Order Created',
      message: 'This is a test notification for supplier order creation',
      data: {
        orderId: 'test123',
        productName: 'Test Product',
        amount: 1000
      }
    });

    const savedNotif = await testNotification.save();
    console.log('✓ Notification saved with ID:', savedNotif._id);

    // Step 3: Retrieve notifications for supplier
    console.log('\nStep 3: Retrieving notifications for supplier...');
    const notificationsForSupplier = await Notification.find({
      recipient: supplier._id,
      recipientRole: 'Supplier'
    });

    console.log(`✓ Found ${notificationsForSupplier.length} notification(s) for supplier`);
    if (notificationsForSupplier.length > 0) {
      const lastNotif = notificationsForSupplier[notificationsForSupplier.length - 1];
      console.log('  - Title:', lastNotif.title);
      console.log('  - Message:', lastNotif.message);
      console.log('  - Type:', lastNotif.type);
      console.log('  - Sender ID:', lastNotif.sender);
      console.log('  - Sender Role:', lastNotif.senderRole);
    }

    // Step 4: Retrieve notifications for business owner
    console.log('\nStep 4: Testing business owner notifications...');
    
    const boNotification = new Notification({
      recipient: businessOwner._id,
      recipientRole: 'BusinessOwner',
      sender: supplier._id,
      senderRole: 'Supplier',
      type: 'supplier_order_status_updated',
      title: 'Supplier Updated Order Status',
      message: 'Supplier has updated the order status',
      data: {
        orderId: 'test123',
        productName: 'Test Product',
        status: 'In Progress'
      }
    });

    const savedBoNotif = await boNotification.save();
    console.log('✓ Business Owner notification saved:', savedBoNotif._id);

    const notificationsForBO = await Notification.find({
      recipient: businessOwner._id,
      recipientRole: 'BusinessOwner'
    });

    console.log(`✓ Found ${notificationsForBO.length} notification(s) for business owner`);
    if (notificationsForBO.length > 0) {
      const lastNotif = notificationsForBO[notificationsForBO.length - 1];
      console.log('  - Title:', lastNotif.title);
      console.log('  - Message:', lastNotif.message);
      console.log('  - Type:', lastNotif.type);
    }

    // Step 5: Test notification counts
    console.log('\nStep 5: Testing notification counts...');
    const supplierUnreadCount = await Notification.countDocuments({
      recipient: supplier._id,
      recipientRole: 'Supplier',
      isRead: false
    });
    console.log('✓ Unread notifications for supplier:', supplierUnreadCount);

    const boUnreadCount = await Notification.countDocuments({
      recipient: businessOwner._id,
      recipientRole: 'BusinessOwner',
      isRead: false
    });
    console.log('✓ Unread notifications for business owner:', boUnreadCount);

    // Step 6: Cleanup - delete test notifications
    console.log('\nStep 6: Cleaning up test notifications...');
    await Notification.deleteMany({
      'data.orderId': 'test123'
    });
    console.log('✓ Test notifications deleted');

    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===\n');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testNotificationSystem();
