import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './notifications.css';

const Notifications = () => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const token = localStorage.getItem('token');

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

  useEffect(() => {
    fetchUnreadCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNotificationClick = () => {
    navigate('/dashboard/notifications');
  };

  return (
    <button
      className="notifications-bell-icon"
      onClick={handleNotificationClick}
      title="View Notifications"
    >
      <i className="bi bi-bell-fill"></i>
      {unreadCount > 0 && (
        <span className="notification-badge">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default Notifications;


