import React, { useState, useEffect, useRef } from 'react';
import { useRole } from '../../context/RoleContext';
import '../../styles/messaging.css';

const Messaging = () => {
    const { permissions, hasPermission, role } = useRole();
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [showEmployeeSelector, setShowEmployeeSelector] = useState(false);
    const [showSupplierSelector, setShowSupplierSelector] = useState(false);
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
    const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
    const [userTypeTab, setUserTypeTab] = useState('employees');
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editingContent, setEditingContent] = useState('');
    const [showMessageMenu, setShowMessageMenu] = useState(null);
    const messagesEndRef = useRef(null);
    const messageMenuRef = useRef(null);
    const token = localStorage.getItem('token');

    // Get current user ID and role
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/auth/getuser', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': token
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setCurrentUserId(data._id);
                    setCurrentUserRole(data.role);
                    // Also store in localStorage as backup
                    localStorage.setItem('userId', data._id);
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
                // Fallback to localStorage if API fails
                const storedUserId = localStorage.getItem('userId');
                if (storedUserId) {
                    setCurrentUserId(storedUserId);
                }
            }
        };
        
        if (token) {
            fetchCurrentUser();
        }
    }, [token]);

    // Fetch conversations on mount and when permissions load
    useEffect(() => {
        // Only fetch if user has access to view messages
        if (hasPermission('canViewMessages')) {
            setLoading(true);
            fetchConversations();
            // Poll for new conversations every 30 seconds
            const interval = setInterval(fetchConversations, 30000);
            return () => clearInterval(interval);
        }
    }, [role]);

    // Fetch messages when conversation changes
    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation.userId, selectedConversation.userRole);
            // Poll for new messages every 10 seconds
            const interval = setInterval(() => {
                fetchMessages(selectedConversation.userId, selectedConversation.userRole);
            }, 10000);
            return () => clearInterval(interval);
        }
    }, [selectedConversation]);

    // Auto scroll to latest message
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchConversations = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/messages/conversations', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token
                }
            });

            if (response.ok) {
                const data = await response.json();
                setConversations(data.conversations || []);
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (userId, userRole) => {
        setLoadingMessages(true);
        try {
            const response = await fetch(
                `http://localhost:5000/api/messages/conversation/${userId}/${userRole}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': token
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();

        if (!newMessage.trim() || !selectedConversation) return;

        if (!hasPermission('canSendMessages')) {
            alert('You do not have permission to send messages');
            return;
        }

        setSending(true);
        try {
            const response = await fetch('http://localhost:5000/api/messages/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token
                },
                body: JSON.stringify({
                    recipientId: selectedConversation.userId,
                    recipientRole: selectedConversation.userRole,
                    content: newMessage
                })
            });

            if (response.ok) {
                const data = await response.json();
                setMessages([...messages, data.message]);
                setNewMessage('');
                // Update conversation list
                fetchConversations();
            } else {
                const error = await response.json();
                alert(error.error || 'Error sending message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error sending message');
        } finally {
            setSending(false);
        }
    };

    const handleDeleteMessage = async (messageId) => {
        if (!hasPermission('canDeleteMessages')) {
            alert('You do not have permission to delete messages');
            return;
        }

        if (!window.confirm('Delete this message?')) return;

        try {
            const response = await fetch(`http://localhost:5000/api/messages/${messageId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token
                }
            });

            if (response.ok) {
                setMessages(messages.filter(msg => msg._id !== messageId));
            } else {
                const error = await response.json();
                alert(error.error || 'Error deleting message');
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            alert('Error deleting message');
        }
    };

    const handleEditMessage = async (messageId, newContent) => {
        if (!hasPermission('canDeleteMessages')) {
            alert('You do not have permission to edit messages');
            return;
        }

        if (!newContent.trim()) {
            alert('Message cannot be empty');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/messages/${messageId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token
                },
                body: JSON.stringify({
                    content: newContent.trim()
                })
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(messages.map(msg => 
                    msg._id === messageId ? data.message : msg
                ));
                setEditingMessageId(null);
                setEditingContent('');
                setShowMessageMenu(null);
            } else {
                const error = await response.json();
                alert(error.error || 'Error editing message');
            }
        } catch (error) {
            console.error('Error editing message:', error);
            alert('Error editing message');
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (messageMenuRef.current && !messageMenuRef.current.contains(e.target)) {
                setShowMessageMenu(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Fetch employees for business owner
    const fetchEmployees = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/employee/getallemployees', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Backend returns array directly, not wrapped in 'employees' key
                setEmployees(Array.isArray(data) ? data : (data.employees || []));
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    // Fetch suppliers for business owner or employee
    const fetchSuppliers = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/supplier/getallsuppliers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Backend returns array directly, not wrapped in 'suppliers' key
                setSuppliers(Array.isArray(data) ? data : (data.suppliers || []));
            }
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        }
    };

    // Load employees/suppliers when selector is opened
    useEffect(() => {
        if (showEmployeeSelector) {
            if (employees.length === 0 && currentUserRole === 'businessowner') {
                fetchEmployees();
            }
            if (suppliers.length === 0) {
                fetchSuppliers();
            }
        }
    }, [showEmployeeSelector, currentUserRole, employees.length, suppliers.length]);

    // Handle employee selection
    const handleSelectEmployee = (employee) => {
        setSelectedConversation({
            userId: employee._id,
            userRole: 'Employee',
            userDetails: employee
        });
        setShowEmployeeSelector(false);
        setEmployeeSearchTerm('');
    };

    // Handle supplier selection
    const handleSelectSupplier = (supplier) => {
        setSelectedConversation({
            userId: supplier._id,
            userRole: 'Supplier',
            userDetails: supplier
        });
        setShowSupplierSelector(false);
        setSupplierSearchTerm('');
    };

    const filteredConversations = conversations.filter(conv => {
        const name = `${conv.userDetails?.fname || ''} ${conv.userDetails?.lname || ''}`.toLowerCase();
        return name.includes(searchTerm.toLowerCase());
    });

    const filteredEmployees = employees.filter(emp => {
        const name = `${emp.fname || ''} ${emp.lname || ''}`.toLowerCase();
        return name.includes(employeeSearchTerm.toLowerCase());
    });

    const filteredSuppliers = suppliers.filter(sup => {
        const name = `${sup.fname || ''} ${sup.lname || ''}`.toLowerCase();
        const company = (sup.companyName || '').toLowerCase();
        const searchLower = supplierSearchTerm.toLowerCase();
        return name.includes(searchLower) || company.includes(searchLower);
    });

    const formatTime = (date) => {
        const d = new Date(date);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date) => {
        const d = new Date(date);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) {
            return formatTime(date);
        }
        return d.toLocaleDateString();
    };

    const getUserDisplayName = (user, userRole) => {
        if (!user) return userRole;
        return `${user.fname || ''} ${user.lname || ''}`.trim() || user.email;
    };

    if (!hasPermission('canViewMessages')) {
        return (
            <div className="messaging-container">
                <div className="messaging-header">
                    <h1>
                        <i className="bi bi-chat-dots me-2"></i>
                        Messages
                    </h1>
                </div>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <p>You don't have permission to view messages.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="messaging-container">
            <div className="messaging-header">
                <h1>
                    <i className="bi bi-chat-dots me-2"></i>
                    Messages
                </h1>
            </div>

            <div className="messaging-wrapper">
                {/* Conversations List */}
                <div className="conversations-panel">
                    <div className="conversations-search">
                        <div className="d-flex gap-2 mb-2">
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="form-control"
                            />
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => {
                                    if (showEmployeeSelector) {
                                        setShowEmployeeSelector(false);
                                    } else {
                                        setShowEmployeeSelector(true);
                                        // Set default tab based on user role
                                        if (currentUserRole === 'businessowner') {
                                            setUserTypeTab('employees');
                                        } else {
                                            setUserTypeTab('suppliers');
                                        }
                                    }
                                }}
                                title="Start new conversation"
                            >
                                <i className="bi bi-plus-lg"></i>
                            </button>
                        </div>
                        
                        {/* User Type Selector - Tabs and Content */}
                        {showEmployeeSelector && (
                            <div className="user-selector-section mb-2" style={{ backgroundColor: '#f9f9f9', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #e0e0e0' }}>
                                {/* Tabs */}
                                <div className="user-type-tabs mb-3" style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e0e0e0', marginBottom: '1rem' }}>
                                    {currentUserRole === 'businessowner' && (
                                        <button
                                            className="tab-button"
                                            onClick={() => setUserTypeTab('employees')}
                                            style={{
                                                padding: '0.75rem 1.25rem',
                                                border: 'none',
                                                background: 'none',
                                                cursor: 'pointer',
                                                borderBottom: userTypeTab === 'employees' ? '3px solid #667eea' : 'none',
                                                color: userTypeTab === 'employees' ? '#667eea' : '#888',
                                                fontWeight: userTypeTab === 'employees' ? '600' : '500',
                                                fontSize: '0.95rem',
                                                transition: 'all 0.3s ease',
                                                marginBottom: '-2px'
                                            }}
                                        >
                                            <i className="bi bi-people me-2"></i>Employees
                                        </button>
                                    )}
                                    <button
                                        className="tab-button"
                                        onClick={() => setUserTypeTab('suppliers')}
                                        style={{
                                            padding: '0.75rem 1.25rem',
                                            border: 'none',
                                            background: 'none',
                                            cursor: 'pointer',
                                            borderBottom: userTypeTab === 'suppliers' ? '3px solid #667eea' : 'none',
                                            color: userTypeTab === 'suppliers' ? '#667eea' : '#888',
                                            fontWeight: userTypeTab === 'suppliers' ? '600' : '500',
                                            fontSize: '0.95rem',
                                            transition: 'all 0.3s ease',
                                            marginBottom: '-2px'
                                        }}
                                    >
                                        <i className="bi bi-shop me-2"></i>Suppliers
                                    </button>
                                </div>
                                
                                {/* Employee Selector */}
                                {userTypeTab === 'employees' && currentUserRole === 'businessowner' && (
                                    <div className="employee-selector">
                                        <input
                                            type="text"
                                            placeholder="Search employees by name..."
                                            value={employeeSearchTerm}
                                            onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                                            className="form-control form-control-sm mb-3"
                                            style={{ borderRadius: '0.375rem' }}
                                        />
                                        <div className="employee-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                            {employees.length === 0 ? (
                                                <p className="text-muted text-center py-4">No employees found</p>
                                            ) : (
                                                filteredEmployees.map((emp) => (
                                                    <button
                                                        key={emp._id}
                                                        className="list-group-item list-group-item-action text-start"
                                                        onClick={() => handleSelectEmployee(emp)}
                                                        style={{
                                                            border: '1px solid #e0e0e0',
                                                            borderRadius: '0.375rem',
                                                            marginBottom: '0.75rem',
                                                            padding: '0.85rem',
                                                            backgroundColor: '#fff',
                                                            transition: 'all 0.2s ease',
                                                            cursor: 'pointer'
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f4ff'}
                                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#fff'}
                                                    >
                                                        <div className="d-flex align-items-center justify-content-between">
                                                            <div>
                                                                <strong className="d-block">{emp.fname} {emp.lname}</strong>
                                                                <small className="text-muted">{emp.role}</small>
                                                            </div>
                                                            <i className="bi bi-chevron-right text-primary"></i>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Supplier Selector */}
                                {userTypeTab === 'suppliers' && (
                                    <div className="supplier-selector">
                                        <input
                                            type="text"
                                            placeholder="Search suppliers by name or company..."
                                            value={supplierSearchTerm}
                                            onChange={(e) => setSupplierSearchTerm(e.target.value)}
                                            className="form-control form-control-sm mb-3"
                                            style={{ borderRadius: '0.375rem' }}
                                        />
                                        <div className="supplier-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                            {suppliers.length === 0 ? (
                                                <div className="text-center py-4">
                                                    <i className="bi bi-inbox text-muted" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
                                                    <p className="text-muted mb-0">No suppliers found</p>
                                                </div>
                                            ) : (
                                                filteredSuppliers.map((sup) => (
                                                    <button
                                                        key={sup._id}
                                                        className="list-group-item list-group-item-action text-start"
                                                        onClick={() => handleSelectSupplier(sup)}
                                                        style={{
                                                            border: '1px solid #e0e0e0',
                                                            borderRadius: '0.375rem',
                                                            marginBottom: '0.75rem',
                                                            padding: '0.85rem',
                                                            backgroundColor: '#fff',
                                                            transition: 'all 0.2s ease',
                                                            cursor: 'pointer'
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f4ff'}
                                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#fff'}
                                                    >
                                                        <div className="d-flex align-items-center justify-content-between">
                                                            <div>
                                                                <strong className="d-block">{sup.fname} {sup.lname}</strong>
                                                                {sup.companyName && (
                                                                    <small className="text-muted">{sup.companyName}</small>
                                                                )}
                                                            </div>
                                                            <i className="bi bi-chevron-right text-primary"></i>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="conversations-list">
                        {loading ? (
                            <div className="text-center py-4">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="no-conversations text-center py-4">
                                <p>No conversations yet</p>
                            </div>
                        ) : (
                            filteredConversations.map((conv) => (
                                <div
                                    key={`${conv.userId}-${conv.userRole}`}
                                    className={`conversation-item ${
                                        selectedConversation?.userId === conv.userId &&
                                        selectedConversation?.userRole === conv.userRole
                                            ? 'active'
                                            : ''
                                    }`}
                                    onClick={() => setSelectedConversation(conv)}
                                >
                                    <div className="conversation-header">
                                        <h6 className="mb-1">
                                            {getUserDisplayName(conv.userDetails, conv.userRole)}
                                        </h6>
                                        <small className="text-muted">
                                            {conv.userRole === 'Employee'
                                                ? `(${conv.userDetails?.role || 'Employee'})`
                                                : ''}
                                        </small>
                                    </div>
                                    <p className="conversation-preview">
                                        {conv.lastMessage?.substring(0, 50)}...
                                    </p>
                                    <small className="conversation-time">
                                        {formatDate(conv.lastMessageTime)}
                                    </small>
                                    {conv.unreadCount > 0 && (
                                        <span className="badge bg-danger ms-2">
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Window */}
                <div className="chat-panel">
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="chat-header">
                                <h5 className="mb-0">
                                    {getUserDisplayName(
                                        selectedConversation.userDetails,
                                        selectedConversation.userRole
                                    )}
                                </h5>
                                <small className="text-muted d-block">
                                    {selectedConversation.userRole === 'Employee'
                                        ? `(${selectedConversation.userDetails?.role || 'Employee'})`
                                        : selectedConversation.userRole}
                                </small>
                            </div>

                            {/* Messages Area */}
                            <div className="messages-area">
                                {loadingMessages ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="no-messages text-center py-4">
                                        <p>No messages yet. Start a conversation!</p>
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        // Use currentUserId or fallback to localStorage
                                        const userId = currentUserId || localStorage.getItem('userId');
                                        
                                        // Handle both cases: sender as object or as string ID
                                        const senderId = msg.sender?._id || msg.sender;
                                        
                                        // Compare as strings
                                        const isSentByMe = userId && senderId && 
                                                         String(senderId) === String(userId);
                                        
                                        // Check if editing this message
                                        const isEditing = editingMessageId === msg._id;
                                        
                                        return (
                                        <div
                                            key={msg._id}
                                            className={`message-item ${isSentByMe ? 'sent' : 'received'}`}
                                            ref={showMessageMenu === msg._id ? messageMenuRef : null}
                                        >
                                            {!isSentByMe && (
                                                <div className="message-avatar">
                                                    <div className="avatar-circle">
                                                        {msg.sender?.fname?.charAt(0).toUpperCase()}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="message-content">
                                                {!isSentByMe && (
                                                    <small className="message-sender">
                                                        {msg.sender?.fname} {msg.sender?.lname}
                                                    </small>
                                                )}
                                                <div 
                                                    className="message-bubble"
                                                    onClick={() => isSentByMe && hasPermission('canDeleteMessages') && setShowMessageMenu(msg._id)}
                                                    style={{ cursor: isSentByMe && hasPermission('canDeleteMessages') ? 'pointer' : 'default' }}
                                                >
                                                    {isEditing ? (
                                                        <div className="edit-message-form">
                                                            <textarea
                                                                value={editingContent}
                                                                onChange={(e) => setEditingContent(e.target.value)}
                                                                className="form-control form-control-sm"
                                                                rows="2"
                                                                autoFocus
                                                            />
                                                            <div className="edit-buttons mt-2">
                                                                <button
                                                                    className="btn btn-sm btn-success me-2"
                                                                    onClick={() => handleEditMessage(msg._id, editingContent)}
                                                                >
                                                                    Save
                                                                </button>
                                                                <button
                                                                    className="btn btn-sm btn-secondary"
                                                                    onClick={() => {
                                                                        setEditingMessageId(null);
                                                                        setEditingContent('');
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="mb-0">{msg.content}</p>
                                                    )}
                                                </div>
                                                <small className="message-time">
                                                    {formatTime(msg.createdAt)}
                                                    {msg.updatedAt && msg.updatedAt !== msg.createdAt && (
                                                        <span className="ms-2">(edited)</span>
                                                    )}
                                                    {isSentByMe && msg.isRead && (
                                                        <i className="bi bi-check-all ms-1 text-info"></i>
                                                    )}
                                                </small>
                                            </div>
                                            {isSentByMe && hasPermission('canDeleteMessages') && (
                                                <div className="message-menu-wrapper">
                                                    <button
                                                        className="btn btn-sm btn-link text-muted p-0"
                                                        onClick={() => setShowMessageMenu(showMessageMenu === msg._id ? null : msg._id)}
                                                        title="Message options"
                                                    >
                                                        <i className="bi bi-three-dots-vertical"></i>
                                                    </button>
                                                    {showMessageMenu === msg._id && (
                                                        <div className="message-dropdown-menu">
                                                            <button
                                                                className="dropdown-item"
                                                                onClick={() => {
                                                                    setEditingMessageId(msg._id);
                                                                    setEditingContent(msg.content);
                                                                    setShowMessageMenu(null);
                                                                }}
                                                            >
                                                                <i className="bi bi-pencil me-2"></i>Edit
                                                            </button>
                                                            <button
                                                                className="dropdown-item text-danger"
                                                                onClick={() => {
                                                                    handleDeleteMessage(msg._id);
                                                                    setShowMessageMenu(null);
                                                                }}
                                                            >
                                                                <i className="bi bi-trash me-2"></i>Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            {hasPermission('canSendMessages') ? (
                                <form onSubmit={handleSendMessage} className="message-form">
                                    <input
                                        type="text"
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        disabled={sending}
                                        className="form-control"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() || sending}
                                        className="btn btn-primary"
                                    >
                                        {sending ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-send me-2"></i>
                                                Send
                                            </>
                                        )}
                                    </button>
                                </form>
                            ) : (
                                <div className="alert alert-warning mb-0">
                                    You do not have permission to send messages
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="no-chat-selected text-center">
                            <i className="bi bi-chat-dots display-1 text-muted"></i>
                            <p className="text-muted mt-3">Select a conversation to start messaging</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Messaging;
