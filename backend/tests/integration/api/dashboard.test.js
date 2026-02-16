const request = require('supertest');
const app = require('../../../server');
const TestHelper = require('../../helpers/testHelper');

// Note: Actual dashboard routes are /stats, /admin-stats, /employee-stats

describe('Dashboard API Integration Tests', () => {
  let helper, adminUser, hrUser, managerUser, employeeUser, adminEmployee;
  let adminToken, hrToken, managerToken, employeeToken;

  beforeAll(async () => {
    helper = new TestHelper(app);
    
    // Create test users
    ({ user: adminUser, token: adminToken } = await helper.createAdminUser());
    ({ user: hrUser, token: hrToken } = await helper.createHRUser());
    ({ user: managerUser, token: managerToken } = await helper.createManagerUser());
    ({ user: employeeUser, token: employeeToken } = await helper.createEmployeeUser());
    
    // Get employee records for ID-based routes
    adminEmployee = adminUser.employee;
  });

  afterAll(async () => {
    await helper.cleanup();
  });

  // Test 1: Get general stats (role-based response)
  describe('GET /api/dashboard/stats', () => {
    it('should return admin stats for admin role', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return manager stats for manager role', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return employee stats for employee role', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data).toHaveProperty('userInfo');
    });

    it('should return HR stats for HR role', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  // Test 2: Get admin dashboard stats (admin/HR only)
  describe('GET /api/dashboard/admin-stats', () => {
    it('should get admin dashboard stats for admin', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin-stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should allow HR to access admin stats', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin-stats')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow non-admin/HR to access admin stats', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin-stats')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
    });
  });

  // Test 3: Get employee-specific stats
  describe('GET /api/dashboard/employee-stats', () => {
    it('should get employee stats for authenticated user', async () => {
      const response = await request(app)
        .get('/api/dashboard/employee-stats')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  // Test 4: Authorization tests
  describe('Authorization', () => {
    it('should require authentication for /stats', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats');

      expect(response.status).toBe(401);
    });

    it('should require authentication for /admin-stats', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin-stats');

      expect(response.status).toBe(401);
    });

    it('should require authentication for /employee-stats', async () => {
      const response = await request(app)
        .get('/api/dashboard/employee-stats');

      expect(response.status).toBe(401);
    });
  });
});
