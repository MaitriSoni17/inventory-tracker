const mongoose = require('mongoose');

const AIDataFixProposalSchema = new mongoose.Schema(
  {
    businessowner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessOwner',
      required: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    createdByRole: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['product_field_update', 'supplier_field_update'],
      required: true
    },
    targetModel: {
      type: String,
      enum: ['Product', 'Supplier'],
      required: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.75
    },
    currentValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    suggestedValue: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    fieldPath: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'applied', 'failed'],
      default: 'pending',
      index: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    appliedAt: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

AIDataFixProposalSchema.index({ businessowner: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('AIDataFixProposal', AIDataFixProposalSchema);
