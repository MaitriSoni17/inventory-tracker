const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Message Model
 * Stores messages between users (Business Owner, Employee, Manager, Supervisor, Supplier)
 * Supports one-on-one and group messaging
 */
const MessageSchema = new Schema({
    // Sender information
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    senderRole: {
        type: String,
        enum: ['BusinessOwner', 'Employee', 'Supplier'],
        required: true
    },
    
    // Recipient information (for one-on-one messages)
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    recipientRole: {
        type: String,
        enum: ['BusinessOwner', 'Employee', 'Supplier'],
        required: true
    },
    
    // Message content
    content: {
        type: String,
        required: true,
        trim: true
    },
    
    // File attachment (optional)
    attachment: {
        fileName: { type: String },
        fileUrl: { type: String },
        fileType: { type: String }
    },
    
    // Message status
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date,
        default: null
    },
    
    // Deletion flags
    deletedBySender: {
        type: Boolean,
        default: false
    },
    deletedByRecipient: {
        type: Boolean,
        default: false
    },
    
    // Business owner association for data isolation
    businessowner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BusinessOwner',
        required: true
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient querying
MessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
MessageSchema.index({ recipient: 1, isRead: 1 });
MessageSchema.index({ businessowner: 1, createdAt: -1 });

// Pre-save hook to update updatedAt
MessageSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Message', MessageSchema);
