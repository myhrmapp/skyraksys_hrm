const request = require('supertest');
const app = require('../../../server');
const TestHelper = require('../../helpers/testHelper');

// Note: Actual system-config routes require password re-authentication
// TestHelper creates users with password 'Password123!'
const TEST_PASSWORD = 'Password123!';

describe('System Config API Integration Tests', () => {
  let helper, adminUser, hrUser, employeeUser;
  let adminToken, hrToken, employeeToken;

  beforeAll(async () => {
    helper = new TestHelper(app);
    
    // Create test users
    ({ user: adminUser, token: adminToken } = await helper.createAdminUser());
    ({ user: hrUser, token: hrToken } = await helper.createHRUser());
    ({ user: employeeUser, token: employeeToken } = await helper.createEmployeeUser());
  });

  afterAll(async () => {
    await helper.cleanup();
  });

  // Test 1: View system config (requires password re-auth)
  describe('POST /api/system-config/view', () => {
    it('should allow admin to view system config with password', async () => {
      const response = await request(app)
        .post('/api/system-config/view')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: TEST_PASSWORD });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data).toHaveProperty('authentication');
      expect(response.body.data).toHaveProperty('database');
      expect(response.body.data).toHaveProperty('email');
    });

    it('should reject view without password', async () => {
      const response = await request(app)
        .post('/api/system-config/view')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject view with incorrect password', async () => {
      const response = await request(app)
        .post('/api/system-config/view')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'wrongpassword' });

      expect(response.status).toBe(401);
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .post('/api/system-config/view')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ password: TEST_PASSWORD });

      expect(response.status).toBe(403);
    });
  });

  // Test 2: Update system config (requires password re-auth)
  describe('PUT /api/system-config/update', () => {
    it('should allow admin to update config with password', async () => {
      const updateData = {
        password: TEST_PASSWORD,
        section: 'application',
        updates: {
          maxFileSize: '10MB'
        }
      };

      const response = await request(app)
        .put('/api/system-config/update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated');
    });

    it('should reject update without password', async () => {
      const response = await request(app)
        .put('/api/system-config/update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          section: 'application',
          updates: { test: 'value' }
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .put('/api/system-config/update')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({
          password: TEST_PASSWORD,
          section: 'application',
          updates: { test: 'value' }
        });

      expect(response.status).toBe(403);
    });
  });

  // Test 3: Get audit trail (admin only, no password re-auth)
  describe('GET /api/system-config/audit-trail', () => {
    it('should return audit trail for admin', async () => {
      const response = await request(app)
        .get('/api/system-config/audit-trail')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
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

  // Test 4: Verify password
  describe('POST /api/system-config/verify-password', () => {
    it('should verify correct admin password', async () => {
      const response = await request(app)
        .post('/api/system-config/verify-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: TEST_PASSWORD });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('verified');
    });

    it('should reject incorrect password', async () => {
      const response = await request(app)
        .post('/api/system-config/verify-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .post('/api/system-config/verify-password')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ password: TEST_PASSWORD });

      expect(response.status).toBe(403);
    });
  });

  // Test 5: Authorization tests
  describe('Authorization', () => {
    it('should require authentication for view', async () => {
      const response = await request(app)
        .post('/api/system-config/view')
        .send({ password: TEST_PASSWORD });

      expect(response.status).toBe(401);
    });

    it('should require authentication for update', async () => {
      const response = await request(app)
        .put('/api/system-config/update')
        .send({
          password: TEST_PASSWORD,
          section: 'test',
          updates: {}
        });

      expect(response.status).toBe(401);
    });

    it('should require authentication for audit trail', async () => {
      const response = await request(app)
        .get('/api/system-config/audit-trail');

      expect(response.status).toBe(401);
    });
  });
});
