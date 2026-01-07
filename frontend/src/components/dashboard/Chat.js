import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/chat.css';

const Chat = (props) => {
    const navigate = useNavigate();
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [mobileShowChat, setMobileShowChat] = useState(false);
    const messagesEndRef = useRef(null);
    const messageInputRef = useRef(null);
    const selectedContactRef = useRef(null);
    
    const token = localStorage.getItem('token');
    const currentRole = localStorage.getItem('role');
    const isBusinessOwner = currentRole === 'businessowner';

    // Keep ref in sync with state for use in interval
    useEffect(() => {
        selectedContactRef.current = selectedContact;
    }, [selectedContact]);

    // Scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Fetch contacts (silent mode for polling)
    const fetchContacts = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const response = await fetch('http://localhost:5000/api/chat/contacts', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token
                }
            });

            if (response.ok) {
                const data = await response.json();
                setContacts(data.contacts);
            }
        } catch (error) {
            console.error('Error fetching contacts:', error);
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [token]);

    // Fetch conversation with selected contact (silent mode for polling)
    const fetchConversation = useCallback(async (contactId, showLoading = true) => {
        if (!contactId) return;
        try {
            if (showLoading) setLoadingMessages(true);
            const response = await fetch(`http://localhost:5000/api/chat/conversation/${contactId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token
                }
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages);
                // Update contact's unread count to 0
                setContacts(prev => prev.map(c => 
                    c._id === contactId ? { ...c, unreadCount: 0 } : c
                ));
            }
        } catch (error) {
            console.error('Error fetching conversation:', error);
        } finally {
            if (showLoading) setLoadingMessages(false);
        }
    }, [token]);

    // Initial fetch and polling setup
    useEffect(() => {
        fetchContacts(true);
        
        // Poll for new messages every 10 seconds (silent refresh)
        const interval = setInterval(() => {
            fetchContacts(false);
            if (selectedContactRef.current) {
                fetchConversation(selectedContactRef.current._id, false);
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [fetchContacts, fetchConversation]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch conversation when contact is selected
    useEffect(() => {
        if (selectedContact) {
            fetchConversation(selectedContact._id, true);
            messageInputRef.current?.focus();
        }
    }, [selectedContact?._id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Handle contact selection
    const handleContactSelect = (contact) => {
        setSelectedContact(contact);
        setMobileShowChat(true);
    };

    // Handle sending message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        
        if (!newMessage.trim() || !selectedContact || sending) return;

        try {
            setSending(true);
            const response = await fetch('http://localhost:5000/api/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token
                },
                body: JSON.stringify({
                    recipientId: selectedContact._id,
                    message: newMessage.trim()
                })
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(prev => [...prev, data.message]);
                setNewMessage('');
                // Update contact's last message
                setContacts(prev => prev.map(c => 
                    c._id === selectedContact._id 
                        ? { 
                            ...c, 
                            lastMessage: { 
                                message: data.message.message, 
                                createdAt: data.message.createdAt,
                                isFromMe: true 
                            } 
                        } 
                        : c
                ));
            } else {
                const errorData = await response.json();
                props.showAlert?.(errorData.error || 'Error sending message', 'danger');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            props.showAlert?.('Error sending message', 'danger');
        } finally {
            setSending(false);
        }
    };

    // Handle back button in mobile view
    const handleBackToContacts = () => {
        setMobileShowChat(false);
    };

    // Format timestamp
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        // If less than 24 hours, show time
        if (diff < 24 * 60 * 60 * 1000) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        // If less than 7 days, show day name
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            return date.toLocaleDateString([], { weekday: 'short' });
        }
        // Otherwise show date
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    // Format message timestamp
    const formatMessageTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Get role badge color
    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'BusinessOwner': return 'badge-owner';
            case 'Employee': return 'badge-employee';
            case 'Supplier': return 'badge-supplier';
            default: return 'badge-default';
        }
    };

    // Filter contacts by search term
    const filteredContacts = contacts.filter(contact => 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate total unread messages
    const totalUnread = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

    return (
        <div className="chat-page">
            {/* Header */}
            <div className="chat-header-section">
                <div className="chat-header-top">
                    <h1 className="chat-title">
                        <i className="bi bi-chat-dots-fill"></i>
                        Messages
                        {totalUnread > 0 && (
                            <span className="total-unread-badge">{totalUnread}</span>
                        )}
                    </h1>
                    <div className="chat-header-actions">
                        {isBusinessOwner && (
                            <button 
                                className="btn-manage-permissions"
                                onClick={() => navigate('/dashboard/chatpermissions')}
                            >
                                <i className="bi bi-shield-lock me-2"></i>
                                Manage Permissions
                            </button>
                        )}
                        <button className="btn-back" onClick={() => navigate('/dashboard')}>
                            <i className="bi bi-arrow-left me-2"></i>
                            Back
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="chat-main">
                {loading ? (
                    <div className="chat-loading">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p>Loading contacts...</p>
                    </div>
                ) : contacts.length === 0 ? (
                    <div className="chat-empty">
                        <i className="bi bi-chat-square-text"></i>
                        <h3>No Contacts Available</h3>
                        <p>
                            {isBusinessOwner 
                                ? "Set up chat permissions to enable messaging between users."
                                : "You don't have permission to chat with anyone yet. Please contact your business owner."
                            }
                        </p>
                        {isBusinessOwner && (
                            <button 
                                className="btn-primary-action"
                                onClick={() => navigate('/dashboard/chatpermissions')}
                            >
                                <i className="bi bi-shield-lock me-2"></i>
                                Set Up Permissions
                            </button>
                        )}
                    </div>
                ) : (
                    <div className={`chat-container ${mobileShowChat ? 'mobile-show-chat' : ''}`}>
                        {/* Contacts Sidebar */}
                        <div className="chat-sidebar">
                            <div className="chat-search">
                                <i className="bi bi-search"></i>
                                <input
                                    type="text"
                                    placeholder="Search contacts..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="contacts-list">
                                {filteredContacts.length === 0 ? (
                                    <div className="no-contacts-found">
                                        <p>No contacts found</p>
                                    </div>
                                ) : (
                                    filteredContacts.map(contact => (
                                        <div
                                            key={contact._id}
                                            className={`contact-item ${selectedContact?._id === contact._id ? 'active' : ''} ${contact.unreadCount > 0 ? 'has-unread' : ''}`}
                                            onClick={() => handleContactSelect(contact)}
                                        >
                                            <div className="contact-avatar">
                                                <i className="bi bi-person-circle"></i>
                                            </div>
                                            <div className="contact-info">
                                                <div className="contact-header">
                                                    <span className="contact-name">{contact.name}</span>
                                                    {contact.lastMessage && (
                                                        <span className="contact-time">
                                                            {formatTime(contact.lastMessage.createdAt)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="contact-details">
                                                    <span className={`contact-role-badge ${getRoleBadgeClass(contact.role)}`}>
                                                        {contact.role}
                                                    </span>
                                                    {contact.lastMessage && (
                                                        <span className="contact-preview">
                                                            {contact.lastMessage.isFromMe && <i className="bi bi-check2 me-1"></i>}
                                                            {contact.lastMessage.message.substring(0, 30)}
                                                            {contact.lastMessage.message.length > 30 && '...'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {contact.unreadCount > 0 && (
                                                <span className="unread-badge">{contact.unreadCount}</span>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Chat Window */}
                        <div className="chat-window">
                            {selectedContact ? (
                                <>
                                    {/* Chat Header */}
                                    <div className="chat-window-header">
                                        <button 
                                            className="btn-back-mobile"
                                            onClick={handleBackToContacts}
                                        >
                                            <i className="bi bi-arrow-left"></i>
                                        </button>
                                        <div className="chat-contact-info">
                                            <div className="chat-contact-avatar">
                                                <i className="bi bi-person-circle"></i>
                                            </div>
                                            <div>
                                                <h4>{selectedContact.name}</h4>
                                                <span className={`role-badge ${getRoleBadgeClass(selectedContact.role)}`}>
                                                    {selectedContact.role}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Messages Area */}
                                    <div className="messages-area">
                                        {loadingMessages ? (
                                            <div className="messages-loading">
                                                <div className="spinner-border spinner-border-sm text-primary" role="status">
                                                    <span className="visually-hidden">Loading...</span>
                                                </div>
                                            </div>
                                        ) : messages.length === 0 ? (
                                            <div className="no-messages">
                                                <i className="bi bi-chat-square-text"></i>
                                                <p>No messages yet. Start the conversation!</p>
                                            </div>
                                        ) : (
                                            messages.map((msg, index) => {
                                                const isFromMe = msg.sender !== selectedContact._id;
                                                const showDate = index === 0 || 
                                                    new Date(msg.createdAt).toDateString() !== 
                                                    new Date(messages[index - 1].createdAt).toDateString();
                                                
                                                return (
                                                    <React.Fragment key={msg._id}>
                                                        {showDate && (
                                                            <div className="message-date-divider">
                                                                <span>{new Date(msg.createdAt).toLocaleDateString([], { 
                                                                    weekday: 'long', 
                                                                    month: 'short', 
                                                                    day: 'numeric' 
                                                                })}</span>
                                                            </div>
                                                        )}
                                                        <div className={`message ${isFromMe ? 'sent' : 'received'}`}>
                                                            <div className="message-bubble">
                                                                <p>{msg.message}</p>
                                                                <span className="message-time">
                                                                    {formatMessageTime(msg.createdAt)}
                                                                    {isFromMe && (
                                                                        <i className={`bi ${msg.isRead ? 'bi-check2-all read' : 'bi-check2'} ms-1`}></i>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </React.Fragment>
                                                );
                                            })
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Message Input */}
                                    <form className="message-input-form" onSubmit={handleSendMessage}>
                                        <input
                                            ref={messageInputRef}
                                            type="text"
                                            placeholder="Type a message..."
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            disabled={sending}
                                        />
                                        <button 
                                            type="submit" 
                                            disabled={!newMessage.trim() || sending}
                                            className="btn-send"
                                        >
                                            {sending ? (
                                                <span className="spinner-border spinner-border-sm" role="status"></span>
                                            ) : (
                                                <i className="bi bi-send-fill"></i>
                                            )}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <div className="no-chat-selected">
                                    <i className="bi bi-chat-dots"></i>
                                    <h3>Select a conversation</h3>
                                    <p>Choose a contact from the list to start messaging</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chat;
