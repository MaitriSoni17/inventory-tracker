// Knowledge base for the AI chatbot
// Contains company information, FAQs, and features

const chatbotKnowledge = {
  // Company Information
  company: {
    name: 'Inline Tracker',
    description: 'Smart inventory management solution for modern businesses',
    tagline: 'Streamline your inventory operations with our AI-powered management system',
    founded: '2023',
    users: '1000+',
    companies: '50+',
    uptime: '99.9%'
  },

  // Features
  features: {
    inventory: {
      title: 'Inventory Management',
      description: 'Real-time tracking of products across multiple warehouses',
      benefits: [
        'Real-time stock tracking across all locations',
        'Multi-warehouse support for distributed operations',
        'Automatic low-stock alerts and notifications',
        'Category organization and product classification',
        'Barcode scanning for quick inventory updates',
        'Historical stock tracking and reports'
      ]
    },
    orders: {
      title: 'Order Management',
      description: 'Manage customer orders from creation to delivery',
      benefits: [
        'Create and track customer orders easily',
        'Delivery scheduling and timeline management',
        'Real-time status monitoring and updates',
        'Complete order history and archives',
        'Automated order notifications',
        'Invoice generation and management'
      ]
    },
    employees: {
      title: 'Employee Management',
      description: 'Manage your team efficiently',
      benefits: [
        'Team member management and profiles',
        'Task assignment and tracking',
        'Performance monitoring and analytics',
        'Role-based access control system',
        'Attendance tracking',
        'Shift management and scheduling'
      ]
    },
    suppliers: {
      title: 'Supplier Management',
      description: 'Streamline supplier relationships and orders',
      benefits: [
        'Supplier profile management',
        'Purchase order creation and tracking',
        'Delivery tracking and updates',
        'Order history and records',
        'Payment terms management',
        'Supplier rating and review system'
      ]
    },
    warehouses: {
      title: 'Warehouse Management',
      description: 'Organize and manage multiple warehouse locations',
      benefits: [
        'Multi-location inventory tracking',
        'Location management and organization',
        'Warehouse capacity monitoring',
        'Distribution optimization',
        'Zone management within warehouses',
        'Stock transfer tracking between locations'
      ]
    },
    chatbot: {
      title: 'AI Chatbot Assistant',
      description: 'Get instant answers to your inventory questions',
      benefits: [
        'Natural language query processing',
        'Instant insights and recommendations',
        'Smart business suggestions',
        '24/7 availability and support',
        'Multi-language support',
        'Learning from interactions'
      ]
    },
    analytics: {
      title: 'Analytics & Reports',
      description: 'Gain deep insights into your business operations',
      benefits: [
        'Real-time dashboards and visualizations',
        'Custom report generation',
        'Sales analytics and trends',
        'Business trend analysis',
        'Export functionality for data analysis',
        'Key performance indicator (KPI) tracking'
      ]
    },
    security: {
      title: 'Security & Compliance',
      description: 'Enterprise-grade data protection',
      benefits: [
        'End-to-end data encryption',
        'Role-based access control',
        'Complete audit logs',
        'Automatic data backup',
        'Two-factor authentication',
        'GDPR compliance'
      ]
    },
    integration: {
      title: 'Integration & Automation',
      description: 'Seamlessly integrate with existing tools',
      benefits: [
        'REST API integrations',
        'Workflow automation',
        'Email notifications',
        'Scheduled automated reports',
        'Third-party application support',
        'Webhook support for real-time updates'
      ]
    }
  },

  // Why Choose Us
  whyChooseUs: {
    title: 'Why Choose Inline Tracker?',
    reasons: [
      'Easy to use interface with minimal learning curve',
      'Affordable pricing for small and medium businesses',
      'Fast deployment with quick onboarding',
      'Dedicated 24/7 customer support',
      'Regular feature updates and improvements',
      'Cloud-based solution with no installation',
      'Scalable to grow with your business',
      'Real-time data and insights',
      'Mobile app for on-the-go management',
      'Enterprise-grade security'
    ]
  },

  // Pricing & Plans
  pricing: {
    plans: [
      'Starter Plan - Perfect for small businesses',
      'Professional Plan - For growing companies',
      'Enterprise Plan - Complete solution for large organizations'
    ]
  },

  // Support & Contact
  support: {
    email: 'support@inlinetracker.com',
    phone: '+1 (555) 123-4567',
    hours: 'Monday to Friday, 9 AM to 6 PM EST',
    liveChat: 'Available 24/7 for premium users'
  },

  // Frequently Asked Questions
  faqs: {
    'getting-started': [
      {
        q: 'How do I get started with Inline Tracker?',
        a: 'Getting started is easy - sign up for an account, complete the onboarding wizard, and start managing your inventory immediately'
      },
      {
        q: 'Do I need technical knowledge to use Inline Tracker?',
        a: 'No technical knowledge required - our intuitive interface is designed for everyone'
      },
      {
        q: 'Is there a free trial available?',
        a: 'Yes, we offer a 14-day free trial with full access to all features'
      }
    ],
    'pricing': [
      {
        q: 'What are your pricing plans?',
        a: 'We offer flexible plans starting from $29/month for startups to enterprise solutions'
      },
      {
        q: 'Can I upgrade or downgrade my plan?',
        a: 'Yes, you can change your plan anytime with changes taking effect in the next billing cycle'
      },
      {
        q: 'Do you offer discounts for annual billing?',
        a: 'Yes, we offer up to 20% discount for annual subscriptions'
      }
    ],
    'features': [
      {
        q: 'What features are included in the Starter plan?',
        a: 'Starter plan includes inventory management, basic reporting, up to 5 users, and customer support'
      },
      {
        q: 'Can I add more users to my account?',
        a: 'Yes, you can add additional users at any time - additional user fees apply'
      },
      {
        q: 'Is there an API for custom integrations?',
        a: 'Yes, we provide a comprehensive REST API for custom integrations with third-party applications'
      }
    ],
    'support': [
      {
        q: 'What support is available?',
        a: 'We offer email support, phone support during business hours, and live chat for premium users'
      },
      {
        q: 'How quickly will I receive support?',
        a: 'We aim to respond within 2 hours for urgent issues and 24 hours for regular inquiries'
      },
      {
        q: 'Is there training available?',
        a: 'Yes, we provide video tutorials, documentation, and personalized training sessions'
      }
    ]
  }
};

// Keywords mapping for intelligent response matching
const keywordMappings = {
  // Feature related keywords
  'inventory|stock|products|warehouse': 'inventory',
  'order|customer|delivery|fulfillment': 'orders',
  'employee|team|staff|user|role': 'employees',
  'supplier|vendor|purchase': 'suppliers',
  'warehouse|location|facility': 'warehouses',
  'chatbot|assistant|ai': 'chatbot',
  'report|analytics|dashboard|insight|metric|kpi': 'analytics',
  'security|encrypt|password|safe|compliance|gdpr': 'security',
  'integration|api|webhook|automation|sync': 'integration',

  // Why choose us keywords
  'why|choose|benefit|advantage|reason|difference': 'whyChooseUs',

  // Pricing keywords
  'price|cost|plan|subscription|billing|payment': 'pricing',

  // Support keywords
  'help|support|contact|problem|issue|error|assist': 'support',
  'phone|email|chat|reach': 'support',

  // FAQ keywords
  'faq|question|how|what|when|where|start|begin|begin': 'faqs'
};

export { chatbotKnowledge, keywordMappings };
