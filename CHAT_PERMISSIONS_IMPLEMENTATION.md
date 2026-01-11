# Chat Permissions Implementation - Group and Individual Based

## Overview
Successfully implemented a dual-mode chat permission system that supports both **individual-based** and **group-based** permissions for chat functionality. This allows fine-grained control at individual user level and broad control through role groups.

## Key Features

### 1. **Individual-Based Permissions**
- Business owner can grant specific users permission to chat with specific individuals
- Perfect for one-off permissions or sensitive communications
- Supports bidirectional chat setup
- Each user can have unique permissions independent of their role

### 2. **Group-Based Permissions**
- Business owner can define communication rules between role groups:
  - Manager
  - Supervisor
  - Employee
  - Supplier
- All users in a group inherit the group's communication permissions
- Simplifies management for large teams

### 3. **Supplier Communication**
- Suppliers can communicate based on:
  1. **Individual permissions** set by business owner (specific supplier to specific user)
  2. **Group permissions** if the business owner allows Supplier group to communicate with other groups
- This enables flexible supplier-employee communication workflows

## Backend Implementation

### Model Changes

#### `ChatPermission.js` (Updated)
- Added `permissionType` field: `'individual'` or `'group'`
- **Individual Permission Fields:**
  - `user`: User who can be contacted
  - `userRole`: Role of the user
  - `userName`: Name of the user
  - `allowedUser`: User allowed to contact
  - `allowedUserRole`: Role of allowed user
  - `allowedUserName`: Name of allowed user

- **Group Permission Fields:**
  - `groupRole`: Group/role being contacted (manager, supervisor, employee, supplier)
  - `allowedGroupRole`: Group/role allowed to initiate contact

- Improved indices for efficient querying of both permission types

#### `RolePermissions.js` (Updated)
- Added `canChat` permission to all role levels:
  - Manager: `true`
  - Supervisor: `true`
  - Employee: `true`

### API Endpoints

#### Individual Permissions
```
POST   /api/chat/permissions/individual          - Create/update individual permission
POST   /api/chat/permissions/individual/batch    - Batch update individual permissions
DELETE /api/chat/permissions/:id                 - Delete individual permission
```

#### Group Permissions
```
GET    /api/chat/permissions/group               - Get all group permissions
POST   /api/chat/permissions/group               - Create/update group permission
POST   /api/chat/permissions/group/batch         - Batch update group permissions
DELETE /api/chat/permissions/group/:id           - Delete group permission
```

#### General
```
GET    /api/chat/permissions                     - Get all permissions (both types)
GET    /api/chat/contacts                        - Get list of users current user can chat with
GET    /api/chat/conversation/:userId            - Get conversation with specific user
POST   /api/chat/send                            - Send a message
```

### Core Logic

#### Permission Validation (`canChatWithUser` function)
The system checks permissions in this order:
1. **First Check:** Look for individual permission
   - If `ChatPermission` exists with `permissionType='individual'` and user has permission → **Allow**
   
2. **Second Check:** Look for group-based permission
   - Determine sender's group role (businessowner, manager, supervisor, employee, supplier)
   - Determine recipient's group role
   - If `ChatPermission` exists with `permissionType='group'` matching the roles → **Allow**
   
3. **If neither exists** → **Deny**

#### Contacts Endpoint Logic
The updated `/api/chat/contacts` endpoint:
1. Gets all users with individual permissions for current user
2. Gets all group permissions that apply to current user's role
3. Retrieves all users matching those group roles
4. Combines both sets of users (avoiding duplicates)
5. Returns enriched contact list with unread counts

## Frontend Implementation

### Component: `ChatPermissions.js` (Updated)

#### Tab-Based Interface
- **Individual Permissions Tab:**
  - Select a user from the list
  - Check which users can send them messages
  - Enable/Disable all at once
  - Quick "Enable Two-Way" button for bidirectional setup
  - Search functionality

- **Group-Based Permissions Tab:**
  - Visual matrix showing role group interactions
  - Rows: Groups that initiate messages
  - Columns: Groups that receive messages
  - Toggle permissions at intersection
  - Enable/Disable all group permissions
  - Clear legend explaining the matrix

#### Features
- Separate save buttons for each permission type
- Visual feedback (badges, color coding)
- Loading states
- Error handling with alerts
- Responsive design for mobile/tablet

### Styling Updates
New CSS classes added for:
- Tab navigation (`.chat-permissions-tabs`, `.tab-btn`)
- Group permissions container (`.group-permissions-container`)
- Permission matrix table (`.permissions-table`, `.permission-cell`)
- Custom checkboxes (`.custom-checkbox`)
- Legend and helper text (`.group-permissions-legend`)

## Usage Examples

### Example 1: Individual Permission
```javascript
// Allow John (Employee) to chat with Sarah (Manager)
{
  permissionType: 'individual',
  user: sarahId,
  userRole: 'Employee',
  userName: 'Sarah',
  allowedUser: johnId,
  allowedUserRole: 'Employee',
  allowedUserName: 'John',
  isActive: true
}
```

### Example 2: Group Permission
```javascript
// Allow all Employees to chat with all Managers
{
  permissionType: 'group',
  groupRole: 'manager',
  allowedGroupRole: 'employee',
  isActive: true
}
```

### Example 3: Supplier Communication
```javascript
// Grant Supplier permission to chat with specific Employee
{
  permissionType: 'individual',
  user: employeeId,
  userRole: 'Employee',
  userName: 'John',
  allowedUser: supplierId,
  allowedUserRole: 'Supplier',
  allowedUserName: 'Acme Corp',
  isActive: true
}

// OR allow Supplier group to chat with Employee group
{
  permissionType: 'group',
  groupRole: 'employee',
  allowedGroupRole: 'supplier',
  isActive: true
}
```

## Database Queries Affected

The system now issues queries to:
1. `ChatPermission` with `permissionType` filter
2. `Employee` with `role` field for group role determination
3. `BusinessOwner` for business owner info
4. `Supplier` with `isActive` check
5. `ChatMessage` for message retrieval
6. `Notification` for message notifications

## Migration Notes

If migrating from the old individual-only system:
1. Existing individual permissions don't need modification
2. Set `permissionType='individual'` on all existing records
3. Create new group permissions as needed
4. Test permissions before rolling out

## Security Considerations

1. **Business Owner Only:** Only business owners can manage permissions
2. **Permission Validation:** Every chat request validates permissions (both individual and group)
3. **Supplier Restrictions:** Suppliers cannot initiate new connections; they can only chat with permitted users
4. **Audit Trail:** All permission changes are tracked with `createdAt` and `updatedAt` timestamps

## Testing Checklist

- [ ] Individual permissions work for specific user pairs
- [ ] Group permissions apply to all users in matched groups
- [ ] Bidirectional chat setup works
- [ ] Supplier individual permissions work
- [ ] Supplier group permissions work
- [ ] Contacts list shows correct mix of individual + group permissions
- [ ] Message sending validates both permission types
- [ ] Permission removal prevents further communication
- [ ] Toggle on/off works correctly in UI
- [ ] Batch operations process multiple permissions correctly

## Performance Notes

- Indices on `permissionType`, `groupRole`, and `allowedGroupRole` ensure fast queries
- Group permission checks are O(1) hash lookups
- Contact list caching possible if needed
- Consider pagination for large permission matrices
