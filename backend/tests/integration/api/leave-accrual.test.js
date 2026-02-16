const request = require('supertest');
const app = require('../../../server');
const TestHelper = require('../../helpers/testHelper');

// Note: Actual leave-accrual routes are admin/HR only

describe('Leave Accrual API Integration Tests', () => {
  let helper, adminUser, hrUser, employeeUser;
  let adminToken, hrToken, employeeToken;
  let testEmployee;

  beforeAll(async () => {
    helper = new TestHelper(app);
    
    // Create test users (createEmployeeUser already creates an Employee record)
    ({ user: adminUser, token: adminToken } = await helper.createAdminUser());
    ({ user: hrUser, token: hrToken } = await helper.createHRUser());
    ({ user: employeeUser, token: employeeToken } = await helper.createEmployeeUser());
    
    // Use the employee record from the employeeUser
    testEmployee = employeeUser.employee;
  });

  afterAll(async () => {
    await helper.cleanup();
  });

  // Test 1: Get accrual status for all employees
  describe('GET /api/leave-accrual/status', () => {
    it('should get accrual status for all employees as admin', async () => {
      const response = await request(app)
        .get('/api/leave-accrual/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.year).toBeDefined();
    });

    it('should allow HR to view accrual status', async () => {
      const response = await request(app)
        .get('/api/leave-accrual/status')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should support year query parameter', async () => {
      const year = 2024;
      const response = await request(app)
        .get(`/api/leave-accrual/status?year=${year}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.year).toBe(year);
    });

    it('should not allow regular employees', async () => {
      const response = await request(app)
        .get('/api/leave-accrual/status')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
    });
  });

  // Test 2: Preview accrual
  describe('GET /api/leave-accrual/preview', () => {
    it('should preview accrual as admin', async () => {
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;

      const response = await request(app)
        .get(`/api/leave-accrual/preview?year=${year}&month=${month}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should allow HR to preview accrual', async () => {
      const response = await request(app)
        .get('/api/leave-accrual/preview')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 3: Run monthly accrual (admin only)
  describe('POST /api/leave-accrual/run', () => {
    it('should run monthly accrual as admin', async () => {
      const accrualData = {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
      };

      const response = await request(app)
        .post('/api/leave-accrual/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(accrualData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should not allow HR to run accrual (admin only)', async () => {
      const response = await request(app)
        .post('/api/leave-accrual/run')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ year: 2024, month: 1 });

      expect(response.status).toBe(403);
    });

    it('should not allow regular employees to run accrual', async () => {
      const response = await request(app)
        .post('/api/leave-accrual/run')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ year: 2024, month: 1 });

      expect(response.status).toBe(403);
    });
  });

  // Test 4: Year-end carry forward (admin only)
  describe('POST /api/leave-accrual/carry-forward', () => {
    it('should run year-end carry forward as admin', async () => {
      const carryForwardData = {
        newYear: new Date().getFullYear() + 1
      };

      const response = await request(app)
        .post('/api/leave-accrual/carry-forward')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(carryForwardData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should not allow HR to run carry forward (admin only)', async () => {
      const response = await request(app)
        .post('/api/leave-accrual/carry-forward')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ newYear: 2025 });

      expect(response.status).toBe(403);
    });
  });

  // Test 5: Authorization tests
  describe('Authorization', () => {
    it('should require authentication for status', async () => {
      const response = await request(app)
        .get('/api/leave-accrual/status');

      expect(response.status).toBe(401);
    });

    it('should require authentication for preview', async () => {
      const response = await request(app)
        .get('/api/leave-accrual/preview');

      expect(response.status).toBe(401);
    });

    it('should require authentication for run', async () => {
      const response = await request(app)
        .post('/api/leave-accrual/run')
        .send({});

      expect(response.status).toBe(401);
    });

    it('should require authentication for carry-forward', async () => {
      const response = await request(app)
        .post('/api/leave-accrual/carry-forward')
        .send({});

      expect(response.status).toBe(401);
    });
  });
});

