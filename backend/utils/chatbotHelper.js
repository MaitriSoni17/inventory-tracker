const mongoose = require('mongoose');
const Product = require('../models/Products');
const CustomerOrders = require('../models/CustomerOrders');
const Warehouse = require('../models/Warehouse');
const Supplier = require('../models/Supplier');
const Employee = require('../models/Employee');
const BusinessOwner = require('../models/BusinessOwner');
const axios = require('axios');
const { Groq } = require('groq-sdk');

/**
 * Safely convert userId to ObjectId for aggregate pipelines
 */
const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return id;
  }
};

// Initialize Groq client (FREE API)
const GROQ_API_KEY = process.env.GROQ_API_KEY || null;
const USE_GROQ = !!GROQ_API_KEY;

let groqClient = null;
if (USE_GROQ) {
  groqClient = new Groq({ apiKey: GROQ_API_KEY });
}

// In-memory conversation history (per user, last 10 messages)
const conversationHistory = new Map();
const MAX_HISTORY = 10;

const getConversationHistory = (userId) => {
  return conversationHistory.get(userId) || [];
};

const addToConversationHistory = (userId, role, content) => {
  if (!conversationHistory.has(userId)) {
    conversationHistory.set(userId, []);
  }
  const history = conversationHistory.get(userId);
  history.push({ role, content, timestamp: Date.now() });
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
  // Clean up conversations older than 1 hour
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  conversationHistory.forEach((val, key) => {
    if (val.length > 0 && val[val.length - 1].timestamp < oneHourAgo) {
      conversationHistory.delete(key);
    }
  });
};

/**
 * Resolve the businessowner ID for any role
 */
const resolveBusinessOwnerId = async (userId, role) => {
  if (role === 'businessowner') return userId;
  try {
    const emp = await Employee.findById(userId).select('businessowner');
    return emp?.businessowner || null;
  } catch (e) {
    return null;
  }
};

/**
 * Get context based on user role and fetch relevant data
 */
const getContextForRole = async (userId, role) => {
  try {
    let context = {};
    if (!userId) return context;

    if (role === 'businessowner') {
      context.products = await Product.countDocuments({ businessowner: userId });
      context.totalOrders = await CustomerOrders.countDocuments({ businessowner: userId });
      context.pendingOrders = await CustomerOrders.countDocuments({
        businessowner: userId,
        status: { $in: ['Pending', 'Processing'] }
      });
      context.completedOrders = await CustomerOrders.countDocuments({
        businessowner: userId,
        status: 'Delivered'
      });
      context.warehouses = await Warehouse.countDocuments({ businessowner: userId });
      context.suppliers = await Supplier.countDocuments({ businessowner: userId });
      context.employees = await Employee.countDocuments({ businessowner: userId });

      // Employee details
      const employeesList = await Employee.find({ businessowner: userId })
        .select('fname lname email phone hireAt jDate role salary')
        .limit(15);
      context.employeesList = employeesList;

      // Low stock products
      const lowStockProducts = await Product.find({
        businessowner: userId,
        totalProducts: { $lt: 10 }
      }).select('name totalProducts category price').limit(10);
      context.lowStockProducts = lowStockProducts;

      // Recent orders
      const recentOrders = await CustomerOrders.find({ businessowner: userId })
        .sort({ oDate: -1 })
        .select('cName pName amount oDate status dStatus products')
        .limit(8);
      context.recentOrders = recentOrders;

      // Revenue calculation
      const revenueData = await CustomerOrders.aggregate([
        { $match: { businessowner: toObjectId(userId) } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' }, avgOrderValue: { $avg: '$amount' } } }
      ]);
      if (revenueData.length > 0) {
        context.totalRevenue = revenueData[0].totalRevenue;
        context.avgOrderValue = Math.round(revenueData[0].avgOrderValue * 100) / 100;
      }

      // Orders by status breakdown
      const statusBreakdown = await CustomerOrders.aggregate([
        { $match: { businessowner: toObjectId(userId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      context.orderStatusBreakdown = statusBreakdown;

      // Top selling products
      const topProducts = await CustomerOrders.aggregate([
        { $match: { businessowner: toObjectId(userId) } },
        { $group: { _id: '$pName', totalSold: { $sum: 1 }, totalRevenue: { $sum: '$amount' } } },
        { $sort: { totalSold: -1 } },
        { $limit: 5 }
      ]);
      context.topProducts = topProducts;

      // Salary data
      try {
        const SalaryPayment = require('../models/SalaryPayment');
        const salaryStats = await SalaryPayment.aggregate([
          { $match: { businessowner: toObjectId(userId) } },
          { $group: { _id: null, totalPaid: { $sum: '$amount' }, paymentCount: { $sum: 1 } } }
        ]);
        if (salaryStats.length > 0) {
          context.totalSalaryPaid = salaryStats[0].totalPaid;
          context.salaryPaymentCount = salaryStats[0].paymentCount;
        }
        const recentPayments = await SalaryPayment.find({ businessowner: userId })
          .sort({ paymentDate: -1 })
          .populate('employee', 'fname lname')
          .limit(5);
        context.recentSalaryPayments = recentPayments;
      } catch (e) { /* salary model may not exist */ }

      // Supplier orders
      try {
        const SupplierOrders = require('../models/SupplierOrders');
        const supplierOrderStats = await SupplierOrders.aggregate([
          { $match: { businessowner: toObjectId(userId) } },
          { $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: { $multiply: ['$ounits', '$amount'] } } } }
        ]);
        context.supplierOrderStats = supplierOrderStats;
      } catch (e) { /* ignore */ }

    } else if (role === 'employee') {
      // Resolve business owner ID so employees see all data they have access to
      const boId = await resolveBusinessOwnerId(userId, role);
      const scopeFilter = boId ? { businessowner: boId } : { employee: userId };

      context.totalProducts = await Product.countDocuments(scopeFilter);
      context.assignedProducts = await Product.countDocuments({ employee: userId });
      context.totalOrders = await CustomerOrders.countDocuments(scopeFilter);
      context.assignedOrders = await CustomerOrders.countDocuments({ employee: userId });
      context.pendingTasks = await CustomerOrders.countDocuments({
        ...scopeFilter,
        status: { $in: ['Pending', 'Processing'] }
      });
      context.completedTasks = await CustomerOrders.countDocuments({
        ...scopeFilter,
        status: 'Delivered'
      });

      // Recent orders within the business scope
      const assignedOrders = await CustomerOrders.find(scopeFilter)
        .select('pName cName status dStatus oDate dDate amount products')
        .sort({ oDate: -1 })
        .limit(8);
      context.assignedOrdersList = assignedOrders;

      // Low stock products
      const lowStockProducts = await Product.find({
        ...scopeFilter,
        totalProducts: { $lt: 10 }
      }).select('name totalProducts category price').limit(10);
      context.lowStockProducts = lowStockProducts;

      // Urgent orders (deadline within 3 days)
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      const urgentOrders = await CustomerOrders.find({
        ...scopeFilter,
        status: { $in: ['Pending', 'Processing'] },
        dDate: { $lte: threeDaysFromNow, $gte: new Date() }
      }).select('pName cName dDate status products').limit(5);
      context.urgentOrders = urgentOrders;

      // Overdue orders
      const overdueOrders = await CustomerOrders.find({
        ...scopeFilter,
        status: { $in: ['Pending', 'Processing'] },
        dDate: { $lt: new Date() }
      }).select('pName cName dDate products').limit(5);
      context.overdueOrders = overdueOrders;

      // Employee profile info
      const employee = await Employee.findById(userId).select('fname lname role jDate salary businessowner');
      if (employee) {
        context.employeeName = `${employee.fname} ${employee.lname || ''}`.trim();
        context.employeeRole = employee.role || 'employee';
        context.joinDate = employee.jDate;
        context.businessOwnerId = employee.businessowner;
      }

      // Salary payments for this employee
      try {
        const SalaryPayment = require('../models/SalaryPayment');
        const myPayments = await SalaryPayment.find({ employee: userId })
          .sort({ paymentDate: -1 }).limit(5);
        context.mySalaryPayments = myPayments;
      } catch (e) { /* ignore */ }

    } else if (role === 'supplier') {
      const SupplierOrders = require('../models/SupplierOrders');
      context.totalOrders = await SupplierOrders.countDocuments({ supplier: userId });
      context.pendingOrders = await SupplierOrders.countDocuments({
        supplier: userId,
        status: 'Pending'
      });
      context.deliveredOrders = await SupplierOrders.countDocuments({
        supplier: userId,
        status: 'Delivered'
      });
      context.cancelledOrders = await SupplierOrders.countDocuments({
        supplier: userId,
        status: 'Cancelled'
      });

      // Supplier order details (model fields: pName, ounits, amount, status, oDate, dDate)
      const supplierOrders = await SupplierOrders.find({ supplier: userId })
        .select('pName ounits amount status oDate dDate')
        .sort({ oDate: -1 })
        .limit(8);
      context.recentSupplierOrders = supplierOrders;

      // Revenue stats for supplier
      const supplierRevenue = await SupplierOrders.aggregate([
        { $match: { supplier: toObjectId(userId) } },
        { $group: { _id: null, totalValue: { $sum: { $multiply: ['$ounits', '$amount'] } } } }
      ]);
      if (supplierRevenue.length > 0) {
        context.totalOrderValue = supplierRevenue[0].totalValue;
      }

      // Supplier profile (model uses fname/lname, not sname)
      const supplier = await Supplier.findById(userId).select('fname lname email phone companyName');
      if (supplier) {
        context.supplierName = `${supplier.fname} ${supplier.lname || ''}`.trim();
        context.supplierCompany = supplier.companyName;
      }
    }

    return context;
  } catch (error) {
    return {};
  }
};

/**
 * Generate system prompt based on user role
 */
const generateSystemPrompt = (role) => {
  const basePrompt = `You are a smart, friendly AI assistant for "Inline Tracker" — an Inventory Tracking System. You MUST respond ONLY in English.

RESPONSE RULES:
1. Keep responses concise (under 200 words unless detailed data is requested)
2. Use bullet points or numbered lists for any multi-item response
3. Use emojis sparingly but effectively for visual clarity
4. Bold important values with **text**
5. When showing data, format it clearly with labels
6. If the user asks something outside inventory management, politely redirect them
7. Be conversational and helpful — not robotic
8. Reference the actual data provided in the context when answering
9. If you don't have specific data to answer, say so honestly and suggest what the user can do`;

  const rolePrompts = {
    businessowner: `${basePrompt}

You are helping a **Business Owner** who manages their entire business through this platform. They care about:
- Revenue, sales performance, and growth
- Inventory levels and stock alerts
- Employee productivity and team management
- Supplier relationships and order fulfillment
- Warehouse operations
- Salary and payment management

Be professional, data-driven, and proactive with actionable insights. When presenting numbers, add context (e.g., "5 pending orders — 2 are urgent").`,

    employee: `${basePrompt}

You are helping an **Employee** who works on assigned tasks and orders. They care about:
- Their assigned orders and tasks
- Deadlines and urgent items
- Product information they're handling
- Their work performance
- Their salary payments

Be supportive, clear about priorities, and help them stay organized. Flag urgent or overdue items proactively.`,

    supplier: `${basePrompt}

You are helping a **Supplier** who fulfills product orders. They care about:
- Pending orders they need to fulfill
- Delivery schedules and deadlines
- Order history and payment tracking
- Their supply performance

Be professional, focus on order fulfillment, and help them track their deliveries efficiently.`
  };

  return rolePrompts[role] || basePrompt;
};

/**
 * Format context into readable text for AI model
 */
const formatContextForAI = (context, role) => {
  let formattedContext = '';

  if (role === 'businessowner') {
    formattedContext = `
BUSINESS OVERVIEW:
- Total Products: ${context.products || 0}
- Total Orders: ${context.totalOrders || 0}
- Pending Orders: ${context.pendingOrders || 0}
- Completed Orders: ${context.completedOrders || 0}
- Warehouses: ${context.warehouses || 0}
- Suppliers: ${context.suppliers || 0}
- Employees: ${context.employees || 0}
- Total Revenue: $${context.totalRevenue || 0}
- Average Order Value: $${context.avgOrderValue || 0}`;

    if (context.orderStatusBreakdown?.length) {
      formattedContext += `\n\nORDER STATUS BREAKDOWN:`;
      context.orderStatusBreakdown.forEach(s => {
        formattedContext += `\n- ${s._id}: ${s.count} orders`;
      });
    }

    if (context.topProducts?.length) {
      formattedContext += `\n\nTOP SELLING PRODUCTS:`;
      context.topProducts.forEach((p, i) => {
        formattedContext += `\n${i + 1}. ${p._id} — ${p.totalSold} orders, $${p.totalRevenue} revenue`;
      });
    }

    if (context.employeesList?.length) {
      formattedContext += `\n\nTEAM MEMBERS:`;
      context.employeesList.forEach(emp => {
        formattedContext += `\n- ${emp.fname} ${emp.lname || ''} (${emp.email}) — Role: ${emp.role || 'employee'}`;
      });
    }

    if (context.lowStockProducts?.length) {
      formattedContext += `\n\nLOW STOCK PRODUCTS (< 10 units):`;
      context.lowStockProducts.forEach(p => {
        formattedContext += `\n- ${p.name} (${p.category}) — ${p.totalProducts} units left, Price: $${p.price}`;
      });
    }

    if (context.recentOrders?.length) {
      formattedContext += `\n\nRECENT ORDERS:`;
      context.recentOrders.forEach(o => {
        const productName = o.pName || (o.products && o.products.length > 0 ? o.products.map(p => p.productName).join(', ') : 'N/A');
        formattedContext += `\n- ${o.cName} -> ${productName} — $${o.amount} (${o.status})`;
      });
    }

    if (context.totalSalaryPaid) {
      formattedContext += `\n\nSALARY DATA:`;
      formattedContext += `\n- Total Salary Paid: $${context.totalSalaryPaid}`;
      formattedContext += `\n- Payments Made: ${context.salaryPaymentCount}`;
    }

    if (context.supplierOrderStats?.length) {
      formattedContext += `\n\nSUPPLIER ORDER SUMMARY:`;
      context.supplierOrderStats.forEach(s => {
        formattedContext += `\n- ${s._id}: ${s.count} orders (Value: $${s.totalValue || 0})`;
      });
    }

  } else if (role === 'employee') {
    formattedContext = `
YOUR PROFILE:
- Name: ${context.employeeName || 'N/A'}
- Role: ${context.employeeRole || 'employee'}

WORK SUMMARY:
- Total Products: ${context.totalProducts || 0}
- Personally Assigned Products: ${context.assignedProducts || 0}
- Total Orders: ${context.totalOrders || 0}
- Pending Tasks: ${context.pendingTasks || 0}
- Completed Tasks: ${context.completedTasks || 0}`;

    if (context.urgentOrders?.length) {
      formattedContext += `\n\nURGENT ORDERS (deadline within 3 days):`;
      context.urgentOrders.forEach(o => {
        const deadline = new Date(o.dDate).toLocaleDateString();
        const productName = o.pName || (o.products && o.products.length > 0 ? o.products.map(p => p.productName).join(', ') : 'N/A');
        formattedContext += `\n- ${productName} for ${o.cName} — Due: ${deadline}`;
      });
    }

    if (context.overdueOrders?.length) {
      formattedContext += `\n\nOVERDUE ORDERS:`;
      context.overdueOrders.forEach(o => {
        const deadline = new Date(o.dDate).toLocaleDateString();
        const productName = o.pName || (o.products && o.products.length > 0 ? o.products.map(p => p.productName).join(', ') : 'N/A');
        formattedContext += `\n- ${productName} for ${o.cName} — Was due: ${deadline}`;
      });
    }

    if (context.assignedOrdersList?.length) {
      formattedContext += `\n\nYOUR RECENT ORDERS:`;
      context.assignedOrdersList.forEach(o => {
        const productName = o.pName || (o.products && o.products.length > 0 ? o.products.map(p => p.productName).join(', ') : 'N/A');
        formattedContext += `\n- ${productName} for ${o.cName} — ${o.status} | $${o.amount}`;
      });
    }

    if (context.mySalaryPayments?.length) {
      formattedContext += `\n\nRECENT SALARY PAYMENTS:`;
      context.mySalaryPayments.forEach(p => {
        formattedContext += `\n- $${p.amount} on ${new Date(p.paymentDate).toLocaleDateString()} (${p.status})`;
      });
    }

  } else if (role === 'supplier') {
    formattedContext = `
SUPPLIER PROFILE:
- Name: ${context.supplierName || 'N/A'}

SUPPLY OVERVIEW:
- Total Orders: ${context.totalOrders || 0}
- Pending Orders: ${context.pendingOrders || 0}
- Delivered Orders: ${context.deliveredOrders || 0}
- Cancelled Orders: ${context.cancelledOrders || 0}
- Total Order Value: $${context.totalOrderValue || 0}`;

    if (context.recentSupplierOrders?.length) {
      formattedContext += `\n\nRECENT ORDERS:`;
      context.recentSupplierOrders.forEach(o => {
        formattedContext += `\n- ${o.pName} — Qty: ${o.ounits}, $${o.amount}/unit (${o.status})`;
      });
    }
  }

  return formattedContext;
};

/**
 * Generate AI response - main entry point
 */
const generateAIResponse = async (userMessage, role, context, userId) => {
  try {
    // Add user message to conversation history
    addToConversationHistory(userId, 'user', userMessage);

    let response;

    // Try Groq API first if available
    if (USE_GROQ && groqClient) {
      response = await generateGroqResponse(userMessage, role, context, userId);
    } else {
      // Use intelligent rule-based response
      response = await generateIntelligentResponse(userMessage, role, context, userId);
    }

    // Add bot response to conversation history
    addToConversationHistory(userId, 'assistant', response);

    return response;
  } catch (error) {
    return generateEnhancedResponse(userMessage, role, context);
  }
};

/**
 * Handle specific entity queries (product details, order details, etc.)
 */
const handleSpecificEntityQuery = async (userMessage, role, userId) => {
  const message = userMessage.toLowerCase().trim();

  // Resolve the business owner ID for data scoping
  const boId = await resolveBusinessOwnerId(userId, role);
  const dataOwnerId = boId || userId;

  // Detect product-specific queries
  if ((message.includes('product') || message.includes('item')) &&
    (message.includes('tell me') || message.includes('show') || message.includes('detail') || message.includes('info about') || message.includes('about') || message.includes('search'))) {
    let productName = null;

    let match = userMessage.match(/(?:product|item)\s+(?:named\s+)?["']?([^"'.!?]+)["']?/i);
    if (match && match[1]) productName = match[1].trim();

    if (!productName) {
      match = userMessage.match(/(?:tell me about|show me|search for|details? (?:on|for|about))\s+(?:(?:the\s+)?product\s+)?["']?([^"'.!?]+)["']?/i);
      if (match && match[1]) productName = match[1].trim();
    }

    if (productName && (role === 'businessowner' || role === 'employee')) {
      const products = await searchProducts(productName, dataOwnerId);
      if (products.length > 0) {
        return formatProductDetailsResponse(products);
      }
      return `No products found matching "${productName}".\n\nTry:\n• Check the spelling\n• Search by category or brand\n• Use a partial name`;
    }
  }

  // Detect order-specific queries
  if ((message.includes('order') &&
    (message.includes('tell me') || message.includes('show') || message.includes('detail') || message.includes('info about') || message.includes('about') || message.includes('search'))) ||
    message.includes('customer order')) {
    let orderTerm = null;

    let match = userMessage.match(/order\s+(?:for\s+)?["']?([^"'.!?]+)["']?/i);
    if (match && match[1]) orderTerm = match[1].trim();

    if (!orderTerm) {
      match = userMessage.match(/(?:tell me about|show me|details? (?:on|for|about))\s+(?:(?:the\s+)?order\s+)?["']?([^"'.!?]+)["']?/i);
      if (match && match[1]) orderTerm = match[1].trim();
    }

    if (orderTerm && (role === 'businessowner' || role === 'employee')) {
      const orders = await searchOrders(orderTerm, dataOwnerId);
      if (orders.length > 0) {
        return formatOrderDetailsResponse(orders);
      }
      return `No orders found matching "${orderTerm}".\n\nTry searching by:\n• Customer name\n• Product name`;
    }
  }

  // Detect category queries
  if (message.includes('category') || message.includes('categories')) {
    if (role === 'businessowner' || role === 'employee') {
      const categories = await getCategoryDetails(dataOwnerId);
      if (categories.length > 0) return formatCategoryDetailsResponse(categories);
      return `No categories found yet. Create categories from your dashboard to organize products.`;
    }
  }

  // Detect warehouse queries with details
  if ((message.includes('warehouse') || message.includes('warehouses')) &&
    (message.includes('detail') || message.includes('address') || message.includes('manager') || message.includes('location') || message.includes('info') || message.includes('show') || message.includes('list'))) {
    if (role === 'businessowner' || role === 'employee') {
      const warehouses = await getWarehouseDetails(dataOwnerId);
      if (warehouses.length > 0) return formatWarehouseDetailsResponse(warehouses);
      return `No warehouses set up yet. Add warehouses from your dashboard to manage inventory locations.`;
    }
  }

  // Detect salary/payment queries
  if (message.includes('salary') || message.includes('payment') || message.includes('pay') || message.includes('wage') || message.includes('payroll')) {
    const context = await getContextForRole(userId, role);
    if (role === 'businessowner') {
      return getSalaryResponse(context);
    } else if (role === 'employee') {
      return getEmployeeSalaryResponse(context);
    }
  }

  return null;
};

/**
 * Salary response for business owner
 */
const getSalaryResponse = (context) => {
  let response = `**SALARY & PAYMENTS OVERVIEW:**\n\n`;

  if (context.totalSalaryPaid) {
    response += `• Total Salary Paid: **$${context.totalSalaryPaid.toLocaleString()}**\n`;
    response += `• Payment Transactions: **${context.salaryPaymentCount}**\n\n`;
  } else {
    response += `• No salary payments recorded yet.\n\n`;
  }

  if (context.recentSalaryPayments?.length) {
    response += `**Recent Payments:**\n`;
    context.recentSalaryPayments.forEach((p, i) => {
      const empName = p.employee ? `${p.employee.fname} ${p.employee.lname || ''}`.trim() : 'Unknown';
      response += `${i + 1}. **${empName}** — $${p.amount} on ${new Date(p.paymentDate).toLocaleDateString()} (${p.status})\n`;
    });
    response += `\n`;
  }

  response += `Manage salary payments from the **Salary Management** section in your dashboard.`;
  return response;
};

/**
 * Salary response for employee
 */
const getEmployeeSalaryResponse = (context) => {
  let response = `**YOUR SALARY PAYMENTS:**\n\n`;

  if (context.mySalaryPayments?.length) {
    context.mySalaryPayments.forEach((p, i) => {
      response += `${i + 1}. **$${p.amount}** — ${new Date(p.paymentDate).toLocaleDateString()}\n`;
      response += `   • Method: ${p.paymentMethod || 'N/A'}\n`;
      response += `   • Period: ${p.paymentPeriod || 'N/A'}\n`;
      response += `   • Status: ${p.status}\n\n`;
    });
  } else {
    response += `No salary payments found in your records.\n\n`;
  }

  response += `Contact your business owner for salary-related questions.`;
  return response;
};

/**
 * Format product details for display
 */
const formatProductDetailsResponse = (products) => {
  if (!products || products.length === 0) return null;

  let response = `**PRODUCT DETAILS** (${products.length} found):\n\n`;

  products.forEach((product, index) => {
    const details = getProductDetails(product);
    response += `**${index + 1}. ${details.name}**\n`;
    response += `   • Category: ${details.category}\n`;
    response += `   • Price: $${details.price}\n`;
    response += `   • Stock: ${details.stock} units ${details.stock < 10 ? '⚠️ LOW' : '✅'}\n`;
    response += `   • Brand: ${details.brand || 'N/A'}\n`;
    response += `   • Mfg Date: ${details.manufactureDate}\n`;
    response += `   • Exp Date: ${details.expiryDate}\n`;
    response += `   • Warehouses: ${details.warehouses.join(', ')}\n`;
    if (details.description !== 'No description available') {
      response += `   • Description: ${details.description}\n`;
    }
    response += `\n`;
  });

  return response;
};

/**
 * Format order details for display
 */
const formatOrderDetailsResponse = (orders) => {
  if (!orders || orders.length === 0) return null;

  let response = `**ORDER DETAILS** (${orders.length} found):\n\n`;

  orders.forEach((order, index) => {
    const details = getOrderDetails(order);
    response += `**${index + 1}. Order for ${details.customer}**\n`;
    response += `   • Product: ${details.product}\n`;
    response += `   • Amount: ${details.amount}\n`;
    response += `   • Ordered: ${details.orderDate}\n`;
    response += `   • Deadline: ${details.deadline}\n`;
    if (details.daysRemaining !== 'N/A') {
      response += `   • ${details.urgency} (${details.daysRemaining} days)\n`;
    }
    response += `   • Status: ${details.productStatus} | Delivery: ${details.deliveryStatus}\n`;
    if (details.address !== 'Not provided') {
      response += `   • Address: ${details.address}\n`;
    }
    response += `\n`;
  });

  return response;
};

/**
 * Format category details for display
 */
const formatCategoryDetailsResponse = (categories) => {
  if (!categories || categories.length === 0) return null;

  let response = `**CATEGORIES** (${categories.length} total):\n\n`;

  categories.forEach((category, index) => {
    response += `${index + 1}. **${category.name}**\n`;
    response += `   • Description: ${category.description}\n`;
    response += `   • Products: ${category.productCount} items\n\n`;
  });

  return response;
};

/**
 * Format warehouse details for display
 */
const formatWarehouseDetailsResponse = (warehouses) => {
  if (!warehouses || warehouses.length === 0) return null;

  let response = `**WAREHOUSES** (${warehouses.length} total):\n\n`;

  warehouses.forEach((warehouse, index) => {
    response += `**${index + 1}. ${warehouse.wName}**\n`;
    response += `   • Manager: ${warehouse.wManager}\n`;
    response += `   • Address: ${warehouse.wAddress}\n`;
    response += `   • Contact: ${warehouse.wContact}\n`;
    response += `   • Email: ${warehouse.wEmail}\n`;
    if (warehouse.city || warehouse.state) {
      response += `   • Location: ${[warehouse.city, warehouse.state, warehouse.country].filter(Boolean).join(', ')}\n`;
    }
    response += `\n`;
  });

  return response;
};

/**
 * Generate response using Groq API with conversation history
 */
const generateGroqResponse = async (userMessage, role, context, userId) => {
  try {
    if (!USE_GROQ || !groqClient) {
      return generateEnhancedResponse(userMessage, role, context);
    }

    // First check for specific entity queries that need DB lookups
    const entityResponse = await handleSpecificEntityQuery(userMessage, role, userId);
    if (entityResponse) return entityResponse;

    const systemPrompt = generateSystemPrompt(role);
    const contextString = formatContextForAI(context, role);

    // Build conversation messages with history
    const messages = [
      {
        role: 'system',
        content: `${systemPrompt}\n\nCurrent Data:\n${contextString}`
      }
    ];

    // Add conversation history for multi-turn context
    const history = getConversationHistory(userId);
    history.slice(-6).forEach(msg => {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    });

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    const response = await groqClient.chat.completions.create({
      messages: messages,
      model: 'llama-3.1-8b-instant',
      max_tokens: 600,
      temperature: 0.6,
      top_p: 0.9
    });

    let responseText = response.choices[0].message.content.trim();
    return responseText;
  } catch (error) {
    // Fallback to intelligent rule-based response
    return generateIntelligentResponse(userMessage, role, context, userId);
  }
};

/**
 * Search for specific products by name
 */
const searchProducts = async (productName, businessownerId) => {
  try {
    const escapedName = productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const products = await Product.find({
      businessowner: businessownerId,
      $or: [
        { name: { $regex: escapedName, $options: 'i' } },
        { desc: { $regex: escapedName, $options: 'i' } },
        { brand: { $regex: escapedName, $options: 'i' } }
      ]
    }).select('name category price totalProducts brand mDate eDate desc warehouse').limit(5);

    // Resolve category and warehouse names for display
    if (products.length > 0) {
      const Category = require('../models/Category');
      const catIds = [...new Set(products.map(p => p.category).filter(Boolean))];
      const whIds = [...new Set(products.flatMap(p => Array.isArray(p.warehouse) ? p.warehouse : (p.warehouse ? [p.warehouse] : [])).filter(Boolean))];

      const [cats, whs] = await Promise.all([
        Category.find({ _id: { $in: catIds } }).select('_id cName').lean(),
        Warehouse.find({ _id: { $in: whIds } }).select('_id wName').lean()
      ]);

      const catMap = {};
      cats.forEach(c => { catMap[c._id.toString()] = c.cName; });
      const whMap = {};
      whs.forEach(w => { whMap[w._id.toString()] = w.wName; });

      return products.map(p => {
        const pObj = p.toObject ? p.toObject() : { ...p };
        pObj.categoryName = catMap[pObj.category] || pObj.category;
        if (Array.isArray(pObj.warehouse)) {
          pObj.warehouseNames = pObj.warehouse.map(wId => whMap[wId] || wId).filter(Boolean);
        } else if (pObj.warehouse) {
          pObj.warehouseNames = [whMap[pObj.warehouse] || pObj.warehouse];
        } else {
          pObj.warehouseNames = [];
        }
        return pObj;
      });
    }
    return products;
  } catch (error) {
    return [];
  }
};

/**
 * Search for specific orders
 */
const searchOrders = async (searchTerm, businessownerId) => {
  try {
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const orders = await CustomerOrders.find({
      businessowner: businessownerId,
      $or: [
        { cName: { $regex: escapedTerm, $options: 'i' } },
        { pName: { $regex: escapedTerm, $options: 'i' } }
      ]
    }).select('cName pName amount oDate status dStatus dDate cAddress desc pAvail products').limit(5);
    return orders;
  } catch (error) {
    return [];
  }
};

/**
 * Get categories with product counts
 */
const getCategoryDetails = async (businessownerId) => {
  try {
    const Category = require('../models/Category');
    const categories = await Category.find({ businessowner: businessownerId });
    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const count = await Product.countDocuments({
          businessowner: businessownerId,
          category: cat._id.toString()
        });
        return { name: cat.cName, description: cat.cDesc, productCount: count };
      })
    );
    return categoriesWithCounts;
  } catch (error) {
    return [];
  }
};

/**
 * Get warehouse details
 */
const getWarehouseDetails = async (businessownerId) => {
  try {
    const warehouses = await Warehouse.find({ businessowner: businessownerId })
      .select('wName wManager wAddress wContact wEmail city state country');
    return warehouses;
  } catch (error) {
    return [];
  }
};

/**
 * Get detailed product information
 */
const getProductDetails = (product) => {
  if (!product) return null;
  return {
    name: product.name,
    category: product.categoryName || product.category,
    price: product.price,
    stock: product.totalProducts,
    brand: product.brand,
    manufactureDate: product.mDate ? new Date(product.mDate).toLocaleDateString() : 'N/A',
    expiryDate: product.eDate ? new Date(product.eDate).toLocaleDateString() : 'N/A',
    warehouses: product.warehouseNames && product.warehouseNames.length > 0 ? product.warehouseNames : (product.warehouse && product.warehouse.length > 0 ? product.warehouse : ['Not assigned']),
    description: product.desc || 'No description available'
  };
};

/**
 * Get detailed order information
 */
const getOrderDetails = (order) => {
  if (!order) return null;

  const daysUntilDeadline = order.dDate ? Math.ceil((new Date(order.dDate) - new Date()) / (1000 * 60 * 60 * 24)) : 'N/A';

  let urgency = '✅ On Track';
  if (typeof daysUntilDeadline === 'number') {
    if (daysUntilDeadline < 0) urgency = '🔴 OVERDUE';
    else if (daysUntilDeadline < 3) urgency = '⚠️ URGENT';
    else if (daysUntilDeadline < 7) urgency = '⚡ Due Soon';
  }

  const productName = order.pName || (order.products && order.products.length > 0 ? order.products.map(p => p.productName).join(', ') : 'N/A');

  return {
    customer: order.cName,
    product: productName,
    category: order.category,
    amount: `$${order.amount}`,
    orderDate: new Date(order.oDate).toLocaleDateString(),
    deadline: order.dDate ? new Date(order.dDate).toLocaleDateString() : 'N/A',
    daysRemaining: daysUntilDeadline,
    urgency: urgency,
    productStatus: order.status || 'Pending',
    deliveryStatus: order.dStatus || 'Not shipped',
    availability: order.pAvail || 'Unknown',
    address: order.cAddress || 'Not provided',
    notes: order.desc || 'None'
  };
};

/**
 * Enhanced rule-based response system
 */
const generateEnhancedResponse = (userMessage, role, context) => {
  const message = userMessage.toLowerCase().trim();

  const intents = {
    greeting: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'howdy', 'greetings'],
    dashboard: ['dashboard', 'overview', 'summary', 'business summary', 'how is business', 'how are things'],
    inventory_status: ['inventory', 'stock', 'products', 'how many products', 'product count', 'stock level'],
    order_status: ['order', 'orders', 'pending', 'delivery', 'shipment', 'tracking'],
    low_stock_alert: ['low stock', 'reorder', 'out of stock', 'running low', 'stock alert', 'need restock'],
    employee_info: ['employee', 'employees', 'team', 'staff', 'worker', 'personnel', 'my team', 'members'],
    supplier_info: ['supplier', 'supply', 'vendor', 'procurement'],
    warehouse_info: ['warehouse', 'storage', 'location', 'depot'],
    salary_info: ['salary', 'payment', 'pay', 'wage', 'compensation', 'payroll'],
    revenue_info: ['revenue', 'income', 'earning', 'sales', 'profit', 'money'],
    top_products: ['top product', 'best selling', 'popular', 'top selling', 'most sold'],
    urgent_tasks: ['urgent', 'overdue', 'deadline', 'due soon', 'priority', 'critical'],
    reports: ['report', 'analytics', 'export', 'download', 'generate report'],
    help: ['help', 'what can you do', 'capabilities', 'features', 'commands'],
    thanks: ['thank', 'thanks', 'appreciate', 'great', 'awesome', 'perfect', 'good job'],
  };

  let detectedIntent = null;
  let bestScore = 0;
  for (const [intent, keywords] of Object.entries(intents)) {
    const score = keywords.filter(kw => message.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      detectedIntent = intent;
    }
  }

  switch (detectedIntent) {
    case 'greeting':
      return getGreetingResponse(role, context);
    case 'dashboard':
      return getDashboardResponse(role, context);
    case 'inventory_status':
      return getInventoryStatusResponse(role, context);
    case 'order_status':
      return getOrderStatusResponse(role, context);
    case 'low_stock_alert':
      return getLowStockResponse(role, context);
    case 'employee_info':
      return getEmployeeDetailsResponse(role, context);
    case 'supplier_info':
      return getSupplierInfoResponse(role, context);
    case 'warehouse_info':
      return getWarehouseInfoResponse(role, context);
    case 'salary_info':
      return role === 'employee' ? getEmployeeSalaryResponse(context) : getSalaryResponse(context);
    case 'revenue_info':
      return getRevenueResponse(role, context);
    case 'top_products':
      return getTopProductsResponse(role, context);
    case 'urgent_tasks':
      return getUrgentTasksResponse(role, context);
    case 'reports':
      return getReportsHelpResponse(role);
    case 'help':
      return getHelpResponse(role);
    case 'thanks':
      return `You're welcome! 😊 Let me know if there's anything else I can help with.`;
    default:
      return getDefaultResponse(role);
  }
};

/**
 * Response generators
 */
const getGreetingResponse = (role, context) => {
  const roleGreetings = {
    businessowner: () => {
      let msg = `👋 Hello! Welcome back to your dashboard.\n\n**Quick Overview:**\n`;
      msg += `• ${context.products || 0} products in stock\n`;
      msg += `• ${context.pendingOrders || 0} pending orders\n`;
      msg += `• ${context.employees || 0} team members\n`;
      if (context.lowStockProducts?.length > 0) {
        msg += `\n⚠️ **Alert:** ${context.lowStockProducts.length} items need restocking!\n`;
      }
      msg += `\nHow can I help you today?`;
      return msg;
    },
    employee: () => {
      let msg = `👋 Hello${context.employeeName ? `, ${context.employeeName}` : ''}! Ready to tackle your tasks?\n\n`;
      msg += `**Your Status:**\n`;
      msg += `• ${context.totalProducts || 0} products\n`;
      msg += `• ${context.pendingTasks || 0} pending tasks\n`;
      msg += `• ${context.totalOrders || 0} orders\n`;
      if (context.urgentOrders?.length > 0) {
        msg += `\n🚨 **${context.urgentOrders.length} urgent order(s)** need attention!\n`;
      }
      if (context.overdueOrders?.length > 0) {
        msg += `🔴 **${context.overdueOrders.length} overdue order(s)** — please prioritize!\n`;
      }
      msg += `\nWhat would you like to know?`;
      return msg;
    },
    supplier: () => {
      let msg = `👋 Hello${context.supplierName ? `, ${context.supplierName}` : ''}!\n\n`;
      msg += `**Your Orders:**\n`;
      msg += `• ${context.pendingOrders || 0} pending deliveries\n`;
      msg += `• ${context.deliveredOrders || 0} completed deliveries\n`;
      msg += `\nHow can I assist you?`;
      return msg;
    }
  };
  return (roleGreetings[role] || roleGreetings.businessowner)();
};

const getDashboardResponse = (role, context) => {
  if (role === 'businessowner') {
    let msg = `📊 **BUSINESS DASHBOARD**\n\n`;
    msg += `**Key Metrics:**\n`;
    msg += `• Products: **${context.products || 0}**\n`;
    msg += `• Total Orders: **${context.totalOrders || 0}**\n`;
    msg += `• Pending: **${context.pendingOrders || 0}** | Completed: **${context.completedOrders || 0}**\n`;
    msg += `• Revenue: **$${(context.totalRevenue || 0).toLocaleString()}**\n`;
    msg += `• Avg Order: **$${context.avgOrderValue || 0}**\n\n`;
    msg += `👥 **Team:** ${context.employees || 0} employees\n`;
    msg += `🏢 **Warehouses:** ${context.warehouses || 0}\n`;
    msg += `📦 **Suppliers:** ${context.suppliers || 0}\n\n`;

    if (context.lowStockProducts?.length > 0) {
      msg += `⚠️ **Alerts:**\n`;
      msg += `• ${context.lowStockProducts.length} products low on stock\n`;
    }

    if (context.topProducts?.length > 0) {
      msg += `\n🏆 **Top Products:**\n`;
      context.topProducts.slice(0, 3).forEach((p, i) => {
        msg += `${i + 1}. ${p._id} — ${p.totalSold} orders ($${p.totalRevenue})\n`;
      });
    }
    return msg;
  } else if (role === 'employee') {
    let msg = `📋 **YOUR DASHBOARD**\n\n`;
    msg += `• Total Products: **${context.totalProducts || 0}**\n`;
    msg += `• Total Orders: **${context.totalOrders || 0}**\n`;
    msg += `• Pending Tasks: **${context.pendingTasks || 0}**\n`;
    msg += `• Completed: **${context.completedTasks || 0}**\n\n`;
    if (context.urgentOrders?.length > 0) {
      msg += `🚨 **Urgent:** ${context.urgentOrders.length} orders due within 3 days\n`;
    }
    if (context.overdueOrders?.length > 0) {
      msg += `🔴 **Overdue:** ${context.overdueOrders.length} past deadline\n`;
    }
    return msg;
  } else if (role === 'supplier') {
    let msg = `📦 **SUPPLY DASHBOARD**\n\n`;
    msg += `• Total Orders: **${context.totalOrders || 0}**\n`;
    msg += `• Pending: **${context.pendingOrders || 0}**\n`;
    msg += `• Delivered: **${context.deliveredOrders || 0}**\n`;
    msg += `• Total Value: **$${(context.totalOrderValue || 0).toLocaleString()}**\n`;
    return msg;
  }
  return getDashboardResponse('businessowner', context);
};

const getInventoryStatusResponse = (role, context) => {
  if (role === 'businessowner') {
    let msg = `📦 **INVENTORY STATUS:**\n\n`;
    msg += `• Total Products: **${context.products || 0}**\n`;
    msg += `• Warehouses: **${context.warehouses || 0}**\n`;
    msg += `• Suppliers: **${context.suppliers || 0}**\n\n`;
    if (context.lowStockProducts?.length > 0) {
      msg += `⚠️ **Low Stock Alert** (${context.lowStockProducts.length} items):\n`;
      context.lowStockProducts.forEach(p => {
        msg += `• ${p.name} — **${p.totalProducts}** units (${p.category})\n`;
      });
    } else {
      msg += `✅ All products are adequately stocked!`;
    }
    return msg;
  } else if (role === 'employee') {
    let msg = `📦 **INVENTORY STATUS:**\n\n`;
    msg += `• Total Products: **${context.totalProducts || 0}**\n`;
    msg += `• Total Orders: **${context.totalOrders || 0}**\n`;
    msg += `• Pending Tasks: **${context.pendingTasks || 0}**\n`;
    if (context.lowStockProducts?.length > 0) {
      msg += `\n⚠️ **Low Stock** (${context.lowStockProducts.length} items):\n`;
      context.lowStockProducts.forEach(p => {
        msg += `• ${p.name} — **${p.totalProducts}** units\n`;
      });
    }
    return msg;
  } else if (role === 'supplier') {
    return `📋 **Supply Status:**\n\n• Pending Orders: **${context.pendingOrders || 0}**\n• Delivered: **${context.deliveredOrders || 0}**\n\nPlease fulfill pending orders promptly.`;
  }
  return 'Inventory information is available from your dashboard.';
};

const getOrderStatusResponse = (role, context) => {
  if (role === 'businessowner') {
    let msg = `📋 **ORDER STATUS:**\n\n`;
    msg += `• Total Orders: **${context.totalOrders || 0}**\n`;
    msg += `• Pending: **${context.pendingOrders || 0}**\n`;
    msg += `• Completed: **${context.completedOrders || 0}**\n\n`;
    if (context.recentOrders?.length > 0) {
      msg += `**Recent Orders:**\n`;
      context.recentOrders.slice(0, 5).forEach((o, i) => {
        const productName = o.pName || (o.products && o.products.length > 0 ? o.products.map(p => p.productName).join(', ') : 'N/A');
        msg += `${i + 1}. ${o.cName} → ${productName} — $${o.amount} (${o.status})\n`;
      });
    }
    return msg;
  } else if (role === 'employee') {
    let msg = `📋 **ORDERS:**\n\n`;
    msg += `• Total Orders: **${context.totalOrders || 0}**\n`;
    msg += `• Pending: **${context.pendingTasks || 0}**\n`;
    msg += `• Completed: **${context.completedTasks || 0}**\n\n`;
    if (context.assignedOrdersList?.length > 0) {
      msg += `**Your Recent Orders:**\n`;
      context.assignedOrdersList.slice(0, 5).forEach((o, i) => {
        const productName = o.pName || (o.products && o.products.length > 0 ? o.products.map(p => p.productName).join(', ') : 'N/A');
        msg += `${i + 1}. ${productName} for ${o.cName} — ${o.status}\n`;
      });
    }
    return msg;
  } else if (role === 'supplier') {
    let msg = `📦 **YOUR SUPPLY ORDERS:**\n\n`;
    msg += `• Pending: **${context.pendingOrders || 0}**\n`;
    msg += `• Delivered: **${context.deliveredOrders || 0}**\n\n`;
    if (context.recentSupplierOrders?.length > 0) {
      msg += `**Recent Orders:**\n`;
      context.recentSupplierOrders.slice(0, 5).forEach((o, i) => {
        msg += `${i + 1}. ${o.pName} — Qty: ${o.ounits}, $${o.amount}/unit (${o.status})\n`;
      });
    }
    return msg;
  }
  return 'Order information is available from your dashboard.';
};

const getLowStockResponse = (role, context) => {
  if (role === 'businessowner') {
    if (context.lowStockProducts?.length > 0) {
      let msg = `⚠️ **LOW STOCK ALERT** (${context.lowStockProducts.length} products):\n\n`;
      context.lowStockProducts.forEach((p, i) => {
        msg += `${i + 1}. **${p.name}** (${p.category})\n`;
        msg += `   • Current stock: **${p.totalProducts}** units\n`;
        msg += `   • Price: $${p.price}\n`;
        msg += `   • Action: Reorder recommended\n\n`;
      });
      msg += `💡 Create supplier orders for these products from your dashboard.`;
      return msg;
    }
    return `✅ **Great news!** All your products have adequate stock levels. No restocking needed right now.`;
  }
  return `Stock information is managed by the business owner. Check your dashboard for relevant details.`;
};

const getEmployeeDetailsResponse = (role, context) => {
  if (role === 'businessowner') {
    if (context.employeesList?.length > 0) {
      let msg = `👥 **TEAM MEMBERS** (${context.employees || 0} total):\n\n`;
      context.employeesList.forEach((emp, i) => {
        const name = `${emp.fname} ${emp.lname || ''}`.trim();
        const joinDate = emp.jDate ? new Date(emp.jDate).toLocaleDateString() : 'N/A';
        msg += `**${i + 1}. ${name}**\n`;
        msg += `   • Email: ${emp.email}\n`;
        msg += `   • Phone: ${emp.phone || 'N/A'}\n`;
        msg += `   • Role: ${emp.role || 'employee'}\n`;
        msg += `   • Joined: ${joinDate}\n\n`;
      });
      msg += `💡 Manage your team from the **Employees** section.`;
      return msg;
    }
    return `👥 You have **${context.employees || 0}** employees. Add team members from your dashboard.`;
  } else if (role === 'employee') {
    let msg = `👤 **YOUR PROFILE:**\n\n`;
    msg += `• Name: **${context.employeeName || 'N/A'}**\n`;
    msg += `• Role: **${context.employeeRole || 'employee'}**\n`;
    msg += `• Pending Tasks: **${context.pendingTasks || 0}**\n`;
    msg += `• Completed Tasks: **${context.completedTasks || 0}**\n`;
    return msg;
  }
  return `Employee information is not accessible for your role.`;
};

const getSupplierInfoResponse = (role, context) => {
  if (role === 'supplier') {
    let msg = `📦 **YOUR SUPPLY OVERVIEW:**\n\n`;
    msg += `• Total Orders: **${context.totalOrders || 0}**\n`;
    msg += `• Pending: **${context.pendingOrders || 0}**\n`;
    msg += `• Delivered: **${context.deliveredOrders || 0}**\n`;
    msg += `• Total Value: **$${(context.totalOrderValue || 0).toLocaleString()}**\n\n`;
    if (context.recentSupplierOrders?.length > 0) {
      msg += `**Recent Orders:**\n`;
      context.recentSupplierOrders.slice(0, 5).forEach((o, i) => {
        msg += `${i + 1}. ${o.pName} — Qty: ${o.ounits}, $${o.amount}/unit (${o.status})\n`;
      });
    }
    return msg;
  } else if (role === 'businessowner') {
    return `📦 **Suppliers:** You have **${context.suppliers || 0}** active suppliers. Manage them from the **Suppliers** section.`;
  }
  return `Supplier information is not available for your role.`;
};

const getWarehouseInfoResponse = (role, context) => {
  if (role === 'businessowner') {
    return `🏢 **WAREHOUSES:**\n\n• Total: **${context.warehouses || 0}** warehouses\n\n💡 For detailed warehouse info (addresses, managers), ask: *"Show warehouse details"*`;
  }
  return `Warehouse information is managed by the business owner.`;
};

const getRevenueResponse = (role, context) => {
  if (role === 'businessowner') {
    let msg = `💰 **REVENUE & SALES:**\n\n`;
    msg += `• Total Revenue: **$${(context.totalRevenue || 0).toLocaleString()}**\n`;
    msg += `• Total Orders: **${context.totalOrders || 0}**\n`;
    msg += `• Avg Order Value: **$${context.avgOrderValue || 0}**\n\n`;

    if (context.topProducts?.length > 0) {
      msg += `🏆 **Top Revenue Products:**\n`;
      context.topProducts.forEach((p, i) => {
        msg += `${i + 1}. ${p._id} — ${p.totalSold} orders, $${p.totalRevenue} revenue\n`;
      });
    }

    if (context.totalSalaryPaid) {
      msg += `\n💼 **Expenses:**\n`;
      msg += `• Salary paid: $${context.totalSalaryPaid.toLocaleString()}\n`;
    }
    return msg;
  } else if (role === 'supplier') {
    return `💰 **Your Total Order Value:** $${(context.totalOrderValue || 0).toLocaleString()}\n• Pending: ${context.pendingOrders || 0}\n• Delivered: ${context.deliveredOrders || 0}`;
  }
  return `Revenue information is accessible to business owners only.`;
};

const getTopProductsResponse = (role, context) => {
  if (role === 'businessowner') {
    if (context.topProducts?.length > 0) {
      let msg = `🏆 **TOP SELLING PRODUCTS:**\n\n`;
      context.topProducts.forEach((p, i) => {
        msg += `**${i + 1}. ${p._id}**\n`;
        msg += `   • Orders: ${p.totalSold}\n`;
        msg += `   • Revenue: $${p.totalRevenue}\n\n`;
      });
      return msg;
    }
    return `📊 No sales data available yet. Start selling to see your top products!`;
  }
  return `Top product information is available to business owners.`;
};

const getUrgentTasksResponse = (role, context) => {
  if (role === 'employee') {
    let msg = `🚨 **URGENT & OVERDUE TASKS:**\n\n`;
    if (context.overdueOrders?.length > 0) {
      msg += `🔴 **OVERDUE** (${context.overdueOrders.length}):\n`;
      context.overdueOrders.forEach((o, i) => {
        const productName = o.pName || (o.products && o.products.length > 0 ? o.products.map(p => p.productName).join(', ') : 'N/A');
        msg += `${i + 1}. ${productName} for ${o.cName} — Due: ${new Date(o.dDate).toLocaleDateString()}\n`;
      });
      msg += `\n`;
    }
    if (context.urgentOrders?.length > 0) {
      msg += `⚠️ **DUE SOON** (${context.urgentOrders.length}):\n`;
      context.urgentOrders.forEach((o, i) => {
        const productName = o.pName || (o.products && o.products.length > 0 ? o.products.map(p => p.productName).join(', ') : 'N/A');
        msg += `${i + 1}. ${productName} for ${o.cName} — Due: ${new Date(o.dDate).toLocaleDateString()}\n`;
      });
    }
    if (!context.overdueOrders?.length && !context.urgentOrders?.length) {
      msg += `✅ No urgent or overdue tasks. You're on track!`;
    }
    return msg;
  } else if (role === 'businessowner') {
    let msg = `🚨 **ATTENTION REQUIRED:**\n\n`;
    msg += `• Pending Orders: **${context.pendingOrders || 0}**\n`;
    if (context.lowStockProducts?.length > 0) {
      msg += `• Low Stock Items: **${context.lowStockProducts.length}**\n`;
    }
    msg += `\n💡 Review your dashboard for detailed action items.`;
    return msg;
  }
  return `Check your dashboard for priority items.`;
};

const getReportsHelpResponse = (role) => {
  if (role === 'businessowner') {
    return `📊 **REPORTS & ANALYTICS:**\n\nGenerate and download reports from the **Reports** section:\n\n• 📦 Product Reports — stock levels, categories\n• 📋 Order Reports — sales, status tracking\n• 👥 Employee Reports — team performance\n• 📦 Supplier Reports — supply chain data\n• 💰 Salary Reports — payment history\n\n💡 Go to **Dashboard → Reports** to export data.`;
  } else if (role === 'employee') {
    return `📊 **REPORTS:**\n\nYou can view and export reports (if permitted) from the **Reports** section.\n\n💡 Ask your business owner if you need specific report access.`;
  }
  return `📊 Reports are available from the Reports section in your dashboard.`;
};

const getHelpResponse = (role) => {
  const helpMessages = {
    businessowner: `🤖 **I CAN HELP YOU WITH:**\n\n📊 **Business Insights:**\n• "Show my dashboard" — overview of everything\n• "Revenue summary" — sales and income\n• "Top selling products" — best performers\n\n📦 **Inventory:**\n• "Stock status" — current inventory\n• "Low stock alerts" — items needing restock\n• "Product details [name]" — specific product info\n\n📋 **Orders:**\n• "Order status" — pending and recent orders\n• "Show orders for [customer]" — specific order info\n\n👥 **Team:**\n• "Show employees" — team member list\n• "Salary overview" — payment information\n\n🏢 **Operations:**\n• "Warehouse details" — locations and managers\n• "Show categories" — product categories\n• "Supplier info" — supplier management\n\n📊 **Reports:**\n• "Report help" — how to generate reports`,

    employee: `🤖 **I CAN HELP YOU WITH:**\n\n📋 **Your Work:**\n• "My dashboard" — your task overview\n• "My orders" — assigned orders list\n• "Urgent tasks" — deadlines and overdue items\n\n💰 **Salary:**\n• "My salary" — payment history\n\n📦 **Products:**\n• "Inventory status" — your assigned products\n\n❓ Just ask naturally — I'll understand!`,

    supplier: `🤖 **I CAN HELP YOU WITH:**\n\n📦 **Orders:**\n• "My orders" — all your supply orders\n• "Pending orders" — what needs delivery\n• "Order status" — delivery tracking\n\n💰 **Business:**\n• "Revenue" — your total order value\n• "Dashboard" — quick overview\n\n❓ Ask me anything about your supply operations!`
  };

  return helpMessages[role] || helpMessages.businessowner;
};

const getDefaultResponse = (role) => {
  return `I'm not sure I understood that. Here are some things I can help with:\n\n• "Dashboard" — quick overview\n• "Stock status" — inventory levels\n• "Orders" — order tracking\n• "Revenue" or "Salary" — financial info\n• "Help" — see all commands\n\nTry asking in a different way, or type **help** for the full list!`;
};

/**
 * Intent Analysis for intelligent responses
 */
const analyzeUserIntent = (userMessage) => {
  const message = userMessage.toLowerCase().trim();

  const intents = {
    inventory: {
      keywords: ['stock', 'inventory', 'item', 'product', 'goods', 'material'],
      actions: ['check', 'see', 'show', 'view', 'tell', 'how many', 'count'],
      variations: ['low stock', 'out of stock', 'available', 'in stock']
    },
    order: {
      keywords: ['order', 'orders', 'customer', 'purchase', 'delivery', 'shipment', 'sale'],
      actions: ['check', 'track', 'status', 'pending', 'see', 'show', 'tell', 'view'],
      variations: ['pending order', 'delivered', 'completed', 'processed']
    },
    alert: {
      keywords: ['low', 'alert', 'warning', 'ending', 'finish', 'out of stock', 'critical'],
      actions: ['need', 'require', 'reorder', 'urgent'],
      variations: ['reorder', 'stock out', 'empty']
    },
    employee: {
      keywords: ['employee', 'staff', 'worker', 'team', 'member', 'manager', 'supervisor'],
      actions: ['show', 'list', 'tell', 'get', 'details', 'info', 'view'],
      variations: ['my team', 'workers', 'team members', 'all employees']
    },
    warehouse: {
      keywords: ['warehouse', 'storage', 'location', 'depot', 'facility'],
      actions: ['where', 'show', 'tell', 'location', 'address', 'find'],
      variations: ['where is', 'find warehouse', 'warehouse location']
    },
    category: {
      keywords: ['category', 'categories', 'type', 'group', 'classification'],
      actions: ['show', 'list', 'see', 'all', 'view', 'get'],
      variations: ['all categories', 'product types', 'categories list']
    },
    supplier: {
      keywords: ['supplier', 'vendor', 'seller', 'supply', 'procurement'],
      actions: ['show', 'tell', 'pending', 'check', 'view', 'list'],
      variations: ['supplier order', 'purchase order']
    },
    salary: {
      keywords: ['salary', 'payment', 'pay', 'wage', 'compensation', 'payroll'],
      actions: ['show', 'check', 'my', 'view', 'history'],
      variations: ['my salary', 'salary history', 'pay slip']
    },
    revenue: {
      keywords: ['revenue', 'income', 'earning', 'sales', 'profit', 'money', 'financial'],
      actions: ['show', 'total', 'how much', 'check'],
      variations: ['total sales', 'revenue report', 'income summary']
    },
    help: {
      keywords: ['help', 'what can', 'capability', 'feature', 'command', 'guide'],
      actions: ['do', 'help', 'can', 'show'],
      variations: ['what can you do', 'how to use', 'commands']
    }
  };

  for (const [intent, data] of Object.entries(intents)) {
    const hasKeyword = data.keywords.some(kw => message.includes(kw));
    const hasAction = data.actions.some(act => message.includes(act));

    if (hasKeyword) {
      const hasContext = hasAction || data.variations.some(v => message.includes(v));
      if (hasContext) return intent;
    }
  }

  return 'general';
};

/**
 * Extract query parameters
 */
const extractQueryParameters = (userMessage) => {
  const message = userMessage.toLowerCase();
  return {
    searchTerm: extractSearchTerm(message),
    timeFrame: extractTimeFrame(message),
    status: extractStatus(message)
  };
};

const extractSearchTerm = (message) => {
  const patterns = [
    /(?:product|item|order)?\s+(?:named|called|for|about|of)?\s+["']?([^"'.!?]+?)["']?(?:\s|$|\.)/i,
    /["']([^"']+)["']/,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) return match[1].trim();
  }
  return null;
};

const extractTimeFrame = (message) => {
  if (message.includes('today')) return 'today';
  if (message.includes('week')) return 'week';
  if (message.includes('month')) return 'month';
  if (message.includes('year')) return 'year';
  return 'all';
};

const extractStatus = (message) => {
  if (message.includes('pending')) return 'pending';
  if (message.includes('delivered') || message.includes('complete')) return 'delivered';
  if (message.includes('processing')) return 'processing';
  return null;
};

/**
 * Generate response with intelligent analysis (fallback when Groq is unavailable)
 */
const generateIntelligentResponse = async (userMessage, role, context, userId) => {
  try {
    // Check for specific entity queries first
    const entityResponse = await handleSpecificEntityQuery(userMessage, role, userId);
    if (entityResponse) return entityResponse;

    // Fetch context if needed
    if (!context || Object.keys(context).length === 0) {
      context = await getContextForRole(userId, role);
    }

    // Use enhanced response system
    return generateEnhancedResponse(userMessage, role, context);
  } catch (error) {
    return `Something went wrong. Please try again or type **help** for assistance.`;
  }
};

// Backward compatibility exports
const convertToListFormat = (text) => {
  if (!text) return text;
  if (text.includes('\n•') || text.includes('\n-') || text.includes('\n✅') || text.includes('\n1.')) {
    return text;
  }
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  if (sentences.length > 1) {
    return sentences.map(s => `• ${s.replace(/^[0-9]+\.\s*/, '').trim()}`).join('\n');
  }
  return text;
};

const formatResponseAsList = (title, items, format = 'simple') => {
  if (!items || items.length === 0) {
    return `**${title}**\n\nNo information found.`;
  }
  let response = `**${title}**\n\n`;
  items.forEach((item, index) => {
    const label = item.name || item.label || item;
    response += `${index + 1}. ${label}\n`;
  });
  return response;
};

module.exports = {
  getContextForRole,
  generateSystemPrompt,
  formatContextForAI,
  generateAIResponse,
  analyzeUserIntent,
  extractQueryParameters,
  formatResponseAsList,
  generateIntelligentResponse,
  convertToListFormat
};
