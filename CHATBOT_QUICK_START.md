# AI Chatbot - Quick Start Guide

## Quick Setup (2 minutes)

### 1. **Start Backend Server**
```bash
cd backend
npm install    # If not already done
nodemon index.js
# Or: npm run dev (if script exists)
```

Backend should be running on: `http://localhost:5000`

### 2. **Start Frontend Application**
```bash
# In root directory (in another terminal)
npm install    # If not already done
npm start
```

Frontend will open on: `http://localhost:3000`

### 3. **Login to Application**
- Use existing credentials or create a new account
- Make sure you're logged in to the dashboard

### 4. **Test the Chatbot**
- Look for the **purple chat button** in the **bottom-right corner**
- Click the button to open the chatbot window
- Try asking a question related to your role

## Test Queries by Role

### For Business Owner
Click to test these queries:

```
"What is my inventory status?"
↓
Expected: Shows product count, low stock items, and recent orders

"Show pending orders"
↓
Expected: Lists all pending customer orders

"Tell me about my suppliers"
↓
Expected: Displays supplier count and information

"How many employees do I have?"
↓
Expected: Shows employee count

"Which products have low stock?"
↓
Expected: Lists products with less than 10 units
```

### For Employee
Click to test these queries:

```
"What are my assigned tasks?"
↓
Expected: Shows assigned products and pending orders count

"Show my pending orders"
↓
Expected: Lists all orders assigned to you

"What's my task status?"
↓
Expected: Displays pending tasks information

"help"
↓
Expected: Shows available assistance options
```

### For Supplier
Click to test these queries:

```
"What orders are pending?"
↓
Expected: Shows pending supply orders count

"Show my delivery status"
↓
Expected: Displays delivered and pending orders

"Tell me about recent orders"
↓
Expected: Lists your recent supply orders

"help"
↓
Expected: Shows assistance options for suppliers
```

## Chatbot Features

### 1. **Open/Close**
- Click the **purple chat button** to open
- Click the **X button** in the header to close
- Chat button reappears when closed

### 2. **Minimize/Expand**
- Click the **minimize icon** (−) to collapse the chat window
- Only header shows when minimized
- Click again to expand

### 3. **Clear Chat**
- Click the **refresh icon** (↻) to clear chat history
- Resets conversation to initial greeting

### 4. **Send Message**
- Type your question in the input field
- Press **Enter** or click the **send button** (paper plane)
- Wait for AI response
- Message timestamp appears below each message

### 5. **Visual Feedback**
- User messages appear in **purple** on the right
- Bot messages appear in **light gray** on the left
- **Typing indicator** (3 dots) shows while processing
- Error messages appear in **red**

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Send Message | Enter |
| Focus Input | Tab (when chatbot open) |
| Close Chat | Esc (if implemented) |

## Styling & Design

The chatbot features a modern design that matches your application:

- **Colors**: Purple gradient theme matching app branding
- **Icons**: Font Awesome icons for consistency
- **Animations**: Smooth sliding and fading transitions
- **Responsive**: Works on mobile, tablet, and desktop
- **Shadows**: Professional depth and elevation
- **Typography**: Clean, readable fonts

## File Structure

```
inventory-tracker/
├── backend/
│   ├── routes/
│   │   └── chatbot.js          ← Chatbot API endpoint
│   ├── utils/
│   │   └── chatbotHelper.js    ← AI response logic
│   └── index.js                ← Route registration
│
├── src/
│   ├── components/
│   │   ├── Chatbot.js          ← React component
│   │   └── styles/
│   │       └── chatbot.css     ← Styling
│   └── SideBar.js              ← Integration point
│
└── AI_CHATBOT_IMPLEMENTATION.md ← Full documentation
```

## Troubleshooting Quick Fixes

### Chat button not showing?
1. Check browser console (F12) for errors
2. Verify CSS file is loaded (in Network tab)
3. Clear browser cache (Ctrl+Shift+Delete)
4. Try incognito mode

### Can't send messages?
1. Check backend is running (`localhost:5000`)
2. Open browser console (F12)
3. Look for red errors
4. Verify you're logged in
5. Check your role is saved: Run in console: `localStorage.getItem('role')`

### Getting generic responses?
1. Check you're logged in with correct role
2. Verify backend has database connection
3. Check browser console for API errors
4. Try refreshing the page

### Styling looks wrong?
1. Hard refresh page (Ctrl+F5)
2. Clear browser cache
3. Check chatbot.css is in styles folder
4. Verify import in Chatbot.js

## Next Steps (Optional Enhancements)

1. **Add Real AI** (OpenAI, Claude, etc.)
   - Install API client: `npm install openai`
   - Add API key to `.env`
   - Update `chatbotHelper.js` with API call

2. **Save Chat History**
   - Create Chat model in MongoDB
   - Save messages to database
   - Load history on page load

3. **Add Voice**
   - Install speech library: `npm install web-speech-api`
   - Add voice input button
   - Add audio response option

4. **Analytics**
   - Track popular questions
   - Monitor response accuracy
   - Analyze user satisfaction

## Support

For issues:
1. Check browser console (F12) for errors
2. Check backend console for errors
3. Review `AI_CHATBOT_IMPLEMENTATION.md` for detailed help
4. Verify all files are created correctly
5. Ensure dependencies are installed

---

**Ready to use!** Click the purple chat button and start asking questions! 🚀
