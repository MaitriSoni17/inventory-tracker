# Testing Guide - Role-Based Access Control

## Quick Start Testing

### Step 1: Create Test Employees

Use Postman or your frontend to create employees with different roles:

#### **Creating a Manager**
```json
POST: http://localhost:5000/api/employee/createemployee
Headers: { "auth-token": "YOUR_BUSINESS_OWNER_TOKEN" }

Body (form-data):
{
  "fname": "John",
  "lname": "Manager",
  "email": "manager@test.com",
  "password": "password123",
  "role": "manager",
  "department": "Operations",
  "hireAt": "2024-01-01"
}

Expected Response:
{
  "authToken": "...",
  "success": true,
  "employee": {
    "_id": "...",
    "role": "manager",
    "fname": "John",
    "email": "manager@test.com"
  }
}
```

#### **Creating a Supervisor**
```json
POST: http://localhost:5000/api/employee/createemployee
Headers: { "auth-token": "YOUR_BUSINESS_OWNER_TOKEN" }

Body (form-data):
{
  "fname": "Jane",
  "lname": "Supervisor",
  "email": "supervisor@test.com",
  "password": "password123",
  "role": "supervisor",
  "department": "Sales",
  "reportingTo": "MANAGER_ID",
  "hireAt": "2024-01-15"
}
```

#### **Creating a Regular Employee**
```json
POST: http://localhost:5000/api/employee/createemployee
Headers: { "auth-token": "YOUR_BUSINESS_OWNER_TOKEN" }

Body (form-data):
{
  "fname": "Bob",
  "lname": "Employee",
  "email": "employee@test.com",
  "password": "password123",
  "role": "employee",
  "department": "Sales",
  "reportingTo": "SUPERVISOR_ID",
  "hireAt": "2024-02-01"
}
```

---

### Step 2: Test Login with Each Role

#### **Login as Employee**
```json
POST: http://localhost:5000/api/employee/loginemployee

Body:
{
  "email": "employee@test.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "authtoken": "eyJhbGc...",
  "role": "employee"  // ← Note: role is returned
}
```

Store the `authtoken` for subsequent requests.

#### **Login as Supervisor**
```json
POST: http://localhost:5000/api/employee/loginemployee

Body:
{
  "email": "supervisor@test.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "authtoken": "eyJhbGc...",
  "role": "supervisor"  // ← Role is "supervisor"
}
```

#### **Login as Manager**
```json
POST: http://localhost:5000/api/employee/loginemployee

Body:
{
  "email": "manager@test.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "authtoken": "eyJhbGc...",
  "role": "manager"  // ← Role is "manager"
}
```

---

### Step 3: Test Permission Restrictions

#### **Test: Employee Cannot Delete Product**

Login as Employee and try to delete a product:

```json
DELETE: http://localhost:5000/api/products/deleteproduct/PRODUCT_ID
Headers: {
  "auth-token": "EMPLOYEE_TOKEN",
  "Content-Type": "application/json"
}

Expected Response (403):
{
  "error": "You do not have permission to delete products"
}
```

#### **Test: Supervisor CAN Delete Product**

Login as Supervisor:

```json
DELETE: http://localhost:5000/api/products/deleteproduct/PRODUCT_ID
Headers: {
  "auth-token": "SUPERVISOR_TOKEN",
  "Content-Type": "application/json"
}

Expected Response (200):
{
  "message": "Product deleted successfully"
}
```

#### **Test: Employee Cannot Create Warehouse**

```json
POST: http://localhost:5000/api/warehouse/createwarehouse
Headers: {
  "auth-token": "EMPLOYEE_TOKEN",
  "Content-Type": "application/json"
}

Body:
{
  "wName": "Test Warehouse",
  "wManager": "John",
  "wAddress": "123 Main St",
  "wContact": "1234567890",
  "wEmail": "warehouse@test.com"
}

Expected Response (403):
{
  "error": "You do not have permission to create warehouses"
}
```

#### **Test: Manager CAN Create Warehouse**

```json
POST: http://localhost:5000/api/warehouse/createwarehouse
Headers: {
  "auth-token": "MANAGER_TOKEN",
  "Content-Type": "application/json"
}

Body:
{
  "wName": "Test Warehouse",
  "wManager": "John",
  "wAddress": "123 Main St",
  "wContact": "1234567890",
  "wEmail": "warehouse@test.com"
}

Expected Response (200):
{
  "wName": "Test Warehouse",
  "_id": "...",
  "businessowner": "...",
  "employee": "..."
}
```

---

### Step 4: Test Hierarchy Access

#### **Test: Supervisor Can See Subordinates**

```json
POST: http://localhost:5000/api/employee/getemployee
Headers: {
  "auth-token": "SUPERVISOR_TOKEN",
  "Content-Type": "application/json"
}

Expected Response:
{
  "_id": "...",
  "fname": "Jane",
  "role": "supervisor",
  "reportingTo": { /* Manager details */ },
  "subordinates": [
    {
      "_id": "...",
      "fname": "Bob",
      "email": "employee@test.com"
    }
  ]
}
```

#### **Test: Employee CAN See Their Manager**

```json
POST: http://localhost:5000/api/employee/getemployee
Headers: {
  "auth-token": "EMPLOYEE_TOKEN",
  "Content-Type": "application/json"
}

Expected Response:
{
  "_id": "...",
  "fname": "Bob",
  "role": "employee",
  "reportingTo": { /* Supervisor details */ },
  "subordinates": []
}
```

---

### Step 5: Test Frontend UI

#### **Test: Sidebar Menu Changes by Role**

1. **Login as Employee**
   - Should see: Dashboard, Categories, Products, Orders, Settings
   - Should NOT see: Employees, Suppliers, Warehouses

2. **Login as Supervisor**
   - Should see: Dashboard, Categories, Products, Orders, Settings
   - Should NOT see: Employees, Suppliers
   - Should NOT see: Warehouses (supervisors can't manage warehouses)

3. **Login as Manager**
   - Should see: Dashboard, Categories, Products, Orders, Settings
   - Should see: Employees (can manage team)
   - Should NOT see: Suppliers
   - Should see: Warehouses (managers can manage)

4. **Login as Business Owner**
   - Should see: All menu items
   - Should see: Dashboard, Categories, Products, Orders, Settings, Employees, Suppliers, Warehouses

#### **Test: Role Badge Display**

1. Login as any role
2. Look at top-right corner (user menu area)
3. Should see badge showing current role:
   - Manager = Blue badge
   - Supervisor = Cyan badge
   - Employee = Green badge
   - Business Owner = Secondary badge

#### **Test: Delete Button Visibility**

1. **Login as Employee**: Delete buttons should be disabled/hidden on products
2. **Login as Supervisor**: Delete buttons should be visible on products
3. **Login as Manager**: Delete buttons should be visible on all items

---

### Step 6: Test API Access Control

#### **Test Matrix: Who Can Delete Products**

```
┌──────────────────┬───────────────────────────────────────────┐
│ Role             │ Can Delete Products                       │
├──────────────────┼───────────────────────────────────────────┤
│ Employee         │ ❌ No (403 Forbidden)                     │
│ Supervisor       │ ✅ Yes (own & subordinates' products)    │
│ Manager          │ ✅ Yes (own & team members' products)    │
│ Business Owner   │ ✅ Yes (all products)                    │
└──────────────────┴───────────────────────────────────────────┘
```

#### **Test Matrix: Who Can Create Warehouses**

```
┌──────────────────┬───────────────────────────────────────────┐
│ Role             │ Can Create Warehouses                     │
├──────────────────┼───────────────────────────────────────────┤
│ Employee         │ ❌ No (403 Forbidden)                     │
│ Supervisor       │ ❌ No (403 Forbidden)                     │
│ Manager          │ ✅ Yes                                    │
│ Business Owner   │ ✅ Yes                                    │
└──────────────────┴───────────────────────────────────────────┘
```

#### **Test Matrix: Who Can Create/Delete Categories**

```
┌──────────────────┬──────────────────┬──────────────────┐
│ Role             │ Create Category  │ Delete Category  │
├──────────────────┼──────────────────┼──────────────────┤
│ Employee         │ ❌ No            │ ❌ No            │
│ Supervisor       │ ✅ Yes           │ ❌ No            │
│ Manager          │ ✅ Yes           │ ✅ Yes           │
│ Business Owner   │ ✅ Yes           │ ✅ Yes           │
└──────────────────┴──────────────────┴──────────────────┘
```

---

## Automated Testing Script (Postman)

Create a Postman collection with these tests:

```javascript
// Test 1: Employee Creation with Manager Role
pm.test("Create Manager", function () {
    pm.response.to.have.status(200);
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.employee.role).to.eql("manager");
    pm.environment.set("manager_token", jsonData.authToken);
    pm.environment.set("manager_id", jsonData.employee._id);
});

// Test 2: Login with Manager Credentials
pm.test("Login Manager", function () {
    pm.response.to.have.status(200);
    var jsonData = pm.response.json();
    pm.expect(jsonData.role).to.eql("manager");
    pm.expect(jsonData.success).to.eql(true);
    pm.environment.set("manager_token", jsonData.authtoken);
});

// Test 3: Verify Manager Can Delete Products
pm.test("Manager Can Delete Product", function () {
    pm.response.to.have.status(200);
    pm.expect(pm.response.text()).to.include("deleted successfully");
});

// Test 4: Verify Employee CANNOT Delete Products
pm.test("Employee Cannot Delete Product", function () {
    pm.response.to.have.status(403);
    pm.expect(pm.response.text()).to.include("permission");
});
```

---

## Troubleshooting

### Issue: Employee still sees warehouse option
**Solution**: 
- Clear browser cache
- Re-login
- Check localStorage for correct role
- Verify RoleContext is working

### Issue: Permission check not working
**Solution**:
- Verify `roleBasedAccess.js` middleware is imported
- Check `hasPermission()` function is called
- Verify role in database (not JWT)

### Issue: Reports To not working
**Solution**:
- Ensure manager exists before setting as supervisor's reportingTo
- Check if subordinates array is being updated
- Verify ObjectId is correct

### Issue: Sidebar menu not changing
**Solution**:
- Verify role is being fetched from `/api/employee/getemployee`
- Check RoleContext provider is wrapping entire app
- Clear React cache if using hot reload

---

## Success Criteria

- [ ] All 3 roles can be created
- [ ] Each role logs in successfully
- [ ] Role badge displays correctly
- [ ] Sidebar menu adapts to role
- [ ] Delete permissions work as expected
- [ ] Warehouse access restricted properly
- [ ] Category management works per role
- [ ] Employee hierarchy displays correctly
- [ ] API returns proper 403 errors for denied access
- [ ] No console errors in browser

---

**Testing Date**: December 31, 2025  
**Status**: Ready for QA
