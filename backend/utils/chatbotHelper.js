const mongoose = require('mongoose');
const Product = require('../models/Products');
const CustomerOrders = require('../models/CustomerOrders');
const Warehouse = require('../models/Warehouse');
const Supplier = require('../models/Supplier');
const Employee = require('../models/Employee');
const BusinessOwner = require('../models/BusinessOwner');
const ChatHistory = require('../models/ChatHistory');
const chatbotCache = require('./chatbotCache');
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

const addToConversationHistory = async (userId, role, content) => {
  if (!conversationHistory.has(userId)) {
    conversationHistory.set(userId, []);
  }
  const history = conversationHistory.get(userId);
  history.push({ role, content, timestamp: Date.now() });
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
  
  // Save to database for persistence
  try {
    await ChatHistory.create({
      user: userId,
      role: role === 'user' ? 'user' : 'assistant',
      message: content,
      sender: role,
      timestamp: new Date()
    });
  } catch (e) { /* Ignore DB errors */ }
  
  // Clean up conversations older than 1 hour
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  conversationHistory.forEach((val, key) => {
    if (val.length > 0 && val[val.length - 1].timestamp < oneHourAgo) {
      conversationHistory.delete(key);
    }
  });
};

// Start cache cleanup on module load
chatbotCache.startCleanup();

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
 * OPTIMIZED: Uses aggregation pipelines and caching
 */
const getContextForRole = async (userId, role) => {
  try {
    let context = {};
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return context;

    // Check cache first
    const cached = chatbotCache.get(userId, role);
    if (cached) return cached;

    if (role === 'businessowner') {
      // Use single aggregation pipeline for most data
      const [stats, products, orders, warehouses, suppliers, employees, lowStock] = await Promise.all([
        // Get all counts and revenue in one aggregation
        CustomerOrders.aggregate([
          { $match: { businessowner: toObjectId(userId) } },
          {
            $facet: {
              stats: [
                {
                  $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$amount' },
                    avgOrderValue: { $avg: '$amount' }
                  }
                }
              ],
              byStatus: [
                {
                  $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                  }
                }
              ],
              topProducts: [
                {
                  $group: {
                    _id: '$pName',
                    totalSold: { $sum: 1 },
                    totalRevenue: { $sum: '$amount' }
                  }
                },
                { $sort: { totalSold: -1 } },
                { $limit: 5 }
              ],
              recentOrders: [
                { $sort: { oDate: -1 } },
                { $limit: 8 },
                { $project: { cName: 1, pName: 1, amount: 1, oDate: 1, status: 1, dStatus: 1, products: 1 } }
              ]
            }
          }
        ]),
        Product.countDocuments({ businessowner: userId }),
        Warehouse.countDocuments({ businessowner: userId }),
        Supplier.countDocuments({ businessowner: userId }),
        Employee.find({ businessowner: userId }).select('fname lname email phone hireAt jDate role salary').limit(15),
        Product.find({ businessowner: userId, totalProducts: { $lt: 10 } }).select('name totalProducts category price').limit(10)
      ]);

      // Extract aggregation results
      context.products = products;
      context.warehouses = warehouses;
      context.suppliers = suppliers;
      context.employeesList = employees;
      context.lowStockProducts = lowStock;

      if (stats[0]?.stats?.length > 0) {
        const orderStats = stats[0].stats[0];
        context.totalOrders = orderStats.totalOrders;
        context.totalRevenue = orderStats.totalRevenue;
        context.avgOrderValue = Math.round(orderStats.avgOrderValue * 100) / 100;
        
        // Count pending and completed from byStatus
        context.pendingOrders = stats[0].byStatus.find(s => s._id === 'Pending')?.count || 0;
        context.completedOrders = stats[0].byStatus.find(s => s._id === 'Delivered')?.count || 0;
        context.orderStatusBreakdown = stats[0].byStatus;
        context.topProducts = stats[0].topProducts;
        context.recentOrders = stats[0].recentOrders;
      }

      // Get salary and supplier order stats
      try {
        const [salaryData, supplierOrderStats] = await Promise.all([
          SalaryPayment.aggregate([
            { $match: { businessowner: toObjectId(userId) } },
            {
              $facet: {
                stats: [
                  {
                    $group: {
                      _id: null,
                      totalPaid: { $sum: '$amount' },
                      paymentCount: { $sum: 1 }
                    }
                  }
                ],
                recent: [
                  { $sort: { paymentDate: -1 } },
                  { $limit: 5 },
                  {
                    $lookup: {
                      from: 'employees',
                      localField: 'employee',
                      foreignField: '_id',
                      as: 'employee'
                    }
                  },
                  { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
                  { $project: { amount: 1, paymentDate: 1, status: 1, 'employee.fname': 1, 'employee.lname': 1 } }
                ]
              }
            }
          ]),
          SupplierOrders.aggregate([
            { $match: { businessowner: toObjectId(userId) } },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalValue: { $sum: { $multiply: ['$ounits', '$amount'] } }
              }
            }
          ])
        ]);

        if (salaryData[0]?.stats?.length > 0) {
          context.totalSalaryPaid = salaryData[0].stats[0].totalPaid;
          context.salaryPaymentCount = salaryData[0].stats[0].paymentCount;
          context.recentSalaryPayments = salaryData[0].recent;
        }
        context.supplierOrderStats = supplierOrderStats;
      } catch (e) { /* salary model may not exist */ }

    } else if (role === 'employee') {
      const boId = await resolveBusinessOwnerId(userId, role);
      const scopeFilter = boId ? { businessowner: boId } : { employee: userId };

      // Use aggregations for employee data
      const [orderStats, products, lowStock, employee] = await Promise.all([
        CustomerOrders.aggregate([
          { $match: scopeFilter },
          {
            $facet: {
              counts: [
                {
                  $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    assignedOrders: {
                      $sum: { $cond: [{ $eq: ['$employee', toObjectId(userId)] }, 1, 0] }
                    }
                  }
                }
              ],
              byStatus: [
                {
                  $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                  }
                }
              ],
              urgent: [
                {
                  $match: {
                    status: { $in: ['Pending', 'Processing'] },
                    dDate: { $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), $gte: new Date() }
                  }
                },
                { $limit: 5 },
                { $project: { pName: 1, cName: 1, dDate: 1, status: 1, products: 1 } }
              ],
              overdue: [
                {
                  $match: {
                    status: { $in: ['Pending', 'Processing'] },
                    dDate: { $lt: new Date() }
                  }
                },
                { $limit: 5 },
                { $project: { pName: 1, cName: 1, dDate: 1, products: 1 } }
              ],
              recent: [
                { $sort: { oDate: -1 } },
                { $limit: 8 },
                { $project: { pName: 1, cName: 1, status: 1, dStatus: 1, oDate: 1, dDate: 1, amount: 1, products: 1 } }
              ]
            }
          }
        ]),
        Product.countDocuments(scopeFilter),
        Product.find({ ...scopeFilter, totalProducts: { $lt: 10 } }).select('name totalProducts category price').limit(10),
        Employee.findById(userId).select('fname lname role jDate salary businessowner')
      ]);

      if (orderStats[0]) {
        if (orderStats[0].counts?.length > 0) {
          const counts = orderStats[0].counts[0];
          context.totalOrders = counts.totalOrders;
          context.assignedOrders = await CustomerOrders.countDocuments({ employee: userId, ...scopeFilter });
        }
        context.pendingTasks = orderStats[0].byStatus.find(s => s._id === 'Pending')?.count || 0;
        context.completedTasks = orderStats[0].byStatus.find(s => s._id === 'Delivered')?.count || 0;
        context.urgentOrders = orderStats[0].urgent;
        context.overdueOrders = orderStats[0].overdue;
        context.assignedOrdersList = orderStats[0].recent;
      }

      context.totalProducts = products;
      context.assignedProducts = await Product.countDocuments({ employee: userId });
      context.lowStockProducts = lowStock;

      if (employee) {
        context.employeeName = `${employee.fname} ${employee.lname || ''}`.trim();
        context.employeeRole = employee.role || 'employee';
        context.joinDate = employee.jDate;
        context.businessOwnerId = employee.businessowner;
      }

      // Get salary payments
      try {
        const SalaryPayment = require('../models/SalaryPayment');
        context.mySalaryPayments = await SalaryPayment.find({ employee: userId }).sort({ paymentDate: -1 }).limit(5);
      } catch (e) { /* ignore */ }

    } else if (role === 'supplier') {
      const SupplierOrders = require('../models/SupplierOrders');
      const [stats, supplier] = await Promise.all([
        SupplierOrders.aggregate([
          { $match: { supplier: toObjectId(userId) } },
          {
            $facet: {
              counts: [
                {
                  $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    pendingOrders: {
                      $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
                    },
                    deliveredOrders: {
                      $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] }
                    },
                    cancelledOrders: {
                      $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] }
                    },
                    totalValue: { $sum: { $multiply: ['$ounits', '$amount'] } }
                  }
                }
              ],
              recent: [
                { $sort: { oDate: -1 } },
                { $limit: 8 },
                { $project: { pName: 1, ounits: 1, amount: 1, status: 1, oDate: 1, dDate: 1 } }
              ]
            }
          }
        ]),
        Supplier.findById(userId).select('fname lname email phone companyName')
      ]);

      if (stats[0]?.counts?.length > 0) {
        const counts = stats[0].counts[0];
        context.totalOrders = counts.totalOrders;
        context.pendingOrders = counts.pendingOrders;
        context.deliveredOrders = counts.deliveredOrders;
        context.cancelledOrders = counts.cancelledOrders;
        context.totalOrderValue = counts.totalValue;
      }
      context.recentSupplierOrders = stats[0]?.recent || [];

      if (supplier) {
        context.supplierName = `${supplier.fname} ${supplier.lname || ''}`.trim();
        context.supplierCompany = supplier.companyName;
      }
    }

    // Cache the result
    chatbotCache.set(userId, role, context);
    return context;
  } catch (error) {
    console.error('Error in getContextForRole:', error);
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
- Total Revenue: ₹${context.totalRevenue || 0}
- Average Order Value: ₹${context.avgOrderValue || 0}`;

    if (context.orderStatusBreakdown?.length) {
      formattedContext += `\n\nORDER STATUS BREAKDOWN:`;
      context.orderStatusBreakdown.forEach(s => {
        formattedContext += `\n- ${s._id}: ${s.count} orders`;
      });
    }

    if (context.topProducts?.length) {
      formattedContext += `\n\nTOP SELLING PRODUCTS:`;
      context.topProducts.forEach((p, i) => {
        formattedContext += `\n${i + 1}. ${p._id} — ${p.totalSold} orders, ₹${p.totalRevenue} revenue`;
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
        formattedContext += `\n- ${p.name} (${p.category}) — ${p.totalProducts} units left, Price: ₹${p.price}`;
      });
    }

    if (context.recentOrders?.length) {
      formattedContext += `\n\nRECENT ORDERS:`;
      context.recentOrders.forEach(o => {
        const productName = o.pName || (o.products && o.products.length > 0 ? o.products.map(p => p.productName).join(', ') : 'N/A');
        formattedContext += `\n- ${o.cName} -> ${productName} — ₹${o.amount} (${o.status})`;
      });
    }

    if (context.totalSalaryPaid) {
      formattedContext += `\n\nSALARY DATA:`;
      formattedContext += `\n- Total Salary Paid: ₹${context.totalSalaryPaid}`;
      formattedContext += `\n- Payments Made: ${context.salaryPaymentCount}`;
    }

    if (context.supplierOrderStats?.length) {
      formattedContext += `\n\nSUPPLIER ORDER SUMMARY:`;
      context.supplierOrderStats.forEach(s => {
        formattedContext += `\n- ${s._id}: ${s.count} orders (Value: ₹${s.totalValue || 0})`;
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
        formattedContext += `\n- ${productName} for ${o.cName} — ${o.status} | ₹${o.amount}`;
      });
    }

    if (context.mySalaryPayments?.length) {
      formattedContext += `\n\nRECENT SALARY PAYMENTS:`;
      context.mySalaryPayments.forEach(p => {
        formattedContext += `\n- ₹${p.amount} on ${new Date(p.paymentDate).toLocaleDateString()} (${p.status})`;
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
- Total Order Value: ₹${context.totalOrderValue || 0}`;

    if (context.recentSupplierOrders?.length) {
      formattedContext += `\n\nRECENT ORDERS:`;
      context.recentSupplierOrders.forEach(o => {
        formattedContext += `\n- ${o.pName} — Qty: ${o.ounits}, ₹${o.amount}/unit (${o.status})`;
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

    // Prioritize specific entity/product queries before generic coaching/model responses.
    const entityResponse = await handleSpecificEntityQuery(userMessage, role, userId, context);
    if (entityResponse) {
      addToConversationHistory(userId, 'assistant', entityResponse);
      return entityResponse;
    }

    // Prioritize channel-specific marketing advice for business owners.
    const normalizedMessage = (userMessage || '').toLowerCase().trim();
    if (role === 'businessowner' && isChannelMarketingQuery(normalizedMessage)) {
      const channelResponse = getChannelMarketingResponse(context || {}, normalizedMessage);
      addToConversationHistory(userId, 'assistant', channelResponse);
      return channelResponse;
    }

    // Prioritize general marketing advice for business owners.
    if (role === 'businessowner' && isMarketingIdeasQuery(normalizedMessage)) {
      const marketingResponse = getMarketingIdeasResponse(context || {}, normalizedMessage);
      addToConversationHistory(userId, 'assistant', marketingResponse);
      return marketingResponse;
    }

    // Always prioritize targeted business coaching for business owners.
    if (role === 'businessowner' && isBusinessImprovementQuery(normalizedMessage)) {
      const coachingResponse = getBusinessImprovementResponse(context || {}, normalizedMessage);
      addToConversationHistory(userId, 'assistant', coachingResponse);
      return coachingResponse;
    }

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
const handleSpecificEntityQuery = async (userMessage, role, userId, context = {}) => {
  const message = userMessage.toLowerCase().trim();

  // Resolve the business owner ID for data scoping
  const boId = await resolveBusinessOwnerId(userId, role);
  const dataOwnerId = boId || userId;

  // Detect marketing idea queries before broader sales-idea routing.
  if (role === 'businessowner' && isMarketingIdeasQuery(message)) {
    const marketingContext = Object.keys(context || {}).length > 0 ? context : await getContextForRole(userId, role);
    return getMarketingIdeasResponse(marketingContext, message);
  }

  // Detect business-problem queries before broader sales-idea routing.
  if (role === 'businessowner' && isBusinessImprovementQuery(message)) {
    const improvementContext = Object.keys(context || {}).length > 0 ? context : await getContextForRole(userId, role);
    return getBusinessImprovementResponse(improvementContext, message);
  }

  // Detect channel-specific marketing queries before broader sales-idea routing.
  if (role === 'businessowner' && isChannelMarketingQuery(message)) {
    const channelContext = Object.keys(context || {}).length > 0 ? context : await getContextForRole(userId, role);
    return getChannelMarketingResponse(channelContext, message);
  }

  // Detect sales/promotion idea queries before generic entity lookups.
  const salesIdeaKeywords = /\b(sales?|sell|promotion|promote|marketing|campaign|ideas?|strategy|boost|increase)\b/;
  const salesIdeaQuery = role === 'businessowner' && salesIdeaKeywords.test(message);

  if (salesIdeaQuery) {
    const { term: salesTerm, type: salesType } = extractSalesIdeaTarget(userMessage);

    if (salesTerm) {
      const matchedProducts = await searchProducts(salesTerm, dataOwnerId, 10);

      if (matchedProducts.length > 0) {
        const bestProduct = findBestProductMatch(matchedProducts, salesTerm) || matchedProducts[0];

        if (salesType === 'category' || matchedProducts.length > 1) {
          return formatCategorySalesIdeasResponse(salesTerm, matchedProducts);
        }

        return formatProductSalesIdeasResponse(bestProduct);
      }

      if (salesType === 'category') {
        return formatGenericCategorySalesIdeasResponse(salesTerm);
      }

      return formatGenericProductSalesIdeasResponse(salesTerm);
    }

    return `📈 **BUSINESS SALES IDEAS**\n\nTell me which product or category you want to improve, for example:\n• Sales ideas for Product1\n• Sales ideas for Category1 products\n• How can I boost revenue for my top products?`;
  }

  // Detect product-specific queries (high priority over generic dashboard/overview)
  const isProductQuery = (message.includes('product') || message.includes('item')) &&
    (message.includes('tell') ||
      message.includes('show') ||
      message.includes('detail') ||
      message.includes('info') ||
      message.includes('about') ||
      message.includes('search') ||
      message.includes('stock') ||
      message.includes('availability') ||
      message.includes('price') ||
      message.includes('overview') ||
      message.includes('status'));

  if (isProductQuery) {
    const productName = extractProductSearchTerm(userMessage);

    if (productName && (role === 'businessowner' || role === 'employee')) {
      const products = await searchProducts(productName, dataOwnerId, 10);
      if (products.length > 0) {
        const bestProduct = findBestProductMatch(products, productName);
        // If user asks singular details, prefer concise single-product response
        if (!message.includes('all products') && !message.includes('list products')) {
          return formatSingleProductDetailsResponse(bestProduct || products[0]);
        }
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
 * Normalize extracted search term by removing intent filler words
 */
const sanitizeSearchTerm = (raw) => {
  if (!raw) return null;

  let term = raw
    .replace(/[\n\r\t]/g, ' ')
    .replace(/["'`]+/g, '')
    .replace(/[.,!?;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove trailing/leading helper words that are not entity names
  term = term
    .replace(/\b(details?|detail|info|information|overview|status|stock|stocks|products?|items?)\b\s*$/i, '')
    .replace(/^\b(the|a|an|my|our)\b\s+/i, '')
    .trim();

  return term || null;
};

/**
 * Extract product search term from natural language queries
 */
const extractProductSearchTerm = (userMessage) => {
  if (!userMessage) return null;

  const patterns = [
    // quoted product/item name
    /\b(?:product|products|item|items)\b\s*(?:named|called)?\s*["']([^"']+)["']/i,
    // "overview/details on X products"
    /\b(?:overview|details?|info|status|stock|stocks)\b\s+(?:on|for|of|about)\s+([a-z0-9][a-z0-9\s_-]*?)\s+\b(?:products?|items?)\b/i,
    // "X products details"
    /\b([a-z0-9][a-z0-9\s_-]*?)\s+\b(?:products?|items?)\b\s+\b(?:details?|info|status|stock|stocks|overview)\b/i,
    // "product X" or "item X"
    /\b(?:product|products|item|items)\b\s+(?:named|called|for|about|of)?\s*([a-z0-9][a-z0-9\s_-]*)/i,
    // compact product number mention like product1
    /\b(product\s*\d+)\b/i
  ];

  for (const pattern of patterns) {
    const match = userMessage.match(pattern);
    if (match && match[1]) {
      const cleaned = sanitizeSearchTerm(match[1]);
      if (cleaned) return cleaned;
    }
  }

  return null;
};

/**
 * Pick best matching product from search result
 */
const findBestProductMatch = (products, searchTerm) => {
  if (!products?.length) return null;
  const normalize = (v) => (v || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
  const term = normalize(searchTerm);

  const exact = products.find((p) => normalize(p.name) === term);
  if (exact) return exact;

  const startsWith = products.find((p) => normalize(p.name).startsWith(term));
  if (startsWith) return startsWith;

  const contains = products.find((p) => normalize(p.name).includes(term));
  if (contains) return contains;

  return products[0];
};

/**
 * Salary response for business owner
 */
const getSalaryResponse = (context) => {
  let response = `**SALARY & PAYMENTS OVERVIEW:**\n\n`;

  if (context.totalSalaryPaid) {
    response += `• Total Salary Paid: **₹${context.totalSalaryPaid.toLocaleString()}**\n`;
    response += `• Payment Transactions: **${context.salaryPaymentCount}**\n\n`;
  } else {
    response += `• No salary payments recorded yet.\n\n`;
  }

  if (context.recentSalaryPayments?.length) {
    response += `**Recent Payments:**\n`;
    context.recentSalaryPayments.forEach((p, i) => {
      const empName = p.employee ? `${p.employee.fname} ${p.employee.lname || ''}`.trim() : 'Unknown';
      response += `${i + 1}. **${empName}** — ₹${p.amount} on ${new Date(p.paymentDate).toLocaleDateString()} (${p.status})\n`;
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
      response += `${i + 1}. **₹${p.amount}** — ${new Date(p.paymentDate).toLocaleDateString()}\n`;
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
    response += `   • Price: ₹${details.price}\n`;
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
 * Format a single product response for specific-product questions
 */
const formatSingleProductDetailsResponse = (product) => {
  if (!product) return null;
  const details = getProductDetails(product);

  let response = `📦 **${details.name}**\n\n`;
  response += `• Category: **${details.category}**\n`;
  response += `• Stock: **${details.stock} units** ${details.stock < 10 ? '⚠️ Low Stock' : '✅ In Stock'}\n`;
  response += `• Price: **₹${details.price}**\n`;
  response += `• Brand: **${details.brand || 'N/A'}**\n`;
  response += `• Warehouses: **${details.warehouses.join(', ')}**\n`;

  if (details.description !== 'No description available') {
    response += `• Description: ${details.description}\n`;
  }

  return response;
};

/**
 * Generate practical sales ideas for a specific product
 */
const formatProductSalesIdeasResponse = (product) => {
  if (!product) return null;

  const details = getProductDetails(product);
  const stock = Number(details.stock || 0);
  const price = Number(details.price || 0);
  const lowStock = stock > 0 && stock < 10;

  let response = `🚀 **SALES IDEAS FOR ${details.name.toUpperCase()}**\n\n`;
  response += `**Product Snapshot:**\n`;
  response += `• Price: **₹${price}**\n`;
  response += `• Stock: **${stock} units** ${lowStock ? '⚠️ Low' : '✅'}\n`;
  response += `• Category: **${details.category}**\n\n`;

  response += `**Action Plan:**\n`;
  response += `1. Run a limited-time offer (5-10% discount) to create urgency.\n`;
  response += `2. Bundle ${details.name} with a complementary product to increase order value.\n`;
  response += `3. Highlight benefits in WhatsApp/Instagram posts with real usage examples.\n`;
  response += `4. Offer repeat-customer incentive (coupon on next order).\n`;

  if (stock > 0) {
    const targetDaily = Math.max(1, Math.ceil(stock / 14));
    response += `5. Set a 14-day target: sell **${targetDaily} units/day** to clear current stock.\n`;
  }

  response += `\n**Track Weekly:**\n`;
  response += `• Conversion rate from product views to orders\n`;
  response += `• Discount campaign ROI\n`;
  response += `• Repeat purchase % for this product\n`;

  return response;
};

/**
 * Generate sales ideas for a category using products in that category
 */
const formatCategorySalesIdeasResponse = (categoryTerm, products) => {
  const categoryName = String(categoryTerm || 'this category').trim();
  const topProducts = (products || []).slice(0, 3).map((p) => getProductDetails(p).name);
  const lowStockProducts = (products || []).filter((p) => Number(getProductDetails(p).stock || 0) < 10);

  let response = `📈 **SALES IDEAS FOR ${categoryName.toUpperCase()}**\n\n`;
  response += `**Category Focus:**\n`;
  response += `• Products found: **${products?.length || 0}**\n`;
  if (topProducts.length > 0) {
    response += `• Example products: **${topProducts.join(', ')}**\n`;
  }
  response += `\n**Action Plan:**\n`;
  response += `1. Promote the best-selling item from this category as the hero product.\n`;
  response += `2. Bundle slower items with the best-seller to move more stock.\n`;
  response += `3. Create category-level ads/posts with a single message and one CTA.\n`;
  response += `4. Offer a limited-time category discount to increase conversion.\n`;
  response += `5. Track category conversion, repeat purchase rate, and stock movement weekly.\n`;

  if (lowStockProducts.length > 0) {
    response += `\n⚠️ **Low stock items in this category:**\n`;
    lowStockProducts.slice(0, 5).forEach((p, idx) => {
      const details = getProductDetails(p);
      response += `${idx + 1}. ${details.name} — ${details.stock} units\n`;
    });
    response += `\nConsider restocking these items before running promotions.\n`;
  }

  return response;
};

/**
 * Fallback category sales ideas when category match is not exact
 */
const formatGenericCategorySalesIdeasResponse = (categoryTerm) => {
  const label = String(categoryTerm || 'this category').trim();
  return `📈 **SALES IDEAS FOR ${label.toUpperCase()}**\n\nI could not match the category exactly, but here is a practical category-level plan:\n\n1. Pick one hero product from the category and promote it heavily.\n2. Bundle related items together to raise order value.\n3. Run a category discount for 3-5 days to drive urgency.\n4. Use social posts and WhatsApp messages focused on one use-case.\n5. Review which item moves fastest and keep more stock for it.\n\n💡 If you send the exact category name, I can make this more specific.`;
};

/**
 * Fallback suggestions when product name is unclear/not found
 */
const formatGenericProductSalesIdeasResponse = (productTerm) => {
  let response = `🚀 **SALES IDEAS FOR ${String(productTerm || 'THIS PRODUCT').toUpperCase()}**\n\n`;
  response += `I could not match the exact product in your inventory, but here is a practical plan you can apply immediately:\n\n`;
  response += `1. Offer a time-bound promo (5-10% off) for first-time buyers.\n`;
  response += `2. Create a combo with a related product to increase order value.\n`;
  response += `3. Post short benefit-focused content (before/after, use-cases, testimonials).\n`;
  response += `4. Run repeat-customer coupon campaign (next purchase incentive).\n`;
  response += `5. Track weekly: inquiries, conversion rate, repeat sales, and promo ROI.\n`;
  response += `\n💡 Tip: Ask with exact name, e.g. "sales ideas for product <exact-name>", and I will give product-specific tactics.`;
  return response;
};

/**
 * Extract the target entity and type for sales-idea queries
 */
const extractSalesIdeaTarget = (userMessage) => {
  if (!userMessage) return { term: null, type: null };

  const text = userMessage.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();

  const categoryPatterns = [
    /(?:sales?|sell|promotion|promote|marketing|campaign|ideas?|strategy|boost|increase)\s+(?:ideas?\s+)?(?:for|about|on)\s+([a-z0-9][a-z0-9\s_-]*?)\s+(?:products?|items?|category|categories)\b/i,
    /(?:for|about|on)\s+([a-z0-9][a-z0-9\s_-]*?)\s+(?:products?|items?)\b/i,
    /\b([a-z0-9][a-z0-9\s_-]*?)\s+(?:products?|items?)\b/i,
  ];

  for (const pattern of categoryPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const term = sanitizeSearchTerm(match[1]);
      if (term) {
        const lower = term.toLowerCase();
        if (/\b(category|categories)\b/i.test(text) || lower.includes('category')) {
          return { term, type: 'category' };
        }
        return { term, type: 'product' };
      }
    }
  }

  const productMatch = text.match(/\b(product\s*\d+|product|item|items)\b\s*(?:named|called|for|about|of)?\s*([a-z0-9][a-z0-9\s_-]*)/i);
  if (productMatch?.[2]) {
    const term = sanitizeSearchTerm(productMatch[2]);
    if (term) return { term, type: 'product' };
  }

  return { term: null, type: null };
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

    const normalizedMessage = (userMessage || '').toLowerCase().trim();

    // Keep channel-specific marketing advice deterministic for business owners.
    if (role === 'businessowner' && isChannelMarketingQuery(normalizedMessage)) {
      return getChannelMarketingResponse(context || {}, normalizedMessage);
    }

    // Keep marketing advice deterministic for business owners.
    if (role === 'businessowner' && isMarketingIdeasQuery(normalizedMessage)) {
      return getMarketingIdeasResponse(context || {}, normalizedMessage);
    }

    // Keep advisory responses deterministic for business improvement questions.
    if (role === 'businessowner' && isBusinessImprovementQuery(normalizedMessage)) {
      return getBusinessImprovementResponse(context || {}, normalizedMessage);
    }

    // First check for specific entity queries that need DB lookups
    const entityResponse = await handleSpecificEntityQuery(userMessage, role, userId, context);
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
const searchProducts = async (productName, businessownerId, limit = 5) => {
  try {
    const escapedName = productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const Category = require('../models/Category');
    const matchedCategories = await Category.find({
      businessowner: businessownerId,
      cName: { $regex: escapedName, $options: 'i' }
    }).select('_id cName').lean();

    const categoryIds = matchedCategories.map((c) => c._id.toString());
    const categoryNames = matchedCategories.map((c) => c.cName).filter(Boolean);

    const categoryFilter = [];
    if (categoryIds.length > 0) {
      categoryFilter.push({ category: { $in: categoryIds } });
    }
    if (categoryNames.length > 0) {
      categoryFilter.push({ category: { $in: categoryNames } });
    }

    const products = await Product.find({
      businessowner: businessownerId,
      $or: [
        { name: { $regex: escapedName, $options: 'i' } },
        { desc: { $regex: escapedName, $options: 'i' } },
        { brand: { $regex: escapedName, $options: 'i' } },
        { category: { $regex: escapedName, $options: 'i' } },
        ...categoryFilter
      ]
    }).select('name category price totalProducts brand mDate eDate desc warehouse').limit(limit);

    // Resolve category and warehouse names for display
    if (products.length > 0) {
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
    amount: `₹${order.amount}`,
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

  // Prioritize channel-specific marketing coaching for business owners
  if (role === 'businessowner' && isChannelMarketingQuery(message)) {
    return getChannelMarketingResponse(context, message);
  }

  // Prioritize marketing coaching for business owners
  if (role === 'businessowner' && isMarketingIdeasQuery(message)) {
    return getMarketingIdeasResponse(context, message);
  }

  // Prioritize business improvement coaching for business owners
  if (role === 'businessowner' && isBusinessImprovementQuery(message)) {
    return getBusinessImprovementResponse(context, message);
  }

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
    business_growth: ['improve business', 'grow business', 'increase sales', 'improve revenue', 'business problem', 'business issue', 'need suggestion', 'suggestion for business', 'how to improve'],
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
    case 'business_growth':
      return role === 'businessowner'
        ? getBusinessImprovementResponse(context, message)
        : `Business growth suggestions are available for business owners. I can still help you with your role-specific tasks.`;
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

const isBusinessImprovementQuery = (message) => {
  const strategyKeywords = [
    'improve', 'increase', 'grow', 'boost', 'optimize', 'suggest', 'advice',
    'strategy', 'problem', 'issue', 'help', 'fix', 'plan', 'solution',
    'idea', 'ideas', 'sell', 'marketing', 'promotion',
    'what should i do', 'what to do', 'how to improve', 'how can i improve'
  ];
  const businessKeywords = ['business', 'sales', 'revenue', 'orders', 'stock', 'inventory', 'customer', 'profit', 'team', 'supplier'];
  const issueSignals = ['low', 'down', 'dropped', 'drop', 'decline', 'decreasing', 'stuck', 'not improving', 'poor'];

  const hasBusinessKeyword = businessKeywords.some((kw) => message.includes(kw));
  const hasStrategyKeyword = strategyKeywords.some((kw) => message.includes(kw));
  const hasIssueSignal = issueSignals.some((kw) => message.includes(kw));

  // Trigger if query is clearly business + strategy OR business + problem language.
  return hasBusinessKeyword && (hasStrategyKeyword || hasIssueSignal);
};

const isMarketingIdeasQuery = (message) => {
  const marketingKeywords = ['marketing', 'market', 'advertise', 'advertising', 'promotion', 'promote', 'campaign', 'brand', 'branding', 'reach', 'awareness', 'social media', 'ads', 'offer', 'referral'];
  const ideaKeywords = ['idea', 'ideas', 'strategy', 'strategies', 'suggest', 'suggestion', 'how to', 'what should', 'what can'];
  const businessKeywords = ['business', 'sales', 'customers', 'customer', 'product', 'products', 'store', 'shop', 'brand', 'revenue'];

  const hasMarketingKeyword = marketingKeywords.some((kw) => message.includes(kw));
  const hasIdeaKeyword = ideaKeywords.some((kw) => message.includes(kw));
  const hasBusinessKeyword = businessKeywords.some((kw) => message.includes(kw));

  return hasMarketingKeyword && (hasIdeaKeyword || hasBusinessKeyword);
};

const isChannelMarketingQuery = (message) => {
  const channelKeywords = ['instagram', 'whatsapp', 'facebook', 'social', 'offline', 'local', 'paid ads', 'google ads', 'ads', 'email'];
  const ideaKeywords = ['idea', 'ideas', 'strategy', 'strategies', 'suggest', 'suggestion', 'how to', 'what should', 'what can'];
  return channelKeywords.some((kw) => message.includes(kw)) && ideaKeywords.some((kw) => message.includes(kw));
};

const getChannelMarketingResponse = (context, message = '') => {
  const totalProducts = context.products || context.totalProducts || 0;
  const topProducts = context.topProducts || [];

  const channel =
    message.includes('instagram') ? 'Instagram' :
    message.includes('whatsapp') ? 'WhatsApp' :
    message.includes('facebook') ? 'Facebook' :
    message.includes('google ads') || message.includes('paid ads') || message.includes('ads') ? 'Paid Ads' :
    message.includes('offline') || message.includes('local') ? 'Offline' :
    'Marketing';

  let response = `📣 **${channel.toUpperCase()} IDEAS FOR YOUR BUSINESS**\n\n`;
  response += `**Quick Context:**\n`;
  response += `• Products: **${totalProducts}**\n`;
  if (topProducts.length > 0) {
    response += `• Best sellers: **${topProducts.slice(0, 3).map((p) => p._id).join(', ')}**\n`;
  }

  if (channel === 'Instagram') {
    response += `\n**Instagram Ideas:**\n`;
    response += `1. Post short reels showing product benefits or before/after results.\n`;
    response += `2. Use story polls and countdowns for new offers.\n`;
    response += `3. Share customer testimonials as carousel posts.\n`;
    response += `4. Use a consistent visual theme with one CTA per post.\n`;
    response += `5. Pin your best-selling products and promote them in highlights.\n`;
  } else if (channel === 'WhatsApp') {
    response += `\n**WhatsApp Ideas:**\n`;
    response += `1. Send weekly broadcast offers with one clear CTA.\n`;
    response += `2. Share product photos with short benefit-driven captions.\n`;
    response += `3. Use status updates for new stock, offers, and social proof.\n`;
    response += `4. Create a referral message to encourage sharing.\n`;
    response += `5. Follow up with warm leads after 1-2 days.\n`;
  } else if (channel === 'Facebook') {
    response += `\n**Facebook Ideas:**\n`;
    response += `1. Post offer banners and local community content.\n`;
    response += `2. Share customer reviews and product-use stories.\n`;
    response += `3. Join local groups and share useful updates, not just promotions.\n`;
    response += `4. Boost only the posts that already get good engagement.\n`;
    response += `5. Use local targeting for nearby customers.\n`;
  } else if (channel === 'Paid Ads') {
    response += `\n**Paid Ads Ideas:**\n`;
    response += `1. Start with a small daily budget on your best-selling product.\n`;
    response += `2. Test two creatives: one product image and one short video.\n`;
    response += `3. Retarget people who clicked but didn’t buy.\n`;
    response += `4. Send traffic to one specific product, not your whole dashboard.\n`;
    response += `5. Track cost per lead and conversion rate every week.\n`;
  } else {
    response += `\n**Channel Ideas:**\n`;
    response += `1. Post content regularly with a single call to action.\n`;
    response += `2. Share customer proof and limited-time offers.\n`;
    response += `3. Promote one hero product at a time.\n`;
  }

  response += `\n💡 If you want, I can make this even more specific for product launches, offers, or local growth.`;
  return response;
};

const getMarketingIdeasResponse = (context, message = '') => {
  const totalProducts = context.products || context.totalProducts || 0;
  const totalOrders = context.totalOrders || 0;
  const totalRevenue = context.totalRevenue || 0;
  const topProducts = context.topProducts || [];
  const lowStockCount = context.lowStockProducts?.length || 0;

  const wantsOnline = /online|social|facebook|instagram|whatsapp|digital|ads|google/.test(message);
  const wantsLocal = /local|nearby|shop|store|walk-in|customers/.test(message);
  const wantsOffers = /offer|discount|sale|coupon|deal|promotion/.test(message);

  let response = `📣 **MARKETING IDEAS FOR YOUR BUSINESS**\n\n`;
  response += `**Quick Context:**\n`;
  response += `• Products: **${totalProducts}**\n`;
  response += `• Orders: **${totalOrders}**\n`;
  response += `• Revenue: **₹${Number(totalRevenue || 0).toLocaleString()}**\n`;
  if (lowStockCount > 0) {
    response += `• Low stock items: **${lowStockCount}**\n`;
  }

  response += `\n**High-Impact Marketing Ideas:**\n`;
  response += `1. Post short before/after or use-case content on Instagram, Facebook, and WhatsApp statuses.\n`;
  response += `2. Ask happy customers for reviews and turn them into social proof posts.\n`;
  response += `3. Run a referral offer: give a discount to both the referrer and the new customer.\n`;
  response += `4. Create bundle offers around your best-selling products to increase conversion.\n`;
  response += `5. Send weekly WhatsApp broadcast messages with one clear offer and one CTA.\n`;

  if (wantsOnline || topProducts.length > 0) {
    response += `\n**Online Growth Ideas:**\n`;
    response += `• Promote top-selling items first: ${topProducts.slice(0, 3).map((p) => p._id).join(', ') || 'your best sellers'}\n`;
    response += `• Use 10-15 second videos showing how the product solves a problem.\n`;
    response += `• Test a small paid ad budget on the best-performing product page or post.\n`;
  }

  if (wantsLocal) {
    response += `\n**Local Marketing Ideas:**\n`;
    response += `• Put QR codes on bills, packaging, and shop signage for easy sharing.\n`;
    response += `• Ask repeat customers to share location-tagged posts or stories.\n`;
    response += `• Offer a "buy today / pick up today" deal to increase footfall.\n`;
  }

  if (wantsOffers) {
    response += `\n**Offer Ideas:**\n`;
    response += `• Limited-time 5-10% discount\n`;
    response += `• Buy 2 get 1 style bundle\n`;
    response += `• Free delivery above a threshold\n`;
  }

  response += `\n**Track Weekly:**\n`;
  response += `• Leads / inquiries\n`;
  response += `• Conversion rate\n`;
  response += `• Repeat purchases\n`;
  response += `• ROI of each campaign\n`;

  response += `\n💡 If you want, I can also give ideas for one channel only, like Instagram, WhatsApp, offline, or paid ads.`;
  return response;
};

const getBusinessImprovementResponse = (context, message = '') => {
  const suggestions = [];
  const nextSteps = [];

  const totalOrders = context.totalOrders || 0;
  const pendingOrders = context.pendingOrders || 0;
  const totalRevenue = context.totalRevenue || 0;
  const avgOrderValue = context.avgOrderValue || 0;
  const lowStockCount = context.lowStockProducts?.length || 0;
  const topProducts = context.topProducts || [];

  const pendingRatio = totalOrders > 0 ? pendingOrders / totalOrders : 0;

  const asksSalesHelp = /sales|revenue|profit|income|grow/.test(message);
  const asksStockHelp = /stock|inventory|reorder|out of stock|low stock/.test(message);
  const asksOrderHelp = /order|delivery|pending|shipment/.test(message);
  const asksTeamHelp = /employee|team|staff|worker/.test(message);
  const asksSupplierHelp = /supplier|vendor|procurement/.test(message);

  if (asksSalesHelp || (!asksStockHelp && !asksOrderHelp && !asksTeamHelp && !asksSupplierHelp)) {
    if (topProducts.length > 0) {
      suggestions.push(`Focus promotions on your top products (${topProducts.slice(0, 3).map(p => p._id).join(', ')}) to lift revenue faster.`);
    } else {
      suggestions.push(`Track best-selling products weekly and run focused promotions on your top 3 items.`);
    }

    if (avgOrderValue > 0) {
      const target = Math.round(avgOrderValue * 1.15);
      suggestions.push(`Increase average order value from **₹${Math.round(avgOrderValue)}** to about **₹${target}** using bundles and minimum-order discounts.`);
    } else {
      suggestions.push(`Create bundle offers (fast-moving + slow-moving items) to improve order value.`);
    }

    if (totalRevenue > 0) {
      nextSteps.push(`Set a 30-day revenue target: current **₹${totalRevenue.toLocaleString()}**, target **₹${Math.round(totalRevenue * 1.12).toLocaleString()}** (+12%).`);
    }
  }

  if (asksOrderHelp || pendingRatio > 0.35) {
    suggestions.push(`Reduce pending orders by introducing a daily dispatch cutoff and assigning owner-wise order buckets.`);
    if (totalOrders > 0) {
      suggestions.push(`Pending orders are **${pendingOrders}/${totalOrders}**. Prioritize the oldest pending orders first to improve completion rate.`);
    }
    nextSteps.push(`Create an SLA board: Pending > 48h, Processing > 72h, Delivered target within promised date.`);
  }

  if (asksStockHelp || lowStockCount > 0) {
    if (lowStockCount > 0) {
      suggestions.push(`You have **${lowStockCount}** low-stock products. Reorder by priority (high-demand items first).`);
    }
    suggestions.push(`Set product-level reorder points and auto-review low stock every morning.`);
    nextSteps.push(`For each low-stock SKU, define min stock, lead time, and safety stock to avoid stock-outs.`);
  }

  if (asksTeamHelp) {
    suggestions.push(`Track team productivity by orders completed per employee and on-time completion rate.`);
    suggestions.push(`Use weekly task reviews: top blockers, delayed orders, and corrective actions.`);
  }

  if (asksSupplierHelp) {
    suggestions.push(`Rate suppliers by delivery timeliness, quality issues, and cost consistency each month.`);
    suggestions.push(`Split critical purchases across at least 2 suppliers to reduce risk.`);
  }

  if (suggestions.length === 0) {
    suggestions.push(`Share your exact problem (for example: low sales, too many pending orders, stock-outs, or supplier delays), and I will give a targeted action plan.`);
  }

  let response = `📈 **BUSINESS IMPROVEMENT SUGGESTIONS**\n\n`;
  response += `**Recommended Actions:**\n`;
  suggestions.slice(0, 6).forEach((item, idx) => {
    response += `${idx + 1}. ${item}\n`;
  });

  if (nextSteps.length > 0) {
    response += `\n**Immediate Next Steps (This Week):**\n`;
    nextSteps.slice(0, 3).forEach((step) => {
      response += `• ${step}\n`;
    });
  }

  response += `\n💡 Tell me your specific challenge (example: \"sales are low\" or \"too many pending orders\") and I will give a focused plan.`;
  return response;
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
    msg += `• Revenue: **₹${(context.totalRevenue || 0).toLocaleString()}**\n`;
    msg += `• Avg Order: **₹${context.avgOrderValue || 0}**\n\n`;
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
        msg += `${i + 1}. ${p._id} — ${p.totalSold} orders (₹${p.totalRevenue})\n`;
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
    msg += `• Total Value: **₹${(context.totalOrderValue || 0).toLocaleString()}**\n`;
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
        msg += `${i + 1}. ${o.cName} → ${productName} — ₹${o.amount} (${o.status})\n`;
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
        msg += `${i + 1}. ${o.pName} — Qty: ${o.ounits}, ₹${o.amount}/unit (${o.status})\n`;
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
        msg += `   • Price: ₹${p.price}\n`;
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
    msg += `• Total Value: **₹${(context.totalOrderValue || 0).toLocaleString()}**\n\n`;
    if (context.recentSupplierOrders?.length > 0) {
      msg += `**Recent Orders:**\n`;
      context.recentSupplierOrders.slice(0, 5).forEach((o, i) => {
        msg += `${i + 1}. ${o.pName} — Qty: ${o.ounits}, ₹${o.amount}/unit (${o.status})\n`;
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
    msg += `• Total Revenue: **₹${(context.totalRevenue || 0).toLocaleString()}**\n`;
    msg += `• Total Orders: **${context.totalOrders || 0}**\n`;
    msg += `• Avg Order Value: **₹${context.avgOrderValue || 0}**\n\n`;

    if (context.topProducts?.length > 0) {
      msg += `🏆 **Top Revenue Products:**\n`;
      context.topProducts.forEach((p, i) => {
        msg += `${i + 1}. ${p._id} — ${p.totalSold} orders, ₹${p.totalRevenue} revenue\n`;
      });
    }

    if (context.totalSalaryPaid) {
      msg += `\n💼 **Expenses:**\n`;
      msg += `• Salary paid: ₹${context.totalSalaryPaid.toLocaleString()}\n`;
    }
    return msg;
  } else if (role === 'supplier') {
    return `💰 **Your Total Order Value:** ₹${(context.totalOrderValue || 0).toLocaleString()}\n• Pending: ${context.pendingOrders || 0}\n• Delivered: ${context.deliveredOrders || 0}`;
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
        msg += `   • Revenue: ₹${p.totalRevenue}\n\n`;
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
    const entityResponse = await handleSpecificEntityQuery(userMessage, role, userId, context);
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
