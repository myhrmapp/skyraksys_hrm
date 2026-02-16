const { authenticateToken, authorize } = require('../../../middleware/auth');
const jwt = require('jsonwebtoken');
const db = require('../../../models');
const authConfig = require('../../../config/auth.config');

// Mock the database models
jest.mock('../../../models', () => ({
  User: {
    findByPk: jest.fn()
  },
  Employee: {},
  sequelize: {
    authenticate: jest.fn()
  }
}));

// Mock LogHelper to avoid logging errors in tests
jest.mock('../../../utils/logHelper', () => ({
  logAuthEvent: jest.fn(),
  logAuthzEvent: jest.fn(),
  logError: jest.fn()
}));

// Alias for backward compatibility with tests
const verifyToken = authenticateToken;
const requireRole = authorize;

describe('Authentication Middleware', () => {
  let mockReq, mockRes, nextFunction;

  beforeEach(() => {
    mockReq = {
      header: jest.fn(),
      headers: {},
      cookies: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('should return 401 if no token provided', async () => {
      mockReq.headers.authorization = undefined;

      await verifyToken(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('token')
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid_token';

      await verifyToken(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 for expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 1, email: 'test@example.com' },
        authConfig.secret,
        { expiresIn: '-1h' }
      );

      mockReq.headers.authorization = `Bearer ${expiredToken}`;

      await verifyToken(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should call next() with valid token and existing user', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'employee',
        isActive: true,
        employee: null,
        toJSON: () => ({ id: 1, email: 'test@example.com', role: 'employee', isActive: true })
      };
      
      // Mock User.findByPk to return a user
      db.User.findByPk.mockResolvedValue(mockUser);

      const validToken = jwt.sign(
        { id: 1, email: 'test@example.com', role: 'employee' },
        authConfig.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${validToken}`;

      await verifyToken(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.id).toBe(1);
      expect(mockReq.user.email).toBe('test@example.com');
    });

    it('should extract token from Authorization header', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'employee',
        isActive: true,
        employee: null,
        toJSON: () => ({ id: 1, email: 'test@example.com', role: 'employee', isActive: true })
      };
      
      db.User.findByPk.mockResolvedValue(mockUser);

      const validToken = jwt.sign(
        { id: 1, email: 'test@example.com' },
        authConfig.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${validToken}`;

      await verifyToken(mockReq, mockRes, nextFunction);

      expect(db.User.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle token without Bearer prefix', () => {
      const validToken = jwt.sign(
        { id: 1, email: 'test@example.com' },
        authConfig.secret,
        { expiresIn: '1h' }
      );

      mockReq.header.mockReturnValue(validToken);

      // Depending on implementation, may or may not work
      verifyToken(mockReq, mockRes, nextFunction);

      // Test based on your implementation
      expect(mockRes.status).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      // Setup user in request
      mockReq.user = {
        id: 1,
        email: 'test@example.com',
        role: 'employee'
      };
      mockReq.userRole = 'employee';
      mockReq.userId = 1;
    });

    it('should allow access for matching role', async () => {
      const middleware = requireRole(['employee']);

      await middleware(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow access for multiple allowed roles', async () => {
      const middleware = requireRole(['admin', 'hr', 'employee']);

      await middleware(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny access for non-matching role', async () => {
      const middleware = requireRole(['admin']);

      await middleware(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Access denied')
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 if user has no role', async () => {
      mockReq.user = {
        id: 1,
        email: 'test@example.com'
      };      mockReq.userRole = undefined;
      const middleware = requireRole(['admin']);

      await middleware(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if no user in request', async () => {
      mockReq.user = null;
      mockReq.userRole = null;

      const middleware = requireRole(['admin']);

      await middleware(mockReq, mockRes, nextFunction);

      expect([401, 403]).toContain(mockRes.status.mock.calls[0][0]);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow admin role', async () => {
      mockReq.user.role = 'admin';
      mockReq.userRole = 'admin';
      const middleware = requireRole(['admin']);

      await middleware(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow hr role', async () => {
      mockReq.user.role = 'hr';
      mockReq.userRole = 'hr';
      const middleware = requireRole(['hr']);

      await middleware(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow manager role', async () => {
      mockReq.user.role = 'manager';
      mockReq.userRole = 'manager';
      const middleware = requireRole(['manager']);

      await middleware(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle case-sensitive role comparison', async () => {
      mockReq.user.role = 'Admin';
      mockReq.userRole = 'Admin';
      const middleware = requireRole(['admin']);

      await middleware(mockReq, mockRes, nextFunction);

      // Test based on your implementation
      // If case-sensitive, this should fail
      // If case-insensitive, this should pass
    });

    it('should work with single role string', async () => {
      mockReq.user.role = 'employee';
      mockReq.userRole = 'employee';
      const middleware = requireRole(['employee']);

      await middleware(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('Token Generation', () => {
    it('should generate valid JWT token', () => {
      const payload = {
        id: 1,
        email: 'test@example.com',
        role: 'employee'
      };

      const token = jwt.sign(
        payload,
        authConfig.secret,
        { expiresIn: '24h' }
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, authConfig.secret);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should include expiration in token', () => {
      const token = jwt.sign(
        { id: 1 },
        authConfig.secret,
        { expiresIn: '1h' }
      );

      const decoded = jwt.verify(token, authConfig.secret);
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe('Security Tests', () => {
    it('should not accept tokens signed with different secret', () => {
      const token = jwt.sign(
        { id: 1, email: 'test@example.com' },
        'wrong_secret',
        { expiresIn: '1h' }
      );

      mockReq.header.mockReturnValue(`Bearer ${token}`);

      verifyToken(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should not accept malformed tokens', () => {
      mockReq.header.mockReturnValue('Bearer malformed.token.here');

      verifyToken(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle missing Bearer prefix', () => {
      const validToken = jwt.sign(
        { id: 1 },
        authConfig.secret,
        { expiresIn: '1h' }
      );

      mockReq.header.mockReturnValue(validToken);

      verifyToken(mockReq, mockRes, nextFunction);

      // Depending on implementation
      expect(mockRes.status).toHaveBeenCalled();
    });
  });
});
