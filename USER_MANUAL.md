# 📦 Inline Tracker — User Manual

### Smart Inventory Management System

**Version:** 1.0.0  
**Last Updated:** February 2026

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Requirements](#2-system-requirements)
3. [Installation & Setup](#3-installation--setup)
4. [Getting Started](#4-getting-started)
   - 4.1 [Landing Page Overview](#41-landing-page-overview)
   - 4.2 [Sign Up (Business Owner Registration)](#42-sign-up-business-owner-registration)
   - 4.3 [Login](#43-login)
5. [User Roles & Permissions](#5-user-roles--permissions)
   - 5.1 [Business Owner](#51-business-owner)
   - 5.2 [Employee Roles (Manager / Supervisor / Employee)](#52-employee-roles)
   - 5.3 [Supplier](#53-supplier)
6. [Dashboard](#6-dashboard)
   - 6.1 [Business Owner Dashboard](#61-business-owner-dashboard)
   - 6.2 [Employee Dashboard](#62-employee-dashboard)
   - 6.3 [Supplier Dashboard](#63-supplier-dashboard)
7. [Sidebar Navigation](#7-sidebar-navigation)
8. [Category Management](#8-category-management)
9. [Product Management](#9-product-management)
10. [Order Management (Customer Orders)](#10-order-management-customer-orders)
11. [Employee Management](#11-employee-management)
12. [Supplier Management](#12-supplier-management)
13. [Supplier Orders](#13-supplier-orders)
14. [Warehouse Management](#14-warehouse-management)
15. [Permission Manager](#15-permission-manager)
16. [Salary Management](#16-salary-management)
17. [Notifications](#17-notifications)
18. [Messaging System](#18-messaging-system)
19. [Reports & Export](#19-reports--export)
20. [AI Chatbot Assistant](#20-ai-chatbot-assistant)
21. [Settings](#21-settings)
22. [FAQ & Troubleshooting](#22-faq--troubleshooting)
23. [Glossary](#23-glossary)

---

## 1. Introduction

**Inline Tracker** is a comprehensive, AI-powered inventory management web application designed for businesses of all sizes. It enables business owners, employees, and suppliers to collaboratively manage products, orders, warehouses, and supply chains — all from a single, intuitive dashboard.

### Key Features at a Glance

| Feature | Description |
|---|---|
| **Real-time Tracking** | Monitor inventory across all warehouse locations instantly |
| **Role-Based Access** | Fine-grained permission control for Business Owner, Manager, Supervisor, Employee, and Supplier roles |
| **AI Chatbot** | Intelligent assistant for quick inventory insights and queries |
| **Order Management** | Full lifecycle management for customer and supplier orders |
| **Warehouse Management** | Multi-warehouse support with manager assignment |
| **Salary Management** | Track employee salaries, payments, and payroll |
| **Reports & Export** | Generate and export reports in Excel and PDF formats |
| **Messaging System** | Built-in real-time communication between users |
| **Notifications** | Smart alerts for low stock, delivery dates, salary dues, and more |
| **Data Visualization** | Interactive charts for sales trends and stock levels |

---

## 2. System Requirements

### For End Users (Browser)
- **Browser:** Google Chrome (v90+), Mozilla Firefox (v85+), Microsoft Edge (v90+), or Safari (v14+)
- **Internet:** Stable broadband connection
- **Screen Resolution:** Minimum 1024×768 (responsive design supports mobile devices)

### For Developers / Self-Hosting
- **Node.js:** v16.x or later
- **npm:** v8.x or later
- **MongoDB:** v5.x or later (local or MongoDB Atlas cloud)
- **Operating System:** Windows 10+, macOS 10.15+, or Ubuntu 18.04+

---

## 3. Installation & Setup

### Step 1: Clone or Download the Project

```bash
git clone <repository-url>
cd inventory-tracker
```

### Step 2: Install All Dependencies

Run the following command from the project root to install both frontend and backend dependencies:

```bash
npm install
```

This runs:
- `cd frontend && npm install` (React frontend)
- `cd backend && npm install` (Express backend)

### Step 3: Configure Environment Variables

Create a `.env` file inside the `backend/` folder:

```env
MONGO_URI=mongodb://localhost:27017/inventory-tracker
JWT_SECRET=your_jwt_secret_key
PORT=5000
```

### Step 4: Start the Application

**Development mode (both frontend & backend concurrently):**

```bash
npm run dev
```

This starts:
- **Backend server** on `http://localhost:5000`
- **Frontend** on `http://localhost:3000`

**Production mode:**

```bash
npm start
```

### Step 5: Open the Application

Open your browser and navigate to:

```
http://localhost:3000
```

---

## 4. Getting Started

### 4.1 Landing Page Overview

When you visit the application, you'll see the **Home Page** with the following sections:

```
┌─────────────────────────────────────────────────┐
│  🔲 Inline Tracker    Home  Features  About     │
│                                     Contact     │
├─────────────────────────────────────────────────┤
│                                                 │
│     Inventory Management Simplified             │
│                                                 │
│     Smart, AI-powered inventory tracking        │
│     that saves time and reduces costs.          │
│                                                 │
│     [Start Free Trial]    [Sign In]             │
│                                                 │
├─────────────────────────────────────────────────┤
│  Why Choose Inline Tracker?                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────┐ │
│  │Real-time │ │   AI     │ │  Smart   │ │Ent.│ │
│  │Tracking  │ │Assistant │ │Analytics │ │Sec.│ │
│  └──────────┘ └──────────┘ └──────────┘ └────┘ │
├─────────────────────────────────────────────────┤
│  How It Works:                                  │
│  ① Sign Up → ② Connect → ③ Track → ④ Optimize  │
├─────────────────────────────────────────────────┤
│  Testimonials   │   Homepage AI Chatbot         │
└─────────────────────────────────────────────────┘
```

**Navigation Bar Links:**
- **Home** — Landing page
- **Features** — Detailed feature descriptions
- **About** — About the company / application
- **Contact** — Contact form and information

The homepage also includes a **Homepage Chatbot** widget for visitor queries.

---

### 4.2 Sign Up (Business Owner Registration)

Only **Business Owners** register through the Sign Up page. Employees and Suppliers are created by the Business Owner from within the dashboard.

**Steps to Sign Up:**

1. Click **"Start Free Trial"** or navigate to `/signup`
2. Fill in the registration form:

```
┌─────────────────────────────────────┐
│        🔲 Inline Tracker            │
│                                     │
│        Create Account               │
│   Join us and start managing your   │
│   inventory efficiently             │
│                                     │
│   📧 Email *                        │
│   ┌─────────────────────────────┐   │
│   │ your.email@example.com      │   │
│   └─────────────────────────────┘   │
│                                     │
│   🔒 Password *                     │
│   ┌─────────────────────────────┐   │
│   │ ••••••••           👁        │   │
│   └─────────────────────────────┘   │
│                                     │
│   🔒 Confirm Password *            │
│   ┌─────────────────────────────┐   │
│   │ ••••••••           👁        │   │
│   └─────────────────────────────┘   │
│                                     │
│   [      Create Account        ]    │
│                                     │
│   Already have an account? Login    │
└─────────────────────────────────────┘
```

**Validation Rules:**
- **Email:** Must be a valid email format
- **Password:** Minimum 6 characters
- **Confirm Password:** Must match the password

3. Upon successful registration, you'll be redirected to the **Login** page

---

### 4.3 Login

All users (Business Owners, Employees, and Suppliers) log in through the same Login page.

**Steps to Log In:**

1. Navigate to `/login` or click **"Sign In"**
2. Enter your credentials:

```
┌─────────────────────────────────────┐
│        🔲 Inline Tracker            │
│                                     │
│        Welcome Back                 │
│   Sign in to your account           │
│                                     │
│   📧 Email                          │
│   ┌─────────────────────────────┐   │
│   │ your.email@example.com      │   │
│   └─────────────────────────────┘   │
│                                     │
│   🔒 Password                       │
│   ┌─────────────────────────────┐   │
│   │ ••••••••           👁        │   │
│   └─────────────────────────────┘   │
│                                     │
│   [         Login              ]    │
│                                     │
│   Don't have an account? Sign Up    │
└─────────────────────────────────────┘
```

3. After successful login:
   - An authentication token is stored securely
   - You are redirected to your **role-specific dashboard**

> **Note:** The system automatically detects your role (Business Owner, Employee/Supervisor/Manager, or Supplier) and shows the appropriate dashboard.

---

## 5. User Roles & Permissions

Inline Tracker uses a hierarchical role-based access control system.

### Role Hierarchy

```
        ┌──────────────────┐
        │  Business Owner  │ ← Full system control
        └────────┬─────────┘
                 │
        ┌────────┴─────────┐
        │     Manager      │ ← Configurable permissions
        └────────┬─────────┘
                 │
        ┌────────┴─────────┐
        │    Supervisor     │ ← Configurable permissions
        └────────┬─────────┘
                 │
        ┌────────┴─────────┐
        │     Employee      │ ← Configurable permissions
        └──────────────────┘

        ┌──────────────────┐
        │     Supplier      │ ← External partner (limited access)
        └──────────────────┘
```

### 5.1 Business Owner

The **Business Owner** has complete access to all features:

| Capability | Access |
|---|---|
| Dashboard with analytics & charts | ✅ |
| Create/Edit/Delete Categories | ✅ |
| Create/Edit/Delete Products | ✅ |
| Create/Edit/Delete Customer Orders | ✅ |
| Create/Edit/Delete Employees | ✅ |
| Create/Edit/Delete Suppliers | ✅ |
| Create/Edit/Delete Supplier Orders | ✅ |
| Manage Warehouses | ✅ |
| Set Role-Based & Individual Permissions | ✅ |
| Manage Salaries & Payments | ✅ |
| View & Export Reports | ✅ |
| Send/Receive Messages | ✅ |
| View Notifications | ✅ |
| Configure Notification Preferences | ✅ |
| AI Chatbot | ✅ |
| Profile & Company Settings | ✅ |
| Account Deletion Management | ✅ |

### 5.2 Employee Roles

Employees are created by the Business Owner and assigned one of three sub-roles:

| Feature | Manager | Supervisor | Employee |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Categories (View/Create/Edit/Delete) | Configurable | Configurable | Configurable |
| Products (View/Create/Edit/Delete) | Configurable | Configurable | Configurable |
| Orders (View/Create/Edit/Delete) | Configurable | Configurable | Configurable |
| Employees (View/Manage) | Configurable | Configurable | Configurable |
| Warehouses (View/Create/Edit/Delete) | Configurable | Configurable | Configurable |
| Notifications | Configurable | Configurable | Configurable |
| Messages | Configurable | Configurable | Configurable |
| Reports Export | Configurable | Configurable | Configurable |
| AI Chatbot | ✅ | ✅ | ✅ |
| Settings (Personal) | ✅ | ✅ | ✅ |

> All employee permissions are configured by the Business Owner in the **Permission Manager**.

### 5.3 Supplier

Suppliers are external partners with limited, focused access:

| Capability | Access |
|---|---|
| Supplier Dashboard with order analytics | ✅ |
| View Assigned Supplier Orders | ✅ |
| View Order Details | ✅ |
| Update Order Status | ✅ (if permitted) |
| Receive Notifications | ✅ |
| Messages (if enabled by Business Owner) | Configurable |
| AI Chatbot | ✅ |
| Personal Settings | ✅ |

---

## 6. Dashboard

Upon login, each user is directed to their role-specific dashboard.

### 6.1 Business Owner Dashboard

The Business Owner dashboard provides a comprehensive overview of the entire business:

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Dashboard                          🔔  💬  👤           │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ Sidebar  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│          │  │Total │ │Total │ │Total │ │ Low  │ │Total │  │
│Dashboard │  │Prod. │ │Orders│ │Empl. │ │Stock │ │Wareh.│  │
│Categories│  │  24  │ │  156 │ │  12  │ │  3   │ │  4   │  │
│Products  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘  │
│Orders    │                                                  │
│Employees │  ┌──────────────────┐ ┌──────────────────────┐  │
│Suppliers │  │  📈 Sales Trends  │ │  📊 Stock Levels      │  │
│Warehouses│  │                  │ │                      │  │
│Permis... │  │  Monthly/Weekly  │ │  By Product          │  │
│Salary    │  │  Sales Chart     │ │  Bar Chart           │  │
│Notific.. │  │                  │ │                      │  │
│Messages  │  └──────────────────┘ └──────────────────────┘  │
│Reports   │                                                  │
│Settings  │  ┌──────────────────┐ ┌──────────────────────┐  │
│Log Out   │  │  🏭 Warehouses    │ │  📦 Products Detail   │  │
│          │  │  Quick Overview  │ │  Quick View Modal    │  │
│          │  └──────────────────┘ └──────────────────────┘  │
└──────────┴──────────────────────────────────────────────────┘
```

**Dashboard Widgets:**

1. **Statistics Cards** — Display at-a-glance metrics:
   - Total Products count
   - Total Orders count
   - Total Employees count
   - Low Stock Items (products with ≤10 units)
   - Total Categories count
   - Total Warehouses count

2. **Sales Trends Chart** — Interactive line chart showing:
   - Monthly or Weekly order trends
   - Toggle between time periods

3. **Stock Levels Chart** — Bar chart showing inventory levels per product

4. **Warehouse Overview** — Click any warehouse card to view details

5. **Product Quick View** — Click any product to see details in a modal popup

---

### 6.2 Employee Dashboard

The Employee dashboard shows data relevant to their assigned warehouse and permissions:

```
┌──────────────────────────────────────────────────────────┐
│  📊 Dashboard                         🔔  💬  👤          │
├──────────┬───────────────────────────────────────────────┤
│          │  Your Warehouse: [Warehouse Name]             │
│ Sidebar  │                                               │
│          │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│Dashboard │  │Total │ │Total │ │Total │ │ Low  │        │
│Categories│  │Prod. │ │Orders│ │Categ.│ │Stock │        │
│Products  │  │  18  │ │  45  │ │  6   │ │  2   │        │
│Orders    │  └──────┘ └──────┘ └──────┘ └──────┘        │
│Settings  │                                               │
│Log Out   │  ┌────────────────┐ ┌────────────────────┐   │
│          │  │ 📈 Order Trends │ │ 📊 Stock Overview   │   │
│          │  │ (Monthly/Weekly)│ │                    │   │
│          │  └────────────────┘ └────────────────────┘   │
└──────────┴───────────────────────────────────────────────┘
```

**Key Differences:**
- Shows only data from the employee's assigned warehouse
- Sidebar items are permission-dependent
- Statistics reflect the employee's accessible data

---

### 6.3 Supplier Dashboard

The Supplier dashboard focuses on order management and delivery tracking:

```
┌──────────────────────────────────────────────────────────┐
│  📊 Dashboard                         🔔  💬  👤          │
├──────────┬───────────────────────────────────────────────┤
│          │                                               │
│ Sidebar  │  ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│          │  │  Total   │ │ Pending  │ │Completed │     │
│Dashboard │  │  Orders  │ │  Orders  │ │  Orders  │     │
│Orders    │  │   42     │ │    8     │ │   34     │     │
│Settings  │  └──────────┘ └──────────┘ └──────────┘     │
│Log Out   │                                               │
│          │  ┌────────────────┐ ┌────────────────────┐   │
│          │  │📈 Revenue Trend │ │ 🍩 Order Status     │   │
│          │  │ Monthly Chart  │ │ Doughnut Chart     │   │
│          │  └────────────────┘ └────────────────────┘   │
│          │                                               │
│          │  ┌──────────────────────────────────────┐    │
│          │  │ 📋 Recent Orders Table                │    │
│          │  │ Order ID | Product | Status | Amount  │    │
│          │  └──────────────────────────────────────┘    │
└──────────┴───────────────────────────────────────────────┘
```

**Dashboard Widgets:**
- **Statistics Cards:** Total Orders, Pending Orders, Completed Orders
- **Revenue Trend Chart:** Line chart showing revenue over time (monthly/weekly toggle)
- **Order Status Distribution:** Doughnut chart showing order status breakdown
- **Recent Orders Table:** Quick access to latest orders with status

---

## 7. Sidebar Navigation

The sidebar is the main navigation hub. It adapts based on your role and permissions.

```
┌────────────────────────┐
│ 🔲 Inline Tracker      │
├────────────────────────┤
│ 📊 Dashboard           │
│ 📁 Categories          │  ← Permission-based
│ 📦 Products            │  ← Permission-based
│ 🛒 Orders              │  ← Permission-based
│ 👥 Employees           │  ← Permission-based
│ 🚚 Suppliers           │  ← Business Owner only
│ 🏭 Warehouses          │  ← Permission-based
│ 🛡️ Permissions         │  ← Business Owner only
│ 💰 Salary Management   │  ← Business Owner only
│ 🔔 Notifications       │  ← Permission-based
│ 💬 Messages            │  ← Permission-based
│ 📊 Reports             │  ← Permission-based
│ ⚙️ Settings             │  ← All roles
│ 🚪 Log Out             │  ← All roles
└────────────────────────┘
```

**Mobile/Responsive:** On smaller screens, the sidebar collapses and can be toggled with the ☰ hamburger menu button. Press **Escape** to close it.

**Top Navigation Bar:**
- 🔔 **Notification Bell** — Shows unread notification count, click for dropdown
- 💬 **AI Chatbot** — Access the AI assistant
- 👤 **User Menu** — Quick access to settings and logout

---

## 8. Category Management

**Path:** Dashboard → Categories  
**Access:** Business Owner, or Employees with `canViewCategories` permission

Categories organize your products into logical groups (e.g., Electronics, Furniture, Clothing).

### View Categories

```
┌──────────────────────────────────────────────────────────┐
│  📁 Categories                                           │
│                                                          │
│  🔍 [Search categories...          ]                     │
│                                                          │
│  ┌───────────────────────────────────────────────────┐   │
│  │ + Add New Category                                │   │
│  │ ┌─────────────────────┐ ┌───────────────────────┐ │   │
│  │ │ Category Name *     │ │ Description           │ │   │
│  │ │ [                ]  │ │ [                   ] │ │   │
│  │ └─────────────────────┘ └───────────────────────┘ │   │
│  │ [Add Category]                                    │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────┬────────────────────┬───────────────────┐   │
│  │ Name     │ Description        │ Actions           │   │
│  ├──────────┼────────────────────┼───────────────────┤   │
│  │Electron. │ Electronic devices │ 👁 ✏️ 🗑️           │   │
│  │Furniture │ Office furniture   │ 👁 ✏️ 🗑️           │   │
│  │Clothing  │ Apparel items      │ 👁 ✏️ 🗑️           │   │
│  └──────────┴────────────────────┴───────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### How to Add a Category

1. Navigate to **Categories** from the sidebar
2. In the **"Add New Category"** section:
   - Enter the **Category Name** (required)
   - Enter a **Description** (optional)
3. Click **"Add Category"**
4. A success notification confirms the creation

### How to Edit a Category

1. Click the 👁 **View** icon next to a category
2. A detail/edit modal opens showing category information
3. Modify the **Name** or **Description**
4. Click **"Save Changes"**

### How to Delete a Category

1. Click the 🗑️ **Delete** icon
2. Confirm the deletion in the popup dialog
3. The category is removed

> **Note:** Deleting a category may affect products assigned to it.

### Searching Categories

Use the search bar at the top to filter categories by name or description in real-time.

---

## 9. Product Management

**Path:** Dashboard → Products  
**Access:** Business Owner, or Employees with `canViewProducts` permission

### Products List View

```
┌──────────────────────────────────────────────────────────────────┐
│  📦 Products                              Last Updated: 2:30 PM  │
│                                                                  │
│  🔍 [Search products...    ]                                     │
│                                                                  │
│  Filters:                                                        │
│  [Category ▼]  [Status ▼]  [Stock Level ▼]  [Reset Filters]     │
│                                                                  │
│  [+ Add Product]              [📥 Export Excel] [📥 Export PDF]   │
│                                                                  │
│  ┌──────┬──────────┬────────┬───────┬───────┬────────┬────────┐  │
│  │Image │ Name     │Category│ Brand │ Price │ Stock  │Actions │  │
│  ├──────┼──────────┼────────┼───────┼───────┼────────┼────────┤  │
│  │ 🖼️   │ Laptop X │Electr. │ Dell  │₹45000 │  25    │✏️🗑️📊  │  │
│  │ 🖼️   │ Chair A  │Furnit. │ ErgoX │₹8500  │  8 ⚠️  │✏️🗑️📊  │  │
│  │ 🖼️   │ T-Shirt  │Cloth.  │ Nike  │₹1200  │  150   │✏️🗑️📊  │  │
│  └──────┴──────────┴────────┴───────┴───────┴────────┴────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**Stock Level Indicators:**
- ⚠️ **Low Stock** — 10 or fewer units (highlighted in red/orange)
- **Medium Stock** — 11 to 50 units
- **High Stock** — More than 50 units

### How to Add a Product

1. Click **"+ Add Product"** button
2. Fill in the product form:

```
┌─────────────────────────────────────────────┐
│           Add New Product                   │
│                                             │
│  Product Name *    [                     ]  │
│  Category *        [Select Category    ▼]   │
│  Brand             [                     ]  │
│  Price (₹) *       [                     ]  │
│  Total Stock *     [                     ]  │
│  Warehouse *       [Select Warehouse   ▼]   │
│  Description       [                     ]  │
│  Product Image     [Choose File]            │
│                                             │
│  [Cancel]              [Add Product]        │
└─────────────────────────────────────────────┘
```

3. Click **"Add Product"**
4. You'll be redirected to the products list with a success notification

### How to Edit a Product

1. Click the ✏️ **Edit** icon on any product row
2. You'll be taken to the **Edit Product** page with pre-filled data
3. Modify any fields as needed
4. Click **"Update Product"**

### How to Delete a Product

1. Click the 🗑️ **Delete** icon
2. A confirmation dialog appears: *"Are you sure you want to delete this product?"*
3. Click **OK** to confirm

### Download Individual Product Report

1. Click the 📊 **Report** icon next to any product
2. A PDF report is automatically generated and downloaded
3. The report includes product details, stock info, category, and warehouse information

### Filtering Products

| Filter | Options |
|---|---|
| **Search** | Filter by name, category, or brand |
| **Category** | Filter by specific category |
| **Status** | Filter by active status |
| **Stock Level** | Low (≤10), Medium (11-50), High (>50) |

Click **"Reset Filters"** to clear all filters.

### Export Products

- **📥 Export to Excel** — Downloads an `.xlsx` file with all visible product data
- **📥 Export to PDF** — Downloads a `.pdf` file with formatted product table

---

## 10. Order Management (Customer Orders)

**Path:** Dashboard → Orders  
**Access:** Business Owner, or Employees with `canViewOrders` permission

### Orders List View

```
┌─────────────────────────────────────────────────────────────────┐
│  🛒 Orders                                                      │
│                                                                 │
│  🔍 [Search by name, product, email...]                         │
│                                                                 │
│  Filters:                                                       │
│  [Payment Status ▼]  [Delivery Status ▼]  [Reset Filters]      │
│                                                                 │
│  [+ Add Order]                 [📥 Excel] [📥 PDF]              │
│                                                                 │
│  ┌────────┬──────────┬────────┬───────┬──────────┬──────────┐   │
│  │Order ID│ Customer │Product │Amount │Pay Status│Del.Status│   │
│  ├────────┼──────────┼────────┼───────┼──────────┼──────────┤   │
│  │ #A1B2C3│ John Doe │Laptop X│₹45000 │  Paid    │Delivered │   │
│  │ #D4E5F6│ Jane S.  │Chair A │₹8500  │ Pending  │Shipped   │   │
│  └────────┴──────────┴────────┴───────┴──────────┴──────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### How to Create a New Order

1. Click **"+ Add Order"**
2. Fill in the order form:

| Field | Description |
|---|---|
| Customer Name * | Full name of the customer |
| Customer Email * | Email address |
| Customer Phone | Phone number |
| Customer Address | Delivery address |
| Product Name * | Name of the product being ordered |
| Category | Product category |
| Order Units * | Quantity to order |
| Amount (₹) * | Total order amount |
| Order Date | Date the order was placed |
| Delivery Date | Expected delivery date |
| Payment Status | Paid / Pending / Failed |
| Delivery Status | Processing / Shipped / Delivered / Cancelled |
| Product Availability | In Stock / Out of Stock |
| Notes | Additional order notes |

3. Click **"Submit Order"**

### How to Edit an Order

1. Click the ✏️ **Edit** icon on the order row
2. Modify order details (status, delivery date, etc.)
3. Click **"Update Order"**

### How to Delete an Order

1. Click the 🗑️ **Delete** icon
2. Confirm deletion

### Order Filtering

- **Search:** Filter by customer name, product name, or email
- **Payment Status:** Paid, Pending, Failed
- **Delivery Status:** Processing, Shipped, Delivered, Cancelled

### Export Orders

- **Excel Export** — Full order data in spreadsheet format
- **PDF Export** — Formatted PDF document
- **Individual Order Report** — Click the 📊 icon per order for a detailed report

---

## 11. Employee Management

**Path:** Dashboard → Employees  
**Access:** Business Owner, or users with `canViewEmployees` permission

### Employees List View

```
┌──────────────────────────────────────────────────────────────────┐
│  👥 Employees                      Total: 12  |  Active: 12     │
│                                                                  │
│  🔍 [Search employees...   ]    [Role Filter ▼]                 │
│                                                                  │
│  [+ Create Employee]              [📥 Excel] [📥 PDF]           │
│                                                                  │
│  ┌──────┬──────────┬────────┬───────┬──────────┬────────────┐   │
│  │Photo │ Name     │ Email  │ Role  │Warehouse │Last Login  │   │
│  ├──────┼──────────┼────────┼───────┼──────────┼────────────┤   │
│  │ 👤   │ Rahul S. │r@ex.co │Manager│Warehouse1│ 2 hrs ago  │   │
│  │ 👤   │ Priya K. │p@ex.co │Super. │Warehouse2│ 5 min ago  │   │
│  │ 👤   │ Amit P.  │a@ex.co │Employ.│Warehouse1│ 1 day ago  │   │
│  └──────┴──────────┴────────┴───────┴──────────┴────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### How to Create an Employee

1. Click **"+ Create Employee"**
2. Fill in the employee creation form:

```
┌─────────────────────────────────────────────┐
│         Create New Employee                 │
│                                             │
│  First Name *      [                     ]  │
│  Last Name *       [                     ]  │
│  Email *           [                     ]  │
│  Password *        [                     ]  │
│  Phone             [                     ]  │
│  Role *            [Employee          ▼]    │
│                    (Employee/Supervisor/     │
│                     Manager)                │
│  Warehouse         [Select Warehouse   ▼]   │
│  Address           [                     ]  │
│  City              [                     ]  │
│  State             [                     ]  │
│  Country           [                     ]  │
│  Profile Image     [Choose File]            │
│                                             │
│  [Cancel]           [Create Employee]       │
└─────────────────────────────────────────────┘
```

3. Click **"Create Employee"**
4. The employee can now log in with their email and password

### How to Edit an Employee

1. Click the ✏️ **Edit** icon on the employee row
2. Modify profile details, role, warehouse assignment, etc.
3. Click **"Update Employee"**

### How to Delete an Employee

1. Click the 🗑️ **Delete** icon
2. Confirm the deletion

### Filtering & Searching

- **Search:** Filter by first name, last name, email, or phone
- **Role Filter:** Filter by Manager, Supervisor, or Employee

### Employee Reports

- Click the 📊 icon per employee to download an individual report
- Export all employees via **Excel** or **PDF** buttons

---

## 12. Supplier Management

**Path:** Dashboard → Suppliers  
**Access:** Business Owner only

### Suppliers List View

```
┌──────────────────────────────────────────────────────────────┐
│  🚚 Suppliers                              Total: 8          │
│                                                              │
│  🔍 [Search suppliers...   ]    [City Filter ▼]             │
│                                                              │
│  [+ Create Supplier]              [📥 Excel] [📥 PDF]       │
│                                                              │
│  ┌──────────┬────────┬─────────┬──────────┬────────────┐    │
│  │ Name     │ Email  │ Phone   │ City     │ Last Login │    │
│  ├──────────┼────────┼─────────┼──────────┼────────────┤    │
│  │ Vendor A │v@ex.co │ 9876543 │ Mumbai   │ Just now   │    │
│  │ Supp. B  │s@ex.co │ 1234567 │ Delhi    │ 3 days ago │    │
│  └──────────┴────────┴─────────┴──────────┴────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### How to Create a Supplier

1. Click **"+ Create Supplier"**
2. Fill in supplier details:
   - First Name, Last Name, Email, Password, Phone
   - Address, City, State, Country
3. Click **"Create Supplier"**
4. The supplier can now log in with their credentials

### Supplier Orders from the Business Owner Side

- Click a supplier's name to view their **Supplier Order** page
- From there, you can create, edit, and manage orders for that specific supplier

### How to Delete a Supplier

1. Click the 🗑️ **Delete** icon
2. Confirm deletion

---

## 13. Supplier Orders

### For Business Owners

**Path:** Dashboard → Suppliers → [Select Supplier] → Supplier Orders

Business owners can manage orders placed to suppliers:

```
┌──────────────────────────────────────────────────────────────┐
│  📦 Supplier Orders — Vendor A                               │
│                                                              │
│  [+ Add Supplier Order]                                      │
│                                                              │
│  ┌────────┬─────────┬───────┬──────────┬──────────┬────────┐│
│  │Order ID│ Product │Amount │ Status   │ Delivery │Actions ││
│  ├────────┼─────────┼───────┼──────────┼──────────┼────────┤│
│  │ #001   │ Laptops │₹2.5L  │ Approved │ 15 Feb   │✏️🗑️    ││
│  │ #002   │ Chairs  │₹85000 │ Pending  │ 20 Feb   │✏️🗑️    ││
│  └────────┴─────────┴───────┴──────────┴──────────┴────────┘│
└──────────────────────────────────────────────────────────────┘
```

### For Suppliers

**Path:** Dashboard → Orders (Supplier View)

Suppliers see only orders assigned to them:

```
┌──────────────────────────────────────────────────────────────┐
│  📦 My Orders                                                │
│                                                              │
│  ┌────────┬─────────┬───────┬──────────┬──────────┐         │
│  │Order ID│ Product │Amount │ Status   │ Delivery │         │
│  ├────────┼─────────┼───────┼──────────┼──────────┤         │
│  │ #001   │ Laptops │₹2.5L  │ Approved │ 15 Feb   │         │
│  └────────┴─────────┴───────┴──────────┴──────────┘         │
│                                                              │
│  Click any order to view full details                        │
└──────────────────────────────────────────────────────────────┘
```

Clicking an order opens the **Supplier Order Detail** page where suppliers can view comprehensive order information and update the status if permitted.

---

## 14. Warehouse Management

**Path:** Dashboard → Warehouses  
**Access:** Business Owner, or Employees with `canViewWarehouses` permission

### Warehouses Overview

```
┌───────────────────────────────────────────────────────────────┐
│  🏭 Warehouses                         Total: 4               │
│                                                               │
│  🔍 [Search warehouses...  ]    [City Filter ▼]              │
│                                                               │
│  [+ Add Warehouse]                 [📥 Excel] [📥 PDF]       │
│                                                               │
│  ┌──────────┬─────────┬──────────┬─────────┬─────────────┐   │
│  │ Name     │ Manager │ Address  │ Contact │ Actions     │   │
│  ├──────────┼─────────┼──────────┼─────────┼─────────────┤   │
│  │ WH-North │ Rahul S.│ Mumbai   │ 9876543 │ ✏️ 🗑️        │   │
│  │ WH-South │ Priya K.│ Chennai  │ 1234567 │ ✏️ 🗑️        │   │
│  │ WH-West  │   —     │ Pune     │ 5557890 │ ✏️ 🗑️        │   │
│  └──────────┴─────────┴──────────┴─────────┴─────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

### How to Add a Warehouse

1. Click **"+ Add Warehouse"**
2. A modal form appears:

| Field | Required | Description |
|---|---|---|
| Warehouse Name | Yes | Unique name for the warehouse |
| Manager | No | Select from available managers (can be assigned later) |
| Address | Yes | Physical address |
| Contact | Yes | Phone number |
| Email | Yes | Contact email |
| City | No | City |
| State | No | State/Province |
| Country | No | Country |

3. Click **"Add Warehouse"**

### How to Edit a Warehouse

1. Click the ✏️ **Edit** icon
2. An edit modal opens with pre-filled data
3. Modify fields and click **"Save Changes"**

### How to Delete a Warehouse

1. Click the 🗑️ **Delete** icon
2. Confirm deletion

> **Note:** Managers can be assigned to warehouses later via the warehouse edit function or through the employee assignment system.

---

## 15. Permission Manager

**Path:** Dashboard → Permissions  
**Access:** Business Owner only

The Permission Manager is a powerful tool for controlling what each employee role or individual employee can access.

### Permission Manager Tabs

```
┌──────────────────────────────────────────────────────────────────┐
│  🛡️ Permission Manager                                          │
│                                                                  │
│  [Role-Based] [Individual] [Notifications] [Suppliers]           │
│                                                                  │
│  ═══════════════════════════════════════════════════════════════  │
│                                                                  │
│  Role: [Manager ▼]  [Supervisor]  [Employee]                     │
│                                                                  │
│  🔍 [Search permissions...     ]                                 │
│                                                                  │
│  ┌─ 📦 Product Management ──────────────────────────────────┐   │
│  │  ☑ Can View Products                                     │   │
│  │    ☑ Can Create Products                                 │   │
│  │    ☑ Can Edit Products                                   │   │
│  │    ☐ Can Delete Products                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ 🛒 Order Management ────────────────────────────────────┐   │
│  │  ☑ Can View Orders                                       │   │
│  │    ☑ Can Create Orders                                   │   │
│  │    ☑ Can Edit Orders                                     │   │
│  │    ☐ Can Delete Orders                                   │   │
│  │    ☐ Can Approve Orders                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Save Permissions]    [Sync All Employees]                      │
└──────────────────────────────────────────────────────────────────┘
```

### Tab 1: Role-Based Permissions

Configure default permissions for each role (Manager, Supervisor, Employee):

**Permission Groups:**

| Group | Permissions |
|---|---|
| **Product Management** | View, Create, Edit, Delete Products |
| **Category Management** | View, Create, Edit, Delete Categories |
| **Warehouse Management** | View, Create, Edit, Delete Warehouses |
| **Order Management** | View, Create, Edit, Delete, Approve Orders |
| **Employee Management** | View Employees, Manage Employees, Edit Others' Work |
| **Analytics & Reports** | View Analytics, Export Reports |
| **Notifications** | View Notifications, Send Notifications |
| **Messaging** | View Messages, Send Messages, Delete Messages |

**Permission Dependencies:**
- If a "View" permission is disabled, all related "Create/Edit/Delete" permissions are automatically disabled
- Example: Disabling "Can View Products" automatically disables "Can Create/Edit/Delete Products"

**Actions:**
- **Save Permissions** — Save the current role's permission configuration
- **Sync All Employees** — Apply role-based permissions to all employees of that role

### Tab 2: Individual Permissions

Override role-based permissions for specific employees:

1. Select an employee from the list
2. Toggle individual permissions on/off
3. Click **"Save Individual Permissions"**

> Individual permissions override role-based defaults for that specific employee.

### Tab 3: Notification Preferences

Configure automated notification settings:

| Setting | Description | Default |
|---|---|---|
| Salary Due Alert | Alert when salary payment is due | ✅ On, 3 days before |
| Supplier Order Delivery Alert | Alert approaching delivery dates | ✅ On, 2 days before |
| Product Low Stock Alert | Alert when stock falls below threshold | ✅ On, Threshold: 10 |
| Customer Order Delivery Alert | Alert for customer delivery dates | ✅ On, 1 day before |
| Supplier Order Supply Alert | Alert for supply dates | ✅ On, 2 days before |

### Tab 4: Supplier Permissions

Control what access each supplier has:

- Toggle chat/messaging access per supplier
- Manage supplier portal visibility

---

## 16. Salary Management

**Path:** Dashboard → Salary Management  
**Access:** Business Owner only

### Salary Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  💰 Salary Management                                            │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Total   │ │  With    │ │ Average  │ │  Total   │           │
│  │Employees │ │ Salary   │ │ Salary   │ │ Payroll  │           │
│  │   12     │ │   10     │ │ ₹35,000  │ │ ₹3,50,000│           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  🔍 [Search employees...    ]                                    │
│                                  [📥 Export PDF] [📥 Export XLS] │
│                                                                  │
│  ┌──────────┬────────┬─────────┬─────────┬─────────┬─────────┐  │
│  │ Employee │ Role   │ Base    │  Paid   │ Balance │ Actions │  │
│  │          │        │ Salary  │         │         │         │  │
│  ├──────────┼────────┼─────────┼─────────┼─────────┼─────────┤  │
│  │ Rahul S. │Manager │ ₹50,000 │₹1,00,000│₹50,000  │ 💰 ✏️ 📊 │  │
│  │ Priya K. │Super.  │ ₹35,000 │ ₹35,000 │ ₹0      │ 💰 ✏️ 📊 │  │
│  │ Amit P.  │Employ. │  —      │  —      │  —      │  ✏️     │  │
│  └──────────┴────────┴─────────┴─────────┴─────────┴─────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### How to Set/Update Employee Salary

1. Click the ✏️ **Edit** icon next to an employee
2. A modal opens:

```
┌─────────────────────────────────────┐
│     Set Salary — Rahul S.           │
│                                     │
│  Base Salary (₹) *  [50000      ]   │
│  Currency            [INR      ▼]   │
│  Payment Frequency   [Monthly  ▼]   │
│                                     │
│  [Cancel]        [Save Salary]      │
└─────────────────────────────────────┘
```

3. Enter the base salary, select currency and frequency
4. Click **"Save Salary"**

### How to Record a Salary Payment

1. Click the 💰 **Pay** icon next to an employee
2. Fill in payment details:

| Field | Description |
|---|---|
| Amount (₹) | Payment amount |
| Payment Date | Date of payment |
| Payment Method | Bank Transfer / Cash / Cheque / UPI |
| Payment Period | Month/period the payment covers |
| Description | Notes about the payment |

3. Click **"Record Payment"**

### Export Salary Reports

- **📥 Export PDF** — Download formatted salary report
- **📥 Export Excel** — Download spreadsheet with salary data
- **📊 Individual Report** — Click per employee for detailed salary history

---

## 17. Notifications

**Path:** Dashboard → Notifications  
**Access:** Users with `canViewNotifications` permission

### Notification Bell (Top Bar)

The 🔔 notification bell in the top navigation shows:
- Number badge for unread notifications
- Click to see a dropdown with recent notifications

### Notifications Page

```
┌──────────────────────────────────────────────────────────────┐
│  🔔 Notifications                    Unread: 5               │
│                                                              │
│  Filter: [All ▼] [Unread] [Read]                             │
│                                                              │
│  [Mark All as Read]    [Clear All]                            │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🔴 Product Low Stock Alert                    2 min ago│  │
│  │    "Laptop X" stock is below 10 units (8 remaining)   │  │
│  │    Click to view product →                            │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ 🔴 New Order Created                         1 hr ago │  │
│  │    Order #A1B2C3 created by Employee Rahul S.         │  │
│  │    Click to view order →                              │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ ⚪ Salary Payment Due                      Yesterday   │  │
│  │    Salary due for Priya K. in 3 days                  │  │
│  │    Click to view salary →                             │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Notification Types

| Type | Description | Icon |
|---|---|---|
| Product Low Stock Alert | Product stock below threshold | ⚠️ |
| Customer Order Delivery Alert | Delivery date approaching | 📦 |
| Supplier Order Delivery Alert | Supplier delivery date approaching | 🚚 |
| Supplier Order Supply Alert | Supply date approaching | 📋 |
| Salary Due Alert | Employee salary payment due | 💰 |
| Employee Created/Updated/Deleted | Employee record changes | 👤 |
| Product Created/Updated/Deleted | Product record changes | 📦 |
| Order Created/Updated/Deleted | Order record changes | 🛒 |
| Category Changes | Category create/update/delete | 📁 |
| Supplier Order Status Updates | Order status changes | 🔄 |
| Chat Messages | New message received | 💬 |
| Deletion Requests | Account deletion requests | 🗑️ |

### Notification Actions

- **Click a notification** — Navigate directly to the related item (product, order, employee, etc.)
- **Mark as Read** — Click to dismiss the unread indicator
- **Mark All as Read** — Clear all unread badges
- **Clear All** — Remove all notifications
- **Filter** — View All, Unread only, or Read only

---

## 18. Messaging System

**Path:** Dashboard → Messages  
**Access:** Users with `canViewMessages` permission

### Messaging Interface

```
┌──────────────────────────────────────────────────────────────────┐
│  💬 Messages                                                     │
│                                                                  │
│  ┌────────────────┐ ┌───────────────────────────────────────┐   │
│  │ Conversations  │ │ Chat — Rahul S. (Manager)             │   │
│  │                │ │                                       │   │
│  │ 🔍 [Search...] │ │ ┌───────────────────────────────────┐ │   │
│  │                │ │ │ Rahul: Good morning! The new      │ │   │
│  │ [+ New Chat]   │ │ │        shipment has arrived.      │ │   │
│  │                │ │ │                          9:00 AM  │ │   │
│  │ ┌────────────┐ │ │ │                                   │ │   │
│  │ │ Rahul S.   │ │ │ │ You:  Great! I'll check the     │ │   │
│  │ │ Last msg.. │ │ │ │       inventory count now.       │ │   │
│  │ ├────────────┤ │ │ │                          9:05 AM  │ │   │
│  │ │ Priya K.   │ │ │ │                                   │ │   │
│  │ │ Last msg.. │ │ │ │ Rahul: 👍 Let me know if there   │ │   │
│  │ ├────────────┤ │ │ │        are any discrepancies.    │ │   │
│  │ │ Vendor A   │ │ │ │                          9:10 AM  │ │   │
│  │ │ Last msg.. │ │ │ └───────────────────────────────────┘ │   │
│  │ └────────────┘ │ │                                       │   │
│  │                │ │ ┌─────────────────────────────┐ [📤]  │   │
│  │                │ │ │ Type a message...           │       │   │
│  │                │ │ └─────────────────────────────┘       │   │
│  └────────────────┘ └───────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### How to Start a New Conversation

1. Click **"+ New Chat"** button
2. A selector appears with tabs: **Employees** | **Suppliers**
3. Search and select the person you want to message
4. Type your message and press **Send** or hit Enter

### How to Send a Message

1. Select a conversation from the left panel
2. Type your message in the input field
3. Click the **Send** button or press **Enter**

### Message Actions

- **Edit Message** — Click the ⋮ menu on your own message → Edit (available within a time window)
- **Delete Message** — Click the ⋮ menu → Delete (requires `canDeleteMessages` permission)

### Key Features

- **Real-time Updates** — Messages auto-refresh every 10 seconds
- **Conversations Auto-refresh** — Conversation list updates every 30 seconds
- **Message Search** — Search through conversations
- **Role Indicators** — See user role and type for each contact
- **Timestamps** — All messages show time sent

---

## 19. Reports & Export

**Path:** Dashboard → Reports  
**Access:** Users with `canExportReports` permission

### Reports Configuration

```
┌──────────────────────────────────────────────────────────────┐
│  📊 Reports                                                  │
│                                                              │
│  Report Type:  [Employees     ▼]                             │
│                                                              │
│  Options:      Employees | Products | Orders |               │
│                Supplier Orders | Suppliers                    │
│                                                              │
│  Format:       [Excel ▼]      (Excel / PDF)                 │
│                                                              │
│  Time Period:                                                │
│  Year:         [2026  ▼]                                     │
│  Month:        [February ▼]   (Optional)                     │
│                                                              │
│  Scope:        [All Employees ▼]  (All or specific item)    │
│                                                              │
│  [📥 Generate Report]                                        │
└──────────────────────────────────────────────────────────────┘
```

### Available Report Types

| Report Type | Data Included |
|---|---|
| **Employees** | Employee details, roles, warehouses, contact info |
| **Products** | Product inventory, stock levels, prices, categories |
| **Orders** | Customer orders with status, amounts, dates |
| **Supplier Orders** | Supply chain orders, status, payment info |
| **Suppliers** | Supplier directory with contact details |

### How to Generate a Report

1. Select the **Report Type** (Employees, Products, Orders, etc.)
2. Choose the **Format** (Excel `.xlsx` or PDF `.pdf`)
3. Optionally set a **Year** and **Month** filter
4. Select **Scope**: All items or a specific individual item
5. Click **"Generate Report"**
6. The file downloads automatically

### Salary Reports

Salary reports are available from both the Reports page and the Salary Management page:
- **Summary Report** — All employees' salary overview
- **Individual Report** — Detailed salary and payment history for one employee

---

## 20. AI Chatbot Assistant

The AI Chatbot is available to all logged-in users through the floating chat widget.

### How to Use the Chatbot

1. Click the 🤖 **Chat** icon in the bottom-right corner (or top navigation)
2. The chatbot window opens:

```
┌─────────────────────────────────────┐
│  🤖 AI Assistant          — □ ✕    │
├─────────────────────────────────────┤
│                                     │
│  Bot: Hello! I'm your AI           │
│  Assistant. How can I help you      │
│  with your inventory management     │
│  today?                             │
│                                     │
│  You: How many products do I have   │
│       with low stock?               │
│                                     │
│  Bot: You currently have 3 products │
│  with low stock (≤10 units):        │
│  1. Chair A - 8 units               │
│  2. Desk Lamp - 5 units             │
│  3. Mouse Pad - 3 units             │
│                                     │
├─────────────────────────────────────┤
│  [Type your question...      ] [📤] │
└─────────────────────────────────────┘
```

### What You Can Ask

| Query Type | Example Questions |
|---|---|
| **Inventory Queries** | "How many products do I have?" |
| **Stock Levels** | "Which items are low in stock?" |
| **Order Information** | "Show me pending orders" |
| **Sales Data** | "What were my sales this month?" |
| **Employee Info** | "How many employees work at Warehouse 1?" |
| **General Help** | "How do I add a new product?" |

### Chatbot Features

- **Role-Aware** — Responses are tailored to your role and accessible data
- **Minimize/Maximize** — Click the minimize button to collapse the window
- **Chat History** — Your conversation persists during the session
- **Error Handling** — Clear error messages if authentication fails

### Homepage Chatbot

A separate chatbot is available on the public homepage for visitor queries about the Inline Tracker platform. This does not require authentication.

---

## 21. Settings

Each user role has a dedicated Settings page.

### 21.1 Business Owner Settings

**Path:** Dashboard → Settings

```
┌──────────────────────────────────────────────────────────────┐
│  ⚙️ Settings                                                 │
│                                                              │
│  [Profile] [Company] [Preferences] [Security] [Danger Zone] │
│                                                              │
│  ═══════════════════════════════════════════════════════════  │
└──────────────────────────────────────────────────────────────┘
```

#### Tab 1: Profile

| Field | Description |
|---|---|
| First Name | Your first name |
| Last Name | Your last name |
| Email | Email address (display only) |
| Phone | Phone number |
| Address | Street address |
| City | City |
| State | State/Province |
| Country | Country (default: India) |
| Pincode | Postal/ZIP code |
| Profile Image | Upload/change profile photo |

Click **"Save Profile"** to update.

#### Tab 2: Company

| Field | Description |
|---|---|
| Company Name | Your business name |
| Company Phone | Business phone |
| Company Email | Business email |
| Company Address | Business address |
| Company City/State/Country | Location details |
| Company Pincode | Postal code |
| Company Logo | Upload company logo |

Click **"Save Company Settings"** to update.

#### Tab 3: Preferences

| Setting | Description |
|---|---|
| Email Notifications | Enable/disable email notifications |
| Order Alerts | Get alerts for new orders |
| Low Stock Alerts | Get alerts for low inventory |
| Weekly Report | Receive weekly summary report |

#### Tab 4: Security

- **Change Password:**
  1. Enter current password
  2. Enter new password (min. 6 characters)
  3. Confirm new password
  4. Click **"Change Password"**

#### Tab 5: Danger Zone

- **Deletion Requests Manager** — Review and approve/reject account deletion requests from employees and suppliers
- **Delete Account** — Permanently delete your business account (requires typing "DELETE" to confirm)

### 21.2 Employee Settings

**Path:** Dashboard → Settings (Employee)

Employees can:
- View and update their personal profile
- Change their password
- Request account deletion

### 21.3 Supplier Settings

**Path:** Dashboard → Settings (Supplier)

Suppliers can:
- View and update their personal profile
- Change their password
- Request account deletion

---

## 22. FAQ & Troubleshooting

### Frequently Asked Questions

**Q: I forgot my password. How do I reset it?**  
A: Contact the Business Owner who created your account. They can update your credentials from the employee/supplier management section.

**Q: Why can't I see certain menu items in the sidebar?**  
A: Your access is controlled by role-based permissions. Contact the Business Owner to request additional access.

**Q: How do I change my role from Employee to Manager?**  
A: Only the Business Owner can change employee roles. Go to Dashboard → Settings and contact your Business Owner.

**Q: Why are my products showing a low stock warning?**  
A: Products with 10 or fewer units are flagged as "Low Stock." Re-stock the product or adjust the threshold in Permission Manager → Notification Preferences.

**Q: Can I export data from any page?**  
A: Most list pages (Products, Orders, Employees, Suppliers, Warehouses) offer Excel and PDF export options. You also have a dedicated Reports page for comprehensive exports.

**Q: How do I assign an employee to a warehouse?**  
A: Go to Dashboard → Employees → Edit Employee, then select the warehouse from the dropdown. Alternatively, edit the warehouse and assign a manager.

**Q: Can suppliers see my product prices and inventory?**  
A: No. Suppliers only see orders assigned to them. Their dashboard shows their own order statistics only.

**Q: How does the AI Chatbot work?**  
A: The chatbot uses your authentication and role to query your data intelligently. It can answer questions about inventory, orders, and more based on your permission level.

### Common Issues & Solutions

| Issue | Solution |
|---|---|
| **"Invalid Email or Password"** | Double-check credentials. Ensure caps lock is off. |
| **Page not loading** | Check if both backend (port 5000) and frontend (port 3000) are running. |
| **Data not showing on dashboard** | Ensure your auth token hasn't expired. Try logging out and back in. |
| **Export not working** | Check browser popup blocker settings. Allow downloads from localhost. |
| **Chatbot returns errors** | Ensure you're logged in. Check if the backend server is running. |
| **Notifications not appearing** | Verify notification preferences are enabled in Permission Manager. |
| **Cannot create employee/supplier** | Only Business Owners can create new users. |
| **Permission changes not reflecting** | Click "Sync All Employees" in Permission Manager after changing role permissions. |

---

## 23. Glossary

| Term | Definition |
|---|---|
| **Auth Token** | A secure authentication token stored after login to verify your identity |
| **Business Owner** | The primary user who registers and manages the entire system |
| **Category** | A classification group for organizing products (e.g., Electronics) |
| **Customer Order** | An order placed by a customer for products from your inventory |
| **Dashboard** | The main overview page showing key business metrics and charts |
| **Employee** | A user created by the Business Owner with configurable access |
| **Individual Permission** | A permission override set for a specific employee |
| **Low Stock** | A product with 10 or fewer units in inventory |
| **Manager** | The highest employee sub-role with typically broader access |
| **Notification Preference** | Settings that control when automatic alerts are triggered |
| **Permission** | A access right that controls what a user can view or do |
| **Role-Based Permission** | Default permissions applied to all users of a given role |
| **Salary Payment** | A recorded payment made to an employee |
| **Sidebar** | The left navigation panel for accessing different sections |
| **Supplier** | An external vendor who supplies products to the business |
| **Supplier Order** | An order placed by the business to a supplier for stock |
| **Supervisor** | A mid-level employee sub-role |
| **Sync Permissions** | The action of applying role-based permissions to all employees of that role |
| **Warehouse** | A physical storage location for inventory |

---

## Quick Reference Card

### Keyboard Shortcuts

| Key | Action |
|---|---|
| **Escape** | Close sidebar on mobile |
| **Enter** | Send message in chat |

### URL Quick Access

| Page | URL |
|---|---|
| Home | `http://localhost:3000/` |
| Login | `http://localhost:3000/login` |
| Sign Up | `http://localhost:3000/signup` |
| Dashboard | `http://localhost:3000/dashboard` |
| Categories | `http://localhost:3000/dashboard/category` |
| Products | `http://localhost:3000/dashboard/products` |
| Orders | `http://localhost:3000/dashboard/orders` |
| Employees | `http://localhost:3000/dashboard/employee` |
| Suppliers | `http://localhost:3000/dashboard/suppliers` |
| Warehouses | `http://localhost:3000/dashboard/warehouses` |
| Permissions | `http://localhost:3000/dashboard/permissions` |
| Salary | `http://localhost:3000/dashboard/salary` |
| Notifications | `http://localhost:3000/dashboard/notifications` |
| Messages | `http://localhost:3000/dashboard/messages` |
| Reports | `http://localhost:3000/dashboard/reports` |
| Settings | `http://localhost:3000/dashboard/settings` |

---

**© 2026 Inline Tracker — Smart Inventory Management System**  
**Version 1.0.0 | All Rights Reserved**
