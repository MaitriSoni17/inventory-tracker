/**
 * Service Layer Base Template
 * 
 * Services encapsulate business logic, making routes cleaner and testable.
 * Each service handles database operations and business rules for an entity.
 */

const { AppError } = require('../config/errorHandler');
const { logger } = require('../config/logger');

class BaseService {
  constructor(Model, modelName) {
    this.Model = Model;
    this.modelName = modelName;
  }

  /**
   * Create entity with validation
   */
  async create(data, context = {}) {
    try {
      const entity = new this.Model(data);
      await entity.save();
      logger.info(`${this.modelName} created`, {
        id: entity._id,
        userId: context.userId
      });
      return entity;
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error
        const field = Object.keys(error.keyPattern)[0];
        throw new AppError(`${field} already exists`, 400, 'DUPLICATE_KEY');
      }
      throw error;
    }
  }

  /**
   * Find by ID
   */
  async findById(id, selectFields = null) {
    try {
      const query = this.Model.findById(id);
      if (selectFields) {
        query.select(selectFields);
      }
      return await query;
    } catch (error) {
      throw new AppError(`Error fetching ${this.modelName}`, 500);
    }
  }

  /**
   * Find with filters and pagination
   */
  async findMany(filter = {}, options = {}) {
    try {
      const {
        skip = 0,
        limit = 10,
        sort = '-createdAt',
        selectFields = null
      } = options;

      let query = this.Model.find(filter);

      if (selectFields) {
        query = query.select(selectFields);
      }

      const total = await this.Model.countDocuments(filter);
      const data = await query.sort(sort).skip(skip).limit(limit);

      return { data, total };
    } catch (error) {
      throw new AppError(
        `Error fetching ${this.modelName} list`,
        500
      );
    }
  }

  /**
   * Update entity
   */
  async update(id, data, context = {}) {
    try {
      const entity = await this.Model.findByIdAndUpdate(
        id,
        data,
        { new: true, runValidators: true }
      );

      if (!entity) {
        throw new AppError(`${this.modelName} not found`, 404);
      }

      logger.info(`${this.modelName} updated`, {
        id,
        userId: context.userId
      });

      return entity;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        throw new AppError(`${field} already exists`, 400);
      }
      throw new AppError(`Error updating ${this.modelName}`, 500);
    }
  }

  /**
   * Delete entity
   */
  async delete(id, context = {}) {
    try {
      const entity = await this.Model.findByIdAndDelete(id);

      if (!entity) {
        throw new AppError(`${this.modelName} not found`, 404);
      }

      logger.info(`${this.modelName} deleted`, {
        id,
        userId: context.userId
      });

      return entity;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Error deleting ${this.modelName}`, 500);
    }
  }
}

module.exports = BaseService;
