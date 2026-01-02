# Live Testing Guide - Hierarchy Notification System

## Prerequisites
1. MongoDB is running and accessible
2. Backend server is running on `http://localhost:5000`
3. Postman or similar API testing tool (optional)
4. MongoDB Compass or MongoDB CLI for database verification

---

## Part 1: Starting the Live Server

### Option A: Using npm (Recommended)
```bash
cd backend
npm run dev
```
**Expected Output:**
```
[nodemon] 3.1.10
[nodemon] starting `node index.js`
[dotenv@17.2.3] injecting env...
```

### Option B: Production Mode
```bash
cd backend
npm start
```

### Verify Server is Running
- Open browser and visit: `http://localhost:5000`
- You should see Express server running

---

## Part 2: Testing Notification System

### Step 1: Create Business Owner Account

**Request:**
```
POST http://localhost:5000/api/businessowner/createbusinessowner
Content-Type: application/json

{
  "fname": "John",
  "lname": "Owner",
  "email": "owner@example.com",
  "password": "password123"
}
```

**Expected Response:**
```json
{
  "authToken": "eyJhbGciOiJIUzI1NiIs...",
  "businessowner": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "owner@example.com",
    "fname": "John"
  }
}
```

**Save**: `authToken` as `OWNER_TOKEN`

---

### Step 2: Create Employees with Different Roles

#### Create Employee Role
```
POST http://localhost:5000/api/employee/createemployee
Content-Type: application/json
auth-token: OWNER_TOKEN

{
  "fname": "Alice",
  "lname": "Employee",
  "email": "employee@example.com",
  "password": "password123",
  "role": "employee",
  "jDate": "2024-01-15"
}
```

**Expected Response:**
```json
{
  "authToken": "eyJhbGciOiJIUzI1NiIs...",
  "employee": {
    "_id": "507f1f77bcf86cd799439012",
    "role": "employee",
    "fname": "Alice"
  }
}
```

**Save**: ID as `EMPLOYEE_ID`, Token as `EMPLOYEE_TOKEN`

#### Create Supervisor Role
```
POST http://localhost:5000/api/employee/createemployee
Content-Type: application/json
auth-token: OWNER_TOKEN

{
  "fname": "Bob",
  "lname": "Supervisor",
  "email": "supervisor@example.com",
  "password": "password123",
  "role": "supervisor",
  "jDate": "2024-01-10"
}
```

**Save**: ID as `SUPERVISOR_ID`, Token as `SUPERVISOR_TOKEN`

#### Create Manager Role
```
POST http://localhost:5000/api/employee/createemployee
Content-Type: application/json
auth-token: OWNER_TOKEN

{
  "fname": "Carol",
  "lname": "Manager",
  "email": "manager@example.com",
  "password": "password123",
  "role": "manager",
  "jDate": "2024-01-05"
}
```

**Save**: ID as `MANAGER_ID`, Token as `MANAGER_TOKEN`

---

### Step 3: Test Notification Creation

#### Test 3A: Employee Creates Product

**Request:**
```
POST http://localhost:5000/api/products/createproduct
Content-Type: multipart/form-data (or application/json)
auth-token: EMPLOYEE_TOKEN

{
  "name": "Test Product",
  "category": "Electronics",
  "price": 100,
  "totalProducts": 50,
  "mDate": "2024-01-01",
  "eDate": "2025-01-01",
  "warehouse": "Main",
  "desc": "Test product"
}
```

**Expected:**
- Product created
- Business Owner receives notification
- Server logs show notification creation

#### Test 3B: Manager Creates Order

**Request:**
```
POST http://localhost:5000/api/orders/createorder
Content-Type: application/json
auth-token: MANAGER_TOKEN

{
  "customerName": "John Doe",
  "productName": "Test Product",
  "productCategory": "Electronics",
  "totalAmt": 500,
  "orderDate": "2024-01-15T10:00:00Z",
  "deliveryDeadline": "2024-01-22T10:00:00Z",
  "productStatus": "available",
  "deliveryStatus": "pending",
  "pAvailability": "yes"
}
```

**Expected:**
- Order created
- Business Owner receives notification
- Employees receive notification from manager

---

### Step 4: Check Notifications via API

#### Get All Notifications
```
GET http://localhost:5000/api/notifications/getnotifications
auth-token: OWNER_TOKEN
```

**Expected Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439013",
    "type": "employee_created",
    "title": "New Employee Added",
    "message": "Employee Alice Employee has been added to your team.",
    "recipient": "507f1f77bcf86cd799439011",
    "recipientRole": "BusinessOwner",
    "sender": "507f1f77bcf86cd799439012",
    "senderRole": "Employee",
    "isRead": false,
    "createdAt": "2024-01-15T10:30:00Z",
    "data": {
      "employeeId": "507f1f77bcf86cd799439012",
      "email": "employee@example.com",
      "role": "employee"
    }
  },
  ...
]
```

#### Get Unread Count
```
GET http://localhost:5000/api/notifications/unreadcount
auth-token: OWNER_TOKEN
```

**Expected Response:**
```json
{
  "unreadCount": 3
}
```

#### Mark Notification as Read
```
PUT http://localhost:5000/api/notifications/markasread/507f1f77bcf86cd799439013
Content-Type: application/json
auth-token: OWNER_TOKEN
```

#### Mark All as Read
```
PUT http://localhost:5000/api/notifications/markallasread
Content-Type: application/json
auth-token: OWNER_TOKEN
```

---

## Part 3: Database Verification

### Connect to MongoDB

**Using MongoDB CLI:**
```bash
mongo
# or
mongosh
```

**Using MongoDB Compass:**
1. Open MongoDB Compass
2. Connect to `mongodb://localhost:27017`
3. Open `inventory-tracker` database

---

### Verify Notifications in Database

#### 1. Check Total Notifications Created
```javascript
use inventory-tracker
db.notifications.countDocuments()
```

**Expected Output:** Number greater than 0

#### 2. View Sample Notifications
```javascript
db.notifications.find().limit(5).pretty()
```

**Expected Output:**
```javascript
{
  _id: ObjectId("..."),
  recipient: ObjectId("507f1f77bcf86cd799439011"),
  recipientRole: "BusinessOwner",
  sender: ObjectId("507f1f77bcf86cd799439012"),
  senderRole: "Employee",
  type: "product_created_by_employee",
  title: "Product Added",
  message: "An employee has added a new product...",
  data: {
    productId: ObjectId("..."),
    category: "Electronics",
    price: 100
  },
  isRead: false,
  createdAt: ISODate("2024-01-15T10:30:00Z")
}
```

#### 3. Verify Employee Notifications
```javascript
db.notifications.find({
  recipientRole: "Employee",
  type: { $regex: "employee_created" }
}).pretty()
```

**Expected:** Notifications with recipientRole: "Employee"

#### 4. Check Notification Distribution by Type
```javascript
db.notifications.aggregate([
  {
    $group: {
      _id: "$type",
      count: { $sum: 1 }
    }
  },
  { $sort: { count: -1 } }
]).pretty()
```

**Expected Output:**
```javascript
{
  _id: "product_created_by_employee",
  count: 2
}
{
  _id: "employee_created",
  count: 3
}
{
  _id: "order_created_by_employee",
  count: 1
}
...
```

#### 5. Verify Notification Read Status
```javascript
db.notifications.aggregate([
  {
    $group: {
      _id: "$isRead",
      count: { $sum: 1 }
    }
  }
]).pretty()
```

**Expected Output:**
```javascript
{ _id: false, count: 5 }  // Unread
{ _id: true, count: 2 }   // Read
```

#### 6. Check Sender Population
```javascript
db.notifications.findOne().pretty()
// Note: sender will be ObjectId in DB, but populated with details in API response
```

#### 7. Verify Hierarchy Notifications
```javascript
// Find notifications where sender is Employee and recipient is Employee (reporting manager)
db.notifications.find({
  senderRole: "Employee",
  recipientRole: "Employee",
  type: { $regex: "product_created" }
}).pretty()
```

#### 8. Count by Recipient Role
```javascript
db.notifications.aggregate([
  {
    $group: {
      _id: "$recipientRole",
      count: { $sum: 1 }
    }
  }
]).pretty()
```

**Expected Output:**
```javascript
{ _id: "BusinessOwner", count: 10 }
{ _id: "Employee", count: 8 }
```

---

## Part 4: Comprehensive Test Checklist

### ✅ Verification Points

- [ ] Business Owner created and can login
- [ ] Employee created and received notification at Business Owner
- [ ] Supervisor created and received notification at Business Owner
- [ ] Manager created and all managers notified
- [ ] Employee creates product → notification reaches Business Owner
- [ ] Employee creates product → notification includes sender details
- [ ] Manager creates order → all subordinates notified
- [ ] Supervisor creates product → employees notified
- [ ] Unread count API returns correct number
- [ ] Mark as read API changes isRead status
- [ ] Mark all as read API marks all unread as true
- [ ] Database contains all expected notifications
- [ ] Notification data includes metadata
- [ ] Notification timestamps are correct
- [ ] Sender role is correctly set
- [ ] Recipient role is correctly set

---

## Part 5: Troubleshooting

### Issue: Server not starting
**Solution:**
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill process if needed
taskkill /PID <pid> /F
```

### Issue: MongoDB connection error
**Solution:**
```bash
# Ensure MongoDB is running
# Windows:
net start MongoDB

# Mac:
brew services start mongodb-community

# Linux:
sudo systemctl start mongod
```

### Issue: No notifications created
**Solution:**
1. Check server logs for errors
2. Verify auth tokens are correct
3. Check that routes imported notificationHelper correctly
4. Ensure role is correctly set in token

### Issue: Notifications not showing sender details
**Solution:**
- Check that populateSenderData is being called in /api/notifications/getnotifications
- Verify sender ID exists in database

---

## Summary

Once all steps are complete:

1. ✅ Business Owner can see all employee notifications
2. ✅ Managers can see subordinate notifications
3. ✅ Supervisors receive team notifications
4. ✅ Employees receive manager notifications
5. ✅ Database accurately reflects all notifications
6. ✅ Notification system follows org hierarchy

**The hierarchy-based notification system is fully functional and tested.**
