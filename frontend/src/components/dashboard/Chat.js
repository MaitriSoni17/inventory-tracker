import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/chat.css';

// Modern color palette
const COLORS = {
    background: '#f4f6fb',
    card: '#fff',
    border: '#e5e7eb',
    primary: '#7c3aed',
    primaryLight: '#ede9fe',
    sent: '#7c3aed',
    received: '#f3f4f6',
    text: '#22223b',
    muted: '#6b7280',
};

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
        setSelectedContact(null);
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

    return (
        <div className="chat-modern-root" style={{ background: COLORS.background, minHeight: '100vh', padding: 0 }}>
            <div className="chat-modern-container mt-5">
                {/* Sidebar */}
                <aside className="chat-modern-sidebar">
                    <header className="chat-modern-sidebar-header">
                        <span className="chat-modern-title">Messages</span>
                        {isBusinessOwner && (
                            <button className="chat-modern-perms-btn" onClick={() => navigate('/dashboard/chatpermissions')}>
                                <i className="bi bi-shield-lock"></i>
                            </button>
                        )}
                    </header>
                    <div className="chat-modern-search">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="chat-modern-contacts">
                        {loading ? (
                            <div className="chat-modern-loading">Loading...</div>
                        ) : filteredContacts.length === 0 ? (
                            <div className="chat-modern-empty">No contacts</div>
                        ) : (
                            filteredContacts.map(contact => (
                                <div
                                    key={contact._id}
                                    className={`chat-modern-contact${selectedContact?._id === contact._id ? ' active' : ''}`}
                                    onClick={() => handleContactSelect(contact)}
                                >
                                    <div className="chat-modern-avatar">
                                        <i className="bi bi-person-circle"></i>
                                    </div>
                                    <div className="chat-modern-contact-info">
                                        <div className="chat-modern-contact-row">
                                            <span className="chat-modern-contact-name">{contact.name}</span>
                                            {contact.lastMessage && (
                                                <span className="chat-modern-contact-time">{formatTime(contact.lastMessage.createdAt)}</span>
                                            )}
                                        </div>
                                        <div className="chat-modern-contact-row">
                                            <span className={`chat-modern-role-badge ${getRoleBadgeClass(contact.role)}`}>{contact.role}</span>
                                            {contact.lastMessage && (
                                                <span className="chat-modern-contact-preview">
                                                    {contact.lastMessage.isFromMe && <i className="bi bi-check2 me-1"></i>}
                                                    {contact.lastMessage.message.substring(0, 30)}{contact.lastMessage.message.length > 30 && '...'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {contact.unreadCount > 0 && (
                                        <span className="chat-modern-unread-badge">{contact.unreadCount}</span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </aside>
                {/* Main Chat Window */}
                <main className="chat-modern-main">
                    {selectedContact ? (
                        <>
                            <header className="chat-modern-main-header">
                                <button className="chat-modern-back-btn" onClick={handleBackToContacts}>
                                    <i className="bi bi-arrow-left"></i>
                                </button>
                                <div className="chat-modern-main-avatar">
                                    <i className="bi bi-person-circle"></i>
                                </div>
                                <div className="chat-modern-main-info">
                                    <span className="chat-modern-main-name">{selectedContact.name}</span>
                                    <span className={`chat-modern-role-badge ${getRoleBadgeClass(selectedContact.role)}`}>{selectedContact.role}</span>
                                </div>
                            </header>
                            <section className="chat-modern-messages">
                                {loadingMessages ? (
                                    <div className="chat-modern-loading">Loading...</div>
                                ) : messages.length === 0 ? (
                                    <div className="chat-modern-empty">No messages yet. Start the conversation!</div>
                                ) : (
                                    messages.map((msg, idx) => {
                                        const isFromMe = msg.sender !== selectedContact._id;
                                        const showDate = idx === 0 ||
                                            new Date(msg.createdAt).toDateString() !== new Date(messages[idx - 1].createdAt).toDateString();
                                        return (
                                            <React.Fragment key={msg._id}>
                                                {showDate && (
                                                    <div className="chat-modern-date-divider">
                                                        <span>{new Date(msg.createdAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                                    </div>
                                                )}
                                                <div className={`chat-modern-message-row ${isFromMe ? 'sent' : 'received'}`}> 
                                                    <div className="chat-modern-message-bubble">
                                                        <span className="chat-modern-message-text">{msg.message}</span>
                                                        <span className="chat-modern-message-meta">
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
                            </section>
                            <form className="chat-modern-input-bar" onSubmit={handleSendMessage}>
                                <input
                                    ref={messageInputRef}
                                    type="text"
                                    placeholder="Type a message..."
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    disabled={sending}
                                />
                                <button type="submit" disabled={!newMessage.trim() || sending} className="chat-modern-send-btn">
                                    {sending ? <span className="spinner-border spinner-border-sm" role="status"></span> : <i className="bi bi-send-fill"></i>}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="chat-modern-empty chat-modern-main-empty">
                            <i className="bi bi-chat-dots"></i>
                            <div>Select a conversation</div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Chat;
