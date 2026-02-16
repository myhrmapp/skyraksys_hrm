const db = require('../../../models');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'employee'
      };

      const user = await db.User.create(userData);

      expect(user.id).toBeDefined();
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
      expect(user.email).toBe('john.doe@example.com');
      expect(user.role).toBe('employee');
      expect(user.isActive).toBe(true);
    });

    it('should fail with duplicate email', async () => {
      const userData = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'duplicate@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'employee'
      };

      await db.User.create(userData);

      await expect(db.User.create(userData)).rejects.toThrow();
    });

    it('should fail without required fields', async () => {
      await expect(db.User.create({
        firstName: 'Test'
      })).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'invalid-email',
        password: await bcrypt.hash('Password123!', 10),
        role: 'employee'
      };

      await expect(db.User.create(userData)).rejects.toThrow();
    });
  });

  describe('User Roles', () => {
    it('should accept valid roles', async () => {
      const roles = ['admin', 'hr', 'manager', 'employee'];

      for (const role of roles) {
        const user = await db.User.create({
          firstName: 'Test',
          lastName: 'User',
          email: `test.${role}@example.com`,
          password: await bcrypt.hash('Password123!', 10),
          role: role
        });

        expect(user.role).toBe(role);
      }
    });

    it('should reject invalid role', async () => {
      await expect(db.User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'invalid_role'
      })).rejects.toThrow();
    });
  });

  describe('Password Security', () => {
    it('should hash password before storing', async () => {
      const plainPassword = 'Password123!';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const user = await db.User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'secure@example.com',
        password: hashedPassword,
        role: 'employee'
      });

      expect(user.password).not.toBe(plainPassword);
      expect(user.password.length).toBeGreaterThan(50);
    });

    it('should validate minimum password length', async () => {
      await expect(db.User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'short@example.com',
        password: '123', // Too short
        role: 'employee'
      })).rejects.toThrow();
    });
  });

  describe('User Status', () => {
    it('should default to active', async () => {
      const user = await db.User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'active@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'employee'
      });

      expect(user.isActive).toBe(true);
    });

    it('should allow deactivation', async () => {
      const user = await db.User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'deactivate@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'employee',
        isActive: false
      });

      expect(user.isActive).toBe(false);
    });
  });

  describe('Account Lockout', () => {
    it('should track login attempts', async () => {
      const user = await db.User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'lockout@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'employee',
        failedLoginAttempts: 0
      });

      expect(user.failedLoginAttempts).toBe(0);

      await user.update({ failedLoginAttempts: user.failedLoginAttempts + 1 });
      expect(user.failedLoginAttempts).toBe(1);
    });

    it('should support account locking', async () => {
      const user = await db.User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'locked@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'employee'
      });

      const lockoutDate = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
      await user.update({
        lockoutUntil: lockoutDate
      });

      expect(user.lockoutUntil).toBeDefined();
      expect(user.lockoutUntil).toBeInstanceOf(Date);
      expect(user.lockoutUntil.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Timestamps', () => {
    it('should track lastLoginAt', async () => {
      const user = await db.User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'timestamp@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'employee'
      });

      const loginTime = new Date();
      await user.update({ lastLoginAt: loginTime });

      expect(user.lastLoginAt).toBeDefined();
    });

    it('should track passwordChangedAt', async () => {
      const user = await db.User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'pwchange@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'employee'
      });

      await user.update({ passwordChangedAt: new Date() });
      expect(user.passwordChangedAt).toBeDefined();
    });
  });

  describe('Soft Delete', () => {
    it('should soft delete user', async () => {
      const user = await db.User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'softdelete@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'employee'
      });

      await user.destroy();

      const foundUser = await db.User.findByPk(user.id);
      expect(foundUser).toBeNull();

      const deletedUser = await db.User.findByPk(user.id, { paranoid: false });
      expect(deletedUser).toBeDefined();
      expect(deletedUser.deletedAt).toBeDefined();
    });
  });
});
