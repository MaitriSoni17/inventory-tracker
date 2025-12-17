# Notification System Implementation Guide

## Overview
This document describes the comprehensive real-time notification system implemented for the Inventory Tracker application.

## Features

### 1. Business Owner Notifications
Business Owners receive notifications when:
- **Employee Dashboard Changes**:
  - Employee is created/added to the team
  - Employee profile is updated
  - Employee is deleted from the system
  - Employee account is deactivated

### 2. Employee Notifications
Employees receive notifications when Business Owner makes changes to:
- **Products**:
  - New product is added
  - Product information is updated
  - Product is deleted
  
- **Orders**:
  - New customer order is created
  - Order details are updated
  - Order is canceled/deleted
  
- **Categories**:
  - New category is added
  - Category information is updated
  - Category is deleted

## System Architecture

### Backend Components

#### 1. Notification Model (`backend/models/Notification.js`)
```javascript
{
  recipient: ObjectId,           // User receiving the notification
  recipientRole: String,         // 'businessowner' or 'employee'
  sender: ObjectId,              // User who triggered the action
  senderRole: String,            // Role of the sender
  type: String,                  // Type of notification (e.g., 'product_created')
  title: String,                 // Notification title
  message: String,               // Notification message
  data: Object,                  // Additional data (e.g., productId, amount)
  isRead: Boolean,               // Read status
  createdAt: Date                // Timestamp
}
```

Notifications auto-delete after 30 days using MongoDB TTL index.

#### 2. Notification Routes (`backend/routes/notifications.js`)

**Endpoints:**
- `GET /api/notifications/getnotifications` - Get all notifications for current user
- `GET /api/notifications/unreadcount` - Get unread notification count
- `PUT /api/notifications/markasread/:id` - Mark notification as read
- `PUT /api/notifications/markallasread` - Mark all notifications as read
- `DELETE /api/notifications/deletenotification/:id` - Delete a notification
- `DELETE /api/notifications/deleteallnotifications` - Delete all notifications

#### 3. Notification Helper (`backend/utils/notificationHelper.js`)

**Functions:**
```javascript
createNotification()                   // Create and save a notification
notifyBusinessOwnerAboutEmployee()    // Notify about employee changes
notifyEmployeesAboutProduct()         // Notify employees about product changes
notifyEmployeesAboutOrder()           // Notify employees about order changes
notifyEmployeesAboutCategory()        // Notify employees about category changes
```

#### 4. Updated Routes with Notification Integration

**Files Modified:**
- `backend/routes/employee.js` - Employee creation, update, deletion
- `backend/routes/products.js` - Product creation, update, deletion
- `backend/routes/category.js` - Category creation, update, deletion
- `backend/routes/customerorders.js` - Customer order creation, update, deletion

### Frontend Components

#### 1. Notifications Component (`src/components/Notifications.js`)
- Displays notification bell icon with unread badge
- Shows notification panel with full notification list
- Features:
  - Mark individual notifications as read
  - Mark all notifications as read
  - Delete individual notifications
  - Clear all notifications
  - Auto-refresh every 30 seconds
  - Responsive design
  - Time formatting (just now, 1h ago, etc.)

#### 2. Notification Styling (`src/components/notifications.css`)
- Modern UI with animations
- Responsive design for mobile
- Color-coded notification icons based on type
- Smooth transitions and hover effects

#### 3. Integration with SideBar (`src/components/SideBar.js`)
- Notifications component embedded in the navbar
- Available to all authenticated users
- Positioned in top-right corner

## Notification Types

| Type | Title | Triggered By | Sent To |
|------|-------|--------------|---------|
| `employee_created` | New Employee Added | Business Owner creates employee | Business Owner |
| `employee_updated` | Employee Profile Updated | Business Owner updates employee | Business Owner |
| `employee_deleted` | Employee Removed | Business Owner deletes employee | Business Owner |
| `employee_deactivated` | Employee Deactivated | Business Owner deactivates employee | Business Owner |
| `product_created` | New Product Added | Business Owner creates product | All Employees |
| `product_updated` | Product Updated | Business Owner updates product | All Employees |
| `product_deleted` | Product Removed | Business Owner deletes product | All Employees |
| `order_created` | New Order Created | Business Owner creates order | All Employees |
| `order_updated` | Order Updated | Business Owner updates order | All Employees |
| `order_deleted` | Order Canceled | Business Owner deletes order | All Employees |
| `category_created` | New Category Added | Business Owner creates category | All Employees |
| `category_updated` | Category Updated | Business Owner updates category | All Employees |
| `category_deleted` | Category Removed | Business Owner deletes category | All Employees |

## API Integration Flow

### When Employee is Created:
1. Business Owner POSTs to `/api/employee/createemployee`
2. Backend creates employee and stores employee data
3. `notifyBusinessOwnerAboutEmployee()` is called with action='created'
4. Notification is created and saved to database
5. Business Owner sees notification bell badge update
6. Business Owner clicks bell to view notification

### When Product is Created:
1. Business Owner POSTs to `/api/products/createproduct`
2. Backend creates product and stores product data
3. `notifyEmployeesAboutProduct()` is called with action='created'
4. For each employee under this business owner:
   - A notification is created and saved
5. Each Employee sees notification bell badge update
6. Employees click bell to view notification

### When Order is Updated:
1. Business Owner PUTs to `/api/customerorders/updatecustomerorder/:id`
2. Backend updates order and stores updated data
3. `notifyEmployeesAboutOrder()` is called with action='updated'
4. For each employee under this business owner:
   - A notification is created and saved
5. Each Employee sees notification bell badge update

## Frontend Usage

### Basic Implementation in Component:
```javascript
import Notifications from './Notifications';

function Dashboard() {
  return (
    <nav>
      <Notifications />
    </nav>
  );
}
```

### Notification Panel Features:
- **Bell Icon**: Click to toggle notification panel
- **Badge**: Shows unread count (red circle with number)
- **Mark as Read**: Click checkmark icon on notification
- **Delete**: Click trash icon to remove notification
- **Bulk Actions**: Mark all as read or clear all at top of panel
- **Auto-refresh**: Refreshes every 30 seconds for new notifications

## Database Considerations

### Collections:
- `notifications` - Stores all notification records

### Indexes:
- `createdAt` - For sorting and TTL (auto-delete after 30 days)
- Compound index on `(recipient, recipientRole, isRead)` for faster queries

### Data Retention:
- Notifications automatically deleted after 30 days
- Can be manually deleted by users

## Performance Optimizations

1. **Polling Strategy**: Frontend polls every 30 seconds instead of real-time
   - Can be upgraded to WebSocket/Socket.io for real-time updates

2. **Pagination**: Limited to 50 notifications per fetch
   - Can be extended with pagination endpoints

3. **Database Indexing**: Optimized queries with proper indexes

4. **TTL Index**: Auto-cleanup of old notifications to prevent data bloat

## Future Enhancements

1. **Real-time Notifications**:
   - Implement Socket.io for instant notifications
   - Remove polling interval

2. **Email Notifications**:
   - Send email alerts for critical notifications
   - Configurable per user

3. **Push Notifications**:
   - Browser push notifications
   - Mobile app notifications

4. **Notification Preferences**:
   - User can choose which notification types to receive
   - Frequency settings (immediate, daily digest, etc.)

5. **Advanced Filtering**:
   - Filter notifications by type, date, read status
   - Search notifications

6. **Notification Templates**:
   - Customizable notification messages
   - Multi-language support

## Testing the Notification System

### Test Case 1: Employee Creation Notification
1. Login as Business Owner
2. Create a new employee
3. Check notification bell badge appears with count
4. Click bell icon to see "New Employee Added" notification

### Test Case 2: Product Update Notification
1. Login as Business Owner
2. Update a product
3. Login as Employee in same company
4. Check notification bell badge updates
5. See "Product Updated" notification in panel

### Test Case 3: Order Deletion Notification
1. Login as Business Owner
2. Delete a customer order
3. Login as Employee in same company
4. Check notification bell badge updates
5. See "Order Canceled" notification

## Troubleshooting

### Notifications Not Appearing
1. Check browser console for errors
2. Verify auth token is valid
3. Check MongoDB connection
4. Ensure Notification model is properly indexed

### Notifications Not Sending to Employees
1. Verify business owner ID is correctly set
2. Check that employees are assigned to correct business owner
3. Verify API endpoint is called with correct user role

### Performance Issues
1. Check database indexes are created
2. Monitor API response times
3. Consider upgrading to real-time updates if polling is too slow

## Security Considerations

1. **Authentication**: All endpoints require valid auth token
2. **Authorization**: Users can only see their own notifications
3. **Data Validation**: All inputs are validated
4. **Rate Limiting**: Consider adding rate limits in production
5. **XSS Protection**: Notification messages are properly escaped

## File Structure
```
backend/
├── models/
│   └── Notification.js
├── routes/
│   ├── notifications.js
│   ├── employee.js (updated)
│   ├── products.js (updated)
│   ├── category.js (updated)
│   └── customerorders.js (updated)
├── utils/
│   └── notificationHelper.js
└── index.js (updated with notifications route)

src/
├── components/
│   ├── Notifications.js (new)
│   ├── notifications.css (new)
│   └── SideBar.js (updated)
```

## Conclusion
This notification system provides a comprehensive solution for keeping users informed of important changes in the Inventory Tracker application. The modular design allows for easy expansion and customization based on future requirements.
