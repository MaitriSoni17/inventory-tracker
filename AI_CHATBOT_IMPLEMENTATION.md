# AI Chatbot Implementation Guide

## Overview
The AI Chatbot is a modern, role-based conversational assistant integrated into the Inventory Tracker application. It provides intelligent responses tailored to each user's role (Business Owner, Employee, or Supplier) based on real-time data from the database.

## Features

### 1. **Role-Based Responses**
- **Business Owner**: Access to inventory insights, product management, order tracking, supplier information, and employee management
- **Employee**: Focus on assigned products, tasks, orders, and work-related information
- **Supplier**: Information about pending orders, delivery status, and product supplies

### 2. **Modern UI Design**
- Bottom-right positioned chat window with minimize/expand functionality
- Smooth animations and transitions
- Responsive design for mobile, tablet, and desktop
- Matches the application's purple color scheme
- Dark mode support

### 3. **Interactive Features**
- Real-time message sending and receiving
- Typing indicator while processing
- Message timestamps
- Clear chat history button
- Minimize/Maximize/Close controls

### 4. **Data-Aware Responses**
The chatbot provides context-aware answers by:
- Fetching real-time data from the database
- Analyzing inventory levels
- Tracking order statuses
- Monitoring warehouse information
- Providing business insights

## Architecture

### Backend Components

#### 1. **Route: `/api/chatbot/message`** (POST)
**File**: `backend/routes/chatbot.js`
- Handles incoming chat messages
- Authenticates users
- Validates role information
- Returns AI-generated responses

**Request Body**:
```json
{
  "message": "What is my inventory status?",
  "role": "businessowner",
  "userId": "user_id_here"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Based on your current inventory...",
  "timestamp": "2024-01-01T10:30:00.000Z"
}
```

#### 2. **Utility: `chatbotHelper.js`**
**File**: `backend/utils/chatbotHelper.js`

**Functions**:
- `getContextForRole(userId, role)`: Fetches user-specific data from the database
- `generateSystemPrompt(role)`: Creates role-specific system instructions
- `formatContextForAI(context, role)`: Formats data for intelligent processing
- `generateAIResponse(userMessage, role, context)`: Generates contextual responses

**Data Retrieved**:
- Products count and details
- Order status and history
- Warehouse information
- Supplier and employee details
- Low-stock product alerts

### Frontend Components

#### 1. **Component: `Chatbot.js`**
**File**: `src/components/Chatbot.js`

**Key Features**:
- React hooks for state management
- Axios for API communication
- Message history management
- Loading states and error handling
- Auto-scroll to latest messages
- Accessibility features (ARIA labels)

**State Variables**:
- `isOpen`: Chat window visibility
- `isMinimized`: Minimize state
- `messages`: Chat message history
- `inputMessage`: Current user input
- `isLoading`: API request state

#### 2. **Styling: `chatbot.css`**
**File**: `src/components/styles/chatbot.css`

**Features**:
- Modern gradient design
- Smooth animations
- Responsive breakpoints
- Dark mode support
- Accessibility-first approach

#### 3. **Integration: `SideBar.js`**
The Chatbot component is integrated into the SideBar, making it available on all dashboard pages.

## Installation & Setup

### 1. **Dependencies Already Installed**
```bash
# Frontend
npm install axios

# Backend
npm install axios
```

### 2. **Backend Setup**
The chatbot route is already registered in `backend/index.js`:
```javascript
app.use('/api/chatbot', require('./routes/chatbot'));
```

### 3. **Frontend Integration**
The Chatbot component is imported and rendered in `SideBar.js`:
```javascript
import Chatbot from './Chatbot';
// Used in JSX: <Chatbot />
```

## Usage

### For End Users
1. Click the purple chat button (bottom-right corner)
2. Type your question in the input field
3. Press Enter or click the send button
4. Get instant, role-specific responses
5. Use minimize button to collapse the window
6. Use clear button to reset chat history

### Example Queries
**Business Owner**:
- "What is my inventory status?"
- "Show me pending orders"
- "Which products have low stock?"
- "Tell me about my warehouses"

**Employee**:
- "What are my assigned tasks?"
- "Show my pending orders"
- "Tell me about assigned products"
- "What's my task status?"

**Supplier**:
- "What orders are pending?"
- "Show my delivery status"
- "Tell me about my supplies"
- "List recent orders"

## API Endpoints

### POST `/api/chatbot/message`
Sends a message and receives AI response

**Authentication**: Required (JWT)
**Content-Type**: `application/json`

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| message | string | Yes | User's question/message |
| role | string | Yes | User role (businessowner, employee, supplier) |
| userId | string | Yes | User's unique ID |

**Response Codes**:
- `200`: Success
- `400`: Invalid input or role
- `500`: Server error

### GET `/api/chatbot/history`
Retrieves chat history (extensible for future use)

**Authentication**: Required (JWT)
**Response**: Empty array (can be extended)

## Customization

### 1. **Modify Response Logic**
Edit `backend/utils/chatbotHelper.js`:
```javascript
const generateAIResponse = async (userMessage, role, context) => {
  // Add your custom logic here
};
```

### 2. **Customize Styling**
Edit `src/components/styles/chatbot.css`:
```css
:root {
  --chatbot-primary: #7300FF; /* Change primary color */
  /* Modify other CSS variables */
}
```

### 3. **Add AI Integration**
To integrate with real AI services (OpenAI, Anthropic, etc.):
1. Install SDK: `npm install openai` (or preferred provider)
2. Add API key to environment variables
3. Modify `generateAIResponse()` to call the API

Example with OpenAI:
```javascript
const { Configuration, OpenAIApi } = require("openai");

const generateAIResponse = async (userMessage, role, context) => {
  const openai = new OpenAIApi(
    new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    })
  );

  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: generateSystemPrompt(role)
      },
      {
        role: "user",
        content: `${formatContextForAI(context, role)}\n\nUser question: ${userMessage}`
      }
    ],
  });

  return response.data.choices[0].message.content;
};
```

### 4. **Extend Database Queries**
Add more data retrieval in `getContextForRole()`:
```javascript
const getContextForRole = async (userId, role) => {
  // Fetch additional data
  context.customData = await CustomModel.find({ userId });
  return context;
};
```

## Environment Variables

Create a `.env` file in the backend directory:
```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

# Optional: For real AI integration
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Testing

### 1. **Manual Testing**
1. Start the backend: `npm run start` (in backend directory)
2. Start the frontend: `npm start` (in root directory)
3. Login with different user roles
4. Open the chatbot and test various queries

### 2. **Test Scenarios**

#### Business Owner Tests
```
Test Query 1: "What is my inventory status?"
Expected: Display product count, low stock items, recent orders

Test Query 2: "Show pending orders"
Expected: List pending customer orders with status

Test Query 3: "Tell me about warehouses"
Expected: Display warehouse count and information

Test Query 4: "help"
Expected: Show available assistance options
```

#### Employee Tests
```
Test Query 1: "What are my assigned tasks?"
Expected: Show assigned products and orders

Test Query 2: "Show my pending orders"
Expected: List pending orders assigned to employee

Test Query 3: "What's my task status?"
Expected: Display pending tasks count
```

#### Supplier Tests
```
Test Query 1: "What orders are pending?"
Expected: Show pending supply orders

Test Query 2: "Show delivery status"
Expected: Display delivered and pending orders summary

Test Query 3: "Tell me about recent orders"
Expected: List recent supplier orders
```

### 3. **Error Testing**
- Send empty message → Error message displayed
- Send request without authentication → API error handling
- Network timeout → Graceful error message
- Invalid role → Error validation

## Performance Optimization

### 1. **Message Caching**
The chatbot can implement response caching for frequently asked questions:
```javascript
const cache = new Map();

const getCachedResponse = (key) => cache.get(key);
const setCachedResponse = (key, response) => cache.set(key, response);
```

### 2. **Database Query Optimization**
- Use `.select()` to fetch only required fields
- Implement pagination for large datasets
- Add indexes to frequently queried fields

### 3. **Frontend Optimization**
- Lazy load chatbot component
- Debounce input for API calls
- Implement virtual scrolling for large message lists

## Security Considerations

1. **Authentication**: All chatbot endpoints require JWT authentication
2. **Input Validation**: Messages are validated for length and content
3. **Rate Limiting**: Consider implementing rate limiting (example: max 20 messages/minute)
4. **Data Sanitization**: All user inputs should be sanitized
5. **Role-Based Access**: Responses are strictly filtered by user role

## Troubleshooting

### Issue: Chatbot button not visible
**Solution**: 
- Check if chatbot.css is properly imported
- Verify z-index values don't conflict with other elements
- Check browser console for CSS errors

### Issue: Messages not sending
**Solution**:
- Verify backend is running on port 5000
- Check if user is authenticated (JWT token present)
- Check browser network tab for API errors
- Verify role and userId are passed correctly

### Issue: Responses are generic
**Solution**:
- Check database connectivity
- Verify userId is correctly stored in localStorage
- Check chatbotHelper.js queries are finding data
- Review browser console for database errors

### Issue: Styling looks broken
**Solution**:
- Clear browser cache
- Verify chatbot.css is loaded
- Check for CSS conflicts with other stylesheets
- Test in incognito mode

## Future Enhancements

1. **Real AI Integration**: Connect with OpenAI, Anthropic, or other LLM providers
2. **Chat History Persistence**: Save conversations to database
3. **File Support**: Allow users to upload files for analysis
4. **Voice Input/Output**: Add speech recognition and synthesis
5. **Smart Suggestions**: Provide suggested questions based on context
6. **Analytics**: Track commonly asked questions and user satisfaction
7. **Multi-language Support**: Support multiple languages
8. **Webhooks**: Trigger actions based on chatbot responses
9. **Custom Training**: Fine-tune AI model with business-specific data
10. **Integration with Business Tools**: Connect with other systems (email, CRM, etc.)

## Support & Contribution

For issues, feature requests, or improvements, please:
1. Check this documentation first
2. Review existing code comments
3. Test in different browsers and devices
4. Document any issues encountered
5. Provide detailed error messages and logs

---

**Version**: 1.0.0
**Last Updated**: December 2024
**Status**: Production Ready
