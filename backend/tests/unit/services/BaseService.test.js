const BaseService = require('../../../services/BaseService');

describe('BaseService', () => {
  let mockModel;
  let service;

  beforeEach(() => {
    mockModel = {
      name: 'TestModel',
      findAndCountAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      bulkCreate: jest.fn(),
      bulkUpdate: jest.fn(),
      bulkDelete: jest.fn()
    };

    service = new BaseService(mockModel);
  });

  describe('findAll', () => {
    it('should return data and pagination with correct defaults', async () => {
      const rows = [{ id: 1 }, { id: 2 }];
      mockModel.findAndCountAll.mockResolvedValue({ count: 25, rows });

      const result = await service.findAll({ page: 2, limit: 10, where: { active: true } });

      expect(mockModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: true },
          order: [['createdAt', 'DESC']],
          limit: 10,
          offset: 10
        })
      );

      expect(result.data).toEqual(rows);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        totalItems: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true
      });
    });

    it('should rethrow non-Sequelize errors as generic Error with context', async () => {
      const originalError = new Error('Connection lost');
      mockModel.findAndCountAll.mockRejectedValue(originalError);

      await expect(service.findAll()).rejects.toThrow(
        'Error fetching TestModel records: Connection lost'
      );
    });

    it('should preserve Sequelize errors without wrapping', async () => {
      const sequelizeError = new Error('Validation failed');
      sequelizeError.name = 'SequelizeValidationError';
      mockModel.findAndCountAll.mockRejectedValue(sequelizeError);

      await expect(service.findAll()).rejects.toBe(sequelizeError);
    });
  });

  describe('create', () => {
    it('should create a new record using the model', async () => {
      const payload = { name: 'Test' };
      const created = { id: 1, ...payload };
      mockModel.create.mockResolvedValue(created);

      const result = await service.create(payload);

      expect(mockModel.create).toHaveBeenCalledWith(payload, {});
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update an existing record and return it', async () => {
      const id = 1;
      const payload = { name: 'Updated' };
      const existing = {
        id,
        update: jest.fn().mockResolvedValue({ id, ...payload })
      };
      mockModel.findByPk.mockResolvedValue(existing);

      const result = await service.update(id, payload);

      expect(mockModel.findByPk).toHaveBeenCalledWith(id, { include: [] });
      expect(existing.update).toHaveBeenCalledWith(payload, {});
      expect(result).toEqual({ id, ...payload });
    });

    it('should throw an error when record is not found', async () => {
      const id = 999;
      mockModel.findByPk.mockResolvedValue(null);

      await expect(service.update(id, { name: 'X' })).rejects.toThrow(
        'TestModel not found'
      );
    });
  });

  describe('delete', () => {
    it('should delete an existing record and return true', async () => {
      const id = 1;
      const existing = {
        id,
        destroy: jest.fn().mockResolvedValue(true)
      };
      mockModel.findByPk.mockResolvedValue(existing);

      const result = await service.delete(id);

      expect(mockModel.findByPk).toHaveBeenCalledWith(id, { include: [] });
      expect(existing.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should throw an error when record to delete is not found', async () => {
      const id = 999;
      mockModel.findByPk.mockResolvedValue(null);

      await expect(service.delete(id)).rejects.toThrow('TestModel not found');
    });
  });
});
