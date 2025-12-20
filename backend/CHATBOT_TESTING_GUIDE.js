/**
 * Chatbot Testing Guide
 * Test the improved AI chatbot with various query types
 */

const testQueries = {
  // General queries that should work with the improved chatbot
  businessOwnerQueries: [
    // Greetings
    { query: "Hello", expectedIntent: "greeting" },
    { query: "Hi there", expectedIntent: "greeting" },
    { query: "Good morning", expectedIntent: "greeting" },

    // Inventory queries
    { query: "How many products do I have?", expectedIntent: "inventory_status" },
    { query: "Tell me about my inventory", expectedIntent: "inventory_status" },
    { query: "What's my product count?", expectedIntent: "inventory_status" },
    { query: "Show inventory", expectedIntent: "inventory_status" },

    // Order queries
    { query: "What's my order status?", expectedIntent: "order_status" },
    { query: "How many orders are pending?", expectedIntent: "order_status" },
    { query: "Show me my orders", expectedIntent: "order_status" },
    { query: "Tell me about recent orders", expectedIntent: "order_status" },

    // Low stock queries
    { query: "Which products need restocking?", expectedIntent: "low_stock_alert" },
    { query: "Show me low stock items", expectedIntent: "low_stock_alert" },
    { query: "Are any products running low?", expectedIntent: "low_stock_alert" },
    { query: "Low stock alert", expectedIntent: "low_stock_alert" },

    // Warehouse queries
    { query: "How many warehouses do I have?", expectedIntent: "warehouse_info" },
    { query: "Tell me about my warehouses", expectedIntent: "warehouse_info" },
    { query: "Show warehouse information", expectedIntent: "warehouse_info" },

    // Supplier queries
    { query: "How many suppliers do I manage?", expectedIntent: "supplier_info" },
    { query: "Tell me about my suppliers", expectedIntent: "supplier_info" },

    // Help queries
    { query: "Help", expectedIntent: "help" },
    { query: "What can you do?", expectedIntent: "help" },
    { query: "Show me available commands", expectedIntent: "help" },

    // General inquiries
    { query: "How are things?", expectedIntent: "general_inquiry" },
    { query: "What's going on?", expectedIntent: "general_inquiry" },
    { query: "Tell me everything", expectedIntent: "general_inquiry" }
  ],

  employeeQueries: [
    { query: "Hello", expectedIntent: "greeting" },
    { query: "What are my tasks?", expectedIntent: "employee_tasks" },
    { query: "Show my assigned orders", expectedIntent: "order_status" },
    { query: "What products am I managing?", expectedIntent: "inventory_status" },
    { query: "Tell me my pending work", expectedIntent: "employee_tasks" },
    { query: "Help", expectedIntent: "help" }
  ],

  supplierQueries: [
    { query: "Hello", expectedIntent: "greeting" },
    { query: "What orders are pending?", expectedIntent: "supplier_info" },
    { query: "Show my delivery status", expectedIntent: "supplier_info" },
    { query: "What do I need to supply?", expectedIntent: "supplier_info" },
    { query: "Tell me about my orders", expectedIntent: "supplier_info" },
    { query: "Help", expectedIntent: "help" }
  ]
};

/**
 * Manual Testing Steps
 */
const testingSteps = {
  setup: [
    "1. Start the backend: npm start (in backend folder)",
    "2. Start the frontend: npm start (in root folder)",
    "3. Log in as a Business Owner",
    "4. Click the chatbot icon (bottom right)",
    "5. Run tests below"
  ],

  businessOwnerTests: [
    {
      name: "Test 1: Greeting",
      query: "Hello",
      expectation: "Should show a friendly greeting with capabilities"
    },
    {
      name: "Test 2: Inventory Status",
      query: "How many products do I have?",
      expectation: "Should show product count, warehouses, suppliers, and low stock alerts"
    },
    {
      name: "Test 3: Order Management",
      query: "What's my order status?",
      expectation: "Should show total orders, pending orders, and recent order details"
    },
    {
      name: "Test 4: Low Stock Alert",
      query: "Which products need restocking?",
      expectation: "Should list products with low stock and suggest reordering"
    },
    {
      name: "Test 5: General Query",
      query: "Tell me about my business",
      expectation: "Should provide comprehensive business overview with metrics"
    },
    {
      name: "Test 6: Help Command",
      query: "Help",
      expectation: "Should list all available commands and example queries"
    },
    {
      name: "Test 7: Varied Phrasing",
      query: "Show inventory",
      expectation: "Should handle different ways of asking same question"
    },
    {
      name: "Test 8: Complex Query",
      query: "Tell me about my suppliers and warehouses",
      expectation: "Should intelligently respond with relevant information"
    }
  ],

  employeeTests: [
    {
      name: "Test 1: Task Assignment",
      query: "What are my tasks?",
      expectation: "Should show assigned products, orders, and pending tasks"
    },
    {
      name: "Test 2: Order Details",
      query: "Show my assigned orders",
      expectation: "Should list assigned orders with status and delivery info"
    },
    {
      name: "Test 3: Help",
      query: "Help",
      expectation: "Should show employee-specific help information"
    }
  ],

  supplierTests: [
    {
      name: "Test 1: Pending Orders",
      query: "What orders are pending?",
      expectation: "Should show pending and delivered orders count"
    },
    {
      name: "Test 2: Supply Status",
      query: "Tell me about my orders",
      expectation: "Should list recent supply orders with details"
    }
  ]
};

/**
 * API Testing with cURL
 */
const curlExamples = {
  businessOwnerExample: `
# Get Business Owner with user ID and auth token
curl -X POST http://localhost:5000/api/chatbot/message \\
  -H "Content-Type: application/json" \\
  -H "auth-token: YOUR_AUTH_TOKEN_HERE" \\
  -d '{
    "message": "How many products do I have?",
    "role": "businessowner"
  }'
  `,

  employeeExample: `
# Get Employee response
curl -X POST http://localhost:5000/api/chatbot/message \\
  -H "Content-Type: application/json" \\
  -H "auth-token: YOUR_AUTH_TOKEN_HERE" \\
  -d '{
    "message": "What are my tasks?",
    "role": "employee"
  }'
  `,

  generalExample: `
# Test with various messages
curl -X POST http://localhost:5000/api/chatbot/message \\
  -H "Content-Type: application/json" \\
  -H "auth-token: YOUR_AUTH_TOKEN_HERE" \\
  -d '{
    "message": "Help",
    "role": "businessowner"
  }'
  `
};

/**
 * Expected Response Formats
 */
const expectedResponses = {
  greeting: {
    description: "Friendly greeting with capabilities",
    format: "Contains emoji, greeting message, and list of capabilities"
  },
  inventoryStatus: {
    description: "Detailed inventory overview",
    format: "Contains product count, warehouses, suppliers, low stock alerts"
  },
  orderStatus: {
    description: "Order management information",
    format: "Contains total orders, pending count, recent order details"
  },
  help: {
    description: "Available commands and features",
    format: "Contains emoji, section headers, example queries with format"
  }
};

/**
 * Performance Testing
 */
const performanceNotes = {
  withoutOpenAI: {
    responseTime: "Instant (< 100ms)",
    description: "Rule-based response",
    recommendation: "Suitable for high-traffic scenarios"
  },
  withOpenAI: {
    responseTime: "1-3 seconds",
    description: "AI-powered natural language response",
    recommendation: "Better quality responses, may need rate limiting"
  }
};

console.log("=== AI Chatbot Improvement Testing Guide ===\n");
console.log("Setup Steps:");
testingSteps.setup.forEach(step => console.log(step));

console.log("\n\nBusiness Owner Test Cases:");
testingSteps.businessOwnerTests.forEach(test => {
  console.log(`\n${test.name}`);
  console.log(`Query: "${test.query}"`);
  console.log(`Expectation: ${test.expectation}`);
});

console.log("\n\nEmployee Test Cases:");
testingSteps.employeeTests.forEach(test => {
  console.log(`\n${test.name}`);
  console.log(`Query: "${test.query}"`);
  console.log(`Expectation: ${test.expectation}`);
});

console.log("\n\nSupplier Test Cases:");
testingSteps.supplierTests.forEach(test => {
  console.log(`\n${test.name}`);
  console.log(`Query: "${test.query}"`);
  console.log(`Expectation: ${test.expectation}`);
});

console.log("\n\ncURL Examples:");
console.log("Business Owner: ", curlExamples.businessOwnerExample);
console.log("Employee: ", curlExamples.employeeExample);
console.log("General: ", curlExamples.generalExample);

module.exports = { testQueries, testingSteps, curlExamples, expectedResponses };
