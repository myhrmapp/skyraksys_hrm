const db = require('../../../models');

describe('RefreshToken Model', () => {
  let testUser;

  beforeEach(async () => {
    const uniqueId = Math.floor(Math.random() * 100000);
    
    testUser = await db.User.create({
      firstName: 'Token',
      lastName: 'User',
      email: `token${uniqueId}@example.com`,
      password: 'hashedPassword123',
      role: 'employee'
    });
  });

  afterEach(async () => {
    await db.RefreshToken.destroy({ where: {}, force: true });
    await db.User.destroy({ where: {}, force: true });
  });

  describe('Required Fields', () => {
    it('should create refresh token with required fields', async () => {
      const token = await db.RefreshToken.create({
        token: 'random_refresh_token_string_12345',
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      expect(token.id).toBeDefined();
      expect(token.token).toBe('random_refresh_token_string_12345');
      expect(token.userId).toBe(testUser.id);
    });

    it('should fail without token', async () => {
      await expect(db.RefreshToken.create({
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      })).rejects.toThrow();
    });

    it('should fail without expiresAt', async () => {
      await expect(db.RefreshToken.create({
        token: 'test_token_123',
        userId: testUser.id
      })).rejects.toThrow();
    });

    it('should enforce unique token', async () => {
      await db.RefreshToken.create({
        token: 'unique_token_123',
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      await expect(db.RefreshToken.create({
        token: 'unique_token_123',
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      })).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    it('should default isRevoked to false', async () => {
      const token = await db.RefreshToken.create({
        token: 'test_token_456',
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      expect(token.isRevoked).toBe(false);
    });
  });

  describe('Optional Fields', () => {
    it('should store userAgent and ipAddress', async () => {
      const token = await db.RefreshToken.create({
        token: 'test_token_789',
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
        ipAddress: '192.168.1.100'
      });

      expect(token.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0)');
      expect(token.ipAddress).toBe('192.168.1.100');
    });

    it('should track revocation', async () => {
      const token = await db.RefreshToken.create({
        token: 'test_token_revoke',
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const revokedAt = new Date();
      token.isRevoked = true;
      token.revokedAt = revokedAt;
      await token.save();

      const updated = await db.RefreshToken.findByPk(token.id);
      expect(updated.isRevoked).toBe(true);
      expect(updated.revokedAt).toBeDefined();
    });
  });

  describe('Token Expiration', () => {
    it('should store future expiration date', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const token = await db.RefreshToken.create({
        token: 'future_token',
        userId: testUser.id,
        expiresAt: futureDate
      });

      expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should allow checking expired tokens', async () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      const token = await db.RefreshToken.create({
        token: 'expired_token',
        userId: testUser.id,
        expiresAt: pastDate
      });

      expect(token.expiresAt.getTime()).toBeLessThan(Date.now());
    });
  });
});
