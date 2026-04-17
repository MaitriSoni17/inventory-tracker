import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/notifications.css';
import { apiCall, parseResponse } from '../../utils/apiClient';
import useNotificationRefresh from '../../hooks/useNotificationRefresh';

const Notifications = () => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const response = await apiCall('/api/notifications/unreadcount', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.isNetworkError) {
        setUnreadCount(0);
        return;
      }

      if (response.isUnauthorized || response.isDeactivated) {
        setUnreadCount(0);
        if (response.shouldRedirect && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return;
      }

      if (response.ok) {
        const data = await parseResponse(response);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
    }
  };

  useNotificationRefresh(fetchUnreadCount, { intervalMs: 10000 });

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


