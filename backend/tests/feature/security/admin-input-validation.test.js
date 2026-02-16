/**
 * Task 3.4: Admin Input Validation Tests
 * 
 * Purpose: Ensure admin configuration endpoints reject invalid input
 * Coverage: Email config validation (6 tests), Test email validation (6 tests)
 * 
 * Test Structure:
 * - Email Config Schema: Valid config, invalid host, invalid port, missing fields, invalid email, boundary tests
 * - Test Email Schema: Valid test, invalid recipient, invalid SMTP config
 */

// Set test environment variables before requiring modules
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
// ENCRYPTION_KEY must be 64 hex characters (32 bytes when decoded)
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const request = require('supertest');
const app = require('../../../server');
const { User } = require('../../../models');
const bcrypt = require('bcryptjs');
const db = require('../../../models/index');

describe('Admin Input Validation - Task 3.4', () => {
  let adminToken;
  let adminUser;

  beforeAll(async () => {
    try {
      // Use unique email with timestamp to avoid conflicts
      const timestamp = Date.now();
      const testEmail = `admin.t34.${timestamp}@test.com`;
      
      // Create admin user (without employee link for simplicity)
      const hashedPassword = await bcrypt.hash('Admin@123', 4);
      adminUser = await User.create({
        email: testEmail,
        password: hashedPassword,
        role: 'admin',
        firstName: 'Admin',
        lastName: 'Task34',
        isActive: true
      });

      // Login as admin
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: 'Admin@123' });
      adminToken = loginRes.body.data.accessToken;
    } catch (error) {
      console.error('❌ beforeAll failed:', error.message);
      console.error('Error details:', error.errors ? error.errors.map(e => e.message) : 'No validation errors');
      console.error('SQL:', error.sql);
      throw error;
    }
  });

  afterAll(async () => {
    // Cleanup in reverse FK order
    if (adminUser) await adminUser.destroy({ force: true });
    await db.sequelize.close();
  });

  // ========================================
  // Email Config Schema Tests (6 tests)
  // ========================================

  describe('Email Config Schema', () => {
    it('Should accept valid email configuration', async () => {
      const validConfig = {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpSecure: true,
        smtpUser: 'test@gmail.com',
        smtpPassword: 'testpass123',
        emailFrom: 'noreply@skyraksys.com',
        enabled: true
      };

      const res = await request(app)
        .post('/api/admin/email-config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validConfig);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Should reject invalid SMTP host', async () => {
      const invalidConfig = {
        smtpHost: 'not a valid hostname!@#', // Invalid hostname
        smtpPort: 587,
        smtpSecure: true,
        smtpUser: 'test@gmail.com',
        smtpPassword: 'testpass123',
        emailFrom: 'noreply@skyraksys.com',
        enabled: true
      };

      const res = await request(app)
        .post('/api/admin/email-config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidConfig);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Validation error');
    });

    it('Should reject invalid SMTP port (out of range)', async () => {
      const invalidConfig = {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 99999, // Port out of valid range (1-65535)
        smtpSecure: true,
        smtpUser: 'test@gmail.com',
        smtpPassword: 'testpass123',
        emailFrom: 'noreply@skyraksys.com',
        enabled: true
      };

      const res = await request(app)
        .post('/api/admin/email-config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidConfig);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toContain('port');
    });

    it('Should reject missing required fields', async () => {
      const incompleteConfig = {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587
        // Missing: smtpUser, smtpPassword, emailFrom
      };

      const res = await request(app)
        .post('/api/admin/email-config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(incompleteConfig);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.length).toBe(3); // Missing 3 fields
    });

    it('Should reject invalid email formats', async () => {
      const invalidConfig = {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpSecure: true,
        smtpUser: 'not-an-email', // Invalid email
        smtpPassword: 'testpass123',
        emailFrom: 'also-not-an-email', // Invalid email
        enabled: true
      };

      const res = await request(app)
        .post('/api/admin/email-config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidConfig);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.length).toBe(2); // Two invalid emails
    });

    it('Should reject empty SMTP password', async () => {
      const invalidConfig = {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpSecure: true,
        smtpUser: 'test@gmail.com',
        smtpPassword: '', // Empty password
        emailFrom: 'noreply@skyraksys.com',
        enabled: true
      };

      const res = await request(app)
        .post('/api/admin/email-config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidConfig);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toContain('smtpPassword');
    });
  });

  // ========================================
  // Test Email Schema Tests (6 tests)
  // ========================================

  describe('Test Email Schema', () => {
    it('Should accept valid test email request', async () => {
      const validRequest = {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpSecure: true,
        smtpUser: 'test@gmail.com',
        smtpPassword: 'testpass123',
        emailFrom: 'noreply@skyraksys.com',
        testEmail: 'recipient@test.com'
      };

      const res = await request(app)
        .post('/api/admin/email-config/send-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validRequest);

      // Note: SMTP will fail (test config), but Joi validation should pass
      // Expecting 400 from SMTP error, not validation error
      // If it were a validation error, res.body.errors would be defined
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeUndefined(); // No validation errors
      expect(res.body.message).toContain('Failed to send test email');
    });

    it('Should reject invalid test email address', async () => {
      const invalidRequest = {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpSecure: true,
        smtpUser: 'test@gmail.com',
        smtpPassword: 'testpass123',
        emailFrom: 'noreply@skyraksys.com',
        testEmail: 'not-an-email' // Invalid email
      };

      const res = await request(app)
        .post('/api/admin/email-config/send-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidRequest);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toContain('email');
    });

    it('Should reject missing test email address', async () => {
      const incompleteRequest = {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpSecure: true,
        smtpUser: 'test@gmail.com',
        smtpPassword: 'testpass123',
        emailFrom: 'noreply@skyraksys.com'
        // Missing: testEmail
      };

      const res = await request(app)
        .post('/api/admin/email-config/send-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(incompleteRequest);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.length).toBe(1); // Missing testEmail
    });

    it('Should reject invalid SMTP host in test request', async () => {
      const invalidRequest = {
        smtpHost: 'invalid host!@#', // Invalid hostname
        smtpPort: 587,
        smtpSecure: true,
        smtpUser: 'test@gmail.com',
        smtpPassword: 'testpass123',
        emailFrom: 'noreply@skyraksys.com',
        testEmail: 'recipient@test.com'
      };

      const res = await request(app)
        .post('/api/admin/email-config/send-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidRequest);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toContain('hostname');
    });

    it('Should reject invalid SMTP port in test request', async () => {
      const invalidRequest = {
        smtpHost: 'smtp.gmail.com',
        smtpPort: -1, // Invalid port
        smtpSecure: true,
        smtpUser: 'test@gmail.com',
        smtpPassword: 'testpass123',
        emailFrom: 'noreply@skyraksys.com',
        testEmail: 'recipient@test.com'
      };

      const res = await request(app)
        .post('/api/admin/email-config/send-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidRequest);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toContain('port');
    });

    it('Should reject invalid SMTP user email in test request', async () => {
      const invalidRequest = {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpSecure: true,
        smtpUser: 'not-an-email', // Invalid email
        smtpPassword: 'testpass123',
        emailFrom: 'noreply@skyraksys.com',
        testEmail: 'recipient@test.com'
      };

      const res = await request(app)
        .post('/api/admin/email-config/send-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidRequest);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toContain('email');
    });
  });
});
