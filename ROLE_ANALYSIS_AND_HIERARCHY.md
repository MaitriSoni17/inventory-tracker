# Inventory Tracker - Role Analysis & Proposed Hierarchy

## Current System Analysis

### 📊 Current User Roles

Your system currently has **3 main user roles**:

1. **BusinessOwner** - Organization/Company owner
2. **Employee** - Generic employee
3. **Supplier** - External supplier

---

## 📋 CURRENT ROLE RESPONSIBILITIES & ACCESS CONTROL

### 1. BUSINESS OWNER
**Database Reference**: `BusinessOwner` model  
**Authentication**: Email + Password

#### Full Functionalities Available:
- ✅ Create, Read, Update, Delete (CRUD) - Products
- ✅ CRUD - Categories
- ✅ CRUD - Orders (Customer Orders)
- ✅ CRUD - Supplier Orders
- ✅ CRUD - Warehouses
- ✅ CRUD - Employees (Create, View All, Update, Delete, Change Password)
- ✅ CRUD - Suppliers
- ✅ View Notifications (All notifications)
- ✅ Manage Account Settings
- ✅ Deactivate/Delete Account (with 30-day cancellation window)
- ✅ Employee Management Dashboard
- ✅ Supplier Management Dashboard
- ✅ Full Chatbot Access
- ✅ View Business Metrics & Analytics

#### Access Control:
- Can manage all employees and suppliers
- Can view all products, orders, and warehouses
- Full administrative privileges

**Key Routes**:
- `POST /api/businessowner/createbusinessowner` (Create account)
- `POST /api/businessowner/getbusinessowner` (Get profile)
- `PUT /api/businessowner/updatebusinessowner` (Update profile)
- `POST /api/businessowner/getallemployees` (Manage employees)
- `PUT /api/businessowner/updateemployee/:id`
- `DELETE /api/businessowner/deleteemployee/:id`
- `POST /api/businessowner/getallsuppliers`
- `GET /api/businessowner/notifications`
- `POST /api/businessowner/delete` (Account deletion)

---

### 2. EMPLOYEE (Current - Generic)
**Database Reference**: `Employee` model  
**Authentication**: Email + Password  
**Linked To**: BusinessOwner (via `businessowner` field)

#### Current Functionalities:
- ✅ CRUD - Products (Create, Read, Update - limited to own creations)
- ✅ CRUD - Categories
- ✅ CRUD - Orders (Customer Orders) - View own + BusinessOwner's
- ✅ CRUD - Supplier Orders - Create, Read, Update
- ✅ CRUD - Warehouses
- ✅ View/Update Own Profile
- ✅ View Notifications
- ✅ Manage Preferences (Email alerts, notifications)
- ✅ Update Password
- ✅ Delete Account (with 30-day cancellation window)
- ✅ Full Chatbot Access
- ✅ Access Dashboard with Stats

#### Current Restrictions:
- ❌ Cannot create/manage other employees
- ❌ Cannot manage suppliers
- ❌ Cannot view other employees' details
- ❌ Cannot modify products created by BusinessOwner (only own)
- ❌ Cannot manage business settings
- ❌ Cannot see deletion requests (admin feature)

**Key Routes** (with `fetchemployee` middleware):
- `POST /api/employee/getemployee` (Get own profile)
- `PUT /api/employee/updateemployee` (Update own profile)
- `POST /api/products/createproduct` (Create products)
- `POST /api/products/getproduct` (Get own + owner's products)
- `POST /api/customerorders/createcustomerorder`
- `POST /api/orders/getorders` (Get own + owner's)
- `POST /api/warehouse/createwarehouse`
- `PUT /api/employee/updatepreferences`
- `DELETE /api/employee/deleteaccount`

**Key Routes** (with `fetchbusinessowner` middleware - Restricted):
- `POST /api/employee/createemployee` - **ONLY BusinessOwner can create employees**
- `POST /api/employee/getallemployees` - **ONLY BusinessOwner can view all**
- `PUT /api/employee/updateemployee/:id` - **ONLY BusinessOwner can update others**
- `DELETE /api/employee/deleteemployee/:id` - **ONLY BusinessOwner can delete**

---

### 3. SUPPLIER
**Database Reference**: `Supplier` model  
**Authentication**: Email + Password  
**Linked To**: BusinessOwner

#### Functionalities:
- ✅ View Supplier Orders (Incoming orders from BusinessOwner)
- ✅ Update Own Profile
- ✅ Update Order Status & Payment Status
- ✅ View Notifications
- ✅ Update Password
- ✅ Deactivate Account
- ✅ Delete Account

#### Restrictions:
- ❌ Cannot create products
- ❌ Cannot manage inventory
- ❌ Cannot manage employees
- ❌ Limited to supplier-specific operations

---

## 🎯 PROPOSED EMPLOYEE ROLE HIERARCHY

### New Employee Classification System:

```
Employee Hierarchy:
    │
    ├─── MANAGER
    │    ├─ Reports to: BusinessOwner
    │    ├─ Supervises: Supervisors + Employees
    │    └─ Highest operational authority
    │
    ├─── SUPERVISOR  
    │    ├─ Reports to: Manager or BusinessOwner
    │    ├─ Supervises: Employees
    │    └─ Mid-level operational authority
    │
    └─── EMPLOYEE (Basic)
         ├─ Reports to: Supervisor or Manager
         ├─ Supervises: Nobody
         └─ Standard operational access
```

---

## 📊 DETAILED ROLE MATRIX: FUNCTIONALITIES & RESTRICTIONS

### Access Level Definition:
- **Owner**: BusinessOwner only
- **Manager**: ⭐ Highest employee level
- **Supervisor**: ⭐ Mid-level employee
- **Employee**: ⭐ Basic employee level
- **View Own**: Can only view their own data
- **View Team**: Can view team members' data

---

### 1. PRODUCT MANAGEMENT

| Feature | Owner | Manager | Supervisor | Employee |
|---------|-------|---------|-----------|----------|
| Create Product | ✅ | ✅ | ✅ | ✅ |
| View All Products | ✅ | ✅ | ✅ | ✅ |
| View Own Products | ✅ | ✅ | ✅ | ✅ |
| Edit Own Product | ✅ | ✅ | ✅ | ✅ |
| Edit Other's Product | ✅ | ✅ (team) | ✅ (team) | ❌ |
| Delete Product | ✅ | ✅ | ✅ | ❌ |
| View Product History | ✅ | ✅ | ✅ | ✅ |

---

### 2. INVENTORY & WAREHOUSE MANAGEMENT

| Feature | Owner | Manager | Supervisor | Employee |
|---------|-------|---------|-----------|----------|
| Create Warehouse | ✅ | ✅ | ❌ | ❌ |
| View Warehouses | ✅ | ✅ | ✅ | ✅ |
| Edit Warehouse | ✅ | ✅ | ❌ | ❌ |
| Delete Warehouse | ✅ | ✅ | ❌ | ❌ |
| Track Inventory | ✅ | ✅ | ✅ | ✅ |
| Low Stock Alerts | ✅ | ✅ | ✅ | ✅ |
| Manage Stock Levels | ✅ | ✅ | ✅ | ✅ |

---

### 3. ORDER MANAGEMENT (Customer Orders)

| Feature | Owner | Manager | Supervisor | Employee |
|---------|-------|---------|-----------|----------|
| Create Order | ✅ | ✅ | ✅ | ✅ |
| View All Orders | ✅ | ✅ | ✅ | ✅ |
| View Own Orders | ✅ | ✅ | ✅ | ✅ |
| Edit Own Order | ✅ | ✅ | ✅ | ✅ |
| Edit Others' Order | ✅ | ✅ (team) | ✅ (team) | ❌ |
| Change Order Status | ✅ | ✅ | ✅ | ✅ |
| Delete Order | ✅ | ✅ | ✅ | ❌ |
| Export Order Reports | ✅ | ✅ | ✅ | ❌ |

---

### 4. SUPPLIER ORDER MANAGEMENT

| Feature | Owner | Manager | Supervisor | Employee |
|---------|-------|---------|-----------|----------|
| Create Supplier Order | ✅ | ✅ | ✅ | ✅ |
| View All Supplier Orders | ✅ | ✅ | ✅ | ✅ |
| View Own Orders | ✅ | ✅ | ✅ | ✅ |
| Update Order Status | ✅ | ✅ | ✅ | ✅ |
| Update Payment Status | ✅ | ✅ | ✅ | ✅ |
| Delete Supplier Order | ✅ | ✅ | ✅ | ❌ |
| Manage Supplier Relations | ✅ | ✅ | ❌ | ❌ |

---

### 5. CATEGORY MANAGEMENT

| Feature | Owner | Manager | Supervisor | Employee |
|---------|-------|---------|-----------|----------|
| Create Category | ✅ | ✅ | ✅ | ✅ |
| View Categories | ✅ | ✅ | ✅ | ✅ |
| Edit Category | ✅ | ✅ | ❌ | ❌ |
| Delete Category | ✅ | ✅ | ❌ | ❌ |

---

### 6. EMPLOYEE & TEAM MANAGEMENT

| Feature | Owner | Manager | Supervisor | Employee |
|---------|-------|---------|-----------|----------|
| View All Employees | ✅ | ✅ | ✅ | ❌ |
| View Team Members | ✅ | ✅ | ✅ | ❌ |
| Create Employee | ✅ | ❌ | ❌ | ❌ |
| Edit Employee Details | ✅ | ✅ (team) | ✅ (direct reports) | View Own |
| View Employee Performance | ✅ | ✅ | ✅ | ❌ |
| Change Employee Password | ✅ | ✅ (team) | ✅ (direct reports) | Own Only |
| Assign/Reassign Employee | ✅ | ✅ | ❌ | ❌ |
| Delete Employee | ✅ | ❌ | ❌ | ❌ |

---

### 7. REPORTS & ANALYTICS

| Feature | Owner | Manager | Supervisor | Employee |
|---------|-------|---------|-----------|----------|
| Dashboard Access | ✅ | ✅ | ✅ | ✅ |
| View All Statistics | ✅ | ✅ | ✅ (Team) | ✅ (Own) |
| Generate Reports | ✅ | ✅ | ✅ (Team) | ❌ |
| Export Data | ✅ | ✅ | ✅ | ❌ |
| View Metrics | ✅ | ✅ | ✅ | ✅ |

---

### 8. NOTIFICATIONS & COMMUNICATION

| Feature | Owner | Manager | Supervisor | Employee |
|---------|-------|---------|-----------|----------|
| Send Notifications | ✅ | ✅ | ✅ | ❌ |
| View Notifications | ✅ | ✅ | ✅ | ✅ |
| Chatbot Access | ✅ | ✅ | ✅ | ✅ |
| Email Alerts | ✅ | ✅ | ✅ | ✅ |
| Manage Preferences | ✅ | ✅ | ✅ | ✅ |

---

### 9. ACCOUNT & SETTINGS

| Feature | Owner | Manager | Supervisor | Employee |
|---------|-------|---------|-----------|----------|
| View Own Profile | ✅ | ✅ | ✅ | ✅ |
| Update Own Profile | ✅ | ✅ | ✅ | ✅ |
| Change Own Password | ✅ | ✅ | ✅ | ✅ |
| Delete Own Account | ✅ | ✅ | ✅ | ✅ |
| Manage Business Settings | ✅ | ❌ | ❌ | ❌ |

---

## 🔐 ROLE-BASED RESTRICTIONS SUMMARY

### MANAGER Restrictions:
- ❌ Cannot create/delete employees
- ❌ Cannot delete warehouses or manage high-level inventory
- ❌ Cannot manage suppliers directly
- ❌ Cannot access business settings
- ❌ Cannot send order to other teams
- ⚠️ Can only manage team members & direct reports
- ⚠️ Cannot modify other Manager's data

### SUPERVISOR Restrictions:
- ❌ Cannot create/delete employees
- ❌ Cannot create/edit/delete warehouses
- ❌ Cannot create/edit categories
- ❌ Cannot manage suppliers
- ❌ Cannot create deletion requests for others
- ❌ Cannot delete products
- ❌ Cannot generate export reports
- ⚠️ Can only manage direct reports & their work
- ⚠️ View-only access to other team's products/orders

### EMPLOYEE Restrictions:
- ❌ Cannot delete products or orders
- ❌ Cannot view other employees
- ❌ Cannot manage any employees
- ❌ Cannot create/edit/delete categories
- ❌ Cannot create/edit/delete warehouses
- ❌ Cannot edit other employees' products or orders
- ❌ Cannot view business analytics/reports
- ❌ Cannot send notifications
- ❌ View-only access for most operations
- ⚠️ Limited to own created items and general inventory

---

## 🗂️ DATABASE SCHEMA MODIFICATIONS NEEDED

### Update Employee Model:

```javascript
// Current Employee Schema (Add these fields)
const Employee = new Schema({
    // ... existing fields ...
    businessowner: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessOwner' },
    role: { 
        type: String, 
        enum: ['employee', 'supervisor', 'manager'],
        default: 'employee' 
    },
    // NEW FIELDS:
    reportingTo: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Employee',
        default: null // null if reports directly to BusinessOwner
    },
    department: { 
        type: String,
        default: null 
    },
    subordinates: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Employee' 
    }],
    permissions: {
        canCreateProducts: Boolean,
        canDeleteProducts: Boolean,
        canCreateWarehouse: Boolean,
        canDeleteWarehouse: Boolean,
        canDeleteOrders: Boolean,
        canManageEmployees: Boolean,
        canViewAnalytics: Boolean,
        canExportReports: Boolean,
        // ... more custom permissions
    }
});
```

---

## 🚀 IMPLEMENTATION ROADMAP

### Phase 1: Database Updates
1. Update Employee model with new role field & relationships
2. Add `reportingTo`, `department`, `subordinates` fields
3. Create migration script for existing employees (set all to 'employee')

### Phase 2: Backend Authentication & Authorization
1. Update middleware to support 3 roles
2. Add role-based access control (RBAC) middleware
3. Update fetchemployee middleware to handle all 3 roles
4. Add permission checking in all routes

### Phase 3: Route-Level Access Control
1. Add role validation to each endpoint
2. Implement permission checks
3. Add data filtering based on role hierarchy

### Phase 4: Frontend Updates
1. Update dashboard views based on role
2. Hide/show features based on role
3. Update navigation menu
4. Add role-based UI components

### Phase 5: Features & UI
1. Employee hierarchy visualization
2. Team management interface
3. Performance analytics per role
4. Assignment management

---

## 📝 SUMMARY: What Each Role Gets

### **MANAGER** - Team Lead Level
**Purpose**: Lead a team of supervisors and employees, handle operational decisions
- **Can Do**: Everything except create/delete employees, manage suppliers, access business settings
- **Reports To**: Business Owner
- **Manages**: Supervisors, Employees in their team
- **View Access**: Full visibility of team's products, orders, inventory
- **Edit Access**: Own work + team work (products, orders, warehouse items)

### **SUPERVISOR** - Mid-Level Coordinator
**Purpose**: Supervise individual employees, coordinate daily operations
- **Can Do**: Create/edit products & orders, manage inventory, view team performance
- **Reports To**: Manager or Business Owner
- **Manages**: Employees in their team only
- **View Access**: Own + direct reports' products and orders
- **Edit Access**: Own work + direct reports' work (supervise)

### **EMPLOYEE** - Basic Worker
**Purpose**: Execute tasks, handle individual assignments
- **Can Do**: Create/edit own products & orders, manage inventory, view notifications
- **Reports To**: Supervisor or Manager
- **Manages**: Nobody
- **View Access**: Own work + general company inventory
- **Edit Access**: Only own created items

---

## 🎓 Key Benefits of This Hierarchy

1. **Clear Chain of Command**: Employees → Supervisors → Managers → Business Owner
2. **Scalability**: Can manage large teams with structured hierarchy
3. **Accountability**: Each role has clear responsibilities
4. **Security**: Granular permissions prevent unauthorized access
5. **Performance Tracking**: Easier to monitor team performance
6. **Flexibility**: Custom permissions can be assigned per role
7. **Compliance**: Better audit trails with defined roles
8. **User Experience**: Simplified UI based on role

---

## 💡 ADVANCED FEATURES (Future)

- Department-based access control
- Custom role creation
- Time-based permissions (temporary access)
- Delegation system (managers delegate tasks)
- Multi-level approval workflows
- Role-based notifications
- Performance dashboards per role
- Customizable role templates
