import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/chatnotifications.css';

const ChatNotifications = () => {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);
    const token = localStorage.getItem('token');

    // Fetch unread message count
    const fetchUnreadCount = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/chat/unreadcount', {
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
            // Silently fail - chat might not be set up yet
        }
    };

    useEffect(() => {
        if (token) {
            fetchUnreadCount();
            // Poll for new messages every 15 seconds
            const interval = setInterval(() => {
                fetchUnreadCount();
            }, 15000);

            return () => clearInterval(interval);
        }
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleChatClick = () => {
        navigate('/dashboard/chat');
    };

    return (
        <button
            className="chat-bell-icon"
            onClick={handleChatClick}
            title="View Messages"
        >
            <i className="bi bi-chat-dots-fill"></i>
            {unreadCount > 0 && (
                <span className="chat-badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </button>
    );
};

export default ChatNotifications;
