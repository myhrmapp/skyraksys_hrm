const { validate, validateQuery } = require('../../../middleware/validate');
const { createEmployeeSchema } = require('../../../middleware/validators/employee.validator');
const Joi = require('joi');

describe('Validate Middleware', () => {
  let mockReq, mockRes, nextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  describe('validate (body validation)', () => {
    it('should pass validation with valid data', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        age: Joi.number().min(18)
      });

      mockReq.body = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockReq.validatedData).toEqual(mockReq.body);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required()
      });

      mockReq.body = {
        name: 'John Doe'
        // email is missing
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('required')
          })
        ])
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid data types', () => {
      const schema = Joi.object({
        age: Joi.number().required(),
        email: Joi.string().email().required()
      });

      mockReq.body = {
        age: 'not a number',
        email: 'invalid-email'
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: expect.arrayContaining([
          expect.objectContaining({ field: 'age' }),
          expect.objectContaining({ field: 'email' })
        ])
      });
    });

    it('should strip unknown fields', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required()
      });

      mockReq.body = {
        name: 'John Doe',
        email: 'john@example.com',
        unknownField: 'should be removed'
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockReq.validatedData).toEqual({
        name: 'John Doe',
        email: 'john@example.com'
      });
      expect(mockReq.validatedData.unknownField).toBeUndefined();
    });

    it('should convert types automatically', () => {
      const schema = Joi.object({
        age: Joi.number().required(),
        active: Joi.boolean().required()
      });

      mockReq.body = {
        age: '25', // String that can be converted to number
        active: 'true' // String that can be converted to boolean
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockReq.validatedData.age).toBe(25);
      expect(mockReq.validatedData.active).toBe(true);
    });
  });

  describe('employee schema regression guard', () => {
    it('should strip the legacy accountNumber alias and keep bankAccountNumber', () => {
      const payload = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        departmentId: '123e4567-e89b-12d3-a456-426614174000',
        positionId: '123e4567-e89b-12d3-a456-426614174001',
        hireDate: '2025-01-15',
        accountNumber: '1234567890',
        bankAccountNumber: '12345678901234'
      };

      const { error, value } = createEmployeeSchema.validate(payload, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      expect(error).toBeUndefined();
      expect(value.bankAccountNumber).toBe('12345678901234');
      expect(value.accountNumber).toBeUndefined();
    });
  });

  describe('validateQuery (query parameter validation)', () => {
    it('should pass validation with valid query params', () => {
      const schema = Joi.object({
        page: Joi.number().min(1),
        limit: Joi.number().min(1).max(100),
        search: Joi.string()
      });

      mockReq.query = {
        page: '1',
        limit: '10',
        search: 'test'
      };

      const middleware = validateQuery(schema);
      middleware(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockReq.validatedQuery).toEqual({
        page: 1,
        limit: 10,
        search: 'test'
      });
    });

    it('should return 400 for invalid query params', () => {
      const schema = Joi.object({
        page: Joi.number().min(1).required(),
        limit: Joi.number().min(1).max(100).required()
      });

      mockReq.query = {
        page: '0', // Invalid: below min
        limit: '150' // Invalid: above max
      };

      const middleware = validateQuery(schema);
      middleware(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Query validation error',
        errors: expect.arrayContaining([
          expect.objectContaining({ field: 'page' }),
          expect.objectContaining({ field: 'limit' })
        ])
      });
    });

    it('should strip unknown query parameters', () => {
      const schema = Joi.object({
        search: Joi.string()
      });

      mockReq.query = {
        search: 'test',
        unknownParam: 'should be removed'
      };

      const middleware = validateQuery(schema);
      middleware(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockReq.validatedQuery).toEqual({
        search: 'test'
      });
      expect(mockReq.validatedQuery.unknownParam).toBeUndefined();
    });
  });
});
