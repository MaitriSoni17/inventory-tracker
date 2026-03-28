const mongoose = require('mongoose');
const { Schema } = mongoose;

const DeletionRequest = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userEmail: { type: String, required: true },
    userRole: { type: String, required: true, enum: ['employee', 'supplier', 'businessowner'] },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessOwner', default: null }, // For employee/supplier
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    reason: { type: String }, // Reason for deletion
    requestDate: { type: Date, default: Date.now },
    scheduledDeletionDate: { type: Date }, // Date when deletion will occur (48-72 hours after approval)
    approvalDate: { type: Date },
    rejectionReason: { type: String },
    cancellationRequested: { type: Boolean, default: false },
    cancellationStatus: { type: String, enum: ['pending', 'approved', 'rejected', null], default: null },
    cancellationRequestDate: { type: Date },
    cancellationApprovalDate: { type: Date },
    cancellationRejectionDate: { type: Date },
    cancellationRejectionReason: { type: String },
    notificationsSent: { type: Number, default: 0 }, // Track how many reminders were sent
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } // Requests expire after 30 days
});

// Auto-delete expired deletion requests after 30 days
DeletionRequest.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('DeletionRequest', DeletionRequest);
