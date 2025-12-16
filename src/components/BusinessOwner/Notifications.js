import React, { useEffect, useState } from 'react';
import '../styles/notifications.css';

const Notifications = (props) => {
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
    
    // Auto-refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setRefreshing(true);
      const headers = {
        'Content-Type': 'application/json',
        'auth-token': localStorage.getItem('token')
      };
      
      const res = await fetch('http://localhost:5000/api/businessowner/notifications', { 
        method: 'GET',
        headers 
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await res.json();
      
      // Convert timestamp strings to Date objects if needed
      const processedData = data.map(notif => ({
        ...notif,
        timestamp: typeof notif.timestamp === 'string' ? new Date(notif.timestamp) : notif.timestamp
      }));
      
      setNotifications(processedData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      props.showAlert?.('Error loading notifications', 'danger');
      
      // Fall back to empty state instead of mock data
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await fetchNotifications();
    props.showAlert?.('Notifications refreshed', 'success');
  };

  const handleMarkAsRead = (id) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: !notif.read } : notif
      )
    );
    props.showAlert?.('Notification updated', 'success');
  };

  const handleDeleteNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
    props.showAlert?.('Notification deleted', 'success');
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    props.showAlert?.('All notifications marked as read', 'success');
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all notifications?')) {
      setNotifications([]);
      props.showAlert?.('All notifications cleared', 'success');
    }
  };

  // Filter notifications based on tab and search
  const getFilteredNotifications = () => {
    let filtered = notifications;

    // Filter by type
    if (activeTab !== 'all') {
      filtered = filtered.filter(n => n.type === activeTab);
    }

    // Filter by read status
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (filter === 'read') {
      filtered = filtered.filter(n => n.read);
    }

    // Search
    if (searchTerm) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.employeeName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    if (sortBy === 'newest') {
      filtered.sort((a, b) => b.timestamp - a.timestamp);
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => a.timestamp - b.timestamp);
    } else if (sortBy === 'priority') {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }

    return filtered;
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type, icon) => {
    return icon;
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="notifications-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="notifications-container">
      {/* Header */}
      <div className="notifications-header">
        <div className="header-content">
          <h1 className="notifications-title">Notifications</h1>
          <p className="notifications-subtitle">Stay updated with important events</p>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-label">Total</span>
            <span className="stat-value">{notifications.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Unread</span>
            <span className="stat-value unread-badge">{unreadCount}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="notifications-controls">
        <div className="search-bar">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="control-buttons">
          <button 
            className="btn-action" 
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh notifications"
          >
            <i className={`bi ${refreshing ? 'bi-arrow-clockwise' : 'bi-arrow-repeat'}`}></i> 
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="priority">By Priority</option>
          </select>

          {unreadCount > 0 && (
            <button className="btn-action mark-read" onClick={handleMarkAllAsRead}>
              <i className="bi bi-check2-all"></i> Mark All Read
            </button>
          )}

          {notifications.length > 0 && (
            <button className="btn-action clear-all" onClick={handleClearAll}>
              <i className="bi bi-trash"></i> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="notifications-tabs">
        <button
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <i className="bi bi-bell-fill"></i>
          All
        </button>
        <button
          className={`tab-btn ${activeTab === 'low_stock' ? 'active' : ''}`}
          onClick={() => setActiveTab('low_stock')}
        >
          <i className="bi bi-exclamation-triangle-fill"></i>
          Low Stock
        </button>
        <button
          className={`tab-btn ${activeTab === 'product_update' ? 'active' : ''}`}
          onClick={() => setActiveTab('product_update')}
        >
          <i className="bi bi-pencil-square"></i>
          Products
        </button>
        <button
          className={`tab-btn ${activeTab === 'order_update' ? 'active' : ''}`}
          onClick={() => setActiveTab('order_update')}
        >
          <i className="bi bi-box-seam"></i>
          Orders
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
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
          Read ({notifications.filter(n => n.read).length})
        </button>
      </div>

      {/* Notifications List */}
      <div className="notifications-list">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map(notification => (
            <div
              key={notification.id}
              className={`notification-card ${notification.read ? 'read' : 'unread'}`}
            >
              <div className="notification-icon-container">
                <div className={`notification-icon ${notification.color}`}>
                  <i className={`bi ${getNotificationIcon(notification.type, notification.icon)}`}></i>
                </div>
              </div>

              <div className="notification-content">
                <div className="notification-header">
                  <h3 className="notification-title">{notification.title}</h3>
                  <span className={`priority-badge ${notification.priority}`}>
                    {notification.priority}
                  </span>
                </div>
                <p className="notification-message">{notification.message}</p>
                <p className="notification-details">{notification.details}</p>
                <span className="notification-time">
                  <i className="bi bi-clock"></i> {formatTime(notification.timestamp)}
                </span>
              </div>

              <div className="notification-actions">
                <button
                  className={`action-btn ${notification.read ? 'mark-unread' : 'mark-read'}`}
                  onClick={() => handleMarkAsRead(notification.id)}
                  title={notification.read ? 'Mark as unread' : 'Mark as read'}
                >
                  <i className={`bi ${notification.read ? 'bi-envelope' : 'bi-envelope-open'}`}></i>
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => handleDeleteNotification(notification.id)}
                  title="Delete notification"
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>

              {!notification.read && <div className="unread-indicator"></div>}
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="bi bi-bell-slash"></i>
            </div>
            <h3>No Notifications</h3>
            <p>You're all caught up! Check back later for updates.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;