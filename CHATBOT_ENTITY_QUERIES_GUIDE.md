# Chatbot Quick Reference - Entity Queries

## 🚀 New Features

The chatbot now understands **specific entity queries** and provides detailed information about:
- 📦 Products
- 📋 Orders  
- 📂 Categories
- 🏢 Warehouses

---

## 💡 How to Use

### 1️⃣ **Get Product Details**

**What to Ask:**
- "Tell me about product [product name]"
- "Show product details for [product name]"
- "Product info for [product name]"
- "Details on product [product name]"

**Examples:**
```
"Tell me about product iPhone 13"
"Show me details for Samsung Galaxy S21"
"Product information for Dell Laptop"
```

**What You'll Get:**
```
📦 PRODUCT DETAILS:

1. **iPhone 13**
   📂 Category: Electronics
   💰 Price: $999
   📊 Stock: 45 units
   🏷️ Brand: Apple
   📅 Manufacture Date: 1/15/2023
   📅 Expiry Date: N/A
   🏢 Warehouses: Main Warehouse, Branch Store
   📝 Description: Premium smartphone with advanced features
```

---

### 2️⃣ **Get Order Details**

**What to Ask:**
- "Show order for [customer name]"
- "Tell me about order for [customer name]"
- "Order details for [product name]"
- "Tell me about [customer name]'s order"

**Examples:**
```
"Show order for John Doe"
"Tell me about order for Samsung Galaxy"
"Order details for Mike Johnson"
```

**What You'll Get:**
```
📋 ORDER DETAILS:

1. **Order for John Doe**
   👤 Customer: John Doe
   📦 Product: iPhone 13
   📂 Category: Electronics
   💵 Amount: $999
   📅 Order Date: 2/10/2024
   ⏰ Deadline: 2/20/2024
   ⏱️ Days Remaining: 5 days
   ✅ On Track
   ✅ Product Status: In Stock
   🚚 Delivery Status: Ready to Ship
   📍 Delivery Address: 123 Main St, New York, NY
   📝 Notes: Rush delivery requested
```

**Urgency Indicators:**
- ✅ **On Track** - 7+ days until deadline
- ⚡ **Due Soon** - 3-7 days until deadline
- ⚠️ **URGENT - DEADLINE APPROACHING** - Less than 3 days
- 🔴 **OVERDUE** - Deadline has passed

---

### 3️⃣ **View All Categories**

**What to Ask:**
- "Show all categories"
- "List categories"
- "Tell me about categories"
- "Category list"

**What You'll Get:**
```
📂 CATEGORY DETAILS:

Total Categories: 5

1. **Electronics**
   📝 Description: Electronic devices and gadgets
   📦 Products: 12 items

2. **Furniture**
   📝 Description: Office and home furniture
   📦 Products: 8 items

3. **Clothing**
   📝 Description: Apparel and fashion items
   📦 Products: 24 items
```

---

### 4️⃣ **Get Warehouse Information**

**What to Ask:**
- "Show warehouse details"
- "Tell me about warehouse location"
- "Warehouse address information"
- "Warehouse manager details"

**What You'll Get:**
```
🏢 WAREHOUSE DETAILS:

1. **Main Warehouse**
   👤 Manager: Robert Smith
   📍 Address: 456 Industrial Park
   📞 Contact: +1-555-0100
   📧 Email: main@company.com
   🌍 Location: New York, NY, USA

2. **Branch Store**
   👤 Manager: Sarah Johnson
   📍 Address: 789 Commercial Ave
   📞 Contact: +1-555-0200
   📧 Email: branch@company.com
   🌍 Location: Los Angeles, CA, USA
```

---

## 🎯 Common Queries

### For Business Owners:

| Task | Query | Response |
|------|-------|----------|
| Check specific product | "Tell me about product [name]" | Full product details |
| Track customer order | "Show order for [customer]" | Order status & deadline |
| View inventory categories | "Show all categories" | All categories with counts |
| Check warehouse details | "Show warehouse details" | All warehouse info |
| Check low stock | "Tell me about product [name]" | Shows ⚠️ if < 10 units |
| Urgent orders | "Show order for [customer]" | ⚠️ Shows urgency status |

---

## ✨ Smart Features

### 1. **Low Stock Alerts**
Products with less than 10 units automatically show:
```
⚠️ **LOW STOCK ALERT**
```

### 2. **Deadline Urgency**
Orders automatically calculate days remaining and show:
- Urgency status based on delivery deadline
- Color-coded indicators (✅ 🔴 ⚠️ ⚡)

### 3. **Flexible Phrasing**
Understands natural language:
- "Tell me about", "Show me", "Details on", "Info about"
- "Product" or "Item" terminology
- With or without "the"

### 4. **Multiple Match Results**
If multiple items match your search:
- Shows up to 5 results
- All formatted with same detail level

### 5. **Helpful Error Messages**
If no results found:
```
❌ **No products found** matching "ProductName"

💡 Try searching with a different name or check if 
   the product exists in your system.
```

---

## 🔍 Search Tips

### ✅ **Do This:**
- Use complete product/customer names
- Be specific with your search term
- Ask clearly what information you want

### ❌ **Don't Do This:**
- Use partial names (may not match)
- Use special characters that might be escaped
- Ask vague questions like "product" (no name)

### Example Searches:
```
✅ "Tell me about product iPhone 13"
❌ "Tell me about iPhone"

✅ "Show order for John Doe"
❌ "Show John's order" (might not extract name)

✅ "Show all categories"
❌ "Categories" (might not trigger)
```

---

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| No results found | Try different spelling or partial name |
| Warehouse info not showing | Ask for "warehouse details" not just "warehouse" |
| Categories not filtered | Lists all - filtered view coming soon |
| Product name with special chars | Works but may need exact spelling |
| Order search by phone | Use customer name instead |

---

## 📚 General Help

Ask the chatbot: **"Help"** or **"What can you do?"**

You'll get a list of all capabilities and example queries.

---

## 🔐 Permissions

- **Business Owners**: Full access to all entity queries
- **Employees**: Limited access (see your own orders)
- **Suppliers**: Access to supplier orders only

---

## 💬 Example Conversation

**User:** "Tell me about product MacBook Pro"

**Chatbot:**
```
📦 **PRODUCT DETAILS:**

1. **MacBook Pro**
   📂 Category: Computers
   💰 Price: $1,299
   📊 Stock: 8 units
   🏷️ Brand: Apple
   📅 Manufacture Date: 11/1/2023
   📅 Expiry Date: N/A
   🏢 Warehouses: Main Warehouse
   📝 Description: High-performance laptop for professionals
   ⚠️ **LOW STOCK ALERT**
```

**User:** "Show order for Sarah"

**Chatbot:**
```
📋 **ORDER DETAILS:**

1. **Order for Sarah**
   👤 Customer: Sarah Thompson
   📦 Product: MacBook Pro
   💵 Amount: $1,299
   ⏰ Deadline: 2/25/2024
   ⏱️ Days Remaining: 2 days
   ⚠️ **URGENT - DEADLINE APPROACHING**
   🚚 Delivery Status: In Transit
   📍 Delivery Address: 321 Tech Park, San Francisco, CA
```

---

## 🚀 Future Enhancements

Coming soon:
- ✨ Filter results by date, status, category
- ✨ Sort by price, stock, urgency
- ✨ Export results as CSV/PDF
- ✨ Advanced search with multiple criteria
- ✨ Order history and trends
- ✨ Inventory forecasting

---

**Last Updated:** February 2024
**Version:** 2.0 - Enhanced Entity Queries
