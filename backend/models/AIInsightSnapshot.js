const mongoose = require('mongoose');

const AIInsightSnapshotSchema = new mongoose.Schema(
  {
    businessowner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessOwner',
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    role: {
      type: String,
      required: true,
      index: true
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    insights: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  {
    timestamps: true
  }
);

AIInsightSnapshotSchema.index({ businessowner: 1, user: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('AIInsightSnapshot', AIInsightSnapshotSchema);
