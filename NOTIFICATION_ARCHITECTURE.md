# Notification System - Architecture Diagram

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INVENTORY TRACKER APPLICATION                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║                         BUSINESS OWNER ACTIONS                        ║  │
│  ╠═══════════════════════════════════════════════════════════════════════╣  │
│  ║  1. Create/Update/Delete Employee                                    ║  │
│  ║  2. Create/Update/Delete Product                                     ║  │
│  ║  3. Create/Update/Delete Order                                       ║  │
│  ║  4. Create/Update/Delete Category                                    ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                   │                                          │
│                                   ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │              API Routes (POST/PUT/DELETE)                             │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │ /api/employee/{createemployee,updateemployee,deleteemployee}   │  │  │
│  │  │ /api/products/{createproduct,updateproduct,deleteproduct}       │  │  │
│  │  │ /api/category/{createcategory,updatecategory,deletecategory}    │  │  │
│  │  │ /api/customerorders/{createcustomerorder,...}                   │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                   │                                          │
│                                   ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │         Notification Helper Functions                                │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │ notifyBusinessOwnerAboutEmployee()    [Employee Changes]       │  │  │
│  │  │ notifyEmployeesAboutProduct()         [Product Changes]        │  │  │
│  │  │ notifyEmployeesAboutOrder()           [Order Changes]          │  │  │
│  │  │ notifyEmployeesAboutCategory()        [Category Changes]       │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                   │                                          │
│                                   ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │              MongoDB Notification Collection                         │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │ Document Schema:                                                │  │  │
│  │  │ {                                                               │  │  │
│  │  │   recipient: ObjectId         // User to notify                │  │  │
│  │  │   recipientRole: String       // 'businessowner' or 'employee' │  │  │
│  │  │   sender: ObjectId            // Who triggered action          │  │  │
│  │  │   senderRole: String          // Sender's role                 │  │  │
│  │  │   type: String                // 'product_created', etc.       │  │  │
│  │  │   title: String               // Short notification title       │  │  │
│  │  │   message: String             // Full notification message      │  │  │
│  │  │   data: Object                // Additional context data        │  │  │
│  │  │   isRead: Boolean             // Read status                   │  │  │
│  │  │   createdAt: Date             // Timestamp (TTL: 30 days)      │  │  │
│  │  │ }                                                               │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                   │                                          │
│                                   ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │           Notification API Routes                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │ GET  /api/notifications/getnotifications                        │  │  │
│  │  │ GET  /api/notifications/unreadcount                             │  │  │
│  │  │ PUT  /api/notifications/markasread/:id                          │  │  │
│  │  │ PUT  /api/notifications/markallasread                           │  │  │
│  │  │ DELETE /api/notifications/deletenotification/:id                │  │  │
│  │  │ DELETE /api/notifications/deleteallnotifications                │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                   │                                          │
│                                   ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │            React Frontend Component (SideBar)                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │ <Notifications />                                               │  │  │
│  │  │ │                                                               │  │  │
│  │  │ ├─ Bell Icon (Top-right navbar)                                │  │  │
│  │  │ │  └─ Badge: Unread count (red circle)                         │  │  │
│  │  │ │                                                               │  │  │
│  │  │ └─ Notification Panel (On click)                               │  │  │
│  │  │    ├─ Header with Close button                                 │  │  │
│  │  │    ├─ Action Buttons:                                          │  │  │
│  │  │    │  ├─ Mark all as read                                      │  │  │
│  │  │    │  └─ Clear all                                             │  │  │
│  │  │    ├─ Notification List:                                       │  │  │
│  │  │    │  └─ Each notification shows:                              │  │  │
│  │  │    │     ├─ Icon (type-specific)                               │  │  │
│  │  │    │     ├─ Title                                              │  │  │
│  │  │    │     ├─ Message                                            │  │  │
│  │  │    │     ├─ Timestamp (relative)                               │  │  │
│  │  │    │     ├─ Actions:                                           │  │  │
│  │  │    │     │  ├─ Mark as read (checkmark)                        │  │  │
│  │  │    │     │  └─ Delete (trash)                                  │  │  │
│  │  │    │     └─ Highlight if unread                                │  │  │
│  │  │    └─ Empty state if no notifications                          │  │  │
│  │  │                                                               │  │  │
│  │  │ Features:                                                      │  │  │
│  │  │ ✓ Auto-refresh every 30 seconds                                │  │  │
│  │  │ ✓ Responsive design (mobile-friendly)                          │  │  │
│  │  │ ✓ Smooth animations                                            │  │  │
│  │  │ ✓ Time formatting (just now, 5m ago, etc.)                     │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                   │                                          │
│                                   ▼                                          │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║              BUSINESS OWNER / EMPLOYEE SEES NOTIFICATION             ║  │
│  ║  - Bell badge shows count                                            ║  │
│  ║  - Click to see detailed notification                                ║  │
│  ║  - Can mark as read or delete                                        ║  │
│  ║  - Automatically updates every 30 seconds                             ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Examples

### Example 1: Business Owner Creates Employee

```
Business Owner UI
    │
    ├─ Click "Create Employee" button
    │
    └─► POST /api/employee/createemployee
        └─► Backend creates employee record
            └─► notifyBusinessOwnerAboutEmployee() called
                └─► createNotification() creates notification doc:
                    {
                      recipient: businessOwnerId,
                      recipientRole: 'businessowner',
                      sender: employeeId,
                      senderRole: 'employee',
                      type: 'employee_created',
                      title: 'New Employee Added',
                      message: 'Employee John Doe has been added...',
                      isRead: false
                    }
                    └─► Saved to MongoDB
                        └─► Business Owner's frontend polls every 30s
                            └─► GET /api/notifications/getnotifications
                                └─► Bell icon shows badge (1)
                                    └─► Click bell to see notification
```

### Example 2: Business Owner Creates Product

```
Business Owner UI
    │
    ├─ Click "Add Product" button
    │
    └─► POST /api/products/createproduct
        └─► Backend creates product record
            └─► notifyEmployeesAboutProduct() called
                └─► For each Employee under this Business Owner:
                    └─► createNotification() creates notification:
                        {
                          recipient: employeeId,
                          recipientRole: 'employee',
                          sender: businessOwnerId,
                          senderRole: 'businessowner',
                          type: 'product_created',
                          title: 'New Product Added',
                          message: 'Product iPhone 15 has been added...',
                          isRead: false
                        }
                        └─► Saved to MongoDB
                            └─► Employee's frontend polls every 30s
                                └─► Sees bell badge (1 or more)
                                    └─► Clicks to view notification
```

## Notification Type Icons

```
┌──────────────────────────┬─────────────────────┐
│ Notification Type        │ Icon                │
├──────────────────────────┼─────────────────────┤
│ employee_created         │ 👤➕ (person-plus)   │
│ employee_updated         │ ✓👤 (person-check)  │
│ employee_deleted         │ ❌👤 (person-x)     │
│ employee_deactivated     │ /👤 (person-slash)  │
│ product_created          │ 📦 (box)            │
│ product_updated          │ 📋 (box-seam)       │
│ product_deleted          │ ❌📦 (box-slash)    │
│ order_created            │ ✓📋 (check-list)    │
│ order_updated            │ 📋 (clipboard)      │
│ order_deleted            │ ❌📋 (clipboard-x)  │
│ category_created         │ 🏷️ (tag)            │
│ category_updated         │ 🏷️ (tag-fill)       │
│ category_deleted         │ ❌🏷️ (tag-slash)    │
└──────────────────────────┴─────────────────────┘
```

## Component Hierarchy

```
SideBar
  ├─ Navbar
  │  └─ Notifications Component
  │     ├─ Bell Icon Button
  │     │  └─ Badge (unread count)
  │     └─ Notification Panel (on click)
  │        ├─ Header
  │        │  ├─ Title
  │        │  └─ Close button
  │        ├─ Action Bar
  │        │  ├─ Mark all as read
  │        │  └─ Clear all
  │        └─ Notification List
  │           └─ Notification Item (repeating)
  │              ├─ Icon
  │              ├─ Content
  │              │  ├─ Title
  │              │  ├─ Message
  │              │  └─ Timestamp
  │              └─ Actions
  │                 ├─ Mark read button
  │                 └─ Delete button
  └─ Outlet (Page content)
```

## State Management

```
Notifications Component State:
│
├─ notifications: []              // Array of notification objects
├─ unreadCount: 0                 // Count of unread notifications
├─ showPanel: false               // Show/hide notification panel
├─ loading: false                 // Loading state for async operations
└─ token: string                  // Auth token from localStorage

Actions:
│
├─ fetchNotifications()           // GET latest notifications
├─ fetchUnreadCount()             // GET unread count
├─ markAsRead(notificationId)     // PUT mark single as read
├─ markAllAsRead()                // PUT mark all as read
├─ deleteNotification(id)         // DELETE single notification
└─ deleteAllNotifications()       // DELETE all notifications
```

## Performance Optimization

```
Database Queries:
├─ Indexes:
│  ├─ createdAt (for TTL auto-delete, sorting)
│  └─ (recipient, recipientRole, isRead) (for unread count)
│
├─ Pagination:
│  └─ Limited to 50 notifications per fetch
│
└─ TTL Cleanup:
   └─ Auto-delete notifications after 30 days

Frontend Optimization:
├─ Polling:
│  ├─ 30-second interval (configurable)
│  └─ Only updates when panel is visible (can optimize)
│
├─ Component:
│  ├─ React hooks for state management
│  └─ CSS animations for smooth UX
│
└─ Caching:
   └─ Notifications stored in component state
```

## Security Flow

```
User Request
    │
    ├─ Includes auth token in headers
    │
    └─► Middleware: fetchuser
        ├─ Verify JWT token
        ├─ Extract user ID and role
        └─ Attach to req.user
            │
            └─► API Endpoint Handler
                ├─ Verify user ID matches recipient
                ├─ Check role matches expected role
                └─ If authorized: proceed
                   │
                   └─► Query/Update/Delete notification
                       └─► Return to user
```

## Summary

This architecture provides:
- ✅ Real-time notifications (30s polling)
- ✅ Secure, role-based access
- ✅ Efficient database queries
- ✅ Clean, modular code
- ✅ Responsive UI
- ✅ Auto-cleanup with TTL
- ✅ Scalable design
