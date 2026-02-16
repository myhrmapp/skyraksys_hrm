const request = require('supertest');
const app = require('../../../server');
const db = require('../../../models');
const bcrypt = require('bcryptjs');

describe('System Config API - Admin Only with Password Re-auth', () => {
  let adminToken;
  let adminUser;
  let adminPassword = 'AdminPass123!';
  let hrToken;
  let employeeToken;

  beforeAll(async () => {
    // Clean up test data
    await db.User.destroy({ where: { email: ['admin-sysconfig@test.com', 'hr-sysconfig@test.com', 'emp-sysconfig@test.com'] } });

    // Create admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    adminUser = await db.User.create({
      email: 'admin-sysconfig@test.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'SysConfig',
      role: 'admin',
      isActive: true,
      isLocked: false
    });

    // Create HR user
    const hrUser = await db.User.create({
      email: 'hr-sysconfig@test.com',
      password: hashedPassword,
      firstName: 'HR',
      lastName: 'SysConfig',
      role: 'hr',
      isActive: true,
      isLocked: false
    });

    // Create employee user
    const empUser = await db.User.create({
      email: 'emp-sysconfig@test.com',
      password: hashedPassword,
      firstName: 'Employee',
      lastName: 'SysConfig',
      role: 'employee',
      isActive: true,
      isLocked: false
    });

    // Login to get tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin-sysconfig@test.com', password: adminPassword });
    adminToken = adminLogin.body.data.accessToken;

    const hrLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hr-sysconfig@test.com', password: adminPassword });
    hrToken = hrLogin.body.data.accessToken;

    const empLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'emp-sysconfig@test.com', password: adminPassword });
    employeeToken = empLogin.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up
    await db.User.destroy({ where: { email: ['admin-sysconfig@test.com', 'hr-sysconfig@test.com', 'emp-sysconfig@test.com'] } });
    await db.sequelize.close();
  });

  describe('POST /api/system-config/view - View System Config', () => {
    it('should reject unauthenticated access', async () => {
      const response = await request(app)
        .post('/api/system-config/view')
        .send({ password: adminPassword });

      expect(response.status).toBe(401);
    });

    it('should reject non-admin users (HR)', async () => {
      const response = await request(app)
        .post('/api/system-config/view')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ password: adminPassword });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Insufficient permissions');
    });

    it('should reject non-admin users (Employee)', async () => {
      const response = await request(app)
        .post('/api/system-config/view')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ password: adminPassword });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Insufficient permissions');
    });

    it('should reject admin with missing password', async () => {
      const response = await request(app)
        .post('/api/system-config/view')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Password required for this operation');
    });

    it('should reject admin with incorrect password', async () => {
      const response = await request(app)
        .post('/api/system-config/view')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'WrongPassword123!' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid password');

      // Verify audit log created for failed attempt
      const auditLog = await db.AuditLog.findOne({
        where: {
          userId: adminUser.id,
          action: 'SYSTEM_CONFIG_ACCESS_DENIED'
        },
        order: [['createdAt', 'DESC']]
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog.entity).toBe('SystemConfig');
    });

    it('should allow admin with correct password and return all config sections', async () => {
      const response = await request(app)
        .post('/api/system-config/view')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: adminPassword });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // Verify all config sections present
      expect(response.body.data.authentication).toBeDefined();
      expect(response.body.data.database).toBeDefined();
      expect(response.body.data.email).toBeDefined();
      expect(response.body.data.application).toBeDefined();
      expect(response.body.data.redis).toBeDefined();
      expect(response.body.data.rateLimiting).toBeDefined();
      expect(response.body.data.logging).toBeDefined();

      // Verify sensitive data exposed (for admin only)
      expect(response.body.data.authentication.jwtSecret).toBeDefined();
      expect(response.body.data.authentication.encryptionKey).toBeDefined();
      expect(response.body.data.database.password).toBeDefined();
      expect(response.body.data.email.smtpPassword).toBeDefined();

      // Verify audit log created for successful access
      const auditLog = await db.AuditLog.findOne({
        where: {
          userId: adminUser.id,
          action: 'VIEW_SYSTEM_CONFIG'
        },
        order: [['createdAt', 'DESC']]
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog.entity).toBe('SystemConfig');
    });
  });

  describe('POST /api/system-config/verify-password - Password Verification', () => {
    it('should reject missing password', async () => {
      const response = await request(app)
        .post('/api/system-config/verify-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Password required');
    });

    it('should reject incorrect password', async () => {
      const response = await request(app)
        .post('/api/system-config/verify-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'WrongPassword!' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid password');
    });

    it('should accept correct password', async () => {
      const response = await request(app)
        .post('/api/system-config/verify-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: adminPassword });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password verified');
    });

    it('should only allow admin role', async () => {
      const response = await request(app)
        .post('/api/system-config/verify-password')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ password: adminPassword });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/system-config/audit-trail - Audit Trail', () => {
    it('should return audit trail for admin', async () => {
      const response = await request(app)
        .get('/api/system-config/audit-trail?limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(0);
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .get('/api/system-config/audit-trail')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/system-config/audit-trail?limit=5&offset=0')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.offset).toBe(0);
    });
  });

  describe('PUT /api/system-config/update - Update Config (with password re-auth)', () => {
    it('should reject update without password', async () => {
      const response = await request(app)
        .put('/api/system-config/update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          section: 'application',
          updates: { nodeEnv: 'staging' }
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Password required for this operation');
    });

    it('should reject update with incorrect password', async () => {
      const response = await request(app)
        .put('/api/system-config/update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          section: 'application',
          updates: { nodeEnv: 'staging' },
          password: 'WrongPassword!'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid password');
    });

    it('should allow admin to update config with correct password', async () => {
      const response = await request(app)
        .put('/api/system-config/update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          section: 'testConfig',
          updates: { testKey: 'testValue' },
          password: adminPassword
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Configuration updated successfully');

      // Verify audit log created
      const auditLog = await db.AuditLog.findOne({
        where: {
          userId: adminUser.id,
          action: 'UPDATE_SYSTEM_CONFIG',
          entityType: 'SystemConfig'
        },
        order: [['createdAt', 'DESC']]
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog.details.newValue).toEqual({ testKey: 'testValue' });
    });
  });
});
