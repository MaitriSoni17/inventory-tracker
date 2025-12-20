# Chatbot Entity Query - Quick Test Cases

## 🚀 Ready-to-Test Queries

Use these exact queries to test the chatbot features. Log in as a **Business Owner** first.

---

## ✅ Test Set 1: Product Queries

### Test 1.1 - Basic Product Search
```
Query: "Tell me about product"
Expected: Should ask for product name or show error
Status: To test
Result: _______________
```

### Test 1.2 - Product by Name (Exact)
```
Query: "Tell me about product iPhone 13"
Expected: Shows product details if it exists
Status: To test
Result: _______________
```

### Test 1.3 - Product with Show Command
```
Query: "Show product details for Dell Laptop"
Expected: Dell Laptop details
Status: To test
Result: _______________
```

### Test 1.4 - Item Terminology
```
Query: "Item details for Samsung Galaxy"
Expected: Samsung product details
Status: To test
Result: _______________
```

### Test 1.5 - Non-existent Product
```
Query: "Tell me about product XYZ123NonExistent"
Expected: ❌ No products found message with helpful tip
Status: To test
Result: _______________
```

### Test 1.6 - Product with Special Characters
```
Query: "Tell me about product iPad (2023)"
Expected: iPad product details
Status: To test
Result: _______________
```

---

## ✅ Test Set 2: Order Queries

### Test 2.1 - Order by Customer Name
```
Query: "Show order for John Doe"
Expected: All orders from John Doe with deadline info
Status: To test
Result: _______________
```

### Test 2.2 - Order by Product Name
```
Query: "Tell me about order for iPhone"
Expected: All orders containing iPhone
Status: To test
Result: _______________
```

### Test 2.3 - Order with Urgency Status (7+ days)
```
Query: "Show order for [customer with future deadline]"
Expected: ✅ On Track status
Status: To test
Result: _______________
```

### Test 2.4 - Order with Urgency Status (3-7 days)
```
Query: "Show order for [customer with 3-7 day deadline]"
Expected: ⚡ Due Soon status
Status: To test
Result: _______________
```

### Test 2.5 - Order with Urgency Status (< 3 days)
```
Query: "Show order for [customer with urgent deadline]"
Expected: ⚠️ URGENT - DEADLINE APPROACHING
Status: To test
Result: _______________
```

### Test 2.6 - Non-existent Order
```
Query: "Show order for NonExistentCustomer999"
Expected: ❌ No orders found message
Status: To test
Result: _______________
```

---

## ✅ Test Set 3: Category Queries

### Test 3.1 - List All Categories
```
Query: "Show all categories"
Expected: 📂 CATEGORY DETAILS with:
          - Total category count
          - Each category with product count
Status: To test
Result: _______________
```

### Test 3.2 - Alternative Categories Command
```
Query: "List categories"
Expected: Same as Test 3.1
Status: To test
Result: _______________
```

### Test 3.3 - Tell Me About Categories
```
Query: "Tell me about categories"
Expected: Same category listing
Status: To test
Result: _______________
```

### Test 3.4 - Empty Categories
```
Query: "Show all categories" (when none exist)
Expected: 📦 **No categories found.** message
Status: To test
Result: _______________
```

---

## ✅ Test Set 4: Warehouse Queries

### Test 4.1 - Warehouse Details
```
Query: "Show warehouse details"
Expected: 🏢 WAREHOUSE DETAILS with:
          - Warehouse name
          - Manager name
          - Full address
          - Contact number
          - Email
Status: To test
Result: _______________
```

### Test 4.2 - Warehouse Location Info
```
Query: "Tell me about warehouse location"
Expected: Same warehouse details
Status: To test
Result: _______________
```

### Test 4.3 - Warehouse Manager
```
Query: "Show warehouse manager information"
Expected: Warehouses with manager details
Status: To test
Result: _______________
```

### Test 4.4 - Warehouse Address
```
Query: "Tell me about warehouse address"
Expected: Warehouses with full address info
Status: To test
Result: _______________
```

### Test 4.5 - Empty Warehouses
```
Query: "Show warehouse details" (when none exist)
Expected: 🏢 **No warehouses found.** message
Status: To test
Result: _______________
```

---

## ✅ Test Set 5: Edge Cases & Error Handling

### Test 5.1 - Query Without Keyword
```
Query: "Tell me"
Expected: General response or ask for clarification
Status: To test
Result: _______________
```

### Test 5.2 - Typo in Product Name
```
Query: "Tell me about product iPhon" (missing 'e')
Expected: No products found (or closest match if fuzzy search enabled)
Status: To test
Result: _______________
```

### Test 5.3 - Case Insensitive Search
```
Query: "Tell me about product IPHONE 13"
Expected: Should find "iPhone 13" (case insensitive)
Status: To test
Result: _______________
```

### Test 5.4 - Multiple Matches
```
Query: "Tell me about product Dell" (if multiple Dell products)
Expected: Shows up to 5 results
Status: To test
Result: _______________
```

### Test 5.5 - Product with Quotes
```
Query: "Tell me about product 'Samsung Galaxy S21'"
Expected: Should find Samsung Galaxy S21
Status: To test
Result: _______________
```

---

## ✅ Test Set 6: Feature Testing

### Test 6.1 - Low Stock Detection
```
Query: "Tell me about product [product with < 10 units]"
Expected: Shows ⚠️ **LOW STOCK ALERT** in response
Status: To test
Result: _______________
```

### Test 6.2 - Emoji Formatting
```
Query: Any entity query
Expected: Response contains emojis like 📦 💰 📊 🏷️ ✅ ⚠️
Status: To test
Result: _______________
```

### Test 6.3 - Markdown Formatting
```
Query: Any entity query
Expected: Response has **bold**, bullet points, line breaks
Status: To test
Result: _______________
```

### Test 6.4 - Date Formatting
```
Query: "Tell me about product [any product]"
Expected: Dates shown in MM/DD/YYYY format
Status: To test
Result: _______________
```

### Test 6.5 - Days Calculation in Orders
```
Query: "Show order for [any customer]"
Expected: Shows days remaining calculated correctly
Status: To test
Result: _______________
```

---

## ✅ Test Set 7: Natural Language Variations

### Test 7.1 - Product Variations
```
Query 1: "product iPhone"
Query 2: "Product iPhone 13"
Query 3: "Tell me about iPhone 13"
Query 4: "Show iPhone 13 details"
Query 5: "iPhone 13 information"

Expected: Queries 2, 3, 4 should trigger product details
Status: To test
Result: _______________
```

### Test 7.2 - Order Variations
```
Query 1: "order for John"
Query 2: "Show order for John Doe"
Query 3: "Tell me about John's order"
Query 4: "John order information"
Query 5: "Customer order for John"

Expected: Queries 2, 3, 5 should trigger order details
Status: To test
Result: _______________
```

### Test 7.3 - Category Variations
```
Query 1: "category"
Query 2: "categories"
Query 3: "Show all categories"
Query 4: "List categories"
Query 5: "Tell me about categories"

Expected: Queries 2, 3, 4, 5 should work
Status: To test
Result: _______________
```

### Test 7.4 - Warehouse Variations
```
Query 1: "warehouse"
Query 2: "warehouse details"
Query 3: "Show warehouse information"
Query 4: "Tell me about warehouse locations"
Query 5: "warehouse address"

Expected: Queries 2, 3, 4, 5 should work
Status: To test
Result: _______________
```

---

## ✅ Test Set 8: Access Control

### Test 8.1 - Business Owner Access
```
User Role: Business Owner
Query: "Tell me about product iPhone"
Expected: Full product details shown
Status: To test
Result: _______________
```

### Test 8.2 - Employee Access
```
User Role: Employee
Query: "Tell me about product iPhone"
Expected: May show limited data or different response
Status: To test
Result: _______________
```

### Test 8.3 - Supplier Access
```
User Role: Supplier
Query: "Tell me about product iPhone"
Expected: May show limited data or different response
Status: To test
Result: _______________
```

---

## 📊 Summary Test Matrix

| Feature | Test 1 | Test 2 | Test 3 | Test 4 | Test 5 | Status |
|---------|--------|--------|--------|--------|--------|--------|
| Products Search | ✓ | ✓ | ✓ | ✓ | ✓ | _____ |
| Orders Search | ✓ | ✓ | ✓ | ✓ | ✓ | _____ |
| Categories | ✓ | ✓ | ✓ | ✓ | N/A | _____ |
| Warehouses | ✓ | ✓ | ✓ | ✓ | N/A | _____ |
| Error Handling | ✓ | ✓ | ✓ | ✓ | ✓ | _____ |
| Formatting | ✓ | ✓ | ✓ | ✓ | ✓ | _____ |
| Natural Language | ✓ | ✓ | ✓ | ✓ | ✓ | _____ |
| Access Control | ✓ | ✓ | ✓ | N/A | N/A | _____ |

---

## 🐛 Debugging Checklist

If a test fails, check:

- [ ] Logged in as Business Owner
- [ ] Product/Order/Category/Warehouse exists in database
- [ ] Backend server is running (port 3000)
- [ ] Frontend is connected to backend
- [ ] Browser console shows no JavaScript errors
- [ ] Network tab shows successful POST request
- [ ] Response contains expected data
- [ ] No MongoDB connection errors in backend logs

---

## 📝 Test Report Template

```
Test Date: _______________
Tester: _______________
Browser: _______________

PRODUCT QUERIES:
✅ Basic product search: PASS / FAIL
✅ Product by exact name: PASS / FAIL
✅ Product with show: PASS / FAIL
✅ Non-existent product: PASS / FAIL
✅ Special characters: PASS / FAIL

ORDER QUERIES:
✅ Order by customer: PASS / FAIL
✅ Order by product: PASS / FAIL
✅ Urgency indicator: PASS / FAIL
✅ Non-existent order: PASS / FAIL

CATEGORY QUERIES:
✅ List all categories: PASS / FAIL
✅ Category count: PASS / FAIL

WAREHOUSE QUERIES:
✅ Warehouse details: PASS / FAIL
✅ Complete information: PASS / FAIL

FEATURES:
✅ Low stock alerts: PASS / FAIL
✅ Emoji formatting: PASS / FAIL
✅ Markdown formatting: PASS / FAIL
✅ Date formatting: PASS / FAIL

OVERALL STATUS: _______________
ISSUES FOUND: _______________
NOTES: _______________
```

---

## 🎯 Success Criteria

✅ **All tests pass when:**
- Product queries return formatted details
- Order queries show deadlines accurately
- Category queries list all categories
- Warehouse queries display complete info
- No results show helpful error messages
- Emoji and markdown formatting works
- All natural language variations work
- Role-based access functions properly

---

**Ready to test? Log in as a Business Owner and try the queries above!**
