const db = require('../../../models');

describe('AuditLog Model', () => {
  let testUser;

  beforeEach(async () => {
    const uniqueId = Math.floor(Math.random() * 100000);
    
    testUser = await db.User.create({
      firstName: 'Test',
      lastName: 'User',
      email: `audittest${uniqueId}@example.com`,
      password: 'hashedPassword123',
      role: 'admin'
    });
  });

  afterEach(async () => {
    await db.AuditLog.destroy({ where: {}, force: true });
    await db.User.destroy({ where: {}, force: true });
  });

  describe('Required Fields', () => {
    it('should create audit log with required fields', async () => {
      const auditLog = await db.AuditLog.create({
        action: 'CREATED',
        entityType: 'Employee',
        entityId: testUser.id,
        userId: testUser.id
      });

      expect(auditLog.id).toBeDefined();
      expect(auditLog.action).toBe('CREATED');
      expect(auditLog.entityType).toBe('Employee');
    });

    it('should fail without action', async () => {
      await expect(db.AuditLog.create({
        entityType: 'Employee',
        entityId: testUser.id,
        userId: testUser.id
      })).rejects.toThrow();
    });

    it('should fail without entityType', async () => {
      await expect(db.AuditLog.create({
        action: 'CREATED',
        entityId: testUser.id,
        userId: testUser.id
      })).rejects.toThrow();
    });
  });

  describe('Action Enum Values', () => {
    it('should accept valid action values', async () => {
      const actions = ['CREATED', 'UPDATED', 'DELETED', 'LOGIN_SUCCESS', 'PASSWORD_CHANGED'];
      
      for (const action of actions) {
        const log = await db.AuditLog.create({
          action,
          entityType: 'User',
          entityId: testUser.id,
          userId: testUser.id
        });
        expect(log.action).toBe(action);
      }
    });

    it('should reject invalid action values', async () => {
      await expect(db.AuditLog.create({
        action: 'INVALID_ACTION',
        entityType: 'User',
        entityId: testUser.id,
        userId: testUser.id
      })).rejects.toThrow();
    });
  });

  describe('Optional Fields', () => {
    it('should store oldValues and newValues as JSON', async () => {
      const auditLog = await db.AuditLog.create({
        action: 'UPDATED',
        entityType: 'Employee',
        entityId: testUser.id,
        userId: testUser.id,
        oldValues: { salary: 50000 },
        newValues: { salary: 55000 }
      });

      expect(auditLog.oldValues).toEqual({ salary: 50000 });
      expect(auditLog.newValues).toEqual({ salary: 55000 });
    });

    it('should store reason, ipAddress, and userAgent', async () => {
      const auditLog = await db.AuditLog.create({
        action: 'DELETED',
        entityType: 'Department',
        entityId: testUser.id,
        userId: testUser.id,
        reason: 'Duplicate entry',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      });

      expect(auditLog.reason).toBe('Duplicate entry');
      expect(auditLog.ipAddress).toBe('192.168.1.1');
      expect(auditLog.userAgent).toBe('Mozilla/5.0');
    });

    it('should store metadata as JSON', async () => {
      const auditLog = await db.AuditLog.create({
        action: 'EXPORTED',
        entityType: 'Report',
        entityId: testUser.id,
        userId: testUser.id,
        metadata: { format: 'PDF', recordCount: 150 }
      });

      expect(auditLog.metadata).toEqual({ format: 'PDF', recordCount: 150 });
    });

    it('should track success status and error messages', async () => {
      const auditLog = await db.AuditLog.create({
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: testUser.id,
        userId: testUser.id,
        success: false,
        errorMessage: 'Invalid credentials'
      });

      expect(auditLog.success).toBe(false);
      expect(auditLog.errorMessage).toBe('Invalid credentials');
    });

    it('should track operation duration', async () => {
      const auditLog = await db.AuditLog.create({
        action: 'IMPORTED',
        entityType: 'Employee',
        entityId: testUser.id,
        userId: testUser.id,
        duration: 2500
      });

      expect(auditLog.duration).toBe(2500);
    });
  });
});
