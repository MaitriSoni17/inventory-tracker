const CustomerOrders = require('../models/CustomerOrders');
const Product = require('../models/Products');
const { checkAndNotifyLowStock } = require('./notificationHelper');

/**
 * Check and fulfill pending orders when product stock is updated.
 * Called after any product stock increase (update product, restock, etc.)
 * 
 * @param {String} productId - The product ID whose stock was updated
 * @param {String} businessOwnerId - The business owner ID
 * @returns {Array} - Array of fulfilled order IDs
 */
async function fulfillPendingOrders(productId, businessOwnerId) {
    const fulfilledOrders = [];

    try {
        // Find all pending orders for this business owner that contain this product
        const pendingOrders = await CustomerOrders.find({
            businessowner: businessOwnerId,
            isPending: true,
            'products.product': productId
        }).sort({ createdAt: 1 }); // Process oldest orders first (FIFO)

        for (const order of pendingOrders) {
            // Check if ALL products in this order now have sufficient stock
            let canFulfill = true;
            const insufficientProducts = [];

            for (const item of order.products) {
                const productDoc = await Product.findById(item.product);
                if (!productDoc || productDoc.totalProducts < item.quantity) {
                    canFulfill = false;
                    if (productDoc) {
                        insufficientProducts.push(
                            `Insufficient stock for "${productDoc.name}" (Available: ${productDoc.totalProducts}, Requested: ${item.quantity})`
                        );
                    } else {
                        insufficientProducts.push(`Product not found: ${item.product}`);
                    }
                }
            }

            if (canFulfill) {
                // Deduct stock for all products in this order
                for (const item of order.products) {
                    await Product.findByIdAndUpdate(item.product, {
                        $inc: { totalProducts: -item.quantity }
                    });
                }

                // Mark order as fulfilled (no longer pending)
                await CustomerOrders.findByIdAndUpdate(order._id, {
                    $set: {
                        isPending: false,
                        pendingReason: '',
                        pAvail: 'Available'
                    }
                });

                fulfilledOrders.push(order._id);

                // Check for low stock alerts after deduction
                try {
                    for (const item of order.products) {
                        const updatedProduct = await Product.findById(item.product);
                        if (updatedProduct) {
                            await checkAndNotifyLowStock(updatedProduct, businessOwnerId);
                        }
                    }
                } catch (e) {}
            } else {
                // Update the pending reason with current stock info
                await CustomerOrders.findByIdAndUpdate(order._id, {
                    $set: {
                        pendingReason: insufficientProducts.join('; ')
                    }
                });
            }
        }
    } catch (err) {
        console.error('Error fulfilling pending orders:', err);
    }

    return fulfilledOrders;
}

module.exports = { fulfillPendingOrders };
