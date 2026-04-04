const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    businessowner: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessOwner', required: true, index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
    summary: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
    userAgent: { type: String }
  },
  {
    timestamps: true
  }
);

AuditLogSchema.index({ businessowner: 1, createdAt: -1 });
AuditLogSchema.index({ businessowner: 1, entityType: 1, createdAt: -1 });
AuditLogSchema.index({ businessowner: 1, action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
