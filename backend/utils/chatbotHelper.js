const Product = require('../models/Products');
const Order = require('../models/Orders');
const Warehouse = require('../models/Warehouse');
const Supplier = require('../models/Supplier');
const Employee = require('../models/Employee');
const BusinessOwner = require('../models/BusinessOwner');
const axios = require('axios');
const { Groq } = require('groq-sdk');

// Initialize Groq client (FREE API)
// Get your free API key from: https://console.groq.com/keys
const GROQ_API_KEY = process.env.GROQ_API_KEY || null;
const USE_GROQ = !!GROQ_API_KEY;

// Initialize Groq client if API key is available
let groqClient = null;
if (USE_GROQ) {
  groqClient = new Groq({ apiKey: GROQ_API_KEY });
  console.log('✅ Groq AI API initialized - Using FREE AI inference');
} else {
  console.warn('⚠️ GROQ_API_KEY not found. Using rule-based responses. To enable AI, set GROQ_API_KEY in your .env file');
}

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

      // Get employee details (NEW)
      const employeesList = await Employee.find({ businessowner: userId })
        .select('fname lname email phone hireAt jDate role')
        .limit(10);
      context.employeesList = employeesList;

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

      // Get orders by employee (NEW)
      const employeeOrderStats = await Order.aggregate([
        { $match: { businessowner: userId, employee: { $exists: true, $ne: null } } },
        { $group: { _id: '$employee', count: { $sum: 1 }, pending: { $sum: { $cond: [{ $in: ['$productStatus', ['Pending', 'Processing']] }, 1, 0] } } } },
        { $limit: 5 }
      ]);
      context.employeeOrderStats = employeeOrderStats;
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
  const basePrompt = `You are a helpful AI assistant for an Inventory Tracking System. IMPORTANT: You MUST respond ONLY in English. You provide helpful, concise responses about inventory management, orders, products, and related topics.`;

  const rolePrompts = {
    businessowner: `${basePrompt} You are assisting a Business Owner who manages inventory, products, suppliers, employees, and customer orders. Help them with insights about their business operations, inventory levels, order status, and business metrics. Be professional and business-oriented. ALWAYS respond in English only.`,
    employee: `${basePrompt} You are assisting an Employee who works with products and orders. Help them understand their assigned tasks, product information, and order statuses. Be helpful and supportive. ALWAYS respond in English only.`,
    supplier: `${basePrompt} You are assisting a Supplier who provides products. Help them with information about their orders, delivery statuses, and product supplies. Be professional and focus on supplier-related queries. ALWAYS respond in English only.`
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

    if (context.employeesList?.length) {
      formattedContext += `\n\nTeam Members:\n`;
      context.employeesList.forEach(emp => {
        formattedContext += `- ${emp.fname} ${emp.lname || ''} (${emp.email})\n`;
      });
    }

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
 * Generate response using OpenAI API or fallback to enhanced rule-based system
 * Supports both specific queries and general conversational queries
 */
const generateAIResponse = async (userMessage, role, context, userId) => {
  try {
    // Use intelligent analysis to generate list-format responses
    const response = await generateIntelligentResponse(userMessage, role, context, userId);
    return response;
  } catch (error) {
    console.error('Error generating AI response:', error);
    return generateEnhancedResponse(userMessage, role, context);
  }
};

/**
 * Handle specific entity queries (product details, order details, etc.)
 */
const handleSpecificEntityQuery = async (userMessage, role, userId) => {
  const message = userMessage.toLowerCase().trim();
  
  // Detect product-specific queries
  if ((message.includes('product') || message.includes('item')) && 
      (message.includes('tell me') || message.includes('show') || message.includes('detail') || message.includes('info about') || message.includes('about'))) {
    // Try multiple patterns to extract product name
    let productName = null;
    
    // Pattern: "product [name]" or "item [name]"
    let match = userMessage.match(/(?:product|item)\s+(?:named\s+)?["']?([^"'.!?]+)["']?/i);
    if (match && match[1]) {
      productName = match[1].trim();
    }
    
    // Pattern: "tell me about [product name]"
    if (!productName) {
      match = userMessage.match(/(?:tell me about|show me|details? (?:on|for|about))\s+(?:(?:the\s+)?product\s+)?["']?([^"'.!?]+)["']?/i);
      if (match && match[1]) {
        productName = match[1].trim();
      }
    }

    if (productName && role === 'businessowner') {
      const products = await searchProducts(productName, userId);
      if (products.length > 0) {
        return formatProductDetailsResponse(products);
      }
      return `❌ **No products found** matching "${productName}". \n\n💡 Try searching with a different name or check if the product exists in your system.`;
    }
  }

  // Detect order-specific queries
  if ((message.includes('order') && 
       (message.includes('tell me') || message.includes('show') || message.includes('detail') || message.includes('info about') || message.includes('about'))) ||
      message.includes('customer order')) {
    let orderTerm = null;
    
    // Pattern: "order for [customer/product]"
    let match = userMessage.match(/order\s+(?:for\s+)?["']?([^"'.!?]+)["']?/i);
    if (match && match[1]) {
      orderTerm = match[1].trim();
    }
    
    // Pattern: "tell me about [order/customer]"
    if (!orderTerm) {
      match = userMessage.match(/(?:tell me about|show me|details? (?:on|for|about))\s+(?:(?:the\s+)?order\s+)?["']?([^"'.!?]+)["']?/i);
      if (match && match[1]) {
        orderTerm = match[1].trim();
      }
    }

    if (orderTerm && role === 'businessowner') {
      const orders = await searchOrders(orderTerm, userId);
      if (orders.length > 0) {
        return formatOrderDetailsResponse(orders);
      }
      return `❌ **No orders found** matching "${orderTerm}". \n\n💡 Try searching with a customer name or product name.`;
    }
  }

  // Detect category queries
  if (message.includes('category') || message.includes('categories') || message.includes('category list')) {
    if (role === 'businessowner') {
      const categories = await getCategoryDetails(userId);
      if (categories.length > 0) {
        return formatCategoryDetailsResponse(categories);
      }
      return `📦 **No categories found.** Create categories in your dashboard to organize products.`;
    }
  }

  // Detect warehouse queries with details
  if ((message.includes('warehouse') || message.includes('warehouses')) && 
      (message.includes('detail') || message.includes('address') || message.includes('manager') || message.includes('location') || message.includes('info'))) {
    if (role === 'businessowner') {
      const warehouses = await getWarehouseDetails(userId);
      if (warehouses.length > 0) {
        return formatWarehouseDetailsResponse(warehouses);
      }
      return `🏢 **No warehouses found.** Add warehouses in your dashboard to start managing inventory locations.`;
    }
  }

  return null;
};

/**
 * Format product details for display
 */
const formatProductDetailsResponse = (products) => {
  if (!products || products.length === 0) return null;

  let response = `📦 **PRODUCT DETAILS:**\n\n`;

  products.forEach((product, index) => {
    const details = getProductDetails(product);
    response += `${index + 1}. **${details.name}**\n`;
    response += `   📂 Category: ${details.category}\n`;
    response += `   💰 Price: $${details.price}\n`;
    response += `   📊 Stock: ${details.stock} units\n`;
    response += `   🏷️ Brand: ${details.brand || 'N/A'}\n`;
    response += `   📅 Manufacture Date: ${details.manufactureDate}\n`;
    response += `   📅 Expiry Date: ${details.expiryDate}\n`;
    response += `   🏢 Warehouses: ${details.warehouses.join(', ')}\n`;
    response += `   📝 Description: ${details.description}\n`;
    if (details.stock < 10) {
      response += `   ⚠️ **LOW STOCK ALERT**\n`;
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

  let response = `📋 **ORDER DETAILS:**\n\n`;

  orders.forEach((order, index) => {
    const details = getOrderDetails(order);
    response += `${index + 1}. **Order for ${details.customer}**\n`;
    response += `   👤 Customer: ${details.customer}\n`;
    response += `   📦 Product: ${details.product}\n`;
    response += `   📂 Category: ${details.category || 'N/A'}\n`;
    response += `   💵 Amount: ${details.amount}\n`;
    response += `   📅 Order Date: ${details.orderDate}\n`;
    response += `   ⏰ Deadline: ${details.deadline}\n`;
    if (details.daysRemaining !== 'N/A') {
      response += `   ⏱️ Days Remaining: ${details.daysRemaining} days\n`;
      response += `   ${details.urgency}\n`;
    }
    response += `   ✅ Product Status: ${details.productStatus}\n`;
    response += `   🚚 Delivery Status: ${details.deliveryStatus}\n`;
    response += `   📍 Delivery Address: ${details.address}\n`;
    response += `   📝 Notes: ${details.notes}\n`;
    response += `\n`;
  });

  return response;
};

/**
 * Format category details for display
 */
const formatCategoryDetailsResponse = (categories) => {
  if (!categories || categories.length === 0) return null;

  let response = `📂 **CATEGORY DETAILS:**\n\n`;
  response += `Total Categories: ${categories.length}\n\n`;

  categories.forEach((category, index) => {
    response += `${index + 1}. **${category.name}**\n`;
    response += `   📝 Description: ${category.description}\n`;
    response += `   📦 Products: ${category.productCount} items\n`;
    response += `\n`;
  });

  return response;
};

/**
 * Format warehouse details for display
 */
const formatWarehouseDetailsResponse = (warehouses) => {
  if (!warehouses || warehouses.length === 0) return null;

  let response = `🏢 **WAREHOUSE DETAILS:**\n\n`;
  response += `Total Warehouses: ${warehouses.length}\n\n`;

  warehouses.forEach((warehouse, index) => {
    response += `${index + 1}. **${warehouse.wName}**\n`;
    response += `   👨‍💼 Manager: ${warehouse.wManager}\n`;
    response += `   📍 Address: ${warehouse.wAddress}\n`;
    response += `   📞 Contact: ${warehouse.wContact}\n`;
    response += `   📧 Email: ${warehouse.wEmail}\n`;
    response += `   🏙️ City: ${warehouse.city || 'N/A'} | State: ${warehouse.state || 'N/A'} | Country: ${warehouse.country || 'N/A'}\n`;
    response += `\n`;
  });

  return response;
};

/**
 * Generate response using Groq API (FREE)
 * Groq provides fast, free LLM inference without API costs
 */
const generateGroqResponse = async (userMessage, role, context) => {
  try {
    if (!USE_GROQ || !groqClient) {
      console.log('Groq not configured, using fallback');
      return generateEnhancedResponse(userMessage, role, context);
    }

    const systemPrompt = generateSystemPrompt(role);
    const contextString = formatContextForAI(context, role);

    const messages = [
      {
        role: 'system',
        content: `${systemPrompt}\n\nCurrent Business Context:\n${contextString}\n\nIMPORTANT INSTRUCTION: You MUST respond ONLY in English language. Do not use any other language. Provide helpful, concise, and accurate responses based on the user's query and the provided context. If the user asks something not related to inventory management, politely redirect them.`
      },
      {
        role: 'user',
        content: userMessage
      }
    ];

    const response = await groqClient.chat.completions.create({
      messages: messages,
      model: 'mixtral-8x7b-32768', // Free Groq model - very fast and capable
      max_tokens: 500,
      temperature: 0.7
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Groq API error:', error.message);
    // Fallback to rule-based response
    return generateEnhancedResponse(userMessage, role, context);
  }
};

/**
 * Generate response using OpenAI API (DEPRECATED)
 * This function is kept for reference only
 * New implementations should use Groq API instead
 */
const generateOpenAIResponse = async (userMessage, role, context) => {
  try {
    const systemPrompt = generateSystemPrompt(role);
    const contextString = formatContextForAI(context, role);

    const messages = [
      {
        role: 'system',
        content: `${systemPrompt}\n\nCurrent Business Context:\n${contextString}\n\nIMPORTANT INSTRUCTION: You MUST respond ONLY in English language. Do not use any other language. Provide helpful, concise, and accurate responses based on the user's query and the provided context. If the user asks something not related to inventory management, politely redirect them.`
      },
      {
        role: 'user',
        content: userMessage
      }
    ];

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API error:', error.message);
    // Fallback to rule-based response
    return generateEnhancedResponse(userMessage, role, context);
  }
};

/**
 * Search for specific products by name
 */
const searchProducts = async (productName, businessownerId) => {
  try {
    // Escape special regex characters to prevent injection
    const escapedName = productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const products = await Product.find({
      businessowner: businessownerId,
      $or: [
        { name: { $regex: escapedName, $options: 'i' } },
        { pcode: { $regex: escapedName, $options: 'i' } },
        { desc: { $regex: escapedName, $options: 'i' } }
      ]
    }).select('name category price totalProducts brand mDate eDate desc warehouse').limit(5);
    return products;
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
};

/**
 * Search for specific orders
 */
const searchOrders = async (searchTerm, businessownerId) => {
  try {
    // Escape special regex characters
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const orders = await Order.find({
      businessowner: businessownerId,
      $or: [
        { customerName: { $regex: escapedTerm, $options: 'i' } },
        { productName: { $regex: escapedTerm, $options: 'i' } },
        { customerContactNo: { $regex: escapedTerm, $options: 'i' } }
      ]
    }).select('customerName productName totalAmt orderDate productStatus deliveryStatus address notes').limit(5);
    return orders;
  } catch (error) {
    console.error('Error searching orders:', error);
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
          category: cat.cName
        });
        return {
          name: cat.cName,
          description: cat.cDesc,
          productCount: count
        };
      })
    );
    return categoriesWithCounts;
  } catch (error) {
    console.error('Error getting categories:', error);
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
    console.error('Error getting warehouse details:', error);
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
    category: product.category,
    price: product.price,
    stock: product.totalProducts,
    brand: product.brand,
    manufactureDate: product.mDate ? new Date(product.mDate).toLocaleDateString() : 'N/A',
    expiryDate: product.eDate ? new Date(product.eDate).toLocaleDateString() : 'N/A',
    warehouses: product.warehouse && product.warehouse.length > 0 ? product.warehouse : ['Not assigned'],
    description: product.desc || 'No description available'
  };
};

/**
 * Get detailed order information
 */
const getOrderDetails = (order) => {
  if (!order) return null;
  
  const daysUntilDeadline = order.deliveryDeadline ? Math.ceil((new Date(order.deliveryDeadline) - new Date()) / (1000 * 60 * 60 * 24)) : 'N/A';
  
  // Determine urgency level
  let urgency = '✅ On Track';
  if (typeof daysUntilDeadline === 'number') {
    if (daysUntilDeadline < 0) urgency = '🔴 OVERDUE';
    else if (daysUntilDeadline < 3) urgency = '⚠️ URGENT - DEADLINE APPROACHING';
    else if (daysUntilDeadline < 7) urgency = '⚡ Due Soon';
  }
  
  return {
    customer: order.customerName,
    product: order.productName,
    category: order.productCategory,
    amount: `$${order.totalAmt}`,
    orderDate: new Date(order.orderDate).toLocaleDateString(),
    deadline: order.deliveryDeadline ? new Date(order.deliveryDeadline).toLocaleDateString() : 'N/A',
    daysRemaining: daysUntilDeadline,
    urgency: urgency,
    productStatus: order.productStatus || 'Pending',
    deliveryStatus: order.deliveryStatus || 'Not shipped',
    availability: order.pAvailability || 'Unknown',
    address: order.address || 'Not provided',
    notes: order.additionalNotes || 'None'
  };
};

/**
 * Enhanced rule-based response system supporting general queries
 */
const generateEnhancedResponse = (userMessage, role, context) => {
  const message = userMessage.toLowerCase().trim();
  
  // Intent detection for various query types
  const intents = {
    inventory_status: ['inventory', 'stock', 'products', 'how many products', 'product count', 'stock levels'],
    order_status: ['order', 'orders', 'pending', 'status', 'delivery', 'shipment'],
    low_stock_alert: ['low stock', 'reorder', 'out of stock', 'running low', 'stock levels'],
    employee_tasks: ['tasks', 'assigned', 'my work', 'what do i do'],
    employee_details: ['employee', 'employees', 'team', 'staff', 'worker', 'personnel', 'my team', 'show employees'],
    supplier_info: ['supplier', 'supply', 'pending orders'],
    warehouse_info: ['warehouse', 'storage', 'location', 'address', 'manager'],
    product_details: ['product detail', 'product info', 'show product', 'tell me about product', 'item detail', 'item info'],
    order_details: ['order detail', 'order info', 'show order', 'tell me about order', 'customer order', 'order status detail'],
    category_details: ['category', 'categories', 'category list', 'all categories'],
    help: ['help', 'what can you do', 'capabilities', 'features'],
    greeting: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
    general_inquiry: ['how', 'what', 'tell me', 'why', 'when', 'where', 'which']
  };

  // Detect user intent
  let detectedIntent = null;
  for (const [intent, keywords] of Object.entries(intents)) {
    if (keywords.some(keyword => message.includes(keyword))) {
      detectedIntent = intent;
      break;
    }
  }

  // Generate response based on detected intent
  if (detectedIntent === 'greeting') {
    const greetings = {
      businessowner: "Hello! 👋 I'm your AI Assistant. I can help you with inventory management, order tracking, product insights, supplier management, and business analytics. What would you like to know?",
      employee: "Hello! 👋 I'm here to help. I can assist with your assigned tasks, order details, product information, and work schedules. How can I help?",
      supplier: "Hello! 👋 Welcome! I can help you with your pending orders, delivery status, product supplies, and order history. What do you need?"
    };
    return greetings[role] || greetings.businessowner;
  }

  if (detectedIntent === 'inventory_status') {
    return getInventoryStatusResponse(role, context);
  }

  if (detectedIntent === 'order_status') {
    return getOrderStatusResponse(role, context);
  }

  if (detectedIntent === 'low_stock_alert') {
    return getLowStockResponse(role, context);
  }

  if (detectedIntent === 'employee_tasks') {
    return getEmployeeTasksResponse(role, context);
  }

  if (detectedIntent === 'employee_details') {
    return getEmployeeDetailsResponse(role, context);
  }

  if (detectedIntent === 'supplier_info') {
    return getSupplierInfoResponse(role, context);
  }

  if (detectedIntent === 'warehouse_info') {
    return getWarehouseInfoResponse(role, context);
  }

  if (detectedIntent === 'product_details') {
    return `📦 **Product Details:** Please specify the product name.\n\nExample: "Tell me about product iPhone 13" or "Show me details for Laptop"`;
  }

  if (detectedIntent === 'order_details') {
    return `📋 **Order Details:** Please specify the customer name or product name.\n\nExample: "Show order for John Doe" or "Tell me about order for Laptop"`;
  }

  if (detectedIntent === 'category_details') {
    return `📂 **Category Details:** Please wait while I fetch all categories...`;
  }

  if (detectedIntent === 'help') {
    return getHelpResponse(role);
  }

  // General inquiry - provide contextual information
  if (detectedIntent === 'general_inquiry') {
    return getComprehensiveDashboard(role, context);
  }

  // For queries not matching specific intents, provide helpful response
  return `I'm not sure I understood that query. I can help with:\n- Inventory and stock management\n- Order tracking and status\n- Product information\n- Employee tasks and assignments\n- Supplier orders and deliveries\n- Warehouse information\n\nFeel free to ask me anything related to your inventory management!`;
};

/**
 * Response generators for specific intents
 */
const getInventoryStatusResponse = (role, context) => {
  if (role === 'businessowner') {
    return `📊 **Inventory Overview:**\n\n✓ Total Products: ${context.products || 0}\n✓ Active Warehouses: ${context.warehouses || 0}\n✓ Managed Suppliers: ${context.suppliers || 0}\n${context.lowStockProducts?.length > 0 ? `\n⚠️ **Alert:** ${context.lowStockProducts.length} products have low stock:\n${context.lowStockProducts.map(p => `  • ${p.name} - ${p.totalProducts} units`).join('\n')}` : '\n✅ All products have adequate stock levels.'}`;
  } else if (role === 'employee') {
    return `📦 **Your Inventory Assignment:**\n\n✓ Assigned Products: ${context.assignedProducts || 0}\n✓ Active Orders: ${context.assignedOrders || 0}\n✓ Pending Tasks: ${context.pendingTasks || 0}\n\nFocus on completing your assigned tasks on time.`;
  } else if (role === 'supplier') {
    return `📋 **Your Supply Status:**\n\n✓ Pending Orders: ${context.pendingOrders || 0}\n✓ Delivered Orders: ${context.deliveredOrders || 0}\n\nMake sure to fulfill pending orders promptly.`;
  }
};

const getOrderStatusResponse = (role, context) => {
  if (role === 'businessowner') {
    return `📈 **Order Management Status:**\n\n✓ Total Orders: ${context.totalOrders || 0}\n✓ Pending Orders: ${context.pendingOrders || 0}\n${context.recentOrders?.length > 0 ? `\n**Recent Orders:**\n${context.recentOrders.slice(0, 3).map(o => `  • ${o.customerName} - ${o.productName} (${o.productStatus})`).join('\n')}` : ''}\n\nKeep track of order deadlines and ensure timely delivery.`;
  } else if (role === 'employee') {
    return `✓ **Your Assigned Orders:**\n\n✓ Total Assigned: ${context.assignedOrders || 0}\n✓ Pending Tasks: ${context.pendingTasks || 0}\n${context.assignedOrdersList?.length > 0 ? `\n**Your Orders:**\n${context.assignedOrdersList.slice(0, 3).map(o => `  • ${o.productName} for ${o.customerName} - Status: ${o.productStatus}`).join('\n')}` : ''}\n\nFocus on completing your assigned tasks on time.`;
  } else if (role === 'supplier') {
    return `✓ **Your Supply Orders:**\n\n✓ Pending: ${context.pendingOrders || 0}\n✓ Delivered: ${context.deliveredOrders || 0}\n${context.recentSupplierOrders?.length > 0 ? `\n**Recent Orders:**\n${context.recentSupplierOrders.slice(0, 3).map(o => `  • ${o.productName} (Qty: ${o.quantity}) - ${o.status}`).join('\n')}` : ''}\n\nEnsure timely delivery of all pending orders.`;
  }
};

const getLowStockResponse = (role, context) => {
  if (role === 'businessowner') {
    if (context.lowStockProducts?.length > 0) {
      return `⚠️ **Low Stock Alert:**\n\nYou have ${context.lowStockProducts.length} products with less than 10 units:\n\n${context.lowStockProducts.map(p => `• **${p.name}** (${p.category})\n  Currently: ${p.totalProducts} units\n  Action: Consider reordering`).join('\n\n')}\n\nWould you like to create supplier orders for these products?`;
    } else {
      return `✅ **Great News!** All your products have adequate stock levels. Your inventory is well-managed!`;
    }
  }
  return `Your inventory appears to be in good condition. No immediate restocking needed.`;
};

const getEmployeeTasksResponse = (role, context) => {
  if (role === 'employee') {
    return `📋 **Your Tasks Summary:**\n\n✓ Assigned Products: ${context.assignedProducts || 0}\n✓ Assigned Orders: ${context.assignedOrders || 0}\n✓ Pending Tasks: ${context.pendingTasks || 0}\n${context.assignedOrdersList?.length > 0 ? `\n**Current Assignments:**\n${context.assignedOrdersList.map(o => `  • ${o.productName} for ${o.customerName}\n    Status: ${o.productStatus} | Delivery: ${o.deliveryStatus}`).join('\n\n')}` : ''}\n\nWork on completing your pending tasks efficiently!`;
  }
  return `You don't have access to employee task information.`;
};

const getEmployeeDetailsResponse = (role, context) => {
  if (role === 'businessowner') {
    if (context.employeesList && context.employeesList.length > 0) {
      const employeeDetails = context.employeesList.map(emp => {
        const name = `${emp.fname} ${emp.lname || ''}`.trim();
        const joinDate = emp.jDate ? new Date(emp.jDate).toLocaleDateString() : 'N/A';
        return `• **${name}**\n  Email: ${emp.email}\n  Phone: ${emp.phone || 'N/A'}\n  Joined: ${joinDate}\n  Role: ${emp.role || 'employee'}`;
      }).join('\n\n');

      return `👥 **Team Members:**\n\nTotal Employees: ${context.employees || 0}\n\n**Employee Details:**\n${employeeDetails}\n\n💡 **Tip:** You can manage employees from the Employee section in your dashboard. Add, edit, or remove team members as needed.`;
    } else {
      return `👥 **Team Information:**\n\nYou have ${context.employees || 0} employees in your team.\n\n📝 **No detailed information available yet.** Start by adding employees to your team from the dashboard.`;
    }
  }
  return `You don't have access to employee information.`;
};

const getSupplierInfoResponse = (role, context) => {
  if (role === 'supplier') {
    return `📦 **Your Supply Overview:**\n\n✓ Pending Orders: ${context.pendingOrders || 0}\n✓ Delivered Orders: ${context.deliveredOrders || 0}\n${context.recentSupplierOrders?.length > 0 ? `\n**Your Recent Orders:**\n${context.recentSupplierOrders.map(o => `  • ${o.productName}\n    Quantity: ${o.quantity} | Price: ${o.price} | Status: ${o.status}`).join('\n\n')}` : ''}\n\nMaintain good delivery performance to keep strong business relationships.`;
  } else if (role === 'businessowner') {
    return `✓ You have ${context.suppliers || 0} active suppliers. Manage your supplier relationships to ensure consistent product availability.`;
  }
};

const getWarehouseInfoResponse = (role, context) => {
  if (role === 'businessowner') {
    return `🏢 **Warehouse Management:**\n\n✓ Total Warehouses: ${context.warehouses || 0}\n\nYour warehouses are strategically important for inventory distribution. Ensure proper organization and stock tracking across all locations.`;
  }
  return `You don't have access to warehouse information.`;
};

const getComprehensiveDashboard = (role, context) => {
  if (role === 'businessowner') {
    let dashboard = `📊 **BUSINESS DASHBOARD - COMPREHENSIVE OVERVIEW**\n\n`;
    
    // Key metrics section
    dashboard += `🎯 **Key Performance Indicators:**\n`;
    dashboard += `  • Products in Stock: ${context.products || 0}\n`;
    dashboard += `  • Total Orders: ${context.totalOrders || 0}\n`;
    dashboard += `  • Pending Orders: ${context.pendingOrders || 0}\n`;
    dashboard += `  • Team Members: ${context.employees || 0}\n`;
    dashboard += `  • Active Warehouses: ${context.warehouses || 0}\n`;
    dashboard += `  • Suppliers: ${context.suppliers || 0}\n\n`;

    // Alerts section
    if (context.lowStockProducts?.length > 0) {
      dashboard += `⚠️ **Urgent Alerts:**\n`;
      dashboard += `  ${context.lowStockProducts.length} products need restocking\n`;
      dashboard += `  - ${context.lowStockProducts.slice(0, 2).map(p => `${p.name} (${p.totalProducts} units)`).join('\n  - ')}\n\n`;
    }

    // Recent activity section
    if (context.recentOrders?.length > 0) {
      dashboard += `📈 **Recent Activity:**\n`;
      context.recentOrders.slice(0, 2).forEach(order => {
        dashboard += `  • Order from ${order.customerName}: ${order.productName} (${order.productStatus})\n`;
      });
      dashboard += `\n`;
    }

    // Team section
    if (context.employeesList?.length > 0) {
      dashboard += `👥 **Your Team (${context.employeesList.length} members):**\n`;
      context.employeesList.slice(0, 3).forEach(emp => {
        dashboard += `  • ${emp.fname} ${emp.lname || ''} - ${emp.email}\n`;
      });
      dashboard += `\n`;
    }

    // Recommendations section
    dashboard += `💡 **Recommendations:**\n`;
    if (context.lowStockProducts?.length > 0) {
      dashboard += `  1. Reorder low stock items immediately\n`;
    }
    if (context.pendingOrders > 5) {
      dashboard += `  2. Focus on clearing pending orders\n`;
    }
    dashboard += `  3. Review employee performance metrics\n`;
    dashboard += `  4. Maintain supplier relationships\n`;

    return dashboard;
  } else if (role === 'employee') {
    const summary = `📋 **YOUR WORK SUMMARY:**\n\n`;
    const metrics = `✓ Assigned Products: ${context.assignedProducts || 0}\n`;
    const orders = `✓ Assigned Orders: ${context.assignedOrders || 0}\n`;
    const pending = `⚠️ Pending Tasks: ${context.pendingTasks || 0}\n\n`;
    const recommendation = `Focus on completing your pending tasks to keep the team on track!`;
    
    return summary + metrics + orders + pending + recommendation;
  } else if (role === 'supplier') {
    return `📦 **SUPPLIER OVERVIEW:**\n\n✓ Pending Orders: ${context.pendingOrders || 0}\n✓ Delivered: ${context.deliveredOrders || 0}\n\nMaintain excellent delivery performance to strengthen your business relationship with us.`;
  }
};

const getHelpResponse = (role) => {
  const helpMessages = {
    businessowner: `🤖 **I can help you with:**\n\n📊 Business Insights\n  • Inventory status and stock levels\n  • Product availability and low stock alerts\n  • Order management and tracking\n  • Warehouse information\n  • Supplier management\n  • Employee details and team information\n  • Category management\n\n📦 **Specific Details**\n  • Product details, pricing, stock levels\n  • Order information by customer or product\n  • Warehouse locations and managers\n  • Category listings and product counts\n  • Employee information and contact details\n\n💡 **Try asking:**\n  • "How many products do I have?"\n  • "Show me low stock items"\n  • "What's my order status?"\n  • "Tell me about my employees"\n  • "Show my team members"\n  • "Tell me details about product iPhone"\n  • "Show order for John Doe"\n  • "Show all categories"\n  • "Tell me about warehouse locations"\n  • "Help with inventory"`,
    
    employee: `🤖 **I can help you with:**\n\n📦 Task Management\n  • Your assigned tasks and orders\n  • Product details\n  • Delivery status\n  • Work assignments\n\n💡 **Try asking:**\n  • "What are my tasks?"\n  • "Show my assigned orders"\n  • "Tell me about my assignments"\n  • "What products am I managing?"\n  • "Show me my order details"`,
    
    supplier: `🤖 **I can help you with:**\n\n📋 Supply Management\n  • Your pending orders\n  • Delivery status\n  • Order history\n  • Supply requests\n  • Order details and pricing\n\n💡 **Try asking:**\n  • "What are my pending orders?"\n  • "Show my delivery status"\n  • "Tell me about recent orders"\n  • "What do I need to supply?"\n  • "Show order details for [product name]"`
  };

  return helpMessages[role] || helpMessages.businessowner;
};

/**
 * Natural Language Understanding - Advanced Analysis
 * Analyzes user query to understand intent without relying on exact keywords
 */
const analyzeUserIntent = (userMessage) => {
  const message = userMessage.toLowerCase().trim();
  
  // Keywords grouped by concept (ENGLISH ONLY)
  const intents = {
    // INVENTORY RELATED
    inventory: {
      keywords: ['stock', 'inventory', 'item', 'product', 'goods', 'material', 'supplies', 'merchandise'],
      actions: ['check', 'see', 'show', 'view', 'tell', 'how many', 'how much', 'count'],
      variations: ['low stock', 'out of stock', 'available', 'in stock']
    },
    // ORDER RELATED
    order: {
      keywords: ['order', 'orders', 'customer', 'purchase', 'delivery', 'shipment', 'sold', 'sale', 'transaction'],
      actions: ['check', 'track', 'status', 'pending', 'see', 'show', 'tell', 'view', 'list'],
      variations: ['pending order', 'complete order', 'delivered', 'completed', 'processed']
    },
    // LOW STOCK ALERT
    alert: {
      keywords: ['low', 'alert', 'warning', 'ending', 'finish', 'out of stock', 'no stock', 'critical'],
      actions: ['need', 'require', 'must', 'should', 'reorder', 'urgent'],
      variations: ['reorder', 'stock out', 'stock ended', 'no items', 'empty']
    },
    // EMPLOYEE RELATED
    employee: {
      keywords: ['employee', 'staff', 'worker', 'team', 'member', 'person', 'people', 'manager', 'supervisor'],
      actions: ['show', 'list', 'tell', 'get', 'details', 'info', 'view', 'see'],
      variations: ['my team', 'workers', 'my staff', 'team members', 'all employees']
    },
    // WAREHOUSE RELATED
    warehouse: {
      keywords: ['warehouse', 'storage', 'location', 'address', 'store', 'depot', 'place', 'facility'],
      actions: ['where', 'show', 'tell', 'location', 'address', 'find'],
      variations: ['where is', 'find warehouse', 'warehouse location', 'storage location']
    },
    // CATEGORY RELATED
    category: {
      keywords: ['category', 'categories', 'type', 'types', 'group', 'classification', 'class', 'kind'],
      actions: ['show', 'list', 'see', 'all', 'view', 'get'],
      variations: ['all categories', 'product types', 'categories list', 'show categories']
    },
    // SUPPLIER RELATED
    supplier: {
      keywords: ['supplier', 'vendor', 'seller', 'purchase', 'supply', 'ordering', 'procurement', 'source'],
      actions: ['show', 'tell', 'pending', 'check', 'view', 'list'],
      variations: ['pending supplies', 'supplier order', 'purchase order']
    },
    // HELP REQUEST
    help: {
      keywords: ['help', 'what can', 'capability', 'feature', 'assist', 'guidance', 'support', 'instructions'],
      actions: ['do', 'help', 'can', 'show', 'guide'],
      variations: ['what can you do', 'how to use', 'commands', 'features']
    }
  };

  // Analyze intent
  for (const [intent, data] of Object.entries(intents)) {
    const hasKeyword = data.keywords.some(kw => message.includes(kw));
    const hasAction = data.actions.some(act => message.includes(act));
    
    // If has keyword + action or keyword + variation, it's likely this intent
    if (hasKeyword) {
      const hasContext = hasAction || data.variations.some(v => message.includes(v));
      if (hasContext) {
        return intent;
      }
    }
  }
  
  return 'general'; // Default to general inquiry
};

/**
 * Extract specific parameters from user query
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
  // Look for terms after common prepositions
  const patterns = [
    /(?:product|item|order)?\s+(?:named|called|for|about|of)?\s+["']?([^"'.!?]+?)["']?(?:\s|$|\.)/i,
    /["']([^"']+)["']/,
    /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/ // CamelCase names
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
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
 * Convert responses to LIST FORMAT
 */
const formatResponseAsList = (title, items, format = 'simple') => {
  if (!items || items.length === 0) {
    return `❌ **${title}**\n\nNo information found.`;
  }

  let response = `✅ **${title}**\n\n`;
  
  if (format === 'detailed') {
    items.forEach((item, index) => {
      response += `**${index + 1}. ${item.name || item.label}**\n`;
      Object.keys(item).forEach(key => {
        if (key !== 'name' && key !== 'label') {
          response += `   • ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${item[key]}\n`;
        }
      });
      response += '\n';
    });
  } else if (format === 'simple') {
    items.forEach((item, index) => {
      const label = item.name || item.label || item;
      response += `${index + 1}. ${label}\n`;
    });
  } else if (format === 'table') {
    // Table format
    response += '| # | Name | Details |\n';
    response += '|---|------|---------|\n';
    items.forEach((item, index) => {
      response += `| ${index + 1} | ${item.name || item.label} | ${item.details || ''} |\n`;
    });
  }
  
  return response;
};

/**
 * Generate LIST FORMAT responses for different intents
 */
const generateListFormatResponse = (intent, context, userId, role, params = {}) => {
  const lists = {
    inventory: () => {
      const items = context.lowStockProducts?.map(p => ({
        name: `${p.name}`,
        label: `${p.name}`,
        category: p.category,
        current_stock: `${p.totalProducts} units`,
        status: p.totalProducts < 5 ? '🔴 Critical' : '🟡 Low'
      })) || [];
      
      return formatResponseAsList('📦 Stock Status', [
        `📊 Total Products: ${context.products || 0}`,
        `⚠️ Low Stock Items: ${context.lowStockProducts?.length || 0}`,
        ...(items.length > 0 ? ['', '**Low Stock Products:**'] : []),
        ...items.map(i => `   • ${i.name} - ${i.current_stock} (${i.status})`)
      ]);
    },

    order: () => {
      const items = context.recentOrders?.map(o => ({
        name: `${o.customerName} - ${o.productName}`,
        amount: `Amount: ${o.totalAmt}`,
        status: o.productStatus,
        date: new Date(o.orderDate).toLocaleDateString('en-US')
      })) || [];
      
      return formatResponseAsList('📋 Order Information', [
        `📦 Total Orders: ${context.totalOrders || 0}`,
        `⏳ Pending Orders: ${context.pendingOrders || 0}`,
        ...(items.length > 0 ? ['', '**Recent Orders:**'] : []),
        ...items.map(i => `   • ${i.name} - ${i.amount} (${i.status}) - ${i.date}`)
      ]);
    },

    employee: () => {
      const items = context.employeesList?.map(e => ({
        name: `${e.fname} ${e.lname || ''}`,
        email: e.email,
        phone: e.phone,
        position: e.role,
        joined: new Date(e.jDate).toLocaleDateString('en-US')
      })) || [];
      
      return formatResponseAsList('👥 Employee List', [
        `👤 Total Employees: ${context.employees || 0}`,
        ...(items.length > 0 ? ['', '**Employee Details:**'] : []),
        ...items.map(i => `   • ${i.name}\n      📧 ${i.email}\n      📱 ${i.phone}\n      👔 ${i.position}`)
      ]);
    },

    warehouse: () => {
      const items = context.warehouses || 0;
      
      return formatResponseAsList('🏢 Warehouse Information', [
        `🏢 Total Warehouses: ${items}`,
        `📍 Active Locations: ${items}`,
        `📦 Capacity Status: ${items > 0 ? 'Active' : 'No information available'}`
      ]);
    },

    category: () => {
      return formatResponseAsList('📂 Categories', [
        `📂 All Categories`,
        `🏷️ View all product categories`,
        `✏️ Add new categories`
      ]);
    },

    supplier: () => {
      const items = context.recentSupplierOrders?.map(s => ({
        name: s.productName,
        quantity: `${s.quantity} units`,
        price: `Price: ${s.price}`,
        status: s.status
      })) || [];
      
      return formatResponseAsList('📦 Supplier Orders', [
        `📋 Pending Orders: ${context.pendingOrders || 0}`,
        `✅ Delivered Orders: ${context.deliveredOrders || 0}`,
        ...(items.length > 0 ? ['', '**Recent Orders:**'] : []),
        ...items.map(i => `   • ${i.name} - ${i.quantity} - ${i.price} (${i.status})`)
      ]);
    },

    help: () => {
      return `ℹ️ **What Can I Help You With?**\n\n` +
        `I can assist you with the following:\n\n` +
        `1. 📦 **Check Stock**: "How much stock do I have?" or "Show low stock items"\n` +
        `2. 📋 **View Orders**: "Show orders" or "Pending orders"\n` +
        `3. 👥 **Employee Information**: "Show employees" or "Team list"\n` +
        `4. 🏢 **Warehouse Details**: "Where is the warehouse?"\n` +
        `5. 📂 **Categories**: "Show all categories"\n` +
        `6. 📦 **Supplier Orders**: "Supplier orders"\n\n` +
        `**Ask me clearly in English - I will understand! 😊**`;
    }
  };

  return lists[intent]?.() || lists.help();
};

/**
 * Generate response with intelligent analysis
 */
const generateIntelligentResponse = async (userMessage, role, context, userId) => {
  try {
    // 1. ANALYZE USER INTENT
    const intent = analyzeUserIntent(userMessage);
    
    // 2. EXTRACT PARAMETERS
    const params = extractQueryParameters(userMessage);
    
    // 3. FETCH ADDITIONAL DATA IF NEEDED
    if (!context || Object.keys(context).length === 0) {
      context = await getContextForRole(userId, role);
    }
    
    // 4. GENERATE LIST FORMAT RESPONSE
    let response = generateListFormatResponse(intent, context, userId, role, params);
    
    return response;
  } catch (error) {
    console.error('Error in intelligent response:', error);
    return `❌ **Error Occurred**\n\nPlease try again or type 'help' for assistance.`;
  }
};

/**
 * Generate response using simulated AI (can be replaced with real API)
 * For now, uses rule-based responses based on keywords
 */

module.exports = {
  getContextForRole,
  generateSystemPrompt,
  formatContextForAI,
  generateAIResponse,
  analyzeUserIntent,
  extractQueryParameters,
  formatResponseAsList,
  generateIntelligentResponse
};
