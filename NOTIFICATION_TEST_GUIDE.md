# Notification System Testing Guide

## Objective
Test if notifications are triggered when an order is updated by an employee.

---

## Step 1: Login as Employee (Rudra Soni)
**Endpoint:** `POST http://localhost:5000/api/auth/login`

**Body:**
```json
{
  "email": "rudra@gmail.com",
  "password": "123456"
}
```

**Expected Response:**
- Copy the `token` value from response
- Save employee token for next steps

---

## Step 2: Get All Orders
**Endpoint:** `POST http://localhost:5000/api/orders/getorders`

**Headers:**
- `Authorization: Bearer {employee_token}`

**Expected Response:**
- Array of orders
- **Save one Order ID** (e.g., `6943e3b14b4f49758a38874f`)

---

## Step 3: Update Order (Trigger Notification)
**Endpoint:** `PUT http://localhost:5000/api/orders/updateorder/{orderId}`

**Headers:**
- `Authorization: Bearer {employee_token}`

**Body:**
```json
{
  "deliveryStatus": "In Transit",
  "productStatus": "Processing"
}
```

**Important:** Watch the terminal output for these logs:
- `=== GET UPDATE ORDER ===`
- `📢 Employee order update - sending notification to business owner...`
- `→→→ notifyBusinessOwnerAboutOrder CALLED ←←←`
- `[createNotification] CREATING NOTIFICATION`
- `✓✓✓ NOTIFICATION SAVED TO DB ✓✓✓`

If you see errors like "Validation error" or "Cannot save", share those logs.

---

## Step 4: Verify Notification in Database
**Endpoint:** `GET http://localhost:5000/api/notifications/debug/allnotifications`

**Headers:**
- `Authorization: Bearer {business_owner_token}`

**Expected Response:**
- Array of notifications
- Should contain notification with type: `order_updated_by_employee`
- Recipient should be Business Owner's ID: `6943e3b14b4f49758a38874f`

---

## Step 5: Fetch Notifications as Business Owner
**Endpoint:** `GET http://localhost:5000/api/notifications/getnotifications`

**Headers:**
- `Authorization: Bearer {business_owner_token}`

**Expected Response:**
- Array with the notification created in Step 3
- Should show customer name and "Order Updated" message

---

## Important Info

**Business Owner:**
- Email: `maitri@gmail.com`
- ID: `6943e3b14b4f49758a38874f`
- Password: (use /login endpoint)

**Employee:**
- Email: `rudra@gmail.com`
- ID: `6943e4004b4f49758a388b56`
- Password: (use /login endpoint)

---

## Troubleshooting

### Issue: "No fields to update"
- The update body fields don't match the Order model
- Valid fields: `customerName`, `productName`, `productCategory`, `totalAmt`, `orderDate`, `deliveryDeadline`, `productStatus`, `deliveryStatus`, `pAvailability`, `address`, `additionalNotes`

### Issue: Logs don't show "NOTIFICATION SAVED"
- Check for validation errors in the notification model
- Verify that `order_updated_by_employee` is in the Notification type enum

### Issue: Found 0 notifications
- Notifications may not be persisting to database
- Check MongoDB connection
- Look for any `createNotification` errors in terminal

