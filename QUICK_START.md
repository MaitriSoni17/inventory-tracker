# Quick Start: Messaging Feature Setup & Usage

## For Developers

### Installation & Setup

#### 1. Backend Setup
No additional dependencies needed. The feature uses existing packages:
- Express.js (routing)
- Mongoose (database)
- JWT (authentication)

**Steps:**
1. Ensure MongoDB is running
2. Start backend: `npm start` or `npm run dev`
3. Database will auto-create Message collection on first use
4. Indexes are created automatically via Message.js schema

#### 2. Frontend Setup
No additional npm packages required. Uses existing React setup.

**Steps:**
1. Ensure backend API is running on port 5000
2. Start frontend: `npm start`
3. Messaging will be available at `/dashboard/messages`

#### 3. Verify Installation
- [ ] No console errors on startup
- [ ] Messages route exists in App.js
- [ ] Messaging component loads
- [ ] SideBar shows Messages link (if user has permission)

### Testing the Feature

#### Step 1: Create Test Users
```bash
# Create a Business Owner
# Create an Employee
# Create a Manager or Supervisor
# Create a Supplier
```

#### Step 2: Login as Business Owner
1. Go to Dashboard
2. Click "Permissions" in sidebar
3. Find "Messaging" section
4. Verify default permissions are set
5. Optionally customize permissions

#### Step 3: Send First Message
1. Login as Employee
2. Click "Messages" in sidebar
3. See empty state if first time
4. Start conversation by opening messaging
5. Select recipient
6. Type message and send

#### Step 4: Receive & Read
1. Login as another user
2. Click "Messages"
3. Should see conversation in list
4. Click to open and read message
5. Read receipt should show (checkmark)

#### Step 5: Test Permissions
1. Login as Business Owner
2. Go to Permissions
3. Find Messaging group
4. Toggle `canSendMessages` OFF for Employees
5. Login as Employee
6. Messages page should show disabled state
7. Send button should be disabled

---

## For End Users

### Business Owner

#### Setting Up Messaging Permissions

1. **Access Permissions Page**
   - Dashboard → Permissions
   - Find "Messaging" section

2. **Role-Based Configuration**
   - Click on role (Manager/Supervisor/Employee)
   - Toggle messaging permissions:
     - **View Messages**: Can see messages
     - **Send Messages**: Can send new messages
     - **Delete Messages**: Can delete their own messages
   - Changes apply to all employees with that role

3. **Individual Customization** (Optional)
   - Switch to "Individual" permissions tab
   - Select specific employee
   - Set custom permissions
   - Overrides role defaults

4. **Tips**
   - Usually keep View & Send enabled
   - Delete is safe to disable for junior staff
   - Changes take effect immediately

### Employee/Manager/Supervisor

#### Sending Messages

1. **Open Messages**
   - Click "Messages" in sidebar
   - Or navigate to Dashboard → Messages

2. **Start Conversation**
   - See list of previous conversations
   - Or start new one by searching user

3. **Send Message**
   - Type message in input box
   - Press Enter or click Send button
   - Message appears immediately

4. **Features**
   - **Search**: Use top search box to find contacts
   - **Read Receipts**: Checkmarks show when read
   - **Delete**: Click trash icon to delete your message
   - **History**: Scroll up to see earlier messages

### Supplier

#### Messaging Business Owner & Employees

1. **Access Messages** (if enabled)
   - Click "Messages" in sidebar
   - If not visible, you don't have permission

2. **Send to Business Owner**
   - Open Messages
   - Find Business Owner in contact list
   - Send message

3. **Send to Employees**
   - Same process
   - Can message any employee
   - Permission-based

---

## Features Overview

### Basic Messaging
- ✅ Send messages to any user
- ✅ See conversation history
- ✅ Search conversations
- ✅ Unread message count
- ✅ Read receipts

### Message Management
- ✅ Delete your sent messages
- ✅ View sent/received status
- ✅ Organize conversations
- ✅ Auto-refresh for new messages

### Security & Permissions
- ✅ Role-based access control
- ✅ Individual permission override
- ✅ Data isolated by organization
- ✅ All actions require authentication

---

## Troubleshooting Guide

### "Messages" Link Not Showing
**Cause**: User doesn't have `canViewMessages` permission  
**Fix**: 
1. Login as Business Owner
2. Permissions → Messaging
3. Enable `canViewMessages` for their role
4. User refresh page

### Can't Send Message
**Cause**: Might be permission issue or validation  
**Fix**:
1. Check `canSendMessages` permission is enabled
2. Verify you're not sending empty message
3. Check recipient exists
4. Try refreshing page

### Messages Not Updating
**Cause**: Polling interval issue or API error  
**Fix**:
1. Check browser console for errors
2. Verify backend API is running
3. Try refreshing page
4. Check network connection

### Slow Loading
**Cause**: Too many messages or slow connection  
**Fix**:
1. Check internet connection speed
2. Scroll down to see older messages
3. Try in incognito mode
4. Clear browser cache

### Delete Not Working
**Cause**: Can't delete others' messages  
**Fix**:
1. Only your own messages show delete button
2. Check you have `canDeleteMessages` permission
3. Ensure message is from you
4. Try refreshing

---

## API Reference for Developers

### Authentication
All API calls require header:
```
'auth-token': localStorage.getItem('token')
```

### Send Message
```javascript
POST /api/messages/send
{
  "recipientId": "123abc...",
  "recipientRole": "Employee",  // or "BusinessOwner", "Supplier"
  "content": "Your message here"
}
```

### Get Conversations
```javascript
GET /api/messages/conversations
// Returns: [{ userId, userRole, userDetails, lastMessage, lastMessageTime, unreadCount }]
```

### Get Conversation with User
```javascript
GET /api/messages/conversation/:userId/:userRole
// Returns: [{ messages array with full details }]
```

### Get Unread Count
```javascript
GET /api/messages/unread-count
// Returns: { unreadCount: number }
```

### Delete Message
```javascript
DELETE /api/messages/:messageId
// Returns: { success: true }
```

### Mark as Read
```javascript
POST /api/messages/read/:messageId
// Returns: { message object }
```

---

## Database Schema

### Message Collection
```javascript
Message {
  _id: ObjectId,
  sender: ObjectId,              // User ID
  senderRole: String,            // BusinessOwner, Employee, Supplier
  recipient: ObjectId,           // User ID
  recipientRole: String,         // BusinessOwner, Employee, Supplier
  content: String,               // Message text
  attachment: {
    fileName: String,
    fileUrl: String,
    fileType: String
  },
  isRead: Boolean,               // Read status
  readAt: Date,                  // When read
  deletedBySender: Boolean,      // Soft delete
  deletedByRecipient: Boolean,   // Soft delete
  businessowner: ObjectId,       // For data isolation
  createdAt: Date,               // Auto-set
  updatedAt: Date                // Auto-set
}
```

---

## Performance Tips

### For Users
1. **Reduce Auto-Polling**: Messages refresh every 10-30 seconds
2. **Clean Conversations**: Delete old/archived conversations to reduce load
3. **Search Efficiently**: Use conversation search instead of scrolling
4. **Clear Cache**: Periodically clear browser cache for speed

### For Administrators
1. **Set Appropriate Permissions**: Disable unused features to reduce data
2. **Monitor Database**: Check message collection size periodically
3. **Archive Old Messages**: Implement message archiving strategy
4. **Review Unread Count**: Reduce polling frequency if not needed

### For Developers
1. **Use Indexes**: Message queries automatically use indexes
2. **Limit Results**: API limits to 50 messages per conversation
3. **Pagination**: Can implement pagination for older messages
4. **Cache**: Consider caching conversation lists
5. **CDN**: Serve frontend assets from CDN for speed

---

## Customization Guide

### Change UI Colors
Edit `frontend/src/styles/messaging.css`:
```css
/* Primary color from purple to blue */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
/* Change to */
background: linear-gradient(135deg, #0066cc 0%, #003366 100%);
```

### Change Polling Interval
Edit `frontend/src/components/common/Messaging.js`:
```javascript
// Default 30 second interval
const interval = setInterval(fetchConversations, 30000);
// Change to 60 seconds:
const interval = setInterval(fetchConversations, 60000);
```

### Add Message Limit
Edit `backend/routes/messages.js`:
```javascript
// Current: limit 50
.limit(50)
// Change to 100:
.limit(100)
```

### Customize Permission Names
Edit `backend/routes/permissions.js`:
```javascript
{ key: 'canViewMessages', label: 'View Messages' }
// Change to
{ key: 'canViewMessages', label: 'Read Messages' }
```

---

## File Structure

```
project/
├── backend/
│   ├── models/
│   │   ├── Message.js          ← NEW
│   │   ├── RolePermissions.js  ← MODIFIED
│   │   └── Employee.js         ← MODIFIED
│   ├── routes/
│   │   ├── messages.js         ← NEW
│   │   ├── permissions.js      ← MODIFIED
│   │   └── ...
│   ├── middleware/
│   │   └── fetchuser.js        ← MODIFIED
│   └── index.js                ← MODIFIED
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── common/
    │   │       ├── Messaging.js       ← NEW
    │   │       ├── SideBar.js         ← MODIFIED
    │   │       └── ...
    │   ├── styles/
    │   │   ├── messaging.css   ← NEW
    │   │   └── ...
    │   └── App.js              ← MODIFIED
    └── ...

Documentation/
├── MESSAGING_DOCUMENTATION.md     ← NEW (Comprehensive)
├── IMPLEMENTATION_SUMMARY.md      ← NEW (Overview)
└── QUICK_START.md                 ← NEW (This file)
```

---

## Rollback Instructions

If you need to rollback:

1. **Revert Database**:
   - Messages collection will be safe
   - No data loss

2. **Revert Backend**:
   - Remove: `backend/models/Message.js`
   - Remove: `backend/routes/messages.js`
   - Restore: Original versions of modified files
   - Restart backend

3. **Revert Frontend**:
   - Remove: `frontend/src/components/common/Messaging.js`
   - Remove: `frontend/src/styles/messaging.css`
   - Restore: Original App.js and SideBar.js
   - Rebuild frontend

4. **Cleanup**:
   - Remove documentation files
   - Clear browser cache
   - Restart all services

---

## Support Contacts

- **Technical Issues**: Check troubleshooting guide above
- **Feature Requests**: Document in issue tracker
- **Bug Reports**: Include browser console errors
- **Documentation**: Refer to comprehensive MESSAGING_DOCUMENTATION.md

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Jan 20, 2026 | Initial release with full messaging functionality |

---

## License & Attribution

This messaging feature was built following the existing Inventory Tracker architecture and patterns.

**Built with:**
- React
- Express.js
- MongoDB
- Bootstrap & CSS3

**Follows:**
- Project coding standards
- Permission-based access control pattern
- RESTful API conventions
- Responsive design principles

---

**Last Updated**: January 20, 2026  
**Status**: Production Ready  
**Maintainability**: High  

---

For detailed API documentation, see: `MESSAGING_DOCUMENTATION.md`  
For implementation details, see: `IMPLEMENTATION_SUMMARY.md`
