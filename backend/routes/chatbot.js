const express = require('express');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser');
const { getContextForRole, generateAIResponse } = require('../utils/chatbotHelper');

// POST endpoint to send message and get response
router.post('/message', fetchuser, async (req, res) => {
  try {
    let { message, role } = req.body;
    
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
      // Allow custom roles to use chatbot as 'employee'
      if (role && role !== 'businessowner' && role !== 'supplier') {
        // Custom role - treat as employee for chatbot context
        role = 'employee';
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid role'
        });
      }
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


