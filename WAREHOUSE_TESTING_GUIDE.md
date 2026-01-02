# Warehouse-Based Access Control - Testing Guide

## Setup Prerequisites

Before testing, ensure the following setup is complete:

### 1. Create Test Data in MongoDB

```
- 2-3 Warehouses (e.g., "Main Warehouse", "Secondary Warehouse", "Branch Warehouse")
- 1 Business Owner account
- Employees assigned to specific warehouses:
  - Manager1: Assigned to "Main Warehouse"
  - Manager2: Assigned to "Secondary Warehouse"
  - Supervisor1: Assigned to "Main Warehouse" 
  - Employee1: Assigned to "Main Warehouse"
  - Employee2: Assigned to "Secondary Warehouse"
```

### 2. Database Fields to Verify

In MongoDB, check these fields exist:
- `Employee.warehouse` - ObjectId reference to Warehouse
- `Order.warehouse` - ObjectId reference to Warehouse
- `CustomerOrders.warehouse` - ObjectId reference to Warehouse
- `SupplierOrders.warehouse` - ObjectId reference to Warehouse

## Test Cases

### Test 1: Create Employee with Warehouse Assignment

**Purpose**: Verify that new employees can be assigned to a warehouse during creation

**Steps**:
1. Login as Business Owner
2. Navigate to Create Employee (`/dashboard/createemployee`)
3. Fill in employee details:
   - First Name: "Test Manager"
   - Email: "testmanager@test.com"
   - Password: "password123"
   - Role: "manager"
   - Hire At (Warehouse): Select "Main Warehouse"
4. Submit the form

**Expected Result**:
- ✅ Employee created successfully
- ✅ Employee.warehouse field contains "Main Warehouse" ID
- ✅ Employee.hireAt and Employee.warehouse both set to same warehouse

**Verification Command**:
```javascript
// In MongoDB shell
db.employees.findOne({email: "testmanager@test.com"})
// Should show:
// {
//   warehouse: ObjectId("warehouse_id"),
//   hireAt: ObjectId("warehouse_id"),
//   ...
// }
```

---

### Test 2: Business Owner Creates Order with Warehouse Assignment

**Purpose**: Verify business owner can create orders and assign them to specific warehouses

**Steps**:
1. Login as Business Owner
2. Navigate to Add Order (`/dashboard/addorder`)
3. Fill order details:
   - Customer Name: "Test Customer"
   - Customer Email: "customer@test.com"
   - Customer Phone: "9999999999"
   - Product Name: "Test Product"
   - Category: Select any category
   - Amount: "5000"
   - Units: "10"
   - Dates: Set appropriate dates
   - Status: "Paid"
   - Delivery Status: "Packed"
   - Warehouse: Select "Main Warehouse"
4. Submit the form

**Expected Result**:
- ✅ Order created successfully
- ✅ Order.warehouse field set to "Main Warehouse"
- ✅ Order appears in business owner's order list with warehouse name displayed

**Verification Command**:
```javascript
// In MongoDB shell
db.customerorders.findOne({cName: "Test Customer"})
// Should show:
// {
//   warehouse: ObjectId("warehouse_id"),
//   ...
// }
```

---

### Test 3: Warehouse Staff (Manager) Sees Only Their Warehouse Products

**Purpose**: Verify that managers/supervisors/employees only see products from their assigned warehouse

**Steps**:
1. Create products in "Main Warehouse"
2. Create products in "Secondary Warehouse"
3. Login as Manager1 (assigned to "Main Warehouse")
4. Navigate to Products (`/dashboard/products`)

**Expected Result**:
- ✅ Products from "Main Warehouse" are visible
- ✅ Products from "Secondary Warehouse" are NOT visible
- ✅ Only products with warehouse matching employee's warehouse appear

**Debug Steps**:
1. Open Browser DevTools → Network tab
2. Monitor `/api/products/getproduct` API call
3. Verify response only contains products with `warehouse: "main_warehouse_id"`

---

### Test 4: Warehouse Staff (Manager) Sees Only Their Warehouse Orders

**Purpose**: Verify that managers only see orders assigned to their warehouse

**Steps**:
1. Create order and assign to "Main Warehouse"
2. Create order and assign to "Secondary Warehouse"
3. Login as Manager1 (assigned to "Main Warehouse")
4. Navigate to Orders (`/dashboard/orders`)

**Expected Result**:
- ✅ Order from "Main Warehouse" is visible
- ✅ Order from "Secondary Warehouse" is NOT visible
- ✅ Warehouse name displays in the "Warehouse" column
- ✅ Only orders with matching warehouse appear

**Debug Steps**:
1. Open Browser DevTools → Network tab
2. Monitor `/api/customerorders/getcustomerorder` API call
3. Verify response only contains orders with `warehouse: "main_warehouse_id"`

---

### Test 5: Manager Cannot Update Orders from Other Warehouses

**Purpose**: Verify that managers can only update orders in their assigned warehouse

**Steps**:
1. Create two orders:
   - Order A: "Main Warehouse"
   - Order B: "Secondary Warehouse"
2. Login as Manager1 (assigned to "Main Warehouse")
3. Try to edit Order A - Navigate to `/dashboard/editorder/{orderA_id}`
4. Try to edit Order B - Navigate to `/dashboard/editorder/{orderB_id}`

**Expected Result**:
- ✅ Can successfully edit Order A
- ✅ Cannot edit Order B (should get 403 Forbidden error)
- ✅ Attempting to update Order B via API returns: `"You can only update orders in your warehouse"`

**Verification in Browser Console**:
```javascript
// Try to update order from different warehouse
fetch('http://localhost:5000/api/customerorders/updatecustomerorder/{orderB_id}', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'auth-token': localStorage.getItem('token')
  },
  body: JSON.stringify({
    cName: "Test",
    cEmail: "test@test.com",
    // ... other fields
  })
}).then(r => r.json()).then(console.log)
// Should respond with 403 error
```

---

### Test 6: Supervisor/Employee See Only Their Warehouse Orders

**Purpose**: Verify that supervisors and employees only see orders from their warehouse

**Steps**:
1. Create orders for different warehouses
2. Login as Supervisor1 (assigned to "Main Warehouse")
3. Navigate to Orders (`/dashboard/orders`)
4. Repeat for Employee1

**Expected Result**:
- ✅ Supervisor sees only "Main Warehouse" orders
- ✅ Cannot see "Secondary Warehouse" orders
- ✅ Employee sees only "Main Warehouse" orders
- ✅ Cannot see "Secondary Warehouse" orders

---

### Test 7: Employee Creates Order in Their Warehouse

**Purpose**: Verify employees can create orders, which auto-assign to their warehouse

**Steps**:
1. Login as Employee1 (assigned to "Main Warehouse")
2. Navigate to Add Order
3. Create order without selecting warehouse (or warehouse field not visible)

**Expected Result**:
- ✅ Order created successfully
- ✅ Order.warehouse automatically set to Employee1's warehouse ("Main Warehouse")
- ✅ Order appears when Employee1 views orders
- ✅ Order NOT visible to employees in other warehouses

**Backend Verification**:
```javascript
// In backend routes/customerorders.js
// For employee role, line ~38:
if (employee && employee.warehouse) {
    customerorderData.warehouse = employee.warehouse;
}
```

---

### Test 8: Business Owner Can Reassign Orders Between Warehouses

**Purpose**: Verify only business owner can change warehouse assignment

**Steps**:
1. Login as Business Owner
2. Create order assigned to "Main Warehouse"
3. Edit the order
4. Change warehouse to "Secondary Warehouse"
5. Save changes

**Expected Result**:
- ✅ Warehouse changed successfully
- ✅ Order now visible to Manager2 (Secondary Warehouse)
- ✅ Order no longer visible to Manager1 (Main Warehouse)

**Verify via API**:
```javascript
fetch('http://localhost:5000/api/customerorders/updatecustomerorder/{orderId}', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'auth-token': localStorage.getItem('token')
  },
  body: JSON.stringify({
    warehouse: "secondary_warehouse_id",
    // ... other fields
  })
}).then(r => r.json()).then(console.log)
// Should succeed for business owner
```

---

### Test 9: Manager Cannot Change Order Warehouse

**Purpose**: Verify that only business owner can reassign warehouses

**Steps**:
1. Login as Manager1
2. Try to update an order's warehouse field
3. Attempt via API with warehouse parameter

**Expected Result**:
- ✅ Manager can update status/delivery details
- ✅ Manager CANNOT change warehouse field
- ✅ Warehouse field in form should be read-only for non-owners
- ✅ API ignores warehouse parameter for non-owners

**API Test**:
```javascript
// Should not change warehouse
fetch('http://localhost:5000/api/customerorders/updatecustomerorder/{orderId}', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'auth-token': manager_token
  },
  body: JSON.stringify({
    warehouse: "different_warehouse_id"
  })
})
// warehouse should remain unchanged
```

---

### Test 10: Supplier Orders Warehouse Filtering

**Purpose**: Verify supplier orders are filtered by warehouse

**Steps**:
1. Create supplier orders for different warehouses
2. Login as Manager1 (Main Warehouse)
3. Navigate to supplier orders
4. Verify only "Main Warehouse" supplier orders visible

**Expected Result**:
- ✅ Manager sees only supplier orders for their warehouse
- ✅ Supplier sees all orders placed with them
- ✅ Business owner sees all supplier orders

---

## Cross-Warehouse Access Prevention Tests

### Test 11: Manager1 Cannot See Manager2's Data

**Purpose**: Verify strict warehouse isolation

**Steps**:
1. Login as Manager1 (Main Warehouse)
2. Create product in Main Warehouse
3. Create product in Secondary Warehouse (via different manager)
4. Verify separation

**Expected Result**:
- ✅ Manager1 sees Main Warehouse products only
- ✅ Manager1 cannot access Secondary Warehouse products
- ✅ Both products exist in database but manager sees filtered view

**API Verification**:
```javascript
// Monitor API response
const response = await fetch('/api/products/getproduct', {
  method: 'POST',
  headers: {
    'auth-token': manager1_token
  }
})
const products = await response.json()
// All products should have warehouse matching manager's warehouse
products.every(p => p.warehouse.includes(manager1_warehouse_id))
// Should return true
```

---

## Performance & Edge Cases

### Test 12: No Warehouse Assignment - Access Denied

**Purpose**: Verify employees with no warehouse assignment cannot access data

**Setup**: Create employee WITHOUT warehouse assignment

**Steps**:
1. Login as employee with no warehouse
2. Try to access products
3. Try to access orders

**Expected Result**:
- ✅ Empty list returned (no data shown)
- ✅ No error, but no products/orders visible
- ✅ Message shows "No products found" or "No orders found"

---

### Test 13: Bulk Operations Respect Warehouse Filtering

**Purpose**: Verify export/report functions only include filtered data

**Steps**:
1. Create multiple orders in different warehouses
2. Login as Manager1
3. Export orders to Excel
4. Export orders to PDF

**Expected Result**:
- ✅ Exported files only contain Manager1's warehouse orders
- ✅ Other warehouse orders NOT in export
- ✅ Report shows correct filtered totals

---

## API Response Verification Checklist

### For GET /api/products/getproduct

```javascript
// All returned products should have warehouse matching user's warehouse
const checkProducts = (products, userWarehouse) => {
  return products.every(p => {
    if (Array.isArray(p.warehouse)) {
      return p.warehouse.includes(userWarehouse);
    }
    return true; // Empty warehouse = null, acceptable
  });
};
```

### For GET /api/customerorders/getcustomerorder

```javascript
// All returned orders should have warehouse matching user's warehouse
const checkOrders = (orders, userWarehouse) => {
  return orders.every(o => {
    return !o.warehouse || o.warehouse._id === userWarehouse;
  });
};
```

### For GET /api/orders/getorders

```javascript
// Similar check for regular orders
const checkOrders = (orders, userWarehouse) => {
  return orders.every(o => {
    return !o.warehouse || o.warehouse._id === userWarehouse;
  });
};
```

---

## Troubleshooting

### Issue: Manager Sees All Products (Not Filtered)

**Cause**: Warehouse field not set on products or employee

**Fix**:
1. Verify products have `warehouse` field populated
2. Verify employee has `warehouse` ObjectId reference
3. Check backend filter logic in `/api/products/getproduct`
4. Verify token contains employee ID and can fetch employee data

### Issue: Orders Show As `-` for Warehouse

**Cause**: Warehouse mapping issue in frontend

**Fix**:
1. Verify `warehouseMap` state is populated
2. Check API response includes populated warehouse object
3. Ensure warehouse ID matches in mapping
4. Check browser console for errors

### Issue: Cannot Edit Order - 401/403 Error

**Cause**: Permission check failing

**Fix**:
1. Verify employee assigned to order's warehouse
2. Check `Employee.warehouse` field matches `Order.warehouse`
3. Verify token is valid
4. Check backend authorization logic

---

## Success Criteria

All tests are PASSING when:

✅ Business owner sees ALL products, orders across all warehouses  
✅ Managers/supervisors/employees see ONLY their warehouse data  
✅ Warehouse isolation is strict - NO data leakage  
✅ Business owner can reassign orders between warehouses  
✅ Non-owners cannot change warehouse assignments  
✅ New employees auto-assign to their warehouse  
✅ New orders auto-assign to employee's warehouse  
✅ Exports and reports respect filtering  
✅ Cross-warehouse access attempts return proper errors  
✅ All API responses include populated warehouse data  

---

## Regression Tests

After any code changes, re-run:
- Test 3: Manager product filtering
- Test 4: Manager order filtering
- Test 5: Manager update permissions
- Test 11: Cross-warehouse isolation
