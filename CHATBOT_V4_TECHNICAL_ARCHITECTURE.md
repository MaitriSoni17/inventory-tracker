# 🔧 Chatbot v4.0 - Technical Architecture

## SYSTEM OVERVIEW

```
┌─────────────┐
│   USER      │ "স্টক কেমন?" / "Show orders"
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────┐
│   CHATBOT INTERFACE (React)      │
│   • Message input                │
│   • Message display              │
│   • Auto-scroll                  │
│   • Loading state                │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│   API ROUTE (POST /api/chatbot)  │
│   • Validate input               │
│   • Verify authentication        │
│   • Pass userId, role, message   │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│   CHATBOT HELPER - INTELLIGENT NLP               │
│                                                  │
│   1. analyzeUserIntent()                        │
│      └─ Intent: inventory|order|employee|etc    │
│                                                  │
│   2. extractQueryParameters()                   │
│      ├─ searchTerm                             │
│      ├─ timeFrame                              │
│      └─ status                                 │
│                                                  │
│   3. getContextForRole()                        │
│      └─ Fetch real data from MongoDB           │
│                                                  │
│   4. generateListFormatResponse()               │
│      └─ Format as bullet list with emojis      │
│                                                  │
│   5. Return formatted response                  │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────┐
│   MONGODB COLLECTIONS        │
│   • Products                 │
│   • Orders                   │
│   • Employees                │
│   • Warehouses               │
│   • Categories               │
│   • Suppliers                │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   FORMATTED RESPONSE         │
│   (List format with emojis)  │
│   Sent back to frontend      │
└──────────────┬───────────────┘
               │
               ▼
┌─────────────────────────────┐
│   DISPLAY TO USER           │
│   Beautiful list format     │
│   Easy to read on mobile    │
└─────────────────────────────┘
```

---

## CORE FUNCTIONS

### 1. analyzeUserIntent()

**Purpose:** Determine what the user wants

**Input:** `userMessage` (string)

**Output:** `intent` (string)

**Supported Intents:**
```javascript
'inventory'   - Stock/product queries
'order'       - Order/delivery queries
'alert'       - Low stock warnings
'employee'    - Team/staff queries
'warehouse'   - Location/storage queries
'category'    - Product type queries
'supplier'    - Supply order queries
'help'        - Help/command queries
'general'     - Default/unknown queries
```

**Algorithm:**
```javascript
For each intent category:
  1. Check if message contains keywords
  2. Check if message contains action words
  3. If keyword + action found → return this intent
  4. If keyword + variations found → return this intent
Return 'general' if no match
```

**Example:**
```javascript
analyzeUserIntent("স্টক কত?")
→ 'inventory' (has keyword 'stock' + action implied)

analyzeUserIntent("অর্ডার দেখা")
→ 'order' (has keyword 'order' + action 'show')
```

### 2. extractQueryParameters()

**Purpose:** Extract specific details from query

**Input:** `userMessage` (string)

**Output:** Object with:
```javascript
{
  searchTerm: "iPhone" or null,
  timeFrame: "today"|"week"|"month"|"year"|"all",
  status: "pending"|"delivered"|"processing"|null
}
```

**Sub-functions:**

#### extractSearchTerm()
Looks for product/customer names using patterns:
```javascript
// Pattern 1: After preposition
/product named "([^"]+)"/i

// Pattern 2: Quoted text
/["']([^"']+)["']/

// Pattern 3: CamelCase names
/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/
```

#### extractTimeFrame()
Identifies time period:
```
"today" or "আজ" → 'today'
"week" or "সপ্তাহ" → 'week'
"month" or "মাস" → 'month'
"year" or "বছর" → 'year'
→ 'all'
```

#### extractStatus()
Identifies order status:
```
"pending" or "অপেক্ষমাণ" → 'pending'
"delivered" or "পৌঁছেছে" → 'delivered'
"processing" or "প্রক্রিয়াধীন" → 'processing'
→ null
```

### 3. getContextForRole()

**Purpose:** Fetch real business data

**Input:** `userId` (string), `role` (string)

**Output:** Context object

**For Business Owner:**
```javascript
{
  products: 45,                    // Total product count
  totalOrders: 120,                // Total orders
  pendingOrders: 15,               // Waiting orders
  warehouses: 3,                   // Total warehouses
  suppliers: 8,                    // Total suppliers
  employees: 5,                    // Total employees
  employeesList: [...],            // Array of employees
  lowStockProducts: [...],         // Products with qty < 10
  recentOrders: [...]              // Last 5 orders
}
```

**For Employee:**
```javascript
{
  assignedProducts: 20,            // Assigned to employee
  assignedOrders: 5,               // Assigned orders
  pendingTasks: 2,                 // Waiting to complete
  assignedOrdersList: [...]        // Order details
}
```

**For Supplier:**
```javascript
{
  pendingOrders: 3,                // Awaiting supply
  deliveredOrders: 25,             // Already supplied
  recentSupplierOrders: [...]      // Recent orders
}
```

### 4. formatResponseAsList()

**Purpose:** Convert data to readable list format

**Input:**
```javascript
{
  title: string,          // "📦 স্টক স্থিতি"
  items: array,           // Data to display
  format: string          // 'simple'|'detailed'|'table'
}
```

**Output:** Formatted string with bullets/numbers

**Format Options:**

#### 'simple' - Numbered List
```
✅ **Title**

1. Item 1
2. Item 2
3. Item 3
```

#### 'detailed' - With Properties
```
✅ **Title**

**1. Item 1 Name**
   • Property 1: Value
   • Property 2: Value
```

#### 'table' - Markdown Table
```
| # | নাম | বিস্তারিত |
|---|------|----------|
| 1 | Item | Details |
```

### 5. generateIntelligentResponse()

**Purpose:** Main orchestration function

**Flow:**
```
1. Input: userMessage, role, context, userId
   ↓
2. Call analyzeUserIntent()
   ↓
3. Call extractQueryParameters()
   ↓
4. If no context, call getContextForRole()
   ↓
5. Call generateListFormatResponse(intent)
   ↓
6. Return formatted response
```

**Error Handling:**
```javascript
try {
  // Analysis & generation
} catch (error) {
  return "❌ **ত্রুটি হয়েছে** - আবার চেষ্টা করুন"
}
```

### 6. generateListFormatResponse()

**Purpose:** Generate response based on intent

**Input:** `intent`, `context`, `userId`, `role`, `params`

**Output:** Formatted response string

**Intent Handlers:**

#### inventory
```javascript
// Returns:
✅ **📦 স্টক স্থিতি**

📊 মোট পণ্য: X
⚠️ কম স্টক: Y

**কম স্টকের পণ্য:**
   • Product 1 - Qty (Status)
```

#### order
```javascript
// Returns:
✅ **📋 অর্ডার তথ্য**

📦 মোট অর্ডার: X
⏳ অপেক্ষমাণ: Y

**সাম্প্রতিক অর্ডার:**
   • Customer - Product - Amount
```

#### employee
```javascript
// Returns:
✅ **👥 কর্মচারী তালিকা**

👤 মোট কর্মচারী: X

**কর্মচারীর বিবরণ:**
   • Name
      📧 Email
      📱 Phone
```

#### warehouse
```javascript
// Returns:
✅ **🏢 গোডাউন তথ্য**

🏢 মোট গোডাউন: X
📍 সক্রিয়: Y
```

#### category
```javascript
// Returns:
✅ **📂 ক্যাটাগরি**

📂 সব ক্যাটাগরি
🏷️ ক্যাটাগরি দেখতে আরও তথ্য দিন
```

#### supplier
```javascript
// Returns:
✅ **📦 সরবরাহকারী অর্ডার**

📋 অপেক্ষমাণ: X
✅ ডেলিভার হয়েছে: Y
```

#### help
```javascript
// Returns:
ℹ️ **আমি কি কি করতে পারি?**

1. সব আদেশ
2. ব্যবহারের টিপস
3. উদাহরণ
```

---

## DATA FLOW EXAMPLES

### Example 1: Stock Query

```
INPUT: "স্টক কেমন?"

↓ analyzeUserIntent()
  Detects: 'inventory'

↓ extractQueryParameters()
  searchTerm: null
  timeFrame: 'all'
  status: null

↓ getContextForRole()
  Fetches from MongoDB:
  - Total products: 45
  - Low stock products: [{name, qty}, ...]

↓ generateListFormatResponse('inventory')
  Formats as list:
  📊 মোট পণ্য: 45
  ⚠️ কম স্টক: 3
  • iPhone - 8 units
  • Samsung - 4 units

OUTPUT: Formatted response to user
```

### Example 2: Specific Product Query

```
INPUT: "iPhone এর stock দেখা"

↓ analyzeUserIntent()
  Detects: 'inventory'

↓ extractQueryParameters()
  searchTerm: "iPhone"
  timeFrame: 'all'
  status: null

↓ getContextForRole()
  Query MongoDB:
  db.products.find({
    businessowner: userId,
    name: {$regex: "iPhone", $options: "i"}
  })

OUTPUT: iPhone details if found
```

### Example 3: Order Query

```
INPUT: "রহিমের অর্ডার"

↓ analyzeUserIntent()
  Detects: 'order'

↓ extractQueryParameters()
  searchTerm: "Rahim"
  timeFrame: 'all'
  status: null

↓ getContextForRole()
  Query MongoDB:
  db.orders.find({
    businessowner: userId,
    customerName: {$regex: "Rahim", ...}
  })

OUTPUT: Customer's orders list
```

---

## MONGODB QUERIES USED

### Get Context for Business Owner

```javascript
// Product count
Product.countDocuments({businessowner: userId})

// Low stock
Product.find({
  businessowner: userId,
  totalProducts: {$lt: 10}
}).select('name totalProducts category').limit(5)

// Recent orders
Order.find({businessowner: userId})
  .sort({createdAt: -1})
  .select('customerName productName totalAmt orderDate productStatus')
  .limit(5)

// Employees
Employee.find({businessowner: userId})
  .select('fname lname email phone hireAt jDate role')
  .limit(10)

// Order stats by employee
Order.aggregate([
  {$match: {businessowner: userId, employee: {$exists: true}}},
  {$group: {_id: '$employee', count: {$sum: 1}}},
  {$limit: 5}
])
```

---

## KEYWORD MAPPING

### Inventory Keywords
```javascript
English: ['stock', 'inventory', 'item', 'product', 'goods']
Bengali: ['স্টক', 'সামগ্রী', 'পণ্য', 'কালেকশন']
```

### Order Keywords
```javascript
English: ['order', 'orders', 'customer', 'delivery']
Bengali: ['অর্ডার', 'গ্রাহক', 'ডেলিভারি', 'পণ্য অর্ডার']
```

### Employee Keywords
```javascript
English: ['employee', 'staff', 'worker', 'team', 'member']
Bengali: ['কর্মচারী', 'কর্মী', 'টিম', 'সদস্য', 'লোক']
```

### Warehouse Keywords
```javascript
English: ['warehouse', 'storage', 'location', 'address']
Bengali: ['গোডাউন', 'স্টোর', 'ডিপো', 'ঠিকানা']
```

### Action Keywords
```javascript
English: ['check', 'show', 'tell', 'view', 'see', 'how many']
Bengali: ['দেখা', 'জানা', 'বলা', 'কত', 'কোনটা']
```

---

## ERROR HANDLING

### Type 1: Empty/Invalid Input
```javascript
if (!message || !message.trim()) {
  return "❌ বার্তা খালি। কিছু লিখুন।"
}
```

### Type 2: Invalid Role
```javascript
if (!['businessowner', 'employee', 'supplier'].includes(role)) {
  return "❌ অবৈধ ভূমিকা।"
}
```

### Type 3: No User Context
```javascript
if (!context || Object.keys(context).length === 0) {
  context = await getContextForRole(userId, role)
}
```

### Type 4: Database Error
```javascript
catch (error) {
  console.error('Error:', error)
  return "❌ ডাটাবেস ত্রুটি। আবার চেষ্টা করুন।"
}
```

---

## PERFORMANCE OPTIMIZATIONS

### 1. Limit Results
```javascript
.limit(5)    // Max 5 products
.limit(10)   // Max 10 employees
```

### 2. Select Only Needed Fields
```javascript
.select('name price totalProducts category')
// Don't fetch unnecessary fields
```

### 3. Index Recommendations
```javascript
// Create indexes for faster queries
db.products.createIndex({businessowner: 1})
db.orders.createIndex({businessowner: 1, customerName: 1})
db.employees.createIndex({businessowner: 1})
```

### 4. Caching (Future Enhancement)
```javascript
// Cache frequently accessed data
const cache = {
  categories: null,
  lastUpdate: null
}
```

---

## SECURITY MEASURES

### 1. MongoDB Injection Prevention
```javascript
// All searches escaped
const escaped = userInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
```

### 2. Role-Based Filtering
```javascript
// Always filter by role
if (role === 'employee') {
  // Only show employee's data
}
```

### 3. Business Owner Filtering
```javascript
// Multi-tenant: Filter by business owner
{businessowner: userId}
```

### 4. Authentication Check
```javascript
// Verify token before processing
if (!userId) {
  return "❌ প্রমাণীকরণ ব্যর্থ।"
}
```

---

## TESTING SCENARIOS

### Test 1: Intent Detection
```javascript
analyzeUserIntent("স্টক কত?")
// Expected: 'inventory'

analyzeUserIntent("অর্ডার দেখা")
// Expected: 'order'

analyzeUserIntent("কর্মচারী বলা")
// Expected: 'employee'
```

### Test 2: Parameter Extraction
```javascript
extractQueryParameters("গত সপ্তাহের অর্ডার")
// Expected: {searchTerm: null, timeFrame: 'week', status: null}

extractQueryParameters("iPhone এর স্টক")
// Expected: {searchTerm: 'iPhone', timeFrame: 'all', status: null}
```

### Test 3: Response Generation
```javascript
generateListFormatResponse('inventory', context)
// Expected: Formatted list with emojis

generateListFormatResponse('order', context)
// Expected: Order details in list format
```

---

## FILE LOCATIONS

```
backend/
├── utils/
│   └── chatbotHelper.js ............ Main NLP logic
├── routes/
│   └── chatbot.js ................. API endpoint
├── models/
│   ├── Products.js
│   ├── Orders.js
│   ├── Employee.js
│   ├── Warehouse.js
│   ├── Category.js
│   └── Supplier.js
└── middleware/
    └── fetchuser.js ............... Authentication

src/
└── components/
    └── Chatbot.js ................. UI Component
```

---

## API ENDPOINT

### POST /api/chatbot/message

**Request:**
```javascript
{
  message: "স্টক কত?",
  role: "businessowner",
  userId: "60d5ec49c1234567890abcd1"
}
```

**Response:**
```javascript
{
  success: true,
  message: "✅ **📦 স্টক স্থিতি**\n\n📊 মোট...",
  timestamp: "2024-12-20T10:30:00Z"
}
```

**Error Response:**
```javascript
{
  success: false,
  error: "❌ কোন ডেটা পাওয়া যায়নি।"
}
```

---

## FUTURE ENHANCEMENTS

- [ ] Voice input support
- [ ] Multi-user conversation history
- [ ] AI model integration (GPT)
- [ ] Chatbot personality
- [ ] Advanced NLP with ML
- [ ] Real-time notifications
- [ ] Custom intents per business
- [ ] Analytics dashboard

---

**Version:** 4.0
**Status:** Production Ready
**Last Updated:** December 20, 2024
