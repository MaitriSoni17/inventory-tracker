const mongoose = require('mongoose');
const { Schema } = mongoose;

const ChatHistory = new Schema({
    user: { type: mongoose.Schema.Types.ObjectId, required: true }, // User ID (BusinessOwner, Employee, or Supplier)
    role: { type: String, enum: ['businessowner', 'employee', 'supplier'], required: true },
    message: { type: String, required: true },
    sender: { type: String, enum: ['user', 'assistant'], required: true },
    timestamp: { type: Date, default: Date.now, index: true },
    conversationId: { type: String, default: null }, // Group messages into conversations
    isError: { type: Boolean, default: false },
    responseTime: { type: Number, default: 0 }, // Response time in ms for performance tracking
});

// Indexes for efficient queries
ChatHistory.index({ user: 1, timestamp: -1 }); // Most recent messages for a user
ChatHistory.index({ user: 1, conversationId: 1 }); // Messages in a conversation
ChatHistory.index({ timestamp: -1 }); // Clean up old messages
ChatHistory.index({ user: 1, sender: 1, timestamp: -1 }); // Conversation history

module.exports = mongoose.model('ChatHistory', ChatHistory);
