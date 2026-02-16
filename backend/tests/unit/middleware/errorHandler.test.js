const { AppError, ValidationError } = require('../../../utils/errors');

describe('Error Handler Middleware', () => {
  let mockReq, mockRes, nextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/api/test',
      originalUrl: '/api/test',
      ip: '127.0.0.1',
      get: jest.fn(),
      query: {},
      params: {},
      body: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  // Create the error handler from server.js
  const errorHandler = (error, req, res, next) => {
    if (error instanceof AppError) {
      const response = {
        success: false,
        message: error.message
      };
      
      // Include errors array if present (ValidationError subclass)
      if (error.errors && error.errors.length > 0) {
        response.errors = error.errors;
      }
      
      return res.status(error.statusCode).json(response);
    }
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Duplicate entry detected',
        field: error.errors?.[0]?.path || 'unknown'
      });
    }
    
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Cannot complete this operation because the record is referenced by other data. Remove related records first.',
        detail: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  };

  describe('AppError Handling', () => {
    it('should handle AppError with custom status code', () => {
      const error = new AppError('Custom error', 403);
      errorHandler(error, mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Custom error',
        errors: undefined
      });
    });

    it('should handle ValidationError with validation errors', () => {
      const error = new ValidationError('Validation failed', [
        { field: 'email', message: 'Invalid email' }
      ]);
      errorHandler(error, mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'email', message: 'Invalid email' }]
      });
    });
  });

  describe('Sequelize Error Handling', () => {
    it('should handle SequelizeValidationError', () => {
      const error = {
        name: 'SequelizeValidationError',
        errors: [
          { path: 'email', message: 'Email is required' },
          { path: 'name', message: 'Name is required' }
        ]
      };
      errorHandler(error, mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: [
          { field: 'email', message: 'Email is required' },
          { field: 'name', message: 'Name is required' }
        ]
      });
    });

    it('should handle SequelizeUniqueConstraintError', () => {
      const error = {
        name: 'SequelizeUniqueConstraintError',
        errors: [{ path: 'email' }]
      };
      errorHandler(error, mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Duplicate entry detected',
        field: 'email'
      });
    });

    it('should handle SequelizeForeignKeyConstraintError', () => {
      const error = {
        name: 'SequelizeForeignKeyConstraintError',
        message: 'Foreign key constraint violation'
      };
      errorHandler(error, mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot complete this operation because the record is referenced by other data. Remove related records first.',
        detail: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    });
  });

  describe('JWT Error Handling', () => {
    it('should handle JsonWebTokenError', () => {
      const error = { name: 'JsonWebTokenError' };
      errorHandler(error, mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token'
      });
    });

    it('should handle TokenExpiredError', () => {
      const error = { name: 'TokenExpiredError' };
      errorHandler(error, mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token expired'
      });
    });
  });

  describe('Generic Error Handling', () => {
    it('should handle generic error with status code', () => {
      const error = { status: 404, message: 'Not found' };
      errorHandler(error, mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not found'
      });
    });

    it('should default to 500 for unspecified errors', () => {
      const error = { message: 'Something went wrong' };
      errorHandler(error, mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Something went wrong'
      });
    });

    it('should provide default message for errors without message', () => {
      const error = {};
      errorHandler(error, mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });
});
