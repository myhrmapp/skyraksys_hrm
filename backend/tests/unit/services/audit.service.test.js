/**
 * Audit Service Tests
 * 
 * Purpose: Comprehensive test coverage for audit logging functionality
 * 
 * Test Coverage:
 * - Basic logging functionality
 * - Sensitive field sanitization
 * - Query operations
 * - Entity history tracking
 * - User activity reports
 * - Failed operations monitoring
 * - Error handling
 * 
 * Created: February 5, 2026 (Phase 1, Week 1, Day 3-5)
 */

const auditService = require('../../../services/audit.service');
const { AuditLog, User, sequelize } = require('../../../models');
const { v4: uuidv4 } = require('uuid');

describe('AuditService', () => {
  let testUser;
  let testEntityId;

  beforeAll(async () => {
    // Don't force sync (would drop all tables and break foreign keys)
    // Table already exists from previous migrations
    
    // Clean existing data
    await AuditLog.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    // Create test user
    testUser = await User.create({
      employeeId: 'TEST001',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      role: 'admin',
      password: 'TestPassword123!',
      department: 'IT',
      position: 'Developer',
      hireDate: new Date(),
      status: 'active'
    });

    testEntityId = uuidv4();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear audit logs before each test
    await AuditLog.destroy({ where: {}, force: true });
  });

  describe('log()', () => {
    test('should create audit log with all required fields', async () => {
      const result = await auditService.log({
        action: 'CREATED',
        entityType: 'LeaveBalance',
        entityId: testEntityId,
        userId: testUser.id,
        newValues: { balance: 15, year: 2026 },
        reason: 'Initial allocation'
      });

      expect(result).toBeTruthy();
      expect(result.id).toBeDefined();
      expect(result.action).toBe('CREATED');
      expect(result.entityType).toBe('LeaveBalance');
      expect(result.entityId).toBe(testEntityId);
      expect(result.userId).toBe(testUser.id);
      expect(result.newValues).toEqual({ balance: 15, year: 2026 });
      expect(result.reason).toBe('Initial allocation');
      expect(result.success).toBe(true);
    });

    test('should sanitize sensitive fields in oldValues', async () => {
      const result = await auditService.log({
        action: 'UPDATED',
        entityType: 'User',
        entityId: testUser.id,
        userId: testUser.id,
        oldValues: {
          email: 'old@example.com',
          password: 'PlaintextPassword123',
          firstName: 'John'
        },
        newValues: {
          email: 'new@example.com',
          password: 'NewPlaintextPassword456',
          firstName: 'Jane'
        }
      });

      expect(result.oldValues.password).toBe('[REDACTED]');
      expect(result.newValues.password).toBe('[REDACTED]');
      expect(result.oldValues.email).toBe('old@example.com');
      expect(result.newValues.email).toBe('new@example.com');
      expect(result.oldValues.firstName).toBe('John');
      expect(result.newValues.firstName).toBe('Jane');
    });

    test('should handle multiple sensitive fields', async () => {
      const result = await auditService.log({
        action: 'UPDATED',
        entityType: 'AdminConfig',
        entityId: uuidv4(),
        userId: testUser.id,
        newValues: {
          smtpHost: 'smtp.example.com',
          smtpPassword: 'SecretPassword123',
          apiKey: 'sk-1234567890',
          token: 'bearer-token-xyz',
          normalField: 'visible'
        }
      });

      expect(result.newValues.smtpPassword).toBe('[REDACTED]');
      expect(result.newValues.apiKey).toBe('[REDACTED]');
      expect(result.newValues.token).toBe('[REDACTED]');
      expect(result.newValues.smtpHost).toBe('smtp.example.com');
      expect(result.newValues.normalField).toBe('visible');
    });

    test('should capture IP address from request object', async () => {
      const mockReq = {
        headers: {
          'x-forwarded-for': '192.168.1.100, 10.0.0.1',
          'user-agent': 'Mozilla/5.0'
        },
        get: function(header) {
          return this.headers[header.toLowerCase()];
        }
      };

      const result = await auditService.log({
        action: 'UPDATED',
        entityType: 'User',
        entityId: testUser.id,
        userId: testUser.id,
        req: mockReq
      });

      expect(result.ipAddress).toBe('192.168.1.100');
      expect(result.userAgent).toBe('Mozilla/5.0');
    });

    test('should handle missing required fields gracefully', async () => {
      const result = await auditService.log({
        action: 'UPDATED',
        // Missing entityType, entityId, userId
      });

      expect(result).toBeNull();
    });

    test('should never throw errors (non-blocking)', async () => {
      // Force database error by using invalid UUID
      const result = await auditService.log({
        action: 'CREATED',
        entityType: 'Test',
        entityId: 'invalid-uuid', // Will fail UUID validation
        userId: testUser.id
      });

      // Should return null instead of throwing
      expect(result).toBeNull();
    });

    test('should log failed operations with error message', async () => {
      const result = await auditService.log({
        action: 'UPDATED',
        entityType: 'LeaveBalance',
        entityId: testEntityId,
        userId: testUser.id,
        success: false,
        errorMessage: 'Insufficient balance',
        duration: 125
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Insufficient balance');
      expect(result.duration).toBe(125);
    });

    test('should include metadata for correlation', async () => {
      const result = await auditService.log({
        action: 'UPDATED',
        entityType: 'LeaveBalance',
        entityId: testEntityId,
        userId: testUser.id,
        metadata: {
          batchId: 'batch-123',
          correlationId: 'req-456'
        }
      });

      expect(result.metadata.batchId).toBe('batch-123');
      expect(result.metadata.correlationId).toBe('req-456');
      expect(result.metadata.timestamp).toBeDefined();
    });
  });

  describe('query()', () => {
    beforeEach(async () => {
      // Create test audit logs
      await auditService.log({
        action: 'CREATED',
        entityType: 'LeaveBalance',
        entityId: testEntityId,
        userId: testUser.id,
        newValues: { balance: 15 }
      });

      await auditService.log({
        action: 'UPDATED',
        entityType: 'LeaveBalance',
        entityId: testEntityId,
        userId: testUser.id,
        oldValues: { balance: 15 },
        newValues: { balance: 10 }
      });

      await auditService.log({
        action: 'DELETED',
        entityType: 'User',
        entityId: uuidv4(),
        userId: testUser.id
      });
    });

    test('should query logs by entity type', async () => {
      const results = await auditService.query({
        entityType: 'LeaveBalance'
      });

      expect(results.length).toBe(2);
      expect(results[0].entityType).toBe('LeaveBalance');
      expect(results[1].entityType).toBe('LeaveBalance');
    });

    test('should query logs by entity ID', async () => {
      const results = await auditService.query({
        entityType: 'LeaveBalance',
        entityId: testEntityId
      });

      expect(results.length).toBe(2);
      expect(results[0].entityId).toBe(testEntityId);
    });

    test('should query logs by user ID', async () => {
      const results = await auditService.query({
        userId: testUser.id
      });

      expect(results.length).toBe(3);
      expect(results.every(log => log.userId === testUser.id)).toBe(true);
    });

    test('should query logs by action', async () => {
      const results = await auditService.query({
        action: 'CREATED'
      });

      expect(results.length).toBe(1);
      expect(results[0].action).toBe('CREATED');
    });

    test('should query logs by multiple actions', async () => {
      const results = await auditService.query({
        action: ['CREATED', 'UPDATED']
      });

      expect(results.length).toBe(2);
      expect(['CREATED', 'UPDATED']).toContain(results[0].action);
    });

    test('should include user data when requested', async () => {
      const results = await auditService.query({
        entityType: 'LeaveBalance',
        includeUser: true
      });

      expect(results[0].user).toBeDefined();
      expect(results[0].user.firstName).toBe('Test');
      expect(results[0].user.lastName).toBe('User');
    });

    test('should respect limit parameter', async () => {
      const results = await auditService.query({
        limit: 2
      });

      expect(results.length).toBe(2);
    });

    test('should order by createdAt DESC', async () => {
      const results = await auditService.query();

      expect(results[0].createdAt >= results[1].createdAt).toBe(true);
      expect(results[1].createdAt >= results[2].createdAt).toBe(true);
    });
  });

  describe('getEntityHistory()', () => {
    test('should retrieve all logs for specific entity', async () => {
      const entityId = uuidv4();

      await auditService.log({
        action: 'CREATED',
        entityType: 'EmployeeReview',
        entityId: entityId,
        userId: testUser.id,
        newValues: { rating: 5 }
      });

      await auditService.log({
        action: 'UPDATED',
        entityType: 'EmployeeReview',
        entityId: entityId,
        userId: testUser.id,
        oldValues: { rating: 5 },
        newValues: { rating: 4 }
      });

      const history = await auditService.getEntityHistory('EmployeeReview', entityId);

      expect(history.length).toBe(2);
      expect(history[0].action).toBe('UPDATED'); // Most recent first
      expect(history[1].action).toBe('CREATED');
      expect(history[0].user).toBeDefined();
    });
  });

  describe('getUserActivity()', () => {
    test('should retrieve user activity within date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday
      const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow

      // Create log within range
      await auditService.log({
        action: 'UPDATED',
        entityType: 'User',
        entityId: uuidv4(),
        userId: testUser.id
      });

      const activity = await auditService.getUserActivity(
        testUser.id,
        startDate,
        endDate
      );

      expect(activity.length).toBeGreaterThan(0);
      expect(activity.every(log => log.userId === testUser.id)).toBe(true);
    });
  });

  describe('getFailedOperations()', () => {
    test('should retrieve only failed operations', async () => {
      await auditService.log({
        action: 'UPDATED',
        entityType: 'LeaveBalance',
        entityId: uuidv4(),
        userId: testUser.id,
        success: false,
        errorMessage: 'Validation error'
      });

      await auditService.log({
        action: 'UPDATED',
        entityType: 'LeaveBalance',
        entityId: uuidv4(),
        userId: testUser.id,
        success: true
      });

      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday
      const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow

      const failed = await auditService.getFailedOperations(startDate, endDate);

      expect(failed.length).toBe(1);
      expect(failed[0].success).toBe(false);
      expect(failed[0].errorMessage).toBe('Validation error');
      expect(failed[0].user).toBeDefined();
    });
  });

  describe('sanitizeValues()', () => {
    test('should redact all sensitive fields', () => {
      const input = {
        email: 'test@example.com',
        password: 'secret123',
        passwordHash: 'hash123',
        token: 'token123',
        apiKey: 'key123',
        secret: 'secret123',
        ssn: '123-45-6789',
        normalField: 'visible'
      };

      const sanitized = auditService.sanitizeValues(input);

      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.passwordHash).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.secret).toBe('[REDACTED]');
      expect(sanitized.ssn).toBe('[REDACTED]');
      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.normalField).toBe('visible');
    });

    test('should handle null values', () => {
      const result = auditService.sanitizeValues(null);
      expect(result).toBeNull();
    });

    test('should handle non-object values', () => {
      expect(auditService.sanitizeValues('string')).toBe('string');
      expect(auditService.sanitizeValues(123)).toBe(123);
      expect(auditService.sanitizeValues(true)).toBe(true);
    });
  });

  describe('getClientIp()', () => {
    test('should extract IP from X-Forwarded-For header', () => {
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.100, 10.0.0.1' }
      };

      const ip = auditService.getClientIp(req);
      expect(ip).toBe('192.168.1.100');
    });

    test('should extract IP from X-Real-IP header', () => {
      const req = {
        headers: { 'x-real-ip': '172.16.0.50' }
      };

      const ip = auditService.getClientIp(req);
      expect(ip).toBe('172.16.0.50');
    });

    test('should fallback to connection remoteAddress', () => {
      const req = {
        headers: {},
        connection: { remoteAddress: '10.0.0.100' }
      };

      const ip = auditService.getClientIp(req);
      expect(ip).toBe('10.0.0.100');
    });

    test('should return null if no IP found', () => {
      const req = { headers: {} };

      const ip = auditService.getClientIp(req);
      expect(ip).toBeNull();
    });
  });
});

