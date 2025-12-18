# Frontend Implementation Checklist

## ✅ Current Status
The notification system is **fully working** on the backend. The frontend needs to be updated to use the correct API headers and integrate the notification display.

---

## 1. Fix API Headers

**Current Issue:** Frontend might be using `Authorization` header instead of `auth-token`

### Update all API calls:

**BEFORE:**
```javascript
const response = await fetch('http://localhost:5000/api/orders/updateorder/' + orderId, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(updateData)
});
```

**AFTER:**
```javascript
const response = await fetch('http://localhost:5000/api/orders/updateorder/' + orderId, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'auth-token': token  // ← Changed from Authorization
  },
  body: JSON.stringify(updateData)
});
```

---

## 2. Add Notification Display Component

Create a notification component to show notifications to the user.

### Example Component:
```javascript
// src/components/NotificationCenter.js
import React, { useEffect, useState } from 'react';

function NotificationCenter({ token }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 5 seconds
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/notifications/getnotifications', {
        headers: { 'auth-token': token }
      });
      const data = await response.json();
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`http://localhost:5000/api/notifications/markasread/${notificationId}`, {
        method: 'PUT',
        headers: { 'auth-token': token }
      });
      fetchNotifications(); // Refresh list
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div className="notification-center">
      <h3>Notifications ({notifications.length})</h3>
      <div className="notification-list">
        {notifications.map(notif => (
          <div key={notif._id} className="notification-item">
            <h4>{notif.title}</h4>
            <p>{notif.message}</p>
            <small>{new Date(notif.createdAt).toLocaleString()}</small>
            {!notif.isRead && (
              <button onClick={() => markAsRead(notif._id)}>Mark as Read</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationCenter;
```

---

## 3. Notification Types Reference

When you see these in notifications:

| Type | Meaning | Who Receives |
|------|---------|--------------|
| `order_created_by_employee` | Employee created a new order | Business Owner |
| `order_updated_by_employee` | Employee updated an order ✓ | Business Owner |
| `order_deleted_by_employee` | Employee deleted an order | Business Owner |
| `product_created` | Product was added | Employees |
| `product_updated` | Product was updated | Employees |
| `employee_created` | New employee was added | Business Owner |

---

## 4. Update Order - Required Fields

When updating an order from the frontend, you can send these fields:

```javascript
{
  "customerName": "John Doe",           // Optional
  "productName": "Widget",               // Optional
  "productCategory": "Electronics",      // Optional
  "totalAmt": 5000,                      // Optional
  "orderDate": "2025-12-18",             // Optional (ISO date)
  "deliveryDeadline": "2025-12-25",      // Optional (ISO date)
  "productStatus": "Processing",         // Optional
  "deliveryStatus": "In Transit",        // Optional ✓ TESTED
  "pAvailability": "Available",          // Optional
  "address": "123 Main St",              // Optional
  "additionalNotes": "Urgent"            // Optional
}
```

Only include fields you want to update. The system will:
1. Update the order
2. **Automatically create a notification**
3. Send notification to business owner

---

## 5. Notification Endpoints Available

### Get Notifications
```
GET /api/notifications/getnotifications
Headers: { "auth-token": token }
Response: Array of notifications
```

### Mark as Read
```
PUT /api/notifications/markasread/{notificationId}
Headers: { "auth-token": token }
```

### Mark All as Read
```
PUT /api/notifications/markallasread
Headers: { "auth-token": token }
```

### Delete Notification
```
DELETE /api/notifications/deletenotification/{notificationId}
Headers: { "auth-token": token }
```

### Delete All Notifications
```
DELETE /api/notifications/deleteallnotifications
Headers: { "auth-token": token }
```

---

## 6. Testing the Integration

### Test Steps:
1. Login as Employee (rudra@gmail.com)
2. Make PUT request to update an order
3. **Verify notification is created** by calling GET /getnotifications as Business Owner
4. Check notification appears in UI

### Test with curl:
```bash
# Update order
curl -X PUT "http://localhost:5000/api/orders/updateorder/6943f2816595e355f0a93d8f" \
  -H "auth-token: YOUR_EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deliveryStatus":"In Transit"}'

# Get notifications (as business owner)
curl -X GET "http://localhost:5000/api/notifications/getnotifications" \
  -H "auth-token: YOUR_BO_TOKEN"
```

---

## 7. Common Issues & Fixes

### Issue: "Not Found" when updating order
**Cause:** Order ID might not exist
**Fix:** Verify order ID exists by fetching all orders first

### Issue: "Unauthorized" error
**Cause:** Wrong header name or invalid token
**Fix:** Use `auth-token` header (not `Authorization`)

### Issue: Notification not appearing
**Cause:** Check if notification was created (see server logs)
**Fix:** Run test scripts to verify backend is working

### Issue: Only employee sees notification
**Cause:** Notification is sent to business owner only
**Fix:** Login as business owner to see the notification

---

## 8. Next Steps

1. ✅ **Backend Notification System**: COMPLETE & TESTED
2. 🔄 **Frontend Headers**: UPDATE auth-token usage
3. 🔄 **Notification Component**: CREATE UI component
4. 🔄 **Integration Testing**: TEST with real frontend
5. 🔄 **Real-time Updates**: OPTIONAL - Add WebSocket for live updates

---

## Questions?

- Backend is running on: `http://localhost:5000`
- All endpoints require `auth-token` header
- Test files are in `backend/` folder
- Documentation in root folder

**Status:** Ready for frontend integration! 🚀
