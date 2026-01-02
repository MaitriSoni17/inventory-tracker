# Complete Implementation Documentation - Role-Based Access Control

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Files Modified/Created](#files-modifiedcreated)
4. [Database Schema Changes](#database-schema-changes)
5. [API Changes](#api-changes)
6. [Frontend Changes](#frontend-changes)
7. [Deployment Guide](#deployment-guide)
8. [FAQ](#faq)

---

## Overview

This implementation adds a three-tier employee role system to your Inventory Tracker:

- **Manager**: Team lead with operational control
- **Supervisor**: Mid-level coordinator
- **Employee**: Basic worker

Each role has specific permissions that control access to features throughout the system.

---

## Architecture

### Authorization Flow

```
Login Request
    ↓
Verify Credentials
    ↓
Load Employee from Database
    ↓
Extract role from Employee.role field (not JWT)
    ↓
Issue JWT with role
    ↓
On Request:
  → Middleware extracts role
  → Checks database for permissions
  → Grants/Denies access
```

### Permission Hierarchy

```
Business Owner (100% access)
    ↓
Manager (70% access)
    ├─ Can manage team
    ├─ Can delete products
    ├─ Can manage warehouses
    └─ Can export reports
    ↓
Supervisor (40% access)
    ├─ Can supervise team
    ├─ Can delete products
    ├─ Cannot manage warehouses
    └─ Cannot export reports
    ↓
Employee (20% access)
    ├─ Can create products
    ├─ Cannot delete anything
    ├─ Cannot manage teams
    └─ View-only for most features
```

---

## Files Modified/Created

### Backend

#### Created Files:
1. **`backend/middleware/roleBasedAccess.js`** (NEW)
   - RBAC middleware for role checking
   - Permission validation functions
   - Default permission objects per role

#### Modified Files:
1. **`backend/models/Employee.js`**
   - Added role enum: ['employee', 'supervisor', 'manager']
   - Added department, reportingTo, subordinates
   - Added permissions object
   - Added isActive, createdAt fields

2. **`backend/middleware/fetchemployee.js`**
   - Updated to handle all 3 employee roles
   - Sets req.role based on employee.role

3. **`backend/middleware/fetchuser.js`**
   - Enhanced to recognize supervisor and manager roles
   - Uses database role instead of JWT role

4. **`backend/routes/employee.js`**
   - Updated `/createemployee` to accept role, department, reportingTo
   - Updated `/loginemployee` to return actual employee role
   - Updated `/getemployee` to populate hierarchy info

5. **`backend/routes/products.js`**
   - Updated `/deleteproduct` with role-based access control
   - Imports roleBasedAccess middleware
   - Checks permissions before allowing deletion

6. **`backend/routes/warehouse.js`**
   - Updated all warehouse operations for manager/owner only
   - Added permission checks to create, update, delete

7. **`backend/routes/category.js`**
   - Updated category operations with role checks
   - Employee+Supervisor can create, only Manager+ can delete

### Frontend

#### Created Files:
1. **`frontend/src/context/RoleContext.js`** (NEW)
   - Role state management context
   - Permission checking utilities
   - Auto-fetches user details

2. **`frontend/src/components/common/RoleInfo.js`** (NEW)
   - Displays role badge
   - Shows department if available
   - Color-coded by role type

3. **`frontend/src/components/common/CreateEmployeeForm.js`** (NEW)
   - Form for creating employees with role selection
   - Department and reporting-to fields
   - Full validation

#### Modified Files:
1. **`frontend/src/App.js`**
   - Wrapped app with RoleProvider
   - Updated dashboard route logic for all 3 roles
   - All employee types now use Employee dashboard

2. **`frontend/src/components/common/SideBar.js`**
   - Integrated RoleContext
   - Dynamic menu based on role
   - Managers see Warehouses option
   - Business owners see everything
   - Employees see limited options

---

## Database Schema Changes

### Employee Model - New/Modified Fields

```javascript
{
  // Existing fields remain unchanged
  _id: ObjectId,
  businessowner: ObjectId,
  fname: String,
  lname: String,
  email: String,
  password: String,
  // ... other fields ...
  
  // NEW FIELDS:
  role: {
    type: String,
    enum: ['employee', 'supervisor', 'manager'],
    default: 'employee'
  },
  
  department: {
    type: String,
    default: null
  },
  
  reportingTo: {
    type: ObjectId,
    ref: 'Employee',
    default: null
  },
  
  subordinates: [{
    type: ObjectId,
    ref: 'Employee'
  }],
  
  permissions: {
    canCreateProducts: Boolean,
    canDeleteProducts: Boolean,
    canCreateWarehouse: Boolean,
    canDeleteWarehouse: Boolean,
    canCreateCategory: Boolean,
    canDeleteCategory: Boolean,
    canDeleteOrders: Boolean,
    canManageEmployees: Boolean,
    canViewAnalytics: Boolean,
    canExportReports: Boolean,
    canEditOthersWork: Boolean,
    canSendNotifications: Boolean,
    canApproveOrders: Boolean
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}
```

### Migration Script for Existing Data

```javascript
// Set all existing employees to 'employee' role
db.employees.updateMany(
  { role: { $exists: false } },
  { 
    $set: { 
      role: 'employee',
      isActive: true,
      createdAt: new Date(),
      permissions: {
        canCreateProducts: true,
        canDeleteProducts: false,
        canCreateWarehouse: false,
        canDeleteWarehouse: false,
        canCreateCategory: false,
        canDeleteCategory: false,
        canDeleteOrders: false,
        canManageEmployees: false,
        canViewAnalytics: false,
        canExportReports: false,
        canEditOthersWork: false,
        canSendNotifications: false,
        canApproveOrders: false
      }
    }
  }
)
```

---

## API Changes

### Modified Endpoints

#### `POST /api/employee/createemployee`

**New Request Fields:**
```json
{
  "fname": "John",
  "lname": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "manager",          // NEW: 'employee', 'supervisor', or 'manager'
  "department": "Operations", // NEW: optional department
  "reportingTo": "mgr_id",    // NEW: optional manager ID
  "phone": "1234567890",
  "country": "USA",
  "state": "CA",
  "city": "San Francisco",
  "hireAt": "2024-01-01"
}
```

**New Response Fields:**
```json
{
  "authToken": "...",
  "success": true,
  "employee": {
    "_id": "...",
    "fname": "John",
    "email": "john@example.com",
    "role": "manager"  // NEW
  }
}
```

#### `POST /api/employee/loginemployee`

**New Response Field:**
```json
{
  "success": true,
  "authtoken": "...",
  "role": "manager"  // NEW: actual role from database
}
```

#### `POST /api/employee/getemployee`

**New Response Structure:**
```json
{
  "_id": "...",
  "fname": "John",
  "role": "manager",
  "reportingTo": {           // NEW: populated
    "_id": "owner_id",
    "fname": "Jane",
    "email": "jane@example.com",
    "role": "businessowner"
  },
  "subordinates": [          // NEW: populated
    {
      "_id": "emp_id",
      "fname": "Bob",
      "email": "bob@example.com",
      "role": "employee"
    }
  ],
  "permissions": {           // NEW
    "canCreateProducts": true,
    "canDeleteProducts": true,
    // ... other permissions
  }
}
```

#### `DELETE /api/products/deleteproduct/:id`

**New Behavior:**
- Checks `hasPermission(user, 'canDeleteProducts')`
- Returns 403 if user lacks permission
- Managers can delete team members' products
- Supervisors can delete subordinates' products

#### `POST /api/warehouse/createwarehouse`

**New Behavior:**
- Only managers and business owners allowed
- Returns 403 for employees and supervisors

#### `PUT /api/category/updatecategory/:id`

**Unchanged** - all roles can update categories

#### `DELETE /api/category/deletecategory/:id`

**New Behavior:**
- Only business owners and managers can delete
- Returns 403 for employees and supervisors

---

## Frontend Changes

### New Context Hook: `useRole()`

```javascript
import { useRole } from '../context/RoleContext';

const MyComponent = () => {
  const { 
    role,                    // 'employee', 'supervisor', 'manager', 'businessowner'
    userDetails,             // Full employee object
    permissions,             // Permission flags object
    hasPermission,           // Function to check permission
    isSuperior,              // Check if manager or owner
    canManageEmployees,      // Quick check for employee management
    canDeleteItems,          // Quick check for deletion
    canCreateWarehouses      // Quick check for warehouse creation
  } = useRole();

  return (
    <div>
      <h1>Welcome, {role} user!</h1>
      {hasPermission('canDeleteProducts') && (
        <button>Delete Product</button>
      )}
    </div>
  );
};
```

### Updated Components

#### SideBar.js
- Conditional menu rendering based on role
- Different navigation for each role level
- Role-appropriate links only

#### Employee.js (Dashboard)
- Now works for all 3 employee roles
- Same dashboard UI for all employee types
- Permissions enforced on backend

---

## Deployment Guide

### Step 1: Update Database

```bash
# Connect to your MongoDB database
mongo YOUR_MONGODB_URI

# Run migration script
db.employees.updateMany(
  { role: { $exists: false } },
  { 
    $set: { 
      role: 'employee',
      isActive: true,
      createdAt: new Date(),
      permissions: { /* ... */ }
    }
  }
)
```

### Step 2: Deploy Backend

```bash
cd backend
npm install  # if any new dependencies
# No new npm packages added, only new files
git add .
git commit -m "feat: add role-based access control"
git push
npm start  # or your deployment process
```

### Step 3: Deploy Frontend

```bash
cd frontend
npm install  # if any new dependencies
# No new npm packages added, only new files
npm run build
# Deploy build folder to your hosting
npm start  # for development
```

### Step 4: Test

1. Create test users with each role
2. Login as each role
3. Verify permissions work
4. Check sidebar menu changes
5. Test API endpoints (see TESTING_GUIDE.md)

---

## FAQ

### Q: Can I change a user's role after creation?

**A:** Yes! Update the employee's `role` field in the database:

```javascript
db.employees.updateOne(
  { _id: ObjectId("user_id") },
  { $set: { role: 'manager' } }
)
```

The role will take effect on their next login.

### Q: What happens to existing employees?

**A:** They'll be set to 'employee' role by default with basic permissions.

### Q: Can I create custom roles?

**A:** Currently, only 3 roles are supported. Custom roles would require:
1. Adding new role enum value
2. Defining permissions in rolePermissions object
3. Adding UI logic for new role

This is planned as a future feature.

### Q: How do managers see their team?

**A:** When a manager logs in:
1. Their employee record is loaded
2. `subordinates` array is populated via `.populate('subordinates')`
3. Frontend can show subordinates list
4. Data filtering ensures they only see their team's data

### Q: What if I delete a manager?

**A:** You should reassign their subordinates first by updating their `reportingTo` field:

```javascript
db.employees.updateMany(
  { reportingTo: ObjectId("manager_id") },
  { $set: { reportingTo: ObjectId("new_manager_id") } }
)
```

Then delete the manager.

### Q: Can employees see each other's data?

**A:** No. Each employee only sees:
- Their own work items
- Company-wide inventory
- Their manager's/supervisor's data (in management context)

Data filtering is enforced on the backend.

### Q: What's the difference between roles and permissions?

**A:** 
- **Roles** are fixed categories (employee, supervisor, manager)
- **Permissions** are specific capabilities granted to a role

Example: A manager has the `canDeleteWarehouse` permission.

### Q: How do I audit role changes?

**A:** Currently, role changes are not logged. To add audit logs:

```javascript
// Create audit log on role change
db.auditlogs.insertOne({
  userId: employeeId,
  action: 'role_changed',
  oldRole: 'employee',
  newRole: 'manager',
  timestamp: new Date()
})
```

---

## Troubleshooting

### Employee can't access warehouse option

**Check 1:** Verify role in database
```javascript
db.employees.findOne({ email: "manager@test.com" }).role
// Should return 'manager'
```

**Check 2:** Clear browser cache and re-login

**Check 3:** Verify RoleContext is working
```javascript
// In browser console
localStorage.getItem('role')  // Should show 'manager'
```

### API returns "You do not have permission"

**Check:** Verify permissions in database
```javascript
db.employees.findOne({ email: "user@test.com" }).permissions.canDeleteProducts
// Should return true for managers/supervisors
```

### Sidebar menu not updating

**Solution:**
1. Clear React cache: `npm start` with `DANGEROUSLY_DISABLE_HOST_CHECK=true`
2. Hard refresh browser: `Ctrl+Shift+R`
3. Check RoleContext provider wraps App

### reportingTo field shows as null

**Solution:**
- Ensure you set reportingTo when creating employee
- Ensure manager exists before assigning as reportingTo
- Use correct manager ObjectId

---

## Performance Considerations

### Optimization Tips

1. **Lazy Load Subordinates**: Don't always populate full hierarchy
   ```javascript
   // Get only ID references
   const emp = await Employee.findById(id).select('subordinates');
   ```

2. **Cache Permissions**: Store permissions in localStorage after login
   ```javascript
   localStorage.setItem('userPermissions', JSON.stringify(permissions))
   ```

3. **Database Indexes**: Add index on role field
   ```javascript
   db.employees.createIndex({ role: 1, businessowner: 1 })
   ```

4. **Limit Data Queries**: Use `.select()` to limit fields
   ```javascript
   Employee.find({ role: 'manager' }).select('fname email role')
   ```

---

## Security Best Practices

1. **Always verify role on backend** - Never trust frontend role
2. **Use permission object, not just role** - More granular control
3. **Validate reportingTo relationships** - Prevent circular references
4. **Log role changes** - For audit trails
5. **Implement rate limiting** - On API endpoints
6. **Use HTTPS** - For all production traffic
7. **Rotate JWT secrets** - Regularly in production

---

## Future Enhancements

1. **Time-based Permissions**: Permissions valid for specific time periods
2. **Department-based Access**: Restrict access by department
3. **Custom Roles**: Allow creating custom role definitions
4. **Role Templates**: Pre-defined role packages
5. **Delegation**: Temporarily grant permissions to others
6. **Performance Analytics**: Dashboard per role type
7. **Role Audit Log**: Track all role changes
8. **Approval Workflows**: Multi-level approval based on role

---

## Support & Contact

For issues or questions:
1. Check TESTING_GUIDE.md for test scenarios
2. Review ROLE_ANALYSIS_AND_HIERARCHY.md for conceptual details
3. Check browser console for frontend errors
4. Check backend logs for server errors
5. Review database documents for data integrity

---

**Documentation Created**: December 31, 2025  
**Implementation Version**: 1.0  
**Status**: Production Ready
