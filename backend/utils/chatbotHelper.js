const Product = require('../models/Products');
const Order = require('../models/Orders');
const Warehouse = require('../models/Warehouse');
const Supplier = require('../models/Supplier');
const Employee = require('../models/Employee');
const BusinessOwner = require('../models/BusinessOwner');

/**
 * Get context based on user role and fetch relevant data
 */
const getContextForRole = async (userId, role) => {
  try {
    let context = {};

    if (!userId) {
      return context;
    }

    if (role === 'businessowner') {
      context.products = await Product.countDocuments({ businessowner: userId });
      context.totalOrders = await Order.countDocuments({ businessowner: userId });
      context.pendingOrders = await Order.countDocuments({
        businessowner: userId,
        productStatus: { $in: ['Pending', 'Processing'] }
      });
      context.warehouses = await Warehouse.countDocuments({ businessowner: userId });
      context.suppliers = await Supplier.countDocuments({ businessowner: userId });
      context.employees = await Employee.countDocuments({ businessowner: userId });

      // Get low stock products
      const lowStockProducts = await Product.find({
        businessowner: userId,
        totalProducts: { $lt: 10 }
      }).select('name totalProducts category').limit(5);
      context.lowStockProducts = lowStockProducts;

      // Get recent orders
      const recentOrders = await Order.find({ businessowner: userId })
        .sort({ createdAt: -1 })
        .select('customerName productName totalAmt orderDate productStatus')
        .limit(5);
      context.recentOrders = recentOrders;
    } else if (role === 'employee') {
      context.assignedProducts = await Product.countDocuments({ employee: userId });
      context.assignedOrders = await Order.countDocuments({ employee: userId });
      context.pendingTasks = await Order.countDocuments({
        employee: userId,
        productStatus: { $in: ['Pending', 'Processing'] }
      });

      // Get assigned orders details
      const assignedOrders = await Order.find({ employee: userId })
        .select('productName customerName productStatus deliveryStatus orderDate')
        .limit(5);
      context.assignedOrdersList = assignedOrders;
    } else if (role === 'supplier') {
      const SupplierOrders = require('../models/SupplierOrders');
      context.pendingOrders = await SupplierOrders.countDocuments({
        supplier: userId,
        status: 'Pending'
      });
      context.deliveredOrders = await SupplierOrders.countDocuments({
        supplier: userId,
        status: 'Delivered'
      });

      // Get supplier order details
      const supplierOrders = await SupplierOrders.find({ supplier: userId })
        .select('productName quantity price status orderDate')
        .limit(5);
      context.recentSupplierOrders = supplierOrders;
    }

    return context;
  } catch (error) {
    // Silent fail - return empty context
    return {};
  }
};

/**
 * Generate system prompt based on user role
 */
const generateSystemPrompt = (role) => {
  const basePrompt = `You are a helpful AI assistant for an Inventory Tracking System. You provide helpful, concise responses about inventory management, orders, products, and related topics.`;

  const rolePrompts = {
    businessowner: `${basePrompt} You are assisting a Business Owner who manages inventory, products, suppliers, employees, and customer orders. Help them with insights about their business operations, inventory levels, order status, and business metrics. Be professional and business-oriented.`,
    employee: `${basePrompt} You are assisting an Employee who works with products and orders. Help them understand their assigned tasks, product information, and order statuses. Be helpful and supportive.`,
    supplier: `${basePrompt} You are assisting a Supplier who provides products. Help them with information about their orders, delivery statuses, and product supplies. Be professional and focus on supplier-related queries.`
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
Current Business Overview:
- Total Products: ${context.products || 0}
- Total Orders: ${context.totalOrders || 0}
- Pending Orders: ${context.pendingOrders || 0}
- Warehouses: ${context.warehouses || 0}
- Suppliers: ${context.suppliers || 0}
- Employees: ${context.employees || 0}`;

    if (context.lowStockProducts?.length) {
      formattedContext += `\n\nLow Stock Products (< 10 units):\n`;
      context.lowStockProducts.forEach(p => {
        formattedContext += `- ${p.name} (Category: ${p.category}) - ${p.totalProducts} units\n`;
      });
    }

    if (context.recentOrders?.length) {
      formattedContext += `\n\nRecent Orders:\n`;
      context.recentOrders.forEach(o => {
        formattedContext += `- Order from ${o.customerName} for ${o.productName} (Status: ${o.productStatus})\n`;
      });
    }
  } else if (role === 'employee') {
    formattedContext = `
Your Assigned Tasks:
- Assigned Products: ${context.assignedProducts || 0}
- Assigned Orders: ${context.assignedOrders || 0}
- Pending Tasks: ${context.pendingTasks || 0}`;

    if (context.assignedOrdersList?.length) {
      formattedContext += `\n\nYour Assigned Orders:\n`;
      context.assignedOrdersList.forEach(o => {
        formattedContext += `- ${o.productName} for ${o.customerName} (Product Status: ${o.productStatus}, Delivery: ${o.deliveryStatus})\n`;
      });
    }
  } else if (role === 'supplier') {
    formattedContext = `
Your Supply Overview:
- Pending Orders: ${context.pendingOrders || 0}
- Delivered Orders: ${context.deliveredOrders || 0}`;

    if (context.recentSupplierOrders?.length) {
      formattedContext += `\n\nRecent Orders:\n`;
      context.recentSupplierOrders.forEach(o => {
        formattedContext += `- ${o.productName} (Qty: ${o.quantity}, Price: ${o.price}, Status: ${o.status})\n`;
      });
    }
  }

  return formattedContext;
};

/**
 * Generate response using simulated AI (can be replaced with real API)
 * For now, uses rule-based responses based on keywords
 */
const generateAIResponse = async (userMessage, role, context) => {
  const message = userMessage.toLowerCase();
  
  // Rule-based responses for common queries
  const commonQueries = {
    inventory: {
      businessowner: `Based on your current inventory: You have ${context.products || 0} products total. ${context.lowStockProducts?.length > 0 ? `You have ${context.lowStockProducts.length} products with low stock (less than 10 units). Consider reordering: ${context.lowStockProducts.map(p => p.name).join(', ')}.` : 'All products have adequate stock levels.'}`,
      employee: `You are managing ${context.assignedProducts || 0} assigned products. Your current focus should be on your pending tasks.`,
      supplier: `You have ${context.pendingOrders || 0} pending supply orders that need attention.`
    },
    orders: {
      businessowner: `You have ${context.totalOrders || 0} total orders with ${context.pendingOrders || 0} pending. Keep track of order deadlines and ensure timely delivery.`,
      employee: `You have ${context.assignedOrders || 0} assigned orders with ${context.pendingTasks || 0} pending. Focus on completing your assigned tasks on time.`,
      supplier: `You have ${context.pendingOrders || 0} pending supply orders and ${context.deliveredOrders || 0} delivered orders.`
    },
    help: {
      businessowner: `I can help you with: inventory status, order management, product details, warehouse information, supplier management, and employee insights. What would you like to know?`,
      employee: `I can help you with: your assigned tasks, order details, product information, and task status. What do you need help with?`,
      supplier: `I can help you with: your pending orders, delivery status, product supplies, and order history. How can I assist?`
    }
  };

  // Check for keyword matches
  for (const [keyword, responses] of Object.entries(commonQueries)) {
    if (message.includes(keyword)) {
      return responses[role] || responses.businessowner;
    }
  }

  // Default intelligent response based on role
  if (message.includes('how') || message.includes('what') || message.includes('tell me')) {
    const contextSummary = formatContextForAI(context, role);
    return `Based on your current status:\n${contextSummary}\n\nFeel free to ask specific questions about your inventory, orders, or tasks.`;
  }

  // Fallback response
  return `I'm here to help with your inventory management questions. ${commonQueries.help[role]}`;
};

module.exports = {
  getContextForRole,
  generateSystemPrompt,
  formatContextForAI,
  generateAIResponse
};
