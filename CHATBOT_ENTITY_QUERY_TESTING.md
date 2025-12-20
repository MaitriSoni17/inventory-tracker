# Chatbot Entity Query Testing Guide

## Overview
This guide covers testing the enhanced chatbot features that allow querying detailed information about specific products, orders, warehouses, and categories.

---

## Testing Instructions

### 1. **Product Details Query Testing**

#### Prerequisites:
- Log in as a Business Owner
- Ensure products exist in the system

#### Test Cases:

**Test 1.1: Basic Product Search by Name**
```
Query: "Tell me about product iPhone 13"
Expected: Displays product details including:
- Product name
- Category
- Price
- Stock/Quantity
- Brand
- Manufacture Date
- Expiry Date
- Warehouses
- Description
- Low stock warning (if applicable)
```

**Test 1.2: Product Search with "Show" Keyword**
```
Query: "Show product details for Samsung Galaxy"
Expected: Same as Test 1.1
```

**Test 1.3: Item Terminology**
```
Query: "Item details for iPad Pro"
Expected: Same product information format
```

**Test 1.4: No Match Found**
```
Query: "Tell me about product NonExistentProduct"
Expected: ❌ No products found matching "NonExistentProduct"
         💡 Try searching with a different name or check if the product exists in your system.
```

**Test 1.5: Low Stock Warning**
```
Query: "Tell me about product [low-stock-product]"
Expected: Product details with ⚠️ **LOW STOCK ALERT** message (if stock < 10 units)
```

---

### 2. **Order Details Query Testing**

#### Prerequisites:
- Log in as a Business Owner
- Ensure orders exist in the system

#### Test Cases:

**Test 2.1: Order Search by Customer Name**
```
Query: "Show order for John Doe"
Expected: Displays all orders from that customer:
- Customer name
- Product name
- Category
- Amount
- Order Date
- Delivery Deadline
- Days Remaining with Urgency Status
  - ✅ On Track (7+ days)
  - ⚡ Due Soon (3-7 days)
  - ⚠️ URGENT - DEADLINE APPROACHING (< 3 days)
  - 🔴 OVERDUE (negative days)
- Product Status
- Delivery Status
- Delivery Address
- Notes
```

**Test 2.2: Order Search by Product Name**
```
Query: "Tell me about order for Laptop"
Expected: All orders containing product "Laptop"
```

**Test 2.3: Urgent Order Detection**
```
Query: "Show order for [customer-with-urgent-order]"
Expected: Shows ⚠️ URGENT - DEADLINE APPROACHING indicator for orders due within 3 days
```

**Test 2.4: Overdue Order Detection**
```
Query: "Tell me about order for [customer-with-overdue-order]"
Expected: Shows 🔴 OVERDUE indicator for past-due orders
```

**Test 2.5: No Matches**
```
Query: "Show order for NonExistentCustomer"
Expected: ❌ No orders found matching "NonExistentCustomer"
         💡 Try searching with a customer name or product name.
```

---

### 3. **Category Details Query Testing**

#### Prerequisites:
- Log in as a Business Owner
- Ensure categories exist in the system

#### Test Cases:

**Test 3.1: List All Categories**
```
Query: "Show all categories"
Expected: 📂 **CATEGORY DETAILS:**
- Total number of categories
- For each category:
  - Category name
  - Description
  - Number of products in category
```

**Test 3.2: Alternative Category Query**
```
Query: "List categories"
Expected: Same as Test 3.1
```

**Test 3.3: Categories with Product Count**
```
Query: "Tell me about category Electronics"
Expected: Shows all categories (not filtered) with product counts
Note: Current implementation lists all categories, not filtered by name
```

**Test 3.4: No Categories**
```
Query: "Show all categories" (when no categories exist)
Expected: 📦 **No categories found.** Create categories in your dashboard to organize products.
```

---

### 4. **Warehouse Details Query Testing**

#### Prerequisites:
- Log in as a Business Owner
- Ensure warehouses exist in the system

#### Test Cases:

**Test 4.1: Warehouse Details - Standard Query**
```
Query: "Show warehouse details"
Expected: 🏢 **WAREHOUSE DETAILS:**
- Warehouse name
- Manager name
- Address
- Contact number
- Email
- City/State/Country information
```

**Test 4.2: Warehouse Information by Location**
```
Query: "Tell me about warehouse location"
Expected: Shows all warehouses with location information
```

**Test 4.3: Warehouse Manager Details**
```
Query: "Show warehouse manager information"
Expected: Shows all warehouses with manager names and contact info
```

**Test 4.4: No Warehouses**
```
Query: "Show warehouse details" (when no warehouses exist)
Expected: 🏢 **No warehouses found.** Add warehouses in your dashboard to start managing inventory locations.
```

---

## Advanced Test Scenarios

### 5. **Role-Based Access Control**

**Test 5.1: Business Owner Access**
```
User Role: Business Owner
Query: "Tell me about product iPhone"
Expected: Displays complete product details
```

**Test 5.2: Employee Access Restriction**
```
User Role: Employee
Query: "Tell me about product iPhone"
Expected: May have limited access or different response
```

**Test 5.3: Supplier Access Restriction**
```
User Role: Supplier
Query: "Tell me about product iPhone"
Expected: May have limited access or different response
```

---

### 6. **Natural Language Variations**

**Test 6.1: Different Product Query Formats**
```
Queries to test:
- "product iPhone" → Should NOT trigger (needs "tell me", "show", "detail", "info about", "about")
- "Tell me about iPhone" → May trigger depending on keyword detection
- "Product details for iPhone" → Should trigger
- "Show me iPhone details" → Should trigger
- "Info about product iPhone" → Should trigger
```

**Test 6.2: Order Query Variations**
```
Queries to test:
- "order status" → General order status (intent detection)
- "show order for John" → Specific order query
- "Tell me about John's order" → Specific order query
- "order details" → Should trigger order_details intent
```

**Test 6.3: Quote Handling**
```
Queries to test:
- "Product 'iPhone 13 Pro'"
- 'Product "Samsung Galaxy S21"'
- Product iPhone 13 Pro (without quotes)
```

---

### 7. **Performance Testing**

**Test 7.1: Multiple Search Results**
```
Query: "Tell me about product P" (product names starting with P)
Expected: Returns up to 5 results (limit)
- Displays all results in formatted table
- No performance degradation
```

**Test 7.2: Large Warehouse List**
```
Query: "Show warehouse details" (with 20+ warehouses)
Expected: All warehouses displayed in formatted list
```

**Test 7.3: Special Characters in Names**
```
Queries with:
- Hyphens: "Product John-Doe-Item"
- Apostrophes: "Product O'Brien"
- Numbers: "Product 3M"
- Parentheses: "Product (Special)"
Expected: Proper escaping and no regex errors
```

---

## Test Results Template

### Test Case: [Test Name]
- **Query Sent**: [User input]
- **Expected Result**: [What should happen]
- **Actual Result**: [What actually happened]
- **Status**: ✅ PASS / ❌ FAIL
- **Notes**: [Any observations or issues]

---

## Known Limitations & Behaviors

1. **Category Search Not Filtered by Name**
   - Currently lists all categories regardless of query
   - Future enhancement: Filter by category name

2. **Search Results Limit**
   - Maximum 5 results per search
   - If more than 5 results, oldest entries are excluded

3. **Warehouse Detail Query**
   - Requires both "warehouse" AND "detail"/"address"/"manager"/"location"/"info"
   - Simple "warehouse" query won't trigger entity handler

4. **Role-Based Restrictions**
   - Currently only Business Owner has full access to entity queries
   - Employees and Suppliers may have limited functionality

---

## Debugging Tips

### If entity queries are not working:

1. **Check Network Tab**
   - Verify chatbot message POST request includes userId
   - Response should contain handleSpecificEntityQuery result

2. **Check Browser Console**
   - Look for any JavaScript errors
   - Check if chatbot component is properly rendering responses

3. **Check Backend Logs**
   - Verify MongoDB queries execute successfully
   - Look for "Error searching products" or similar error messages

4. **Verify Data in Database**
   - Ensure products/orders/categories/warehouses exist
   - Check businessowner field matches logged-in user's ID

5. **Test with Sample Data**
   - Use known product names for testing
   - Create test orders with specific customer names

---

## Feature Request Enhancements

Potential improvements for future versions:

1. **Sorting Options**
   - Sort products by price, stock, date
   - Sort orders by date, customer, urgency

2. **Filtering**
   - Filter by category, date range, status
   - Filter warehouses by location

3. **Pagination**
   - Handle large result sets with pagination
   - Show "Next" / "Previous" navigation

4. **Fuzzy Search**
   - Match partial/misspelled names
   - Suggest corrections

5. **Export**
   - Export results as CSV/PDF
   - Generate reports

---

## Success Criteria

✅ All tests pass when:
- Product queries return detailed information with emoji formatting
- Order queries show deadline urgency accurately
- Category queries list all categories with product counts
- Warehouse queries display complete contact information
- No results queries show helpful error messages
- Natural language queries with various phrasings work correctly
- Role-based access control functions properly
- Special characters and edge cases handled without errors
- Performance acceptable with large datasets
