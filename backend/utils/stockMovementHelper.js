const StockMovement = require('../models/StockMovement');

const getDirection = (quantityChange, explicitDirection) => {
  if (explicitDirection) return explicitDirection;
  if (quantityChange > 0) return 'IN';
  if (quantityChange < 0) return 'OUT';
  return 'ADJUSTMENT';
};

const recordStockMovement = async ({
  businessowner,
  product,
  orderId,
  quantityChange,
  previousStock,
  newStock,
  source,
  reason,
  actorId,
  actorRole,
  direction,
  metadata = {}
}) => {
  try {
    if (!businessowner || !product || !actorId || !source) return null;
    if (typeof quantityChange !== 'number') return null;
    if (typeof previousStock !== 'number' || typeof newStock !== 'number') return null;

    return await StockMovement.create({
      businessowner,
      product,
      orderId: orderId || null,
      direction: getDirection(quantityChange, direction),
      quantityChange,
      previousStock,
      newStock,
      source,
      reason: reason || '',
      actorId,
      actorRole: actorRole || 'unknown',
      metadata
    });
  } catch (error) {
    return null;
  }
};

module.exports = {
  recordStockMovement
};
