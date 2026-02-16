const db = require('../../../models');

describe('PasswordResetToken Model', () => {
  let testUser;

  beforeEach(async () => {
    const uniqueId = Math.floor(Math.random() * 100000);
    
    testUser = await db.User.create({
      firstName: 'Reset',
      lastName: 'User',
      email: `reset${uniqueId}@example.com`,
      password: 'hashedPassword123',
      role: 'employee'
    });
  });

  afterEach(async () => {
    await db.PasswordResetToken.destroy({ where: {}, force: true });
    await db.User.destroy({ where: {}, force: true });
  });

  describe('Required Fields', () => {
    it('should create password reset token with required fields', async () => {
      const token = await db.PasswordResetToken.create({
        tokenId: 'abc123def456',
        userId: testUser.id,
        email: testUser.email,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      });

      expect(token.id).toBeDefined();
      expect(token.tokenId).toBe('abc123def456');
      expect(token.email).toBe(testUser.email);
    });

    it('should fail without tokenId', async () => {
      await expect(db.PasswordResetToken.create({
        userId: testUser.id,
        email: testUser.email,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      })).rejects.toThrow();
    });

    it('should fail without userId', async () => {
      await expect(db.PasswordResetToken.create({
        tokenId: 'test123',
        email: testUser.email,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      })).rejects.toThrow();
    });

    it('should fail without email', async () => {
      await expect(db.PasswordResetToken.create({
        tokenId: 'test123',
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      })).rejects.toThrow();
    });

    it('should enforce unique tokenId', async () => {
      await db.PasswordResetToken.create({
        tokenId: 'unique_token_id',
        userId: testUser.id,
        email: testUser.email,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      });

      await expect(db.PasswordResetToken.create({
        tokenId: 'unique_token_id',
        userId: testUser.id,
        email: testUser.email,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      })).rejects.toThrow();
    });
  });

  describe('Token Usage Tracking', () => {
    it('should default usedAt to null', async () => {
      const token = await db.PasswordResetToken.create({
        tokenId: 'unused_token',
        userId: testUser.id,
        email: testUser.email,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      });

      expect(token.usedAt).toBeNull();
    });

    it('should allow marking token as used', async () => {
      const token = await db.PasswordResetToken.create({
        tokenId: 'used_token',
        userId: testUser.id,
        email: testUser.email,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      });

      const usedTime = new Date();
      token.usedAt = usedTime;
      await token.save();

      const updated = await db.PasswordResetToken.findByPk(token.id);
      expect(updated.usedAt).toBeDefined();
    });
  });

  describe('Token Expiration', () => {
    it('should store expiration date', async () => {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      const token = await db.PasswordResetToken.create({
        tokenId: 'expiring_token',
        userId: testUser.id,
        email: testUser.email,
        expiresAt
      });

      expect(token.expiresAt.getTime()).toBeCloseTo(expiresAt.getTime(), -2);
    });

    it('should allow checking if token is expired', async () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      const token = await db.PasswordResetToken.create({
        tokenId: 'expired_token_check',
        userId: testUser.id,
        email: testUser.email,
        expiresAt: pastDate
      });

      expect(token.expiresAt.getTime()).toBeLessThan(Date.now());
    });
  });
});
