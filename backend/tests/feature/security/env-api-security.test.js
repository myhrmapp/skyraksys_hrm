const request = require('supertest');
const bcrypt = require('bcryptjs');

// CRITICAL: Set environment variables BEFORE importing app
process.env.JWT_SECRET = 'test-secret-key-for-env-api-security-tests';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-env-api-security-tests';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const app = require('../../../server');
const db = require('../../../models');
const fs = require('fs').promises;
const path = require('path');
const { resetRateLimiter } = require('../../../middleware/login-rate-limiter');

describe('Task 4.1: .env API Security - No Direct File Writes', () => {
  let adminUser, adminToken, adminPassword = 'AdminPass123!';

  beforeAll(async () => {
    await db.sequelize.query('TRUNCATE TABLE users CASCADE');
    resetRateLimiter(); // Clear rate limiter state from previous tests

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    adminUser = await db.User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@env-test.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@env-test.com', password: adminPassword });
    
    console.log('Login response status:', loginResponse.status);
    console.log('Login response body:', JSON.stringify(loginResponse.body, null, 2));
    
    if (loginResponse.body.data && loginResponse.body.data.accessToken) {
      adminToken = loginResponse.body.data.accessToken;
    } else {
      throw new Error('Failed to get admin token during test setup');
    }
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('Email Config Should NOT Write to .env', () => {
    it('should save email config to database instead of .env file', async () => {
      const response = await request(app)
        .post('/api/admin/email-config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          smtpHost: 'smtp.test.com',
          smtpPort: 587,
          smtpSecure: false,
          smtpUser: 'test@test.com',
          smtpPassword: 'testpass123',
          emailFrom: 'noreply@test.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).not.toContain('restart'); // Should not require restart
      expect(response.body.message).toContain('database'); // Should mention database storage
    });

    it('should retrieve email config from database (not .env)', async () => {
      const response = await request(app)
        .get('/api/admin/email-config')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.smtpHost).toBeDefined();
      expect(response.body.source).toBe('database'); // Should indicate source
    });
  });

  describe('Config Versioning', () => {
    it('should store config version history in database', async () => {
      // Update config twice
      await request(app)
        .post('/api/admin/email-config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          smtpHost: 'smtp.v1.com',
          smtpPort: 587,
          smtpSecure: false,
          smtpUser: 'v1@test.com',
          smtpPassword: 'pass1',
          emailFrom: 'v1@test.com'
        });

      await request(app)
        .post('/api/admin/email-config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          smtpHost: 'smtp.v2.com',
          smtpPort: 465,
          smtpSecure: true,
          smtpUser: 'v2@test.com',
          smtpPassword: 'pass2',
          emailFrom: 'v2@test.com'
        });

      // Get version history
      const response = await request(app)
        .get('/api/admin/email-config/history')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.versions).toBeInstanceOf(Array);
      expect(response.body.data.versions.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data.versions[0].version).toBeDefined();
      expect(response.body.data.versions[0].changedBy).toBe(adminUser.id);
    });

    it('should allow rollback to previous config version', async () => {
      const historyResponse = await request(app)
        .get('/api/admin/email-config/history')
        .set('Authorization', `Bearer ${adminToken}`);

      const versions = historyResponse.body.data.versions;
      const previousVersion = versions[versions.length - 2]; // Second to last

      const rollbackResponse = await request(app)
        .post('/api/admin/email-config/rollback')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ version: previousVersion.version });

      expect(rollbackResponse.status).toBe(200);
      expect(rollbackResponse.body.success).toBe(true);
      expect(rollbackResponse.body.message).toContain('rolled back');
    });
  });

  describe('Security: Admin Only Access', () => {
    it('should reject non-admin users from modifying config', async () => {
      const hrPassword = 'HrPass123!';
      const hashedHrPassword = await bcrypt.hash(hrPassword, 10);
      const hrUser = await db.User.create({
        firstName: 'HR',
        lastName: 'User',
        email: 'hr@env-test.com',
        password: hashedHrPassword,
        role: 'hr',
        isActive: true
      });

      const hrLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'hr@env-test.com', password: hrPassword });
      
      const hrToken = hrLoginResponse.body.data.accessToken;

      const response = await request(app)
        .post('/api/admin/email-config')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({
          smtpHost: 'malicious.com',
          smtpPort: 587,
          smtpSecure: false,
          smtpUser: 'hacker@test.com',
          smtpPassword: 'hacked',
          emailFrom: 'hacked@test.com'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Audit Trail for Config Changes', () => {
    it('should log all config changes with admin user and timestamp', async () => {
      await request(app)
        .post('/api/admin/email-config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          smtpHost: 'smtp.audit-test.com',
          smtpPort: 587,
          smtpSecure: false,
          smtpUser: 'audit@test.com',
          smtpPassword: 'auditpass',
          emailFrom: 'audit@test.com'
        });

      // Check audit logs
      const auditResponse = await request(app)
        .get('/api/admin/email-config/audit')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditResponse.status).toBe(200);
      expect(auditResponse.body.data.logs).toBeInstanceOf(Array);
      
      const latestLog = auditResponse.body.data.logs[0];
      expect(latestLog.action).toBe('EMAIL_CONFIG_UPDATED');
      expect(latestLog.userId).toBe(adminUser.id);
      expect(latestLog.details).toBeDefined();
      expect(latestLog.details.changes).toBeDefined();
    });
  });
});
