const express = require('express');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser');
const { getContextForRole, generateAIResponse } = require('../utils/chatbotHelper');

// POST endpoint to send message and get response
router.post('/message', fetchuser, async (req, res) => {
  try {
    const { message } = req.body;
    
    // Use authenticated user's ID from middleware (req.user is the full user object)
    const userId = req.user?._id;

    // Validate input
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message cannot be empty'
      });
    }

    // Enforce role from authenticated token, not request payload.
    const role = ['businessowner', 'supplier'].includes(req.role) ? req.role : 'employee';

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication failed'
      });
    }

    // Get context based on user's role and data
    const context = await getContextForRole(userId, role);

    // Generate AI response (pass userId for specific entity queries)
    const aiResponse = await generateAIResponse(message, role, context, userId, req.user);

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


