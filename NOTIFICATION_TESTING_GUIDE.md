# Notification System Implementation - Testing Guide

## Overview
The hierarchy-based notification system has been successfully implemented for all three employee roles: **Employee**, **Supervisor**, and **Manager**.

## What Was Implemented

### 1. Enhanced NotificationHelper Functions
**File**: `backend/utils/notificationHelper.js`

New functions added:
- `getEmployeesByRole()` - Get employees filtered by role
- `getManagerSubordinates()` - Get a manager's direct reports
- `getSupervisorSubordinates()` - Get employees under a supervisor
- `notifyEmployeesByRole()` - Notify employees of specific role
- `notifyManagerAboutEmployeeProduct()` - Notify manager when employee creates product
- `notifySupervisorAboutEmployeeProduct()` - Notify supervisor about employee actions
- `notifySubordinatesAboutProduct()` - Notify all subordinates about product changes
- `notifySubordinatesAboutOrder()` - Notify subordinates about order changes
- `notifyReportingManager()` - Notify an employee's reporting manager
- `notifyAllManagers()` - Notify all managers about organizational changes
- `notifyManagerAboutNewSubordinate()` - Notify manager when new subordinate is added
- `notifyEmployeeAboutRoleChange()` - Notify employee when role is changed

### 2. Updated Routes for Hierarchy Awareness

#### Products Route (`backend/routes/products.js`)
- When **Employee** creates product: notifies Business Owner + Reporting Manager
- When **Manager/Supervisor** creates product: notifies Business Owner + all subordinates
- When **Business Owner** creates product: notifies all employees

#### Orders Route (`backend/routes/orders.js`)
- When **Employee** creates order: notifies Business Owner + Reporting Manager
- When **Manager/Supervisor** creates order: notifies Business Owner + all subordinates
- When **Business Owner** creates order: notifies all employees

#### Employee Route (`backend/routes/employee.js`)
- When **Employee** is created under a Manager: Manager is notified
- When **Manager** is created: All existing managers are notified
- Business Owner is always notified of new employee creation

### 3. New Notification Types
**File**: `backend/models/Notification.js`

Added notification type:
- `employee_role_updated` - When an employee's role is changed

## Testing the Notification System in MongoDB

### 1. Connect to MongoDB
```bash
# Using MongoDB CLI
mongo

# Or using MongoDB Compass (GUI)
# Connect to your MongoDB instance
```

### 2. View All Notifications
```javascript
// Switch to your database
use inventory-tracker

// View all notifications
db.notifications.find().pretty()

// View specific count
db.notifications.countDocuments()

// View notifications by role
db.notifications.find({ recipientRole: 'Employee' }).pretty()

// View notifications by type
db.notifications.find({ type: 'product_created_by_employee' }).pretty()

// View unread notifications
db.notifications.find({ isRead: false }).pretty()
```

### 3. Test Scenarios to Verify

#### Scenario 1: Employee Creates Product
1. Login as Employee
2. Create a product
3. Check MongoDB:
   ```javascript
   db.notifications.find({ 
     type: 'product_created_by_employee',
     recipientRole: 'BusinessOwner'
   }).pretty()
   
   // Also check for manager notification if employee has reportingTo set
   db.notifications.find({
     type: 'product_created_by_employee',
     recipientRole: 'Employee',
     $expr: { $eq: ['$recipient', <managerId>] }
   }).pretty()
   ```

#### Scenario 2: Manager Notifies Subordinates
1. Create a Manager with subordinates
2. Manager creates a product
3. Check MongoDB:
   ```javascript
   db.notifications.find({
     type: 'product_created',
     senderRole: 'Employee',
     $expr: { $eq: ['$sender', <managerId>] }
   }).pretty()
   ```

#### Scenario 3: Employee Hierarchy Chain
1. Create Manager → Supervisor → Employee
2. Set Supervisor's reportingTo = Manager
3. Set Employee's reportingTo = Supervisor
4. Employee creates product
5. Check MongoDB:
   ```javascript
   // Notification to supervisor
   db.notifications.find({
     recipientRole: 'Employee',
     type: 'product_created_by_employee',
     $expr: { $eq: ['$recipient', <supervisorId>] }
   }).pretty()
   
   // Notification to business owner
   db.notifications.find({
     recipientRole: 'BusinessOwner',
     type: 'product_created_by_employee'
   }).pretty()
   ```

#### Scenario 4: Check Notification Read Status
```javascript
// Find unread notifications
db.notifications.find({ isRead: false }).count()

// Find read notifications
db.notifications.find({ isRead: true }).count()

// Update read status (simulating API call)
db.notifications.updateOne(
  { _id: ObjectId('<notification-id>') },
  { $set: { isRead: true } }
)
```

## API Endpoints for Testing

### Get Notifications
```
GET /api/notifications/getnotifications
Header: auth-token: <token>
```

### Get Unread Count
```
GET /api/notifications/unreadcount
Header: auth-token: <token>
```

### Mark as Read
```
PUT /api/notifications/markasread/:id
Header: auth-token: <token>
```

### Mark All as Read
```
PUT /api/notifications/markallasread
Header: auth-token: <token>
```

## Key Notification Flows

### Employee Role Hierarchy
```
Employee (entry level)
  ↓
Supervisor (manages employees)
  ↓
Manager (manages supervisors and employees)
  ↓
BusinessOwner (owns everything)
```

### Notification Distribution
When an **Employee** performs an action:
1. Employee's **Reporting Manager** gets notified
2. **Business Owner** gets notified
3. Other employees at same level do NOT get notified

When a **Manager** performs an action:
1. **Business Owner** gets notified
2. All **Subordinates** (supervisors & employees under them) get notified

When a **Supervisor** performs an action:
1. **Business Owner** gets notified
2. All **Employees** under them get notified

When **Business Owner** performs an action:
1. All **Employees** of the organization get notified
2. Business owner themselves gets a confirmation notification

## Database Verification Checklist

- [ ] Notifications are created when employee creates product
- [ ] Notifications are created when employee creates order
- [ ] Supervisor receives notifications for subordinate actions
- [ ] Manager receives notifications for team actions
- [ ] Business owner receives notifications for employee actions
- [ ] Notification `isRead` status can be changed
- [ ] Notifications auto-delete after 30 days (TTL index set)
- [ ] Notification sender information is properly populated
- [ ] Notification data includes relevant metadata (IDs, names, etc.)

## Common Database Queries

### View notification distribution
```javascript
db.notifications.aggregate([
  {
    $group: {
      _id: {
        type: '$type',
        recipientRole: '$recipientRole'
      },
      count: { $sum: 1 }
    }
  }
]).pretty()
```

### View notification timeline
```javascript
db.notifications.find()
  .sort({ createdAt: -1 })
  .limit(20)
  .pretty()
```

### Check sender details in notifications
```javascript
db.notifications.aggregate([
  {
    $lookup: {
      from: 'employees',
      localField: 'sender',
      foreignField: '_id',
      as: 'senderDetails'
    }
  },
  { $limit: 5 },
  { $pretty: true }
]).pretty()
```

## Notes
- All notifications use the unified `fetchuser` middleware for authentication
- Role checking in middleware automatically determines user role (employee, supervisor, manager, or businessowner)
- Notifications are automatically populated with sender details before being sent to the client
- TTL (Time To Live) index automatically removes notifications after 30 days
- Notification data field can store additional metadata specific to the action
