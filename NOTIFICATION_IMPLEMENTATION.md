# Notification System - Complete Implementation Examples

## ✅ Quick Start

The notification system is **production-ready**. When an employee updates any order, the business owner automatically receives a notification.

---

## Example 1: Update Order with Notifications

### Frontend Code (React)

```javascript
// In your Order Update component

import React, { useState } from 'react';

function UpdateOrderForm({ orderId, token, onNotification }) {
  const [formData, setFormData] = useState({
    deliveryStatus: '',
    productStatus: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:5000/api/orders/updateorder/${orderId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'auth-token': token  // ← IMPORTANT: Use auth-token, not Authorization
          },
          body: JSON.stringify(formData)
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update order');
      }

      const data = await response.json();
      console.log('Order updated successfully:', data.order);
      
      // Notify parent component
      if (onNotification) {
        onNotification('Order updated! Business owner has been notified.');
      }

      // Clear form
      setFormData({ deliveryStatus: '', productStatus: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Delivery Status</label>
        <select
          name="deliveryStatus"
          value={formData.deliveryStatus}
          onChange={handleInputChange}
        >
          <option value="">Select Status</option>
          <option value="Not Shipped">Not Shipped</option>
          <option value="Shipped">Shipped</option>
          <option value="In Transit">In Transit</option>
          <option value="Delivered">Delivered</option>
        </select>
      </div>

      <div className="form-group">
        <label>Product Status</label>
        <select
          name="productStatus"
          value={formData.productStatus}
          onChange={handleInputChange}
        >
          <option value="">Select Status</option>
          <option value="Pending">Pending</option>
          <option value="Processing">Processing</option>
          <option value="Ready">Ready</option>
        </select>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Updating...' : 'Update Order'}
      </button>

      {error && <div className="error-message">{error}</div>}
    </form>
  );
}

export default UpdateOrderForm;
```

---

## Example 2: Notification Display Component

```javascript
// src/components/NotificationPanel.js

import React, { useEffect, useState } from 'react';
import './NotificationPanel.css';

function NotificationPanel({ token, userRole }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch notifications when component mounts and every 10 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchNotifications = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(
        'http://localhost:5000/api/notifications/getnotifications',
        {
          headers: {
            'auth-token': token  // ← IMPORTANT: Use auth-token
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      setNotifications(data || []);

      // Count unread notifications
      const unread = data.filter(n => !n.isRead).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/notifications/markasread/${notificationId}`,
        {
          method: 'PUT',
          headers: {
            'auth-token': token
          }
        }
      );

      if (response.ok) {
        // Update local state
        setNotifications(prev =>
          prev.map(n =>
            n._id === notificationId ? { ...n, isRead: true } : n
          )
        );
        fetchNotifications(); // Refresh count
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/notifications/deletenotification/${notificationId}`,
        {
          method: 'DELETE',
          headers: {
            'auth-token': token
          }
        }
      );

      if (response.ok) {
        setNotifications(prev =>
          prev.filter(n => n._id !== notificationId)
        );
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'order_updated_by_employee': '📦',
      'order_created_by_employee': '📝',
      'order_deleted_by_employee': '🗑️',
      'product_created': '🆕',
      'product_updated': '✏️',
      'employee_created': '👤',
      'employee_updated': '👤'
    };
    return icons[type] || '🔔';
  };

  return (
    <div className="notification-panel">
      {/* Bell icon with unread count */}
      <button 
        className="notification-bell"
        onClick={() => setShowPanel(!showPanel)}
      >
        🔔
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount}</span>
        )}
      </button>

      {/* Dropdown panel */}
      {showPanel && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <button 
              className="close-btn"
              onClick={() => setShowPanel(false)}
            >
              ✕
            </button>
          </div>

          {loading && <div className="loading">Loading...</div>}

          {notifications.length === 0 ? (
            <div className="no-notifications">
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map(notif => (
                <div
                  key={notif._id}
                  className={`notification-item ${notif.isRead ? 'read' : 'unread'}`}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="notification-content">
                    <h4 className="notification-title">
                      {notif.title}
                    </h4>
                    <p className="notification-message">
                      {notif.message}
                    </p>
                    <small className="notification-time">
                      {new Date(notif.createdAt).toLocaleString()}
                    </small>
                  </div>

                  <div className="notification-actions">
                    {!notif.isRead && (
                      <button
                        className="mark-read-btn"
                        onClick={() => handleMarkAsRead(notif._id)}
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteNotification(notif._id)}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationPanel;
```

### CSS for Notification Panel

```css
/* NotificationPanel.css */

.notification-panel {
  position: relative;
}

.notification-bell {
  position: relative;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 8px;
}

.unread-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: #ff4444;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.notification-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 350px;
  max-height: 500px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  margin-top: 8px;
  overflow-y: auto;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #eee;
  background: #f9f9f9;
}

.notification-header h3 {
  margin: 0;
  font-size: 16px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
}

.notification-list {
  max-height: 400px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid #eee;
  transition: background-color 0.2s;
}

.notification-item:hover {
  background-color: #f5f5f5;
}

.notification-item.unread {
  background-color: #f0f7ff;
}

.notification-icon {
  font-size: 20px;
  min-width: 30px;
  text-align: center;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.notification-message {
  margin: 0 0 4px 0;
  font-size: 13px;
  color: #666;
  word-wrap: break-word;
}

.notification-time {
  font-size: 11px;
  color: #999;
}

.notification-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.mark-read-btn,
.delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.mark-read-btn:hover {
  background-color: #ddd;
}

.delete-btn:hover {
  background-color: #ffcccc;
}

.no-notifications {
  padding: 24px 12px;
  text-align: center;
  color: #999;
  font-size: 13px;
}

.loading {
  padding: 24px 12px;
  text-align: center;
  color: #999;
  font-size: 13px;
}
```

---

## Example 3: Integration in Main App

```javascript
// App.js

import React, { useState, useEffect } from 'react';
import NotificationPanel from './components/NotificationPanel';
import UpdateOrderForm from './components/UpdateOrderForm';

function App() {
  const [token, setToken] = useState(localStorage.getItem('authtoken'));
  const [userRole, setUserRole] = useState(localStorage.getItem('role'));
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Listen for auth changes
    const handleStorageChange = () => {
      setToken(localStorage.getItem('authtoken'));
      setUserRole(localStorage.getItem('role'));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div className="app">
      {/* Header with notification bell */}
      <header className="app-header">
        <h1>Inventory Tracker</h1>
        {token && (
          <NotificationPanel token={token} userRole={userRole} />
        )}
      </header>

      {/* Main content */}
      <main className="app-main">
        {message && <div className="success-message">{message}</div>}
        
        {userRole === 'employee' && (
          <UpdateOrderForm
            orderId="6943f2816595e355f0a93d8f"
            token={token}
            onNotification={(msg) => {
              setMessage(msg);
              setTimeout(() => setMessage(''), 3000);
            }}
          />
        )}
      </main>
    </div>
  );
}

export default App;
```

---

## Testing the Complete Flow

### Step-by-Step Test:

1. **Login as Employee**
   ```
   Email: rudra@gmail.com
   (Use your app's login)
   ```

2. **Update an Order**
   - Click "Update Order"
   - Change delivery status to "In Transit"
   - Click Submit

3. **Verify Notification Created**
   - Backend logs should show: `✓ Notification sent successfully`

4. **Login as Business Owner**
   ```
   Email: maitri@gmail.com
   (Use your app's login)
   ```

5. **Check Notification Panel**
   - Click the bell icon 🔔
   - Should see the order update notification
   - Unread count should show

---

## Troubleshooting

### Notifications not appearing?

Check:
1. ✅ Using `auth-token` header (not `Authorization`)
2. ✅ Token is valid (not expired)
3. ✅ User is logged in as Business Owner
4. ✅ Order was updated (check success response)
5. ✅ Browser console for any errors

### Getting 401 Unauthorized?

**Fix:** Ensure auth-token header is set:
```javascript
headers: {
  'auth-token': token  // NOT 'Authorization': 'Bearer ' + token
}
```

---

## What's Ready

✅ Backend notification system - FULLY WORKING
✅ Order update with auto-notifications - TESTED
✅ Database storage - CONFIRMED
✅ Multiple notification types - CONFIGURED

## What's Next

🔄 Copy notification components to your frontend
🔄 Update API calls to use auth-token header
🔄 Test with actual user interactions
🔄 Consider WebSocket for real-time updates (optional)

**Everything is ready to integrate! 🚀**
