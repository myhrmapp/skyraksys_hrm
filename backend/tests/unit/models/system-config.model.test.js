const db = require('../../../models');

describe('SystemConfig Model', () => {
  let testUser;

  beforeEach(async () => {
    const uniqueId = Math.floor(Math.random() * 100000);
    
    testUser = await db.User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: `config${uniqueId}@example.com`,
      password: 'hashedPassword123',
      role: 'admin'
    });
  });

  afterEach(async () => {
    await db.SystemConfig.destroy({ where: {}, force: true });
    await db.User.destroy({ where: {}, force: true });
  });

  describe('Required Fields', () => {
    it('should create system config with required fields', async () => {
      const config = await db.SystemConfig.create({
        category: 'email',
        key: 'smtp_host',
        value: JSON.stringify('smtp.gmail.com'),
        changedBy: testUser.id
      });

      expect(config.id).toBeDefined();
      expect(config.category).toBe('email');
      expect(config.key).toBe('smtp_host');
      expect(config.version).toBe(1);
    });

    it('should fail without category', async () => {
      await expect(db.SystemConfig.create({
        key: 'test_key',
        value: JSON.stringify('test_value'),
        changedBy: testUser.id
      })).rejects.toThrow();
    });

    it('should fail without key', async () => {
      await expect(db.SystemConfig.create({
        category: 'app',
        value: JSON.stringify('test_value'),
        changedBy: testUser.id
      })).rejects.toThrow();
    });

    it('should fail without changedBy', async () => {
      await expect(db.SystemConfig.create({
        category: 'email',
        key: 'smtp_port',
        value: JSON.stringify(587)
      })).rejects.toThrow();
    });
  });

  describe('Version Management', () => {
    it('should default version to 1', async () => {
      const config = await db.SystemConfig.create({
        category: 'app',
        key: 'max_login_attempts',
        value: JSON.stringify(5),
        changedBy: testUser.id
      });

      expect(config.version).toBe(1);
    });

    it('should support version increments for history tracking', async () => {
      await db.SystemConfig.create({
        category: 'app',
        key: 'session_timeout',
        value: JSON.stringify(30),
        version: 1,
        changedBy: testUser.id
      });

      const updated = await db.SystemConfig.create({
        category: 'app',
        key: 'session_timeout',
        value: JSON.stringify(60),
        version: 2,
        changedBy: testUser.id
      });

      expect(updated.version).toBe(2);
    });
  });

  describe('Optional Fields', () => {
    it('should store description', async () => {
      const config = await db.SystemConfig.create({
        category: 'email',
        key: 'from_address',
        value: JSON.stringify('noreply@example.com'),
        changedBy: testUser.id,
        description: 'Default sender email address'
      });

      expect(config.description).toBe('Default sender email address');
    });
  });
});
