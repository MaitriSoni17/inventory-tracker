# Chatbot Entity Query Architecture - Visual Guide

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER (Browser)                              │
│                   Types: "Tell me about product X"                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Frontend (React - Chatbot Component)                    │
│         Sends POST /api/chatbot/message with userId                │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│         Backend Route Handler (backend/routes/chatbot.js)           │
│  - Validates message, role, userId                                 │
│  - Calls: generateAIResponse(message, role, context, userId)       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│    Chatbot Helper - generateAIResponse()                             │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 1. Check if it's a specific entity query                   │  │
│  │    Call: handleSpecificEntityQuery(message, role, userId)  │  │
│  │                                                             │  │
│  │    Does message contain patterns like:                     │  │
│  │    - "product" + "tell me/show/detail/info"              │  │
│  │    - "order" + "tell me/show/detail/info"                │  │
│  │    - "category/categories"                                │  │
│  │    - "warehouse" + "detail/address/manager/location"      │  │
│  │                                                             │  │
│  │    If YES → Extract entity name and proceed to search      │  │
│  │    If NO → Continue to step 2                             │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                             │                                       │
│                             ▼ (if entity query detected)           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ HANDLE SPECIFIC ENTITY QUERY                               │  │
│  │                                                             │  │
│  │ ┌─────────────────────────────────────────────────────┐   │  │
│  │ │ PRODUCT QUERY?                                      │   │  │
│  │ │ Extract product name using regex pattern            │   │  │
│  │ │ Call: searchProducts(name, userId)                 │   │  │
│  │ │   → MongoDB: find({ businessowner, name regex })   │   │  │
│  │ │ Call: formatProductDetailsResponse(results)        │   │  │
│  │ │   → Format with emoji, price, stock, dates, etc.   │   │  │
│  │ └─────────────────────────────────────────────────────┘   │  │
│  │                           OR                              │  │
│  │ ┌─────────────────────────────────────────────────────┐   │  │
│  │ │ ORDER QUERY?                                        │   │  │
│  │ │ Extract customer/product name using regex           │   │  │
│  │ │ Call: searchOrders(term, userId)                   │   │  │
│  │ │   → MongoDB: find({ businessowner, customerName/   │   │  │
│  │ │             productName regex })                    │   │  │
│  │ │ Call: getOrderDetails(order) for each result       │   │  │
│  │ │   → Calculate days remaining                        │   │  │
│  │ │   → Determine urgency (✅/⚡/⚠️/🔴)                 │   │  │
│  │ │ Call: formatOrderDetailsResponse(results)          │   │  │
│  │ │   → Format with emoji, urgency, deadline, etc.     │   │  │
│  │ └─────────────────────────────────────────────────────┘   │  │
│  │                           OR                              │  │
│  │ ┌─────────────────────────────────────────────────────┐   │  │
│  │ │ CATEGORY QUERY?                                     │   │  │
│  │ │ Call: getCategoryDetails(userId)                   │   │  │
│  │ │   → MongoDB: find({ businessowner })               │   │  │
│  │ │   → Count products per category                     │   │  │
│  │ │ Call: formatCategoryDetailsResponse(results)       │   │  │
│  │ │   → Format with category name, desc, count         │   │  │
│  │ └─────────────────────────────────────────────────────┘   │  │
│  │                           OR                              │  │
│  │ ┌─────────────────────────────────────────────────────┐   │  │
│  │ │ WAREHOUSE QUERY?                                    │   │  │
│  │ │ Call: getWarehouseDetails(userId)                  │   │  │
│  │ │   → MongoDB: find({ businessowner })               │   │  │
│  │ │ Call: formatWarehouseDetailsResponse(results)      │   │  │
│  │ │   → Format with address, manager, contact, email   │   │  │
│  │ └─────────────────────────────────────────────────────┘   │  │
│  │                           │                              │  │
│  │                           ▼ (Entity query handled)       │  │
│  │              Return formatted response ←─────────────┘   │  │
│  │         (Skip AI/rule-based processing)                │  │
│  │                                                         │  │
│  │    If entity response found, RETURN and exit here      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                             │                                 │
│                             ▼ (if NOT entity query)          │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 2. Use AI or Rule-Based Response                       │  │
│  │                                                         │  │
│  │    If OpenAI available:                               │  │
│  │    └─ Call generateOpenAIResponse()                   │  │
│  │                                                         │  │
│  │    Else (Fallback):                                   │  │
│  │    └─ Call generateEnhancedResponse()                 │  │
│  │       - Intent detection (13 types)                   │  │
│  │       - Context-aware responses                       │  │
│  │       - Role-specific answers                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                             │                                 │
│                             ▼                                 │
│              Return AI/Rule-based response                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│         Send Response Back to Frontend (JSON format)                 │
│  {                                                                   │
│    "message": "📦 **PRODUCT DETAILS:**\n\n1. **iPhone 13**..."     │
│  }                                                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│         Frontend Receives and Displays Response                      │
│   With Markdown formatting, emoji, and proper line breaks          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Entity Detection Flow

### Product Query Detection:
```
User Input: "Tell me about product iPhone 13"
                     │
                     ▼
Check keywords:
- Contains "product" OR "item"? ✅ YES
- Contains "tell me" OR "show" OR "detail" OR "info about" OR "about"? ✅ YES
                     │
                     ▼
Extract product name using regex:
/(?:product|item)\s+(?:named\s+)?["']?([^"'.!?]+)["']?/i
Result: "iPhone 13"
                     │
                     ▼
Search MongoDB:
```javascript
Product.find({
  businessowner: userId,
  $or: [
    { name: { $regex: "^iPhone 13$", $options: 'i' } },
    { pcode: { $regex: "^iPhone 13$", $options: 'i' } },
    { desc: { $regex: "^iPhone 13$", $options: 'i' } }
  ]
}).select('name category price totalProducts brand mDate eDate desc warehouse').limit(5)
```
                     │
                     ▼
Format and return:
```
📦 **PRODUCT DETAILS:**

1. **iPhone 13**
   📂 Category: Electronics
   💰 Price: $999
   📊 Stock: 45 units
   ...
```
```

### Order Query Detection:
```
User Input: "Show order for John Doe"
                     │
                     ▼
Check keywords:
- Contains "order"? ✅ YES
- Contains "tell me" OR "show" OR "detail" OR "info about" OR "about"? ✅ YES
  OR Contains "customer order"? 
                     │
                     ▼
Extract search term using regex:
/order\s+(?:for\s+)?["']?([^"'.!?]+)["']?/i
Result: "John Doe"
                     │
                     ▼
Search MongoDB:
```javascript
Order.find({
  businessowner: userId,
  $or: [
    { customerName: { $regex: "^John Doe$", $options: 'i' } },
    { productName: { $regex: "^John Doe$", $options: 'i' } },
    { customerContactNo: { $regex: "^John Doe$", $options: 'i' } }
  ]
}).select('customerName productName totalAmt orderDate productStatus deliveryStatus address notes').limit(5)
```
                     │
                     ▼
For each order, calculate:
- Days remaining = (deadline - today) / milliseconds per day
- Urgency = based on days remaining
                     │
                     ▼
Format and return:
```
📋 **ORDER DETAILS:**

1. **Order for John Doe**
   👤 Customer: John Doe
   📦 Product: iPhone 13
   ...
   ⏱️ Days Remaining: 2 days
   ⚠️ **URGENT - DEADLINE APPROACHING**
```
```

---

## 📊 Database Query Pattern

### With Regex Escaping:
```javascript
// Original user input (potentially dangerous)
const userInput = "Product (with special chars & chars)"

// Escape special regex characters
const escapedInput = userInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Result: "Product \\(with special chars \\& chars\\)"

// Safe MongoDB query
const products = await Product.find({
  businessowner: userId,
  $or: [
    { name: { $regex: escapedInput, $options: 'i' } },
    { pcode: { $regex: escapedInput, $options: 'i' } },
    { desc: { $regex: escapedInput, $options: 'i' } }
  ]
})
```

---

## 🎯 Pattern Matching Examples

### Product Patterns Matched:
```
✅ "product iPhone" → Triggers (contains product + implicit about)
✅ "Tell me about iPhone" → May trigger with "about"
✅ "Show me iPhone details" → Triggers
✅ "Product named 'Galaxy S21'" → Triggers
✅ "item details for Dell" → Triggers (item = product)
✅ "What about product Samsung?" → Triggers

❌ "What is a product?" → Doesn't trigger (no name to extract)
❌ "Show products" → Doesn't trigger (no "tell me/show/detail")
❌ "product" → Doesn't trigger (no action word)
```

### Order Patterns Matched:
```
✅ "Show order for John" → Triggers
✅ "Tell me about John's order" → May trigger with "about"
✅ "Order details for Mike" → Triggers
✅ "Order from Samsung product" → Triggers
✅ "Customer order information" → Triggers

❌ "What about my order?" → May not extract name properly
❌ "orders" → Doesn't trigger (no context)
```

---

## 💾 Data Flow Diagram

```
┌─────────────────────────────────────────┐
│  User Message + userId + role           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  handleSpecificEntityQuery()             │
│  - Pattern matching                     │
│  - Entity name extraction               │
│  - Role validation                      │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────────────┬──────────────┬──────────────┐
        │                     │              │              │
        ▼                     ▼              ▼              ▼
    PRODUCT            ORDER            CATEGORY        WAREHOUSE
    searchProducts()   searchOrders()   getCategoryDetails() getWarehouseDetails()
        │                  │              │              │
        ▼                  ▼              ▼              ▼
    MongoDB         MongoDB        MongoDB          MongoDB
    Query           Query          Query            Query
        │                  │              │              │
        ▼                  ▼              ▼              ▼
    Results          Results         Results          Results
        │                  │              │              │
        ▼                  ▼              ▼              ▼
    getProductDetails()  getOrderDetails()  (already formatted)  (already formatted)
    format...Response()  format...Response() format...Response()  format...Response()
        │                  │              │              │
        └──────┬───────────┴──────────────┴──────────────┘
               │
               ▼
        Formatted Response
        (with emoji, markdown)
               │
               ▼
        Return to User
```

---

## ⚡ Performance Optimization Points

```
USER INPUT (1000ms total)
├─ Pattern Matching (1-2ms)
├─ Regex Extraction (1-2ms)
├─ MongoDB Query (10-50ms)
│  ├─ Index Lookup (1-5ms)
│  └─ Document Fetch (5-45ms)
├─ Data Formatting (2-5ms)
│  ├─ Date Calculations (1-2ms)
│  ├─ String Building (1-3ms)
│  └─ Emoji Insertion (1ms)
└─ Network Response (remaining ms)
```

---

## 🔐 Security Checks

```
User Input
    │
    ▼
1. Regex Character Escaping
   └─ Prevent MongoDB injection
    │
    ▼
2. Role-Based Access Control
   └─ Only allowed roles get results
    │
    ▼
3. BusinessOwner Filtering
   └─ Only see own data (multi-tenancy)
    │
    ▼
4. Input Validation
   └─ Message length, format checks
    │
    ▼
5. SQL/NoSQL Injection Prevention
   └─ Parameterized queries via Mongoose
    │
    ▼
Safe Response
```

---

## 📱 Example Full Conversation

```
┌─ USER ─────────────────────────────────────────────────┐
│ "Tell me about product MacBook Pro"                    │
└────────────────────────────┬──────────────────────────┘
                             │
                   ▼────────────────────────┐
            BACKEND PROCESSING               │
                             │              │
            Check: entity query? ✅ YES      │
            Type: PRODUCT                   │
            Name extracted: "MacBook Pro"   │
            User ID: "123abc"               │
            Role: "businessowner"           │
                             │              │
            Search DB:                      │
            Find products where:            │
            - businessowner = 123abc        │
            - name contains "macbook pro"   │
            Result: 1 product found        │
                             │              │
            Format response ✅             │
                             │              │
                   └────────────────┬──────┘
                                    │
┌─ CHATBOT RESPONSE ──────────────────────────────────────┐
│ 📦 **PRODUCT DETAILS:**                                │
│                                                        │
│ 1. **MacBook Pro**                                     │
│    📂 Category: Computers                             │
│    💰 Price: $1,299                                   │
│    📊 Stock: 8 units                                  │
│    🏷️ Brand: Apple                                    │
│    📅 Manufacture Date: 11/1/2023                    │
│    📅 Expiry Date: N/A                                │
│    🏢 Warehouses: Main Warehouse                      │
│    📝 Description: High-performance laptop for        │
│       professionals                                   │
│    ⚠️ **LOW STOCK ALERT**                            │
└────────────────────────────────────────────────────────┘
```

---

## 🎓 Integration Summary

| Component | Purpose | Status |
|-----------|---------|--------|
| Pattern Matching | Detect entity queries | ✅ Implemented |
| Regex Extraction | Get entity names | ✅ Implemented |
| MongoDB Search | Query database | ✅ Implemented |
| Detail Extraction | Get relevant fields | ✅ Implemented |
| Formatting | Add emoji & structure | ✅ Implemented |
| Error Handling | Handle no results | ✅ Implemented |
| Role Control | Restrict access | ✅ Implemented |
| Performance | Optimize queries | ✅ Optimized |

---

**This architecture ensures efficient, secure, and user-friendly entity queries in the chatbot!**
