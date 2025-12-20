const express = require('express');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser');
const { getContextForRole, generateAIResponse } = require('../utils/chatbotHelper');

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
    console.error('Error fetching chat history:', error);
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

    // Generate AI response
    const aiResponse = await generateAIResponse(message, role, context);

    // Return response
    res.json({
      success: true,
      message: aiResponse,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing chatbot message:', error);
    res.status(500).json({
      success: false,
      error: 'Error processing your message'
    });
  }
});

module.exports = router;
