/**
 * Unit Tests: Password Reset Token Service (DB-backed)
 * 
 * Purpose: Test secure password reset token lifecycle
 * - Token generation and validation (async, DB-backed)
 * - Expiration handling (1 hour)
 * - One-time use enforcement (via usedAt column)
 * - Rate limiting via DB count (3 requests per 15 minutes)
 * - Password strength validation
 * - Cleanup of expired tokens
 * - Statistics from DB
 * 
 * Created: February 5, 2026
 * Updated: February 10, 2026 — Rewrote for DB-backed service
 */

const passwordResetService = require('../../services/password-reset-token.service');
const jwt = require('jsonwebtoken');

// Mock the db models globally
jest.mock('../../models', () => ({
  PasswordResetToken: {
    create: jest.fn().mockResolvedValue({}),
    findOne: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue([1]),
    count: jest.fn().mockResolvedValue(0),
    destroy: jest.fn().mockResolvedValue(0),
  },
  User: {
    findByPk: jest.fn(),
  }
}));

const db = require('../../models');

// Mock user for testing
const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User'
};

describe('Password Reset Token Service', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no token found in DB (not used)
    db.PasswordResetToken.findOne.mockResolvedValue(null);
    db.PasswordResetToken.create.mockResolvedValue({});
    db.PasswordResetToken.update.mockResolvedValue([1]);
    db.PasswordResetToken.count.mockResolvedValue(0);
    db.PasswordResetToken.destroy.mockResolvedValue(0);
  });

  describe('generateResetToken', () => {
    
    test('should generate valid JWT token with correct payload', async () => {
      const result = await passwordResetService.generateResetToken(mockUser);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('tokenId');
      expect(result).toHaveProperty('expiresAt');
      expect(typeof result.token).toBe('string');
      expect(result.token.length).toBeGreaterThan(50);

      // Decode token to verify payload
      const decoded = jwt.decode(result.token);
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.type).toBe('password-reset');
      expect(decoded.tokenId).toBe(result.tokenId);
    });

    test('should persist token to database', async () => {
      const result = await passwordResetService.generateResetToken(mockUser);

      expect(db.PasswordResetToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenId: result.tokenId,
          userId: mockUser.id,
          email: mockUser.email,
          expiresAt: expect.any(Date)
        })
      );
    });

    test('should generate unique token IDs for each request', async () => {
      const result1 = await passwordResetService.generateResetToken(mockUser);
      const result2 = await passwordResetService.generateResetToken(mockUser);

      expect(result1.tokenId).not.toBe(result2.tokenId);
      expect(result1.token).not.toBe(result2.token);
    });

    test('should set expiration time to 1 hour from now', async () => {
      const before = Date.now();
      const result = await passwordResetService.generateResetToken(mockUser);
      const after = Date.now();

      const expectedExpiry = before + (60 * 60 * 1000); // 1 hour
      const actualExpiry = result.expiresAt.getTime();

      // Allow 1 second tolerance for test execution time
      expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(actualExpiry).toBeLessThanOrEqual(after + (60 * 60 * 1000) + 1000);
    });

    test('should still return token if DB create fails', async () => {
      db.PasswordResetToken.create.mockRejectedValue(new Error('DB error'));

      const result = await passwordResetService.generateResetToken(mockUser);

      // Token is still generated via JWT even if DB write fails
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('tokenId');
    });
  });

  describe('verifyResetToken', () => {
    
    test('should verify valid token successfully', async () => {
      const { token } = await passwordResetService.generateResetToken(mockUser);
      // DB returns no record (or record with no usedAt)
      db.PasswordResetToken.findOne.mockResolvedValue({ usedAt: null });

      const result = await passwordResetService.verifyResetToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload.id).toBe(mockUser.id);
      expect(result.payload.email).toBe(mockUser.email);
      expect(result.error).toBeUndefined();
    });

    test('should reject invalid token', async () => {
      const result = await passwordResetService.verifyResetToken('invalid-token-12345');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid');
    });

    test('should reject expired token', async () => {
      const payload = {
        id: mockUser.id,
        email: mockUser.email,
        type: 'password-reset',
        tokenId: 'test-token-id'
      };

      const expiredToken = jwt.sign(payload, passwordResetService.JWT_SECRET, {
        expiresIn: '-1h' // Already expired
      });

      const result = await passwordResetService.verifyResetToken(expiredToken);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    test('should reject wrong token type', async () => {
      const payload = {
        id: mockUser.id,
        email: mockUser.email,
        type: 'email-verification', // Wrong type
        tokenId: 'test-token-id'
      };

      const wrongTypeToken = jwt.sign(payload, passwordResetService.JWT_SECRET, {
        expiresIn: '1h'
      });

      const result = await passwordResetService.verifyResetToken(wrongTypeToken);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid token type');
    });

    test('should reject already used token', async () => {
      const { token } = await passwordResetService.generateResetToken(mockUser);
      
      // DB returns record with usedAt set (token was used)
      db.PasswordResetToken.findOne.mockResolvedValue({ usedAt: new Date() });

      const result = await passwordResetService.verifyResetToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('already been used');
    });
  });

  describe('markTokenAsUsed', () => {
    
    test('should update token with usedAt timestamp in DB', async () => {
      const tokenId = 'test-token-12345';

      await passwordResetService.markTokenAsUsed(tokenId);

      expect(db.PasswordResetToken.update).toHaveBeenCalledWith(
        { usedAt: expect.any(Date) },
        { where: { tokenId } }
      );
    });

    test('should prevent token reuse after marking used', async () => {
      const { token } = await passwordResetService.generateResetToken(mockUser);
      
      // First verification: token not used
      db.PasswordResetToken.findOne.mockResolvedValueOnce({ usedAt: null });
      let result = await passwordResetService.verifyResetToken(token);
      expect(result.valid).toBe(true);

      // Mark as used
      await passwordResetService.markTokenAsUsed('some-token-id');

      // Second verification: DB now returns usedAt
      db.PasswordResetToken.findOne.mockResolvedValueOnce({ usedAt: new Date() });
      result = await passwordResetService.verifyResetToken(token);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('already been used');
    });
  });

  describe('checkRateLimit', () => {
    
    test('should allow first request for email (0 recent tokens in DB)', async () => {
      db.PasswordResetToken.count.mockResolvedValue(0);

      const result = await passwordResetService.checkRateLimit('test@example.com');

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(3);
    });

    test('should allow request when under limit', async () => {
      db.PasswordResetToken.count.mockResolvedValue(2);

      const result = await passwordResetService.checkRateLimit('test@example.com');

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(1);
    });

    test('should block request when at rate limit', async () => {
      db.PasswordResetToken.count.mockResolvedValue(3);
      db.PasswordResetToken.findOne.mockResolvedValue({
        createdAt: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      });

      const result = await passwordResetService.checkRateLimit('test@example.com');

      expect(result.allowed).toBe(false);
      expect(result.remainingAttempts).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(15 * 60); // Max 15 minutes
    });

    test('should fail open if DB query errors', async () => {
      db.PasswordResetToken.count.mockRejectedValue(new Error('DB error'));

      const result = await passwordResetService.checkRateLimit('test@example.com');

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(1);
    });
  });

  describe('generateResetLink', () => {
    
    test('should generate correct reset URL with default base URL', () => {
      const token = 'test-token-12345';
      const link = passwordResetService.generateResetLink(token);

      expect(link).toContain('http://localhost:3000');
      expect(link).toContain('/reset-password');
      expect(link).toContain('?token=');
      expect(link).toContain(encodeURIComponent(token));
    });

    test('should generate correct reset URL with custom base URL', () => {
      const token = 'test-token-12345';
      const baseUrl = 'https://hrm.company.com';
      const link = passwordResetService.generateResetLink(token, baseUrl);

      expect(link).toBe(`${baseUrl}/reset-password?token=${encodeURIComponent(token)}`);
    });

    test('should URL-encode token properly', () => {
      const token = 'token+with/special=chars&';
      const link = passwordResetService.generateResetLink(token);

      expect(link).toContain(encodeURIComponent(token));
      expect(link).not.toContain('+');
      expect(link).not.toContain('&token'); // Should be encoded
    });
  });

  describe('validatePassword', () => {
    
    test('should accept strong password', () => {
      const password = 'SecurePass123!';
      const result = passwordResetService.validatePassword(password);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject password shorter than 8 characters', () => {
      const password = 'Short1!';
      const result = passwordResetService.validatePassword(password);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    test('should reject password without uppercase letter', () => {
      const password = 'lowercase123!';
      const result = passwordResetService.validatePassword(password);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('uppercase'))).toBe(true);
    });

    test('should reject password without lowercase letter', () => {
      const password = 'UPPERCASE123!';
      const result = passwordResetService.validatePassword(password);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('lowercase'))).toBe(true);
    });

    test('should reject password without number', () => {
      const password = 'NoNumberPass!';
      const result = passwordResetService.validatePassword(password);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('number'))).toBe(true);
    });

    test('should reject password without special character', () => {
      const password = 'NoSpecial123';
      const result = passwordResetService.validatePassword(password);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('special character'))).toBe(true);
    });

    test('should reject empty or null password', () => {
      let result = passwordResetService.validatePassword('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');

      result = passwordResetService.validatePassword(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    test('should return all validation errors for weak password', () => {
      const password = 'weak';
      const result = passwordResetService.validatePassword(password);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3); // Multiple issues
    });
  });

  describe('cleanupExpiredData', () => {
    
    test('should call destroy on expired and used tokens', async () => {
      db.PasswordResetToken.destroy.mockResolvedValue(5);

      await passwordResetService.cleanupExpiredData();

      expect(db.PasswordResetToken.destroy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object)
        })
      );
    });

    test('should handle DB errors gracefully', async () => {
      db.PasswordResetToken.destroy.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(passwordResetService.cleanupExpiredData()).resolves.toBeUndefined();
    });
  });

  describe('getStatistics', () => {
    
    test('should return correct DB-based statistics', async () => {
      db.PasswordResetToken.count
        .mockResolvedValueOnce(10)  // activeTokens (non-expired)
        .mockResolvedValueOnce(7)   // unusedTokens (non-expired, usedAt null)
        .mockResolvedValueOnce(3);  // recentRequests (within rate limit window)

      const stats = await passwordResetService.getStatistics();

      expect(stats.activeTokens).toBe(10);
      expect(stats.unusedTokens).toBe(7);
      expect(stats.recentRequests).toBe(3);
    });

    test('should return zero stats on DB error', async () => {
      db.PasswordResetToken.count.mockRejectedValue(new Error('DB error'));

      const stats = await passwordResetService.getStatistics();

      expect(stats.activeTokens).toBe(0);
      expect(stats.unusedTokens).toBe(0);
      expect(stats.recentRequests).toBe(0);
    });
  });

  describe('Compatibility API', () => {

    test('createResetToken should return JWT string', async () => {
      db.User.findByPk.mockResolvedValue({ id: mockUser.id, email: mockUser.email });

      const token = await passwordResetService.createResetToken(mockUser.id);

      expect(typeof token).toBe('string');
      const decoded = jwt.decode(token);
      expect(decoded.id).toBe(mockUser.id);
    });

    test('createResetToken should throw if user not found', async () => {
      db.User.findByPk.mockResolvedValue(null);

      await expect(passwordResetService.createResetToken('unknown-id'))
        .rejects.toThrow('User not found');
    });

    test('validateResetToken should return userId for valid token', async () => {
      const { token } = await passwordResetService.generateResetToken(mockUser);
      db.PasswordResetToken.findOne.mockResolvedValue({ usedAt: null });

      const userId = await passwordResetService.validateResetToken(token);

      expect(userId).toBe(mockUser.id);
    });

    test('validateResetToken should return null for invalid token', async () => {
      const userId = await passwordResetService.validateResetToken('bad-token');

      expect(userId).toBeNull();
    });

    test('invalidateResetToken should mark token as used', async () => {
      const { token } = await passwordResetService.generateResetToken(mockUser);

      await passwordResetService.invalidateResetToken(token);

      expect(db.PasswordResetToken.update).toHaveBeenCalled();
    });
  });
});
