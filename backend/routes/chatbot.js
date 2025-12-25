const express = require('express');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser');
const { getContextForRole, generateAIResponse } = require('../utils/chatbotHelper');

/**
 * Public Homepage Chatbot Endpoint (No Authentication Required)
 * Provides information about the company, features, FAQs, etc.
 */
router.post('/homepage', async (req, res) => {
  try {
    const { message } = req.body;

    // Validate input
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message cannot be empty'
      });
    }

    // Get response from helper function (for public knowledge base)
    const response = await generatePublicChatbotResponse(message);

    // Return response in list format
    res.json({
      success: true,
      message: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error processing your message'
    });
  }
});

/**
 * Generate response for homepage chatbot using local knowledge base
 */
const generatePublicChatbotResponse = async (userMessage) => {
  const lowerMessage = userMessage.toLowerCase();

  // Knowledge base for homepage chatbot
  const publicKnowledge = {
    features: {
      inventory: [
        '✅ Real-time stock tracking across all locations',
        '✅ Multi-warehouse support for distributed operations',
        '✅ Automatic low-stock alerts and notifications',
        '✅ Category organization and product classification',
        '✅ Barcode scanning for quick inventory updates',
        '✅ Historical stock tracking and reports'
      ],
      orders: [
        '✅ Create and track customer orders easily',
        '✅ Delivery scheduling and timeline management',
        '✅ Real-time status monitoring and updates',
        '✅ Complete order history and archives',
        '✅ Automated order notifications',
        '✅ Invoice generation and management'
      ],
      employees: [
        '✅ Team member management and profiles',
        '✅ Task assignment and tracking',
        '✅ Performance monitoring and analytics',
        '✅ Role-based access control system',
        '✅ Attendance tracking',
        '✅ Shift management and scheduling'
      ],
      suppliers: [
        '✅ Supplier profile management',
        '✅ Purchase order creation and tracking',
        '✅ Delivery tracking and updates',
        '✅ Order history and analytics',
        '✅ Payment terms management',
        '✅ Rating and review system'
      ],
      warehouses: [
        '✅ Multi-location inventory tracking',
        '✅ Location-based warehouse management',
        '✅ Capacity monitoring and optimization',
        '✅ Distribution across facilities',
        '✅ Zone management within warehouses',
        '✅ Transfer tracking between locations'
      ],
      all: [
        '✅ Real-time inventory tracking',
        '✅ Comprehensive order management',
        '✅ Employee management system',
        '✅ Supplier management',
        '✅ Multi-warehouse support',
        '✅ AI Chatbot Assistant (24/7)',
        '✅ Advanced Analytics & Reports',
        '✅ Enterprise-grade Security',
        '✅ API Integration support',
        '✅ Automated notifications'
      ]
    },
    
    whyChooseUs: [
      '🎯 Designed specifically for SMBs - affordable and scalable',
      '🚀 Easy to use interface - no technical expertise required',
      '⚡ Fast deployment - get started in minutes',
      '🔒 Enterprise-grade security with encrypted data',
      '📊 Real-time insights for better decision making',
      '💬 24/7 AI assistant for instant support',
      '🤝 Dedicated customer support team',
      '🔄 Continuous updates and new features',
      '📱 Mobile-friendly interface',
      '✨ Proven by 1000+ active users across 50+ companies'
    ],

    values: [
      '🎯 Accuracy - We ensure precise inventory tracking at all times',
      '⚡ Efficiency - We streamline operations and eliminate waste',
      '🔐 Security - We prioritize data protection and compliance',
      '🤝 Support - We provide 24/7 dedicated customer service',
      '💡 Innovation - We continuously improve with AI and ML',
      '🌍 Sustainability - We promote responsible business practices'
    ],

    pricing: [
      '💰 Flexible pricing plans for all business sizes',
      '🆓 14-day free trial with full feature access',
      '❌ No credit card required for trial',
      '📈 Scalable pricing as your business grows',
      '🎁 Special discounts for annual subscriptions',
      '📞 Contact us for enterprise custom pricing'
    ],

    about: [
      '🏢 Founded in 2023 to democratize inventory management',
      '👥 Serving 1000+ active users across 50+ companies',
      '📊 99.9% uptime guarantee with enterprise infrastructure',
      '🌐 Cloud-based solution accessible from anywhere',
      '🔐 GDPR compliant with end-to-end encryption',
      '🚀 Continuously evolving with user feedback'
    ],

    faq: {
      "what is inline tracker": [
        'Inline Tracker is a modern cloud-based inventory management system',
        'Designed for small to medium-sized businesses',
        'Helps track products, manage orders, and optimize supply chain',
        'Includes AI-powered insights and automated notifications'
      ],
      "free trial": [
        '✅ 14-day free trial with full access to all features',
        '✅ No credit card required to start',
        '✅ Access all premium features during trial',
        '✅ Automatic email reminders before trial ends',
        '✅ Cancel anytime with no penalties'
      ],
      "support": [
        '📞 24/7 customer support via email and live chat',
        '📚 Comprehensive documentation and tutorials',
        '🎓 Video training sessions for team members',
        '💬 AI assistant for quick answers',
        '🤝 Dedicated account manager for enterprises'
      ],
      "security": [
        '🔒 End-to-end encryption for all data',
        '🛡️ Enterprise-grade security infrastructure',
        '✅ Regular security audits and updates',
        '📋 GDPR and compliance certifications',
        '🔐 Two-factor authentication available',
        '📊 Daily automated backups'
      ],
      "integration": [
        '✅ REST API for custom integrations',
        '🔗 Webhook support for event automation',
        '📊 Export data in multiple formats',
        '🔄 Scheduled report generation',
        '🔌 Third-party app marketplace integrations',
        '📱 Mobile app with sync capabilities'
      ],
      "training": [
        '✅ Onboarding sessions for new users',
        '📹 Video tutorials on all features',
        '📚 Detailed documentation and guides',
        '🎓 Webinars and training courses',
        '👥 Custom team training programs',
        '💬 AI assistant for quick help'
      ],
      "requirements": [
        '🌐 Works with any modern web browser',
        '📱 Mobile apps for iOS and Android',
        '🔌 Internet connection required',
        '⚙️ No software installation needed',
        '🖥️ Works on Windows, Mac, and Linux',
        '⚡ Optimized for fast performance'
      ],
      "get started": [
        '⚡ Setup takes less than 5 minutes',
        '🚀 Start using core features immediately',
        '📤 Easy data import from existing systems',
        '👥 Invite team members instantly',
        '📊 Create first reports in minutes',
        '✅ Full setup assistance available'
      ]
    }
  };

  // Determine response based on user query
  if (lowerMessage.includes('feature') || lowerMessage.includes('offer') || lowerMessage.includes('can you do')) {
    if (lowerMessage.includes('order')) return formatListResponse('Order Management Features', publicKnowledge.features.orders);
    if (lowerMessage.includes('employee')) return formatListResponse('Employee Management Features', publicKnowledge.features.employees);
    if (lowerMessage.includes('supplier')) return formatListResponse('Supplier Management Features', publicKnowledge.features.suppliers);
    if (lowerMessage.includes('warehouse')) return formatListResponse('Warehouse Management Features', publicKnowledge.features.warehouses);
    if (lowerMessage.includes('inventory') || lowerMessage.includes('stock')) return formatListResponse('Inventory Management Features', publicKnowledge.features.inventory);
    return formatListResponse('✨ Inline Tracker Features', publicKnowledge.features.all);
  }

  if (lowerMessage.includes('why') || lowerMessage.includes('choose') || lowerMessage.includes('advantage') || lowerMessage.includes('benefit')) {
    return formatListResponse('⭐ Why Choose Inline Tracker?', publicKnowledge.whyChooseUs);
  }

  if (lowerMessage.includes('value') || lowerMessage.includes('mission') || lowerMessage.includes('principle')) {
    return formatListResponse('🎯 Our Core Values', publicKnowledge.values);
  }

  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('plan') || lowerMessage.includes('trial')) {
    return formatListResponse('💰 Pricing & Trial Information', publicKnowledge.pricing);
  }

  if (lowerMessage.includes('about') || lowerMessage.includes('company') || lowerMessage.includes('who are you')) {
    return formatListResponse('📋 About Inline Tracker', publicKnowledge.about);
  }

  // Check for FAQ questions
  for (const [key, answer] of Object.entries(publicKnowledge.faq)) {
    if (lowerMessage.includes(key)) {
      const title = key.charAt(0).toUpperCase() + key.slice(1).replace(/[_-]/g, ' ');
      return formatListResponse(title, answer);
    }
  }

  // Check for other FAQ patterns
  if (lowerMessage.includes('how') && lowerMessage.includes('start')) {
    return formatListResponse('🚀 Getting Started', publicKnowledge.faq['get started']);
  }
  if (lowerMessage.includes('train') || lowerMessage.includes('learn')) {
    return formatListResponse('🎓 Training & Support', publicKnowledge.faq.training);
  }
  if (lowerMessage.includes('require') || lowerMessage.includes('system') || lowerMessage.includes('browser')) {
    return formatListResponse('⚙️ System Requirements', publicKnowledge.faq.requirements);
  }

  // Default helpful response
  return formatListResponse('How can I help?', [
    '📌 Ask about our features and capabilities',
    '📌 Learn why you should choose Inline Tracker',
    '📌 Explore our company values and mission',
    '📌 Check pricing and trial information',
    '📌 Browse frequently asked questions',
    '📌 Ask about support, security, training, or integration'
  ]);
};

/**
 * Format response as a list string
 */
const formatListResponse = (title, items) => {
  if (!Array.isArray(items)) return String(items);
  const list = items.join('\n');
  return `${title}\n\n${list}`;
};

// GET endpoint to fetch chat history (optional)
router.get('/history', fetchuser, async (req, res) => {
  try {
    // For now, return empty history - can be expanded to use a Chat model
    res.json({
      success: true,
      messages: [],
      message: 'Chat history retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching chat history'
    });
  }
});

// POST endpoint to send message and get response
router.post('/message', fetchuser, async (req, res) => {
  try {
    const { message, role } = req.body;
    
    // Use authenticated user's ID from middleware (req.user is the full user object)
    const userId = req.user?._id;

    // Validate input
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message cannot be empty'
      });
    }

    if (!role || !['businessowner', 'employee', 'supplier'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication failed'
      });
    }

    // Get context based on user's role and data
    const context = await getContextForRole(userId, role);

    // Generate AI response (pass userId for specific entity queries)
    const aiResponse = await generateAIResponse(message, role, context, userId);

    // Return response
    res.json({
      success: true,
      message: aiResponse,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error processing your message'
    });
  }
});

module.exports = router;


