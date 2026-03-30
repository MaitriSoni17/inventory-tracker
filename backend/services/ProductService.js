/**
 * Products Service
 * 
 * Handles all business logic for products including inventory management,
 * validation, and related entity checks.
 */

const BaseService = require('./BaseService');
const Product = require('../models/Products');
const Category = require('../models/Category');
const { AppError } = require('../config/errorHandler');
const { logger } = require('../config/logger');

class ProductService extends BaseService {
  constructor() {
    super(Product, 'Product');
  }

  /**
   * Create product with category validation
   */
  async createProduct(productData, context = {}) {
    try {
      // Validate category exists
      if (productData.category) {
        const category = await Category.findById(productData.category);
        if (!category) {
          throw new AppError('Category not found', 404);
        }
      }

      const product = await this.create(productData, context);
      return product;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating product', { error: error.message });
      throw new AppError('Failed to create product', 500);
    }
  }

  /**
   * Get products with filters and pagination
   */
  async getProducts(
    filters = {},
    pagination = { skip: 0, limit: 10, sort: '-createdAt' }
  ) {
    try {
      // Build search filter
      const searchFilter = {};
      
      if (filters.name) {
        searchFilter.name = { $regex: filters.name, $options: 'i' };
      }
      if (filters.category) {
        searchFilter.category = filters.category;
      }
      if (filters.minPrice !== undefined) {
        searchFilter.price = { ...searchFilter.price, $gte: filters.minPrice };
      }
      if (filters.maxPrice !== undefined) {
        searchFilter.price = { ...searchFilter.price, $lte: filters.maxPrice };
      }
      if (filters.lowStock !== undefined && filters.lowStock) {
        searchFilter.quantity = { $lt: 10 }; // Low stock threshold
      }

      return await this.findMany(searchFilter, pagination);
    } catch (error) {
      logger.error('Error fetching products', { error: error.message });
      throw new AppError('Failed to fetch products', 500);
    }
  }

  /**
   * Update product quantity (for orders)
   */
  async updateQuantity(productId, quantity, action = 'decrease') {
    try {
      const product = await this.Model.findById(productId);
      if (!product) {
        throw new AppError('Product not found', 404);
      }

      const newQuantity = action === 'decrease' 
        ? product.quantity - quantity 
        : product.quantity + quantity;

      if (newQuantity < 0) {
        throw new AppError('Insufficient stock', 400);
      }

      product.quantity = newQuantity;
      await product.save();

      logger.info('Product quantity updated', {
        productId,
        action,
        quantity,
        newQuantity
      });

      return product;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update product quantity', 500);
    }
  }

  /**
   * Bulk update product quantities (for example, restocks)
   */
  async bulkUpdateQuantities(updates) {
    const session = await this.Model.startSession();

    try {
      await session.withTransaction(async () => {
        for (const update of updates) {
          await this.Model.findByIdAndUpdate(
            update.productId,
            { $inc: { quantity: update.quantity } },
            { session, new: true }
          );
        }
      });

      logger.info('Bulk quantity update completed', {
        updateCount: updates.length
      });

      return true;
    } catch (error) {
      logger.error('Bulk quantity update failed', { error: error.message });
      throw new AppError('Bulk update failed', 500);
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(threshold = 10) {
    try {
      const products = await this.Model
        .find({ quantity: { $lt: threshold } })
        .sort('-quantity');

      return products;
    } catch (error) {
      throw new AppError('Failed to fetch low stock products', 500);
    }
  }

  /**
   * Delete product with cascade checks
   */
  async deleteProductSafely(productId, context = {}) {
    try {
      // Check if product is used in any active orders
      const Order = require('../models/Orders');
      const CustomerOrder = require('../models/CustomerOrders');

      const orderCount = await Order.countDocuments({
        'items.productId': productId,
        status: { $ne: 'delivered' }
      });

      const customerOrderCount = await CustomerOrder.countDocuments({
        'items.productId': productId,
        status: { $ne: 'delivered' }
      });

      if (orderCount > 0 || customerOrderCount > 0) {
        throw new AppError(
          'Cannot delete product with active orders',
          400
        );
      }

      return await this.delete(productId, context);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete product', 500);
    }
  }
}

module.exports = new ProductService();
