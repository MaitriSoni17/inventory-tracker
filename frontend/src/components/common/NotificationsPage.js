import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/notificationspage.css';

const NotificationsPage = (props) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const [selectedNotificationIds, setSelectedNotificationIds] = useState([]);

  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  // Get navigation path based on notification type and data
  const getNavigationPath = (notification) => {
    const { type, data } = notification;
    
    // Employee entity notifications (exclude *_by_employee activity notifications)
    if (type.startsWith('employee')) {
      const employeeId = data?.employeeId || data?.userId || notification?.sender;
      if (employeeId) {
        // Navigate to edit employee page for specific employee
        return `/dashboard/editemployee/${employeeId}`;
      }
      // Default to employees list
      return '/dashboard/employee';
    }
    
    // Product related notifications
    if (type.includes('product')) {
      const productId =
        data?.productId ||
        data?.updatedProductId ||
        data?.id ||
        data?._id ||
        data?.product?._id;

      if (productId) {
        // Navigate to edit product page for specific product
        return `/dashboard/editproduct/${productId}`;
      }
      // Default to products list
      return '/dashboard/products';
    }
    
    // Order related notifications (customer orders)
    if (type.includes('order') && !type.includes('supplier')) {
      if (data?.orderId) {
        // Navigate to edit order page for specific order
        return `/dashboard/editorder/${data.orderId}`;
      }
      // Default to orders list
      return '/dashboard/orders';
    }
    
    // Supplier order related notifications
    if (type.includes('supplier_order')) {
      if (data?.orderId) {
        // For suppliers, navigate to order detail
        if (userRole === 'supplier') {
          return `/dashboard/supplierorderdetail/${data.orderId}`;
        }
        // For business owners/employees, navigate to edit supplier order
        return `/dashboard/editsupplierorder/${data.orderId}`;
      }
      // Default to supplier orders list
      return userRole === 'supplier' ? '/dashboard/suppliersorders' : '/dashboard/suppliers';
    }
    
    // Category related notifications
    if (type.includes('category')) {
      // Navigate to categories page
      return '/dashboard/category';
    }
    
    // Supplier related notifications (not orders)
    if (type.includes('supplier') && !type.includes('order')) {
      const supplierId = data?.supplierId || data?.userId || notification?.sender;
      if (supplierId) {
        return `/dashboard/editsupplier/${supplierId}`;
      }
      return '/dashboard/suppliers';
    }
    
    // Chat/Message related notifications
    if (type === 'chat_message' || type === 'message' || type.includes('chat_permission')) {
      return '/dashboard/messages';
    }
    
    // Salary related notifications
    if (type.includes('salary')) {
      return '/dashboard/salary';
    }
    
    // Low stock alert
    if (type === 'product_low_stock_alert') {
      if (data?.productId) {
        return `/dashboard/editproduct/${data.productId}`;
      }
      return '/dashboard/products';
    }
    
    // Delivery alerts
    if (type === 'customer_order_delivery_alert') {
      if (data?.orderId) {
        return `/dashboard/editorder/${data.orderId}`;
      }
      return '/dashboard/orders';
    }
    
    if (type === 'supplier_order_delivery_alert' || type === 'supplier_order_supply_alert') {
      if (data?.orderId) {
        return userRole === 'supplier' 
          ? `/dashboard/supplierorderdetail/${data.orderId}`
          : `/dashboard/editsupplierorder/${data.orderId}`;
      }
      return userRole === 'supplier' ? '/dashboard/suppliersorders' : '/dashboard/suppliers';
    }
    
    // Default - go to dashboard
    return '/dashboard';
  };

  // Handle notification click - navigate to relevant content
  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
    
    // Get navigation path and navigate
    const path = getNavigationPath(notification);
    navigate(path);
  };

  // Check if notification has a navigable link
  const isNavigable = (notification) => {
    const { type } = notification;
    // List of notification types that have navigation
    const navigableTypes = [
      'employee_created', 'employee_updated', 'employee_deleted', 'employee_deactivated',
      'employee_login', 'employee_deletion_requested', 'employee_deletion_approved',
      'employee_deletion_rejected', 'employee_role_updated', 'employee_password_changed',
      'product_created', 'product_updated', 'product_deleted',
      'product_created_by_employee', 'product_updated_by_employee', 'product_deleted_by_employee',
      'order_created', 'order_updated', 'order_deleted',
      'order_created_by_employee', 'order_updated_by_employee', 'order_deleted_by_employee',
      'category_created', 'category_updated', 'category_deleted',
      'category_created_by_employee', 'category_updated_by_employee', 'category_deleted_by_employee',
      'supplier_order_created', 'supplier_order_updated', 'supplier_order_deleted',
      'supplier_order_created_by_employee', 'supplier_order_updated_by_employee', 
      'supplier_order_deleted_by_employee', 'supplier_order_status_updated',
      'supplier_order_payment_status_updated', 'supplier_deletion_requested',
      'supplier_deletion_approved', 'supplier_deletion_rejected', 'supplier_login',
      'supplier_password_changed',
      'chat_message', 'chat_permission_granted', 'chat_permission_revoked', 'message',
      'salary_due_alert', 'supplier_order_delivery_alert', 'product_low_stock_alert',
      'customer_order_delivery_alert', 'supplier_order_supply_alert'
    ];
    return navigableTypes.includes(type);
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/notifications/getnotifications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': token
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setSelectedNotificationIds((prev) => prev.filter((id) => data.some((n) => n._id === id)));
        fetchUnreadCount();
      }
    } catch (error) {
      props.showAlert?.('Error fetching notifications', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/notifications/unreadcount', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': token
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/notifications/markasread/${notificationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': token
        }
      });

      if (response.ok) {
        setNotifications(
          notifications.map((notif) =>
            notif._id === notificationId ? { ...notif, isRead: true } : notif
          )
        );
        setSelectedNotificationIds((prev) => prev.filter((id) => id !== notificationId));
        fetchUnreadCount();
      }
    } catch (error) {
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/notifications/markallasread', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': token
        }
      });

      if (response.ok) {
        setNotifications(
          notifications.map((notif) => ({ ...notif, isRead: true }))
        );
        setSelectedNotificationIds([]);
        setUnreadCount(0);
        props.showAlert?.('All notifications marked as read', 'success');
      }
    } catch (error) {
      props.showAlert?.('Error marking notifications as read', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/notifications/deletenotification/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': token
        }
      });

      if (response.ok) {
        setNotifications(
          notifications.filter((notif) => notif._id !== notificationId)
        );
        setSelectedNotificationIds((prev) => prev.filter((id) => id !== notificationId));
        fetchUnreadCount();
        props.showAlert?.('Notification deleted', 'success');
      }
    } catch (error) {
      props.showAlert?.('Error deleting notification', 'danger');
    }
  };

  // Delete all notifications
  const deleteAllNotifications = async () => {
    if (window.confirm('Are you sure you want to delete all notifications?')) {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5000/api/notifications/deleteallnotifications', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'auth-token': token
          }
        });

        if (response.ok) {
          setNotifications([]);
          setSelectedNotificationIds([]);
          setUnreadCount(0);
          props.showAlert?.('All notifications deleted', 'success');
        }
      } catch (error) {
        props.showAlert?.('Error deleting notifications', 'danger');
      } finally {
        setLoading(false);
      }
    }
  };

  // Get filtered notifications
  const getFilteredNotifications = () => {
    if (filter === 'unread') {
      return notifications.filter(n => !n.isRead);
    } else if (filter === 'read') {
      return notifications.filter(n => n.isRead);
    }
    return notifications;
  };

  const toggleNotificationSelection = (notificationId) => {
    setSelectedNotificationIds((prev) =>
      prev.includes(notificationId)
        ? prev.filter((id) => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const clearSelection = () => {
    setSelectedNotificationIds([]);
  };

  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredNotifications.map((n) => n._id);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedNotificationIds.includes(id));

    if (allSelected) {
      setSelectedNotificationIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedNotificationIds((prev) => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const bulkMarkSelectedAsRead = async () => {
    if (selectedNotificationIds.length === 0) {
      props.showAlert?.('Please select notifications first', 'warning');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/notifications/bulk/markasread', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': token
        },
        body: JSON.stringify({ notificationIds: selectedNotificationIds })
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notif) =>
            selectedNotificationIds.includes(notif._id) ? { ...notif, isRead: true } : notif
          )
        );
        setSelectedNotificationIds([]);
        fetchUnreadCount();
        props.showAlert?.('Selected notifications marked as read', 'success');
      } else {
        props.showAlert?.('Failed to mark selected notifications', 'danger');
      }
    } catch (error) {
      props.showAlert?.('Error marking selected notifications', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const bulkDeleteSelected = async () => {
    if (selectedNotificationIds.length === 0) {
      props.showAlert?.('Please select notifications first', 'warning');
      return;
    }

    if (!window.confirm(`Delete ${selectedNotificationIds.length} selected notification(s)?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/notifications/bulk/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': token
        },
        body: JSON.stringify({ notificationIds: selectedNotificationIds })
      });

      if (response.ok) {
        setNotifications((prev) => prev.filter((notif) => !selectedNotificationIds.includes(notif._id)));
        setSelectedNotificationIds([]);
        fetchUnreadCount();
        props.showAlert?.('Selected notifications deleted', 'success');
      } else {
        props.showAlert?.('Failed to delete selected notifications', 'danger');
      }
    } catch (error) {
      props.showAlert?.('Error deleting selected notifications', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    const icons = {
      employee_created: 'bi-person-plus-fill',
      employee_updated: 'bi-person-check-fill',
      employee_deleted: 'bi-person-x-fill',
      employee_deactivated: 'bi-person-slash',
      employee_password_changed: 'bi-key-fill',
      product_created: 'bi-box-fill',
      product_updated: 'bi-box-seam',
      product_deleted: 'bi-box-slash',
      order_created: 'bi-clipboard-check-fill',
      order_updated: 'bi-clipboard-check',
      order_deleted: 'bi-clipboard-x',
      category_created: 'bi-tag-fill',
      category_updated: 'bi-tag',
      category_deleted: 'bi-tag-slash',
      supplier_password_changed: 'bi-key-fill',
      message: 'bi-chat-left-text-fill'
    };
    return icons[type] || 'bi-bell-fill';
  };

  // Get notification badge color
  const getNotificationBadge = (type) => {
    if (type.includes('employee')) return 'badge-employee';
    if (type.includes('product')) return 'badge-product';
    if (type.includes('order')) return 'badge-order';
    if (type.includes('category')) return 'badge-category';
    if (type === 'message') return 'badge-message';
    return 'badge-default';
  };

  // Format time
  const formatTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return notifDate.toLocaleDateString();
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredNotifications = getFilteredNotifications();
  const selectedCount = selectedNotificationIds.length;
  const filteredNotificationIds = filteredNotifications.map((notification) => notification._id);
  const isAllFilteredSelected =
    filteredNotificationIds.length > 0 &&
    filteredNotificationIds.every((id) => selectedNotificationIds.includes(id));

  return (
    <div className="notifications-page">
      {/* Header */}
      <div className="notifications-header-section">
        <div className="notifications-header-top">
          <h1 className="notifications-title">
            <i className="bi bi-bell-fill"></i> Notifications
          </h1>
          <button 
            className="btn-back"
            onClick={() => navigate('/dashboard')}
            title="Back to Dashboard"
          >
            <i className="bi bi-arrow-left"></i> Back
          </button>
        </div>

        {/* Filter and Action Buttons */}
        <div className="notifications-toolbar">
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </button>
            <button 
              className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
            <button 
              className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
              onClick={() => setFilter('read')}
            >
              Read ({notifications.length - unreadCount})
            </button>
          </div>

          <div className="action-buttons">
            {unreadCount > 0 && (
              <button 
                className="action-btn mark-read"
                onClick={markAllAsRead}
                disabled={loading}
              >
                <i className="bi bi-check-all"></i> Mark All as Read
              </button>
            )}
            {notifications.length > 0 && (
              <button 
                className="action-btn delete-all"
                onClick={deleteAllNotifications}
                disabled={loading}
              >
                <i className="bi bi-trash"></i> Clear All
              </button>
            )}
          </div>
        </div>

        {notifications.length > 0 && (
          <div className="bulk-operations-section">
            <div className="bulk-left">
              <label className="bulk-select-all">
                <input
                  type="checkbox"
                  checked={isAllFilteredSelected}
                  onChange={toggleSelectAllFiltered}
                  disabled={loading || filteredNotifications.length === 0}
                />
                <span>Select all in current filter</span>
              </label>
              {selectedCount > 0 && (
                <span className="bulk-selected-count">{selectedCount} selected</span>
              )}
            </div>

            <div className="bulk-actions">
              <button
                className="action-btn mark-read"
                onClick={bulkMarkSelectedAsRead}
                disabled={loading || selectedCount === 0}
              >
                <i className="bi bi-check2-square"></i> Mark Selected Read
              </button>
              <button
                className="action-btn delete-all"
                onClick={bulkDeleteSelected}
                disabled={loading || selectedCount === 0}
              >
                <i className="bi bi-trash3"></i> Delete Selected
              </button>
              {selectedCount > 0 && (
                <button className="action-btn" onClick={clearSelection} disabled={loading}>
                  <i className="bi bi-x-circle"></i> Clear Selection
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="notifications-main">
        {loading && notifications.length === 0 ? (
          <div className="notifications-loading">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notifications-empty">
            <i className="bi bi-inbox"></i>
            <h3>No Notifications</h3>
            <p>
              {filter === 'unread' ? 'You\'re all caught up!' : 'No notifications to display'}
            </p>
          </div>
        ) : (
          <div className="notifications-container">
            {filteredNotifications.map((notification) => (
              <div
                key={notification._id}
                className={`notification-card ${!notification.isRead ? 'unread' : ''} ${isNavigable(notification) ? 'clickable' : ''}`}
              >
                <div className="notification-select">
                  <input
                    type="checkbox"
                    checked={selectedNotificationIds.includes(notification._id)}
                    onChange={() => toggleNotificationSelection(notification._id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Select notification"
                  />
                </div>
                <div 
                  className="notification-clickable-area"
                  onClick={() => isNavigable(notification) && handleNotificationClick(notification)}
                  title={isNavigable(notification) ? "Click to view details" : ""}
                >
                  <div className="notification-icon-wrapper">
                    <div className={`notification-icon ${getNotificationBadge(notification.type)}`}>
                      <i className={`bi ${getNotificationIcon(notification.type)}`}></i>
                    </div>
                  </div>

                  <div className="notification-body">
                    <div className="notification-header">
                      <h5 className="notification-title">
                        {notification.title}
                        {isNavigable(notification) && (
                          <i className="bi bi-box-arrow-up-right navigate-icon" title="Click to view"></i>
                        )}
                      </h5>
                      <span className="notification-time">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>
                    
                    <p className="notification-message">{notification.message}</p>
                    
                    {notification.data && Object.keys(notification.data).length > 0 && (
                      <div className="notification-data">
                        {Object.entries(notification.data)
                          .filter(([key]) => !key.toLowerCase().includes('id')) // Hide ID fields
                          .map(([key, value]) => (
                            <span key={key} className="data-item">
                              <strong>{key}:</strong> {String(value)}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="notification-actions">
                  {!notification.isRead && (
                    <button
                      className="action-icon mark"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification._id);
                      }}
                      title="Mark as read"
                    >
                      <i className="bi bi-check-circle"></i>
                    </button>
                  )}
                  <button
                    className="action-icon delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification._id);
                    }}
                    title="Delete"
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;


