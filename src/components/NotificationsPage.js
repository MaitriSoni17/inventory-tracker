import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './styles/notificationspage.css';

const NotificationsPage = (props) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  const token = localStorage.getItem('token');

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
        fetchUnreadCount();
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
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
      console.error('Error fetching unread count:', error);
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
        fetchUnreadCount();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
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
        setUnreadCount(0);
        props.showAlert?.('All notifications marked as read', 'success');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
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
        fetchUnreadCount();
        props.showAlert?.('Notification deleted', 'success');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
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
          setUnreadCount(0);
          props.showAlert?.('All notifications deleted', 'success');
        }
      } catch (error) {
        console.error('Error deleting all notifications:', error);
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

  // Get notification icon
  const getNotificationIcon = (type) => {
    const icons = {
      employee_created: 'bi-person-plus-fill',
      employee_updated: 'bi-person-check-fill',
      employee_deleted: 'bi-person-x-fill',
      employee_deactivated: 'bi-person-slash',
      product_created: 'bi-box-fill',
      product_updated: 'bi-box-seam',
      product_deleted: 'bi-box-slash',
      order_created: 'bi-clipboard-check-fill',
      order_updated: 'bi-clipboard-check',
      order_deleted: 'bi-clipboard-x',
      category_created: 'bi-tag-fill',
      category_updated: 'bi-tag',
      category_deleted: 'bi-tag-slash'
    };
    return icons[type] || 'bi-bell-fill';
  };

  // Get notification badge color
  const getNotificationBadge = (type) => {
    if (type.includes('employee')) return 'badge-employee';
    if (type.includes('product')) return 'badge-product';
    if (type.includes('order')) return 'badge-order';
    if (type.includes('category')) return 'badge-category';
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
                className="action-btn mark-read w-75 me-3"
                onClick={markAllAsRead}
                disabled={loading}
              >
                <i className="bi bi-check-all"></i> Mark All as Read
              </button>
            )}
            {notifications.length > 0 && (
              <button 
                className="action-btn delete-all w-75"
                onClick={deleteAllNotifications}
                disabled={loading}
              >
                <i className="bi bi-trash"></i> Clear All
              </button>
            )}
          </div>
        </div>
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
                className={`notification-card ${!notification.isRead ? 'unread' : ''}`}
              >
                <div className="notification-icon-wrapper">
                  <div className={`notification-icon ${getNotificationBadge(notification.type)}`}>
                    <i className={`bi ${getNotificationIcon(notification.type)}`}></i>
                  </div>
                </div>

                <div className="notification-body">
                  <div className="notification-header">
                    <h5 className="notification-title">{notification.title}</h5>
                    <span className="notification-time">
                      {formatTime(notification.createdAt)}
                    </span>
                  </div>
                  
                  <p className="notification-message">{notification.message}</p>
                  
                  {notification.data && Object.keys(notification.data).length > 0 && (
                    <div className="notification-data">
                      {Object.entries(notification.data).map(([key, value]) => (
                        <span key={key} className="data-item">
                          <strong>{key}:</strong> {String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="notification-actions">
                  {!notification.isRead && (
                    <button
                      className="action-icon mark"
                      onClick={() => markAsRead(notification._id)}
                      title="Mark as read"
                    >
                      <i className="bi bi-check-circle"></i>
                    </button>
                  )}
                  <button
                    className="action-icon delete"
                    onClick={() => deleteNotification(notification._id)}
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
