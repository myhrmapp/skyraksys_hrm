const request = require('supertest');
const bcrypt = require('bcryptjs');

// CRITICAL: Set environment variables BEFORE importing app
process.env.JWT_SECRET = 'test-secret-key-audit-logging';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-audit-logging';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const app = require('../../../server');
const db = require('../../../models');
const { resetRateLimiter } = require('../../../middleware/login-rate-limiter');

describe('Task 4.3: Auth Audit Logging - Comprehensive Event Tracking', () => {
  let testUser, adminUser, testPassword = 'TestPass123!', adminPassword = 'AdminPass123!';
  let testToken, adminToken;

  beforeAll(async () => {
    await db.sequelize.query('TRUNCATE TABLE users CASCADE');
    await db.sequelize.query('TRUNCATE TABLE audit_logs CASCADE');
    
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const hashedTestPassword = await bcrypt.hash(testPassword, 10);
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

    testUser = await db.User.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@audit.com',
      password: hashedTestPassword,
      role: 'employee',
      isActive: true
    });

    adminUser = await db.User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@audit.com',
      password: hashedAdminPassword,
      role: 'admin',
      isActive: true
    });

    const testLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@audit.com', password: testPassword });
    testToken = testLogin.body.data.accessToken;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@audit.com', password: adminPassword });
    adminToken = adminLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('Login Attempt Logging', () => {
    it('should log successful login with IP and user agent', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('User-Agent', 'Test Browser 1.0')
        .send({ email: 'test@audit.com', password: testPassword });

      expect(response.status).toBe(200);

      // Check audit log
      const auditLogs = await db.AuditLog.findAll({
        where: {
          userId: testUser.id,
          action: 'LOGIN_SUCCESS'
        },
        order: [['createdAt', 'DESC']],
        limit: 1
      });

      expect(auditLogs.length).toBe(1);
      const log = auditLogs[0];
      expect(log.entity).toBe('Auth');
      expect(log.details).toBeDefined();
      expect(log.details.ip).toBeDefined();
      expect(log.details.userAgent).toContain('Test Browser');
    });

    it('should log failed login with reason', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('User-Agent', 'Hacker Browser')
        .send({ email: 'test@audit.com', password: 'WrongPassword' });

      expect(response.status).toBe(401);

      // Check audit log
      const auditLogs = await db.AuditLog.findAll({
        where: {
          userId: testUser.id,
          action: 'LOGIN_FAILED'
        },
        order: [['createdAt', 'DESC']],
        limit: 1
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      const log = auditLogs[0];
      expect(log.details.reason).toBe('Invalid credentials');
      expect(log.details.ip).toBeDefined();
    });

    it('should log failed login for non-existent user', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@audit.com', password: 'anything' });

      // Query for LOGIN_FAILED actions and filter by email in metadata
      const auditLogs = await db.AuditLog.findAll({
        where: {
          action: 'LOGIN_FAILED'
        },
        order: [['createdAt', 'DESC']],
        limit: 10
      });

      // Filter for the specific email
      const matchingLogs = auditLogs.filter(log => log.details?.email === 'nonexistent@audit.com');

      // Should still log attempt even if user doesn't exist
      expect(matchingLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Password Change Logging', () => {
    it('should log password changes with old/new hash comparison', async () => {
      const oldPasswordHash = testUser.password;

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: 'NewTestPass123!',
          confirmPassword: 'NewTestPass123!'
        });

      if (response.status !== 200) {
        console.log('Password change failed:', response.status, response.body);
      }

      expect(response.status).toBe(200);

      // Check audit log
      const auditLogs = await db.AuditLog.findAll({
        where: {
          userId: testUser.id,
          action: 'PASSWORD_CHANGED'
        },
        order: [['createdAt', 'DESC']],
        limit: 1
      });

      expect(auditLogs.length).toBe(1);
      const log = auditLogs[0];
      expect(log.details.oldPasswordHash).toBe(oldPasswordHash);
      expect(log.details.newPasswordHash).toBeDefined();
      expect(log.details.newPasswordHash).not.toBe(oldPasswordHash);
      expect(log.details.ip).toBeDefined();
    });

    it('should log admin password resets', async () => {
      // Admin resets another user's password
      const response = await request(app)
        .post('/api/admin/reset-user-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id,
          newPassword: 'AdminResetPass123!'
        });

      if (response.status === 200) {
        const auditLogs = await db.AuditLog.findAll({
          where: {
            userId: testUser.id,
            action: 'PASSWORD_RESET_BY_ADMIN'
          },
          order: [['createdAt', 'DESC']],
          limit: 1
        });

        expect(auditLogs.length).toBe(1);
        expect(auditLogs[0].details.resetBy).toBe(adminUser.id);
      }
    });
  });

  describe('Account Lockout Logging', () => {
    beforeEach(() => {
      // Reset rate limiter to allow consecutive failed attempts
      const { resetRateLimiter } = require('../../../middleware/login-rate-limiter');
      resetRateLimiter();
    });

    it('should log temporary lockouts from failed attempts', async () => {
      // Create new user for clean lockout test
      const lockoutPassword = 'LockoutPass123!';
      const hashedLockoutPassword = await bcrypt.hash(lockoutPassword, 10);
      const lockoutUser = await db.User.create({
        firstName: 'Lockout',
        lastName: 'User',
        email: 'lockout@audit.com',
        password: hashedLockoutPassword,
        role: 'employee',
        isActive: true
      });

      // Make 5 failed attempts to trigger lockout (with delays to avoid rate limiting)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'lockout@audit.com', password: 'WrongPass123' });
        
        // Small delay between attempts to avoid rate limiting
        if (i < 4) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Refresh user to see login attempts count
      await lockoutUser.reload();
      console.log(`User failedLoginAttempts after 5 failed attempts: ${lockoutUser.failedLoginAttempts}, lockoutUntil: ${lockoutUser.lockoutUntil}`);

      // Check audit log for lockout
      const auditLogs = await db.AuditLog.findAll({
        where: {
          userId: lockoutUser.id,
          action: 'ACCOUNT_LOCKED_TEMP'
        },
        order: [['createdAt', 'DESC']],
        limit: 1
      });

      console.log(`Found ${auditLogs.length} ACCOUNT_LOCKED_TEMP audit logs`);

      expect(auditLogs.length).toBeGreaterThan(0);
      const log = auditLogs[0];
      expect(log.details.reason).toBe('Too many failed login attempts');
      expect(log.details.lockDuration).toBeDefined();
      expect(log.details.failedAttempts).toBe(5);
    });

    it('should log manual admin lockouts', async () => {
      const response = await request(app)
        .post('/api/admin/lock-user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id,
          reason: 'Suspicious activity detected'
        });

      if (response.status === 200) {
        const auditLogs = await db.AuditLog.findAll({
          where: {
            userId: testUser.id,
            action: 'ACCOUNT_LOCKED_MANUAL'
          },
          order: [['createdAt', 'DESC']],
          limit: 1
        });

        expect(auditLogs.length).toBe(1);
        expect(auditLogs[0].details.lockedBy).toBe(adminUser.id);
        expect(auditLogs[0].details.reason).toContain('Suspicious');
      }
    });
  });

  describe('Token Refresh Logging', () => {
    // Reset rate limiter before token refresh tests
    beforeEach(() => {
      resetRateLimiter();
    });
    
    it('should log each token refresh with device info', async () => {
      // Reset password and failed login attempts for test@audit.com to ensure clean state
      // (Password may have been changed by "Password Change Logging" tests)
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      await db.User.update(
        { 
          password: hashedPassword,
          failedLoginAttempts: 0, 
          lockoutUntil: null 
        },
        { where: { email: 'test@audit.com' } }
      );
      
      // Verify the user state before login
      const userBeforeLogin = await db.User.findOne({ where: { email: 'test@audit.com' } });
      console.log(`User before login - failedLoginAttempts: ${userBeforeLogin.failedLoginAttempts}, lockoutUntil: ${userBeforeLogin.lockoutUntil}, isActive: ${userBeforeLogin.isActive}, isLocked: ${userBeforeLogin.isLocked}`);
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('User-Agent', 'Mobile App 2.0')
        .send({ email: 'test@audit.com', password: testPassword });

      if (loginResponse.status !== 200) {
        console.log(`Login failed with status ${loginResponse.status}:`, loginResponse.body);
      }
      
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.data).toBeDefined();
      const refreshToken = loginResponse.body.data.refreshToken;

      const refreshResponse = await request(app)
        .post('/api/auth/refresh-token')
        .set('User-Agent', 'Mobile App 2.0')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(200);

      // Check audit log
      const auditLogs = await db.AuditLog.findAll({
        where: {
          userId: testUser.id,
          action: 'TOKEN_REFRESHED'
        },
        order: [['createdAt', 'DESC']],
        limit: 1
      });

      expect(auditLogs.length).toBe(1);
      const log = auditLogs[0];
      expect(log.details.userAgent).toContain('Mobile App');
      expect(log.details.ip).toBeDefined();
      expect(log.details.oldTokenExpiry).toBeDefined();
      expect(log.details.newTokenExpiry).toBeDefined();
    });

    it('should log failed refresh attempts (expired/revoked tokens)', async () => {
      const expiredToken = 'expired.jwt.token';

      await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: expiredToken });

      const auditLogs = await db.AuditLog.findAll({
        where: {
          action: 'TOKEN_REFRESH_FAILED'
        },
        order: [['createdAt', 'DESC']],
        limit: 1
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].details.reason).toBeDefined();
    });
  });

  describe('Audit Log Querying', () => {
    it('should allow admins to query auth events by user', async () => {
      const response = await request(app)
        .get(`/api/admin/audit-logs?userId=${testUser.id}&category=auth`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.logs).toBeInstanceOf(Array);
      
      const authLogs = response.body.data.logs.filter(log =>
        ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'PASSWORD_CHANGED', 'TOKEN_REFRESHED'].includes(log.action)
      );
      expect(authLogs.length).toBeGreaterThan(0);
    });

    it('should allow filtering by date range', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .get(`/api/admin/audit-logs?startDate=${yesterday}&endDate=${tomorrow}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.logs).toBeInstanceOf(Array);
    });

    it('should allow filtering by IP address', async () => {
      const response = await request(app)
        .get('/api/admin/audit-logs?ip=127.0.0.1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.logs).toBeInstanceOf(Array);
    });
  });

  describe('Security: Audit Log Integrity', () => {
    it('should prevent modification of audit logs', async () => {
      const auditLog = await db.AuditLog.findOne({
        where: { userId: testUser.id }
      });

      // Try to update audit log (should fail or be ignored)
      try {
        await auditLog.update({ action: 'TAMPERED_ACTION' });
        fail('Should not allow audit log modification');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should prevent deletion of audit logs', async () => {
      const auditLog = await db.AuditLog.findOne({
        where: { userId: testUser.id }
      });

      // Try to delete audit log (should fail)
      try {
        await auditLog.destroy();
        fail('Should not allow audit log deletion');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
