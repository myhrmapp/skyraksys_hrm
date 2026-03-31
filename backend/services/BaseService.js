// Service layer for business logic separation
const ApiResponse = require('../utils/ApiResponse');

/**
 * Re-throw Sequelize errors as-is to preserve their type for the global error handler.
 * Only wrap truly unexpected errors as generic Error.
 */
function rethrowError(operation, modelName, error) {
  // Preserve Sequelize-specific errors (ValidationError, UniqueConstraintError, ForeignKeyConstraintError, etc.)
  if (error.name && error.name.startsWith('Sequelize')) {
    throw error;
  }
  // Preserve custom AppError instances
  if (error.statusCode) {
    throw error;
  }
  throw new Error(`Error ${operation} ${modelName}: ${error.message}`);
}

class BaseService {
  constructor(model) {
    this.model = model;
  }

  async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        where = {},
        include = [],
        order = [['createdAt', 'DESC']]
      } = options;

      const offset = (page - 1) * limit;

      // Merge any additional where conditions
      const finalWhere = { ...where };

      const { count, rows } = await this.model.findAndCountAll({
        where: finalWhere,
        include,
        order,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const totalPages = Math.ceil(count / limit);

      return {
        data: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: count,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      rethrowError('fetching', `${this.model.name} records`, error);
    }
  }

  async findById(id, include = []) {
    try {
      const record = await this.model.findByPk(id, { include });
      if (!record) {
        return null;
      }
      return record;
    } catch (error) {
      rethrowError('fetching', this.model.name, error);
    }
  }

  async create(data, options = {}) {
    try {
      const record = await this.model.create(data, options);
      return record;
    } catch (error) {
      rethrowError('creating', this.model.name, error);
    }
  }

  async update(id, data, options = {}) {
    try {
      const record = await this.findById(id);
      if (!record) {
        throw new Error(`${this.model.name} not found`);
      }
      const updatedRecord = await record.update(data, options);
      return updatedRecord;
    } catch (error) {
      rethrowError('updating', this.model.name, error);
    }
  }

  async delete(id) {
    try {
      const record = await this.findById(id);
      if (!record) {
        throw new Error(`${this.model.name} not found`);
      }
      await record.destroy();
      return true;
    } catch (error) {
      rethrowError('deleting', this.model.name, error);
    }
  }

  async findOne(where, include = []) {
    try {
      const record = await this.model.findOne({ where, include });
      return record;
    } catch (error) {
      rethrowError('finding', this.model.name, error);
    }
  }

  async count(where = {}) {
    try {
      const count = await this.model.count({ where });
      return count;
    } catch (error) {
      rethrowError('counting', this.model.name, error);
    }
  }

  async bulkCreate(dataArray, options = {}) {
    try {
      const records = await this.model.bulkCreate(dataArray, options);
      return records;
    } catch (error) {
      rethrowError('bulk creating', this.model.name, error);
    }
  }

  async bulkUpdate(where, data) {
    try {
      const [affectedCount] = await this.model.update(data, { where });
      return affectedCount;
    } catch (error) {
      rethrowError('bulk updating', this.model.name, error);
    }
  }

  async bulkDelete(where) {
    try {
      const affectedCount = await this.model.destroy({ where });
      return affectedCount;
    } catch (error) {
      rethrowError('bulk deleting', this.model.name, error);
    }
  }
}

module.exports = BaseService;
