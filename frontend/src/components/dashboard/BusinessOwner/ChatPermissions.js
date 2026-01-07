import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../styles/chatpermissions.css';

const ChatPermissions = (props) => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [permissions, setPermissions] = useState([]); // eslint-disable-line no-unused-vars
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [permissionMatrix, setPermissionMatrix] = useState({});
    
    const token = localStorage.getItem('token');

    // Fetch all users
    const fetchUsers = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:5000/api/chat/users', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUsers(data.users);
            } else {
                const errorData = await response.json();
                props.showAlert?.(errorData.error || 'Error fetching users', 'danger');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            props.showAlert?.('Error fetching users', 'danger');
        }
    }, [token, props]);

    // Fetch existing permissions
    const fetchPermissions = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:5000/api/chat/permissions', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token
                }
            });

            if (response.ok) {
                const data = await response.json();
                setPermissions(data.permissions);
                
                // Build permission matrix from existing permissions
                const matrix = {};
                data.permissions.forEach(perm => {
                    if (!matrix[perm.user]) {
                        matrix[perm.user] = {};
                    }
                    matrix[perm.user][perm.allowedUser] = perm.isActive;
                });
                setPermissionMatrix(matrix);
            } else {
                const errorData = await response.json();
                props.showAlert?.(errorData.error || 'Error fetching permissions', 'danger');
            }
        } catch (error) {
            console.error('Error fetching permissions:', error);
            props.showAlert?.('Error fetching permissions', 'danger');
        }
    }, [token, props]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await fetchUsers();
            await fetchPermissions();
            setLoading(false);
        };
        loadData();
    }, [fetchUsers, fetchPermissions]);

    // Toggle permission for a user pair
    const togglePermission = (userId, allowedUserId) => {
        setPermissionMatrix(prev => {
            const newMatrix = { ...prev };
            if (!newMatrix[userId]) {
                newMatrix[userId] = {};
            }
            newMatrix[userId][allowedUserId] = !newMatrix[userId][allowedUserId];
            return newMatrix;
        });
    };

    // Check if permission exists
    const hasPermission = (userId, allowedUserId) => {
        return permissionMatrix[userId]?.[allowedUserId] || false;
    };

    // Enable all permissions for a user (they can be contacted by everyone)
    const enableAllForUser = (userId) => {
        setPermissionMatrix(prev => {
            const newMatrix = { ...prev };
            if (!newMatrix[userId]) {
                newMatrix[userId] = {};
            }
            users.forEach(user => {
                if (user._id !== userId) {
                    newMatrix[userId][user._id] = true;
                }
            });
            return newMatrix;
        });
    };

    // Disable all permissions for a user
    const disableAllForUser = (userId) => {
        setPermissionMatrix(prev => {
            const newMatrix = { ...prev };
            if (!newMatrix[userId]) {
                newMatrix[userId] = {};
            }
            users.forEach(user => {
                if (user._id !== userId) {
                    newMatrix[userId][user._id] = false;
                }
            });
            return newMatrix;
        });
    };

    // Enable bidirectional chat between two users
    const enableBidirectional = (user1Id, user2Id) => {
        setPermissionMatrix(prev => {
            const newMatrix = { ...prev };
            if (!newMatrix[user1Id]) newMatrix[user1Id] = {};
            if (!newMatrix[user2Id]) newMatrix[user2Id] = {};
            newMatrix[user1Id][user2Id] = true;
            newMatrix[user2Id][user1Id] = true;
            return newMatrix;
        });
    };

    // Save all permissions
    const savePermissions = async () => {
        try {
            setSaving(true);
            
            // Build permissions array from matrix
            const permissionsToSave = [];
            
            Object.keys(permissionMatrix).forEach(userId => {
                const user = users.find(u => u._id === userId);
                if (!user) return;
                
                Object.keys(permissionMatrix[userId]).forEach(allowedUserId => {
                    const allowedUser = users.find(u => u._id === allowedUserId);
                    if (!allowedUser) return;
                    
                    permissionsToSave.push({
                        userId: userId,
                        userRole: user.role,
                        userName: user.name,
                        allowedUserId: allowedUserId,
                        allowedUserRole: allowedUser.role,
                        allowedUserName: allowedUser.name,
                        isActive: permissionMatrix[userId][allowedUserId]
                    });
                });
            });

            const response = await fetch('http://localhost:5000/api/chat/permissions/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token
                },
                body: JSON.stringify({ permissions: permissionsToSave })
            });

            if (response.ok) {
                props.showAlert?.('Permissions saved successfully', 'success');
                await fetchPermissions();
            } else {
                const errorData = await response.json();
                props.showAlert?.(errorData.error || 'Error saving permissions', 'danger');
            }
        } catch (error) {
            console.error('Error saving permissions:', error);
            props.showAlert?.('Error saving permissions', 'danger');
        } finally {
            setSaving(false);
        }
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

    // Filter users by search term
    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Count active permissions for a user
    const countActivePermissions = (userId) => {
        if (!permissionMatrix[userId]) return 0;
        return Object.values(permissionMatrix[userId]).filter(Boolean).length;
    };

    if (loading) {
        return (
            <div className="chat-permissions-page">
                <div className="chat-permissions-loading">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p>Loading users and permissions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-permissions-page">
            {/* Header */}
            <div className="chat-permissions-header">
                <div className="header-content">
                    <h1>
                        <i className="bi bi-shield-lock-fill me-3"></i>
                        Chat Permissions
                    </h1>
                    <p className="header-subtitle">
                        Control who can message whom in your organization
                    </p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="chat-permissions-toolbar">
                <div className="toolbar-left">
                    <div className="search-box">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="toolbar-right">
                    <button 
                        className="btn-back"
                        onClick={() => navigate('/dashboard/chat')}
                    >
                        <i className="bi bi-arrow-left me-2"></i>
                        Back to Chat
                    </button>
                    <button 
                        className="btn-save"
                        onClick={savePermissions}
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                Saving...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-check-lg me-2"></i>
                                Save Permissions
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Instructions */}
            <div className="permissions-instructions">
                <i className="bi bi-info-circle"></i>
                <div>
                    <strong>How it works:</strong> Select a user from the left panel, then check the users who are allowed to send messages to them. 
                    For two-way communication, you need to enable permissions in both directions.
                </div>
            </div>

            {/* Main Content */}
            <div className="permissions-content">
                {/* Users List */}
                <div className="users-list-panel">
                    <div className="panel-header">
                        <h3>Users ({filteredUsers.length})</h3>
                    </div>
                    <div className="users-list">
                        {filteredUsers.map(user => (
                            <div
                                key={user._id}
                                className={`user-item ${selectedUser?._id === user._id ? 'active' : ''}`}
                                onClick={() => setSelectedUser(user)}
                            >
                                <div className="user-avatar">
                                    <i className="bi bi-person-circle"></i>
                                </div>
                                <div className="user-info">
                                    <span className="user-name">{user.name}</span>
                                    <span className={`user-role-badge ${getRoleBadgeClass(user.role)}`}>
                                        {user.displayRole}
                                    </span>
                                </div>
                                <div className="user-permissions-count">
                                    <span className="count-badge">
                                        {countActivePermissions(user._id)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Permissions Panel */}
                <div className="permissions-panel">
                    {selectedUser ? (
                        <>
                            <div className="panel-header">
                                <div className="selected-user-info">
                                    <div className="selected-user-avatar">
                                        <i className="bi bi-person-circle"></i>
                                    </div>
                                    <div>
                                        <h3>{selectedUser.name}</h3>
                                        <span className={`user-role-badge ${getRoleBadgeClass(selectedUser.role)}`}>
                                            {selectedUser.displayRole}
                                        </span>
                                    </div>
                                </div>
                                <div className="quick-actions">
                                    <button 
                                        className="btn-quick-action enable"
                                        onClick={() => enableAllForUser(selectedUser._id)}
                                        title="Allow all users to contact this person"
                                    >
                                        <i className="bi bi-check-all me-1"></i>
                                        Enable All
                                    </button>
                                    <button 
                                        className="btn-quick-action disable"
                                        onClick={() => disableAllForUser(selectedUser._id)}
                                        title="Prevent all users from contacting this person"
                                    >
                                        <i className="bi bi-x-lg me-1"></i>
                                        Disable All
                                    </button>
                                </div>
                            </div>
                            <div className="panel-description">
                                <p>Select users who are allowed to send messages to <strong>{selectedUser.name}</strong>:</p>
                            </div>
                            <div className="allowed-users-list">
                                {users.filter(u => u._id !== selectedUser._id).map(user => {
                                    const isAllowed = hasPermission(selectedUser._id, user._id);
                                    const reverseAllowed = hasPermission(user._id, selectedUser._id);
                                    
                                    return (
                                        <div 
                                            key={user._id} 
                                            className={`allowed-user-item ${isAllowed ? 'allowed' : ''}`}
                                        >
                                            <div className="user-checkbox">
                                                <input
                                                    type="checkbox"
                                                    id={`perm-${user._id}`}
                                                    checked={isAllowed}
                                                    onChange={() => togglePermission(selectedUser._id, user._id)}
                                                />
                                                <label htmlFor={`perm-${user._id}`}></label>
                                            </div>
                                            <div className="user-avatar">
                                                <i className="bi bi-person-circle"></i>
                                            </div>
                                            <div className="user-info">
                                                <span className="user-name">{user.name}</span>
                                                <div className="user-meta">
                                                    <span className={`user-role-badge small ${getRoleBadgeClass(user.role)}`}>
                                                        {user.displayRole}
                                                    </span>
                                                    {user.companyName && (
                                                        <span className="company-name">{user.companyName}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="permission-status">
                                                {isAllowed && reverseAllowed ? (
                                                    <span className="status-badge bidirectional">
                                                        <i className="bi bi-arrow-left-right me-1"></i>
                                                        Two-way
                                                    </span>
                                                ) : isAllowed ? (
                                                    <span className="status-badge one-way">
                                                        <i className="bi bi-arrow-right me-1"></i>
                                                        Can message
                                                    </span>
                                                ) : null}
                                            </div>
                                            {!reverseAllowed && isAllowed && (
                                                <button
                                                    className="btn-enable-reverse"
                                                    onClick={() => enableBidirectional(selectedUser._id, user._id)}
                                                    title="Enable two-way communication"
                                                >
                                                    <i className="bi bi-arrow-left-right"></i>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="no-user-selected">
                            <i className="bi bi-person-check"></i>
                            <h3>Select a User</h3>
                            <p>Choose a user from the list to manage their chat permissions</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatPermissions;
