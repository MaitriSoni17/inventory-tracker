# Role-Based Access Control (RBAC) - Content Accessibility Guide

## Employee Types & Hierarchy

Your application has **4 main user types** in a hierarchical structure:

```
┌─────────────────────────────────────────────────────────────────┐
│                      BUSINESS OWNER                             │
│                   (Full System Control)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐      ┌──────────────────────────────┐  │
│  │      MANAGER         │      │      SUPPLIER                │  │
│  │  (Team Leadership)   │      │  (External Partner)          │  │
│  └──────────────────────┘      └──────────────────────────────┘  │
│          │                                                         │
│          └─────────────────────┐                                  │
│                                │                                  │
│     ┌──────────────────┐  ┌────────────────┐                    │
│     │    SUPERVISOR    │  │    EMPLOYEE    │                    │
│     │  (Team Lead)     │  │  (Basic User)  │                    │
│     └──────────────────┘  └────────────────┘                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. BUSINESS OWNER (Role: `businessowner`)

**Full Administrative Access** - Can access everything

### 📊 Dashboard Access
- ✅ Main dashboard with overview
- ✅ View all statistics and analytics
- ✅ View employee performance metrics
- ✅ View orders and inventory data

### 📦 Inventory Management
- ✅ **Categories** - Create, Read, Update, Delete
- ✅ **Products** - Create, Read, Update, Delete
- ✅ **Orders** - Create, Read, Update, Delete
- ✅ **Warehouses** - Create, Read, Update, Delete (Full Control)

### 👥 Employee Management
- ✅ **Create Employees** - Hire new employees with any role
- ✅ **View Employees** - See all employees and subordinates
- ✅ **Edit Employees** - Modify employee details, roles, assignments
- ✅ **Delete Employees** - Terminate employees
- ✅ **Manage Hierarchies** - Assign managers/supervisors to teams
- ✅ View/Edit all employee work (products, orders, etc.)

### 🤝 Supplier Management
- ✅ **Create Suppliers** - Add new suppliers
- ✅ **View Suppliers** - See all suppliers
- ✅ **Edit Suppliers** - Modify supplier information
- ✅ **Delete Suppliers** - Remove suppliers
- ✅ **Supplier Orders** - Create, view, update orders with suppliers

### ⚙️ System Settings
- ✅ Profile management
- ✅ Change password
- ✅ Account settings
- ✅ System preferences

### 📧 Notifications
- ✅ Send notifications to employees
- ✅ View all system notifications
- ✅ Approve orders
- ✅ Export reports

---

## 2. MANAGER (Role: `manager`)

**Leadership & Team Control** - Can manage their team

### 📊 Dashboard Access
- ✅ Manager dashboard
- ✅ View team analytics
- ✅ View team performance
- ✅ View team orders and inventory

### 📦 Inventory Management
- ✅ **Categories** - Create, Read, Update (Cannot Delete)
- ✅ **Products** - Create, Read, Update, Delete
- ✅ **Orders** - Create, Read, Update, Delete
- ✅ **Warehouses** - Create, Read, Update, Delete (Full Warehouse Access)

### 👥 Employee Management
- ✅ **Create Employees** - Add new team members
- ✅ **View Employees** - See direct reports (subordinates)
- ✅ **Edit Employees** - Modify their team member details
- ✅ **Cannot Delete** - Cannot terminate employees
- ✅ **Manage Team Hierarchy** - Assign supervisors to their team
- ✅ Edit/Approve work done by direct reports

### 🤝 Supplier Management
- ❌ **No Access** - Cannot manage suppliers

### ⚙️ System Settings
- ✅ Profile management
- ✅ Change password
- ✅ View team notifications

### 📊 Approvals & Notifications
- ✅ Approve team orders
- ✅ Receive notifications about team activities

---

## 3. SUPERVISOR (Role: `supervisor`)

**Direct Team Lead** - Limited management of direct reports only

### 📊 Dashboard Access
- ✅ Supervisor dashboard
- ✅ View assigned team data
- ✅ View team's products and orders

### 📦 Inventory Management
- ✅ **Categories** - Create, Read, Update (Cannot Delete)
- ✅ **Products** - Create, Read, Update, Delete
- ✅ **Orders** - Create, Read, Update, Delete
- ❌ **Warehouses** - Cannot access warehouse management

### 👥 Employee Management
- ❌ **Cannot Create Employees**
- ✅ **View Employees** - Can see their direct reports ONLY
- ✅ **Edit Employee Work** - Can edit work done by their direct reports
- ❌ **Cannot Delete or Edit Personnel Info**

### 🤝 Supplier Management
- ❌ **No Access** - Cannot manage suppliers

### ⚙️ System Settings
- ✅ Profile management
- ✅ Change password

### 📊 Reports & Analytics
- ✅ View team analytics
- ❌ Cannot export reports
- ❌ Cannot send notifications

---

## 4. EMPLOYEE (Role: `employee`)

**Basic User** - Can only manage their own work

### 📊 Dashboard Access
- ✅ Personal dashboard
- ✅ View assigned products
- ✅ View their orders
- ❌ Cannot view others' data

### 📦 Inventory Management
- ❌ **Categories** - Cannot access
- ✅ **Products** - Can Create, Read, Update (Cannot Delete)
- ✅ **Orders** - Can Create, Read, Update (Cannot Delete)
- ❌ **Warehouses** - Cannot access

### 👥 Employee Management
- ❌ **Cannot manage employees**
- ❌ Cannot view other employees' details
- ❌ Cannot edit anyone else's work

### 🤝 Supplier Management
- ❌ **No Access**

### ⚙️ System Settings
- ✅ Profile management
- ✅ Change password
- ✅ Notification preferences

### 📊 Limitations
- ❌ Cannot delete products or orders
- ❌ Cannot view analytics
- ❌ Cannot export reports
- ❌ Cannot send notifications
- ❌ Cannot approve orders

---

## 5. SUPPLIER (Role: `supplier`)

**External Partner** - Limited to their own supplier operations

### 📊 Dashboard Access
- ✅ Supplier dashboard
- ✅ View their supplier orders only

### 📦 Inventory Management
- ❌ **Categories** - No access
- ❌ **Products** - No access
- ❌ **Orders** (Customer Orders) - No access

### 📋 Supplier Orders
- ✅ **View Orders** - See orders placed to them
- ✅ **Update Order Status** - Mark orders as received, shipped, etc.
- ✅ **Update Payment Status** - Manage payment details

### 👥 Employee Management
- ❌ **No Access** - Completely isolated from employees

### ⚙️ System Settings
- ✅ Profile management
- ✅ Change password
- ✅ View their business details

### 📊 Notifications
- ✅ Receive notifications about their orders
- ❌ Cannot send notifications

---

## Permission Matrix

| Permission | Business Owner | Manager | Supervisor | Employee | Supplier |
|-----------|:---:|:---:|:---:|:---:|:---:|
| Create Products | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete Products | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create Categories | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete Categories | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Orders | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete Orders | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create Warehouses | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete Warehouses | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Employees | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete Employees | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Employees | ✅ | ✅ (Team) | ❌ | ❌ | ❌ |
| Create Suppliers | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete Suppliers | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Analytics | ✅ | ✅ | ✅ | ❌ | ❌ |
| Export Reports | ✅ | ✅ | ❌ | ❌ | ❌ |
| Send Notifications | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve Orders | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Others' Work | ✅ | ✅ (Team) | ✅ (Direct) | ❌ | ❌ |

---

## Sidebar Navigation by Role

### Business Owner Sees:
- Dashboard
- Categories
- Products
- Orders
- Employees
- Suppliers
- Warehouses
- Notifications
- Settings

### Manager Sees:
- Dashboard
- Categories
- Products
- Orders
- Employees (Can manage team)
- Warehouses
- Notifications
- Settings

### Supervisor Sees:
- Dashboard
- Categories
- Products
- Orders
- Employees (View only - direct reports)
- Notifications
- Settings

### Employee Sees:
- Dashboard
- Products
- Orders
- Notifications
- Settings

### Supplier Sees:
- Dashboard
- Supplier Orders (their orders only)
- Settings

---

## Team Hierarchy Example

```
Business Owner (Alice)
│
├── Manager (Bob) - Manages Engineering Team
│   ├── Supervisor (Charlie) - Product Engineering Lead
│   │   ├── Employee (David)
│   │   └── Employee (Eve)
│   │
│   └── Employee (Frank) - Operations Specialist
│
├── Manager (Grace) - Manages Sales Team
│   ├── Supervisor (Henry)
│   │   ├── Employee (Iris)
│   │   └── Employee (Jack)
│
└── Supplier (Karim) - External supplier (separate system)
```

**Permissions Flow:**
- Alice can see and manage everyone
- Bob can manage his team (Charlie, Frank, David, Eve)
- Charlie can only manage their direct reports (David, Eve)
- David can only see their own work
- Karim operates in isolation

---

## Key Rules

1. **Hierarchy**: Only superiors can see/edit subordinates' work
2. **Isolation**: Employees can't see other employees' data
3. **Suppliers Isolated**: Suppliers operate separately from internal staff
4. **Deletion**: Only higher roles can delete (Business Owner has full delete)
5. **Creation**: Managers and above can create employees; supervisors cannot
6. **Data Access**: Always filtered by hierarchy - you can only see what you're authorized to

---

## Frontend Implementation

The access control is enforced through:

1. **Sidebar Navigation** - Menu items shown based on role
2. **Route Protection** - Protected routes check roles
3. **Component Visibility** - Buttons/features hidden based on permissions
4. **API Validation** - Backend validates permissions on every request

No role bypassing is possible even if someone tries to access a URL directly - the backend will reject unauthorized requests with 401/403 errors.
