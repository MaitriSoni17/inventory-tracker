const mongoose = require('mongoose');

const StockMovementSchema = new mongoose.Schema(
  {
    businessowner: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessOwner', required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerOrders', default: null },
    direction: { type: String, enum: ['IN', 'OUT', 'ADJUSTMENT'], required: true },
    quantityChange: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    source: { type: String, required: true },
    reason: { type: String, default: '' },
    actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    actorRole: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true
  }
);

StockMovementSchema.index({ businessowner: 1, createdAt: -1 });
StockMovementSchema.index({ businessowner: 1, product: 1, createdAt: -1 });
StockMovementSchema.index({ businessowner: 1, source: 1, createdAt: -1 });

module.exports = mongoose.model('StockMovement', StockMovementSchema);
