# Implementation Guide - Chat Permissions with Group and Individual Modes

## What Changed

Your chat permissions system has been completely redesigned to support both **individual-based** and **group-based** permissions, similar to your existing role-based permissions system.

## For Business Owners

### Individual Permissions Tab
Use this to grant specific users permission to chat with specific team members.

**How to Use:**
1. Click "Individual Permissions" tab
2. Select a user from the left panel
3. Check the boxes next to users who should be able to message them
4. Click "Save Permissions"

**Features:**
- Search users to find them quickly
- "Enable All" / "Disable All" buttons for quick setup
- "Enable Two-Way" button to set up bidirectional communication automatically
- Shows number of active permissions per user

### Group-Based Permissions Tab
Use this to define communication rules between role groups. When enabled, all users in a group can communicate with users in other groups.

**How to Use:**
1. Click "Group-Based Permissions" tab
2. Use the table matrix to check/uncheck role combinations
3. **Rows** = Group that sends messages
4. **Columns** = Group that receives messages
5. Click "Save Permissions"

**Role Groups Available:**
- Manager
- Supervisor  
- Employee
- Supplier

**Example:**
- Allow Employees (row) to chat with Managers (column): Check the box at intersection
- Allow Suppliers (row) to chat with Employees (column): Check the box at intersection

## For Suppliers

Suppliers can now communicate with:
1. **Individual users** - If business owner grants them individual permission
2. **User groups** - If business owner enables supplier group communication

This means suppliers can have access to communicate with employees, managers, or supervisors based on business owner configuration.

## How the System Works

The permission checking is hierarchical:
1. First checks if there's a specific individual permission → If yes, allow
2. If no individual permission, checks if group permissions match → If yes, allow
3. If neither exists → Block

This means:
- **Individual permissions override everything**
- **Group permissions provide fallback/default behavior**
- **Most restrictive rule wins for denials**

## API Changes

### New Endpoints for Group Permissions
```
GET  /api/chat/permissions/group              # Get group permissions
POST /api/chat/permissions/group              # Create group permission
POST /api/chat/permissions/group/batch        # Batch update groups
DEL  /api/chat/permissions/group/:id          # Delete group permission
```

### Updated Endpoints
```
POST /api/chat/permissions/individual         # Individual permissions
POST /api/chat/permissions/individual/batch   # Batch update individuals
GET  /api/chat/contacts                       # Now respects both permission types
POST /api/chat/send                           # Now checks both permission types
```

## Permission Types in Database

### Individual Permission Record
```javascript
{
  permissionType: 'individual',
  user: userId,              // Who can be contacted
  userRole: 'Employee',      // Their role
  userName: 'John',          // Their name
  allowedUser: userId2,      // Who is allowed to contact
  allowedUserRole: 'Manager',
  allowedUserName: 'Sarah',
  businessOwner: businessOwnerId,
  isActive: true
}
```

### Group Permission Record
```javascript
{
  permissionType: 'group',
  groupRole: 'employee',          // Who can be contacted
  allowedGroupRole: 'manager',    // Who is allowed to contact
  businessOwner: businessOwnerId,
  isActive: true
}
```

## Migration Path (if coming from old system)

If you had previous individual permissions:
1. They are still valid - just ensure `permissionType: 'individual'` is set
2. New group permissions work alongside old individual ones
3. Both types coexist peacefully - no conflict

## Best Practices

### For Individual Permissions
- Use when you need one-off permissions
- Perfect for sensitive contacts or special relationships
- Good for suppliers with specific employee access

### For Group Permissions
- Use for broad permission structures
- Reduces management overhead
- Better for scaling teams
- Think of it as "default" communication rules

### Combined Strategy
- Set up group permissions as baseline (e.g., "Employees can chat with Managers")
- Use individual permissions for exceptions (e.g., "This Supplier can chat with John")

## Testing Your Setup

1. **Test Individual Permission:**
   - Grant User A permission to chat with User B only
   - User A should see User B in contacts
   - Other users should not see each other

2. **Test Group Permission:**
   - Set Employee group can chat with Manager group
   - Any employee should be able to contact any manager
   - Verify it works for new employees automatically

3. **Test Supplier:**
   - Grant Supplier individual permission to Employee
   - OR enable Supplier group to chat with Employee group
   - Supplier should be in the employee's contacts

4. **Test Bidirectional:**
   - Use "Enable Two-Way" for user pairs
   - Both users should be able to message each other

## Troubleshooting

**Problem:** Supplier can't message anyone
- **Solution:** Check if individual permission is set OR group permission exists

**Problem:** Groups not working
- **Solution:** Verify group names (manager, supervisor, employee, supplier - lowercase)

**Problem:** Contacts list is empty
- **Solution:** You likely have no permissions set. Add individual or group permissions.

**Problem:** Old individual permissions stopped working
- **Solution:** Ensure `permissionType` is set to `'individual'` on those records

## Database Updates Needed

Run these queries to update existing permissions (if migrating):
```javascript
// Set permissionType for all existing permissions that have user field
db.chatpermissions.updateMany(
  { user: { $ne: null }, permissionType: { $exists: false } },
  { $set: { permissionType: 'individual' } }
)
```

## Questions?

Refer to `CHAT_PERMISSIONS_IMPLEMENTATION.md` for detailed technical documentation.
