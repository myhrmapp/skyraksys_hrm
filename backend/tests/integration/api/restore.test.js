const request = require('supertest');
const app = require('../../../server');
const TestHelper = require('../../helpers/testHelper');
const db = require('../../../models');

// Note: Actual restore routes only support employee-reviews, leave-balances, and users

describe('Restore API Integration Tests', () => {
  let helper, adminUser, employeeUser;
  let adminToken, employeeToken;
  let testEmployee, testLeaveType;

  beforeAll(async () => {
    helper = new TestHelper(app);
    
    // Create test users
    ({ user: adminUser, token: adminToken } = await helper.createAdminUser());
    ({ user: employeeUser, token: employeeToken } = await helper.createEmployeeUser());
    
    testEmployee = employeeUser.employee;
    testLeaveType = await helper.createLeaveType();
  });

  afterAll(async () => {
    await helper.cleanup();
  });

  // Test 1: Get soft-deleted employee reviews
  describe('GET /api/restore/employee-reviews', () => {
    it('should get soft-deleted employee reviews as admin', async () => {
      const response = await request(app)
        .get('/api/restore/employee-reviews')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    it('should not allow non-admin to view deleted records', async () => {
      const response = await request(app)
        .get('/api/restore/employee-reviews')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
    });
  });

  // Test 2: Get soft-deleted leave balances
  describe('GET /api/restore/leave-balances', () => {
    it('should get soft-deleted leave balances as admin', async () => {
      const response = await request(app)
        .get('/api/restore/leave-balances')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    it('should not allow non-admin to view deleted records', async () => {
      const response = await request(app)
        .get('/api/restore/leave-balances')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
    });
  });

  // Test 3: Get soft-deleted users
  describe('GET /api/restore/users', () => {
    it('should get soft-deleted users as admin', async () => {
      const response = await request(app)
        .get('/api/restore/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // Test 4: Restore soft-deleted employee review
  describe('POST /api/restore/employee-reviews/:id', () => {
    it('should restore soft-deleted employee review as admin', async () => {
      // Create an employee review
      const review = await db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: adminUser.id,
        reviewPeriod: 'Q1 2024',
        reviewType: 'quarterly',
        overallRating: 4.0,
        status: 'completed'
      });

      // Soft delete it
      await review.destroy();

      // Restore the review
      const response = await request(app)
        .post(`/api/restore/employee-reviews/${review.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('restored');
    });

    it('should not allow non-admin to restore records', async () => {
      const response = await request(app)
        .post('/api/restore/employee-reviews/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent review', async () => {
      const response = await request(app)
        .post('/api/restore/employee-reviews/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  // Test 5: Restore soft-deleted leave balance
  describe('POST /api/restore/leave-balances/:id', () => {
    it('should restore soft-deleted leave balance as admin', async () => {
      // Create a leave balance
      const leaveBalance = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2024,
        totalAccrued: 20.00,
        totalTaken: 5.00,
        totalPending: 0.00,
        balance: 15.00,
        carryForward: 0.00
      });

      // Soft delete it
      await leaveBalance.destroy();

      // Restore the leave balance
      const response = await request(app)
        .post(`/api/restore/leave-balances/${leaveBalance.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('restored');
    });

    it('should return 400 if trying to restore non-deleted record', async () => {
      // Create a leave balance (not deleted)
      const leaveBalance = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2025,
        totalAccrued: 20.00,
        totalTaken: 0.00,
        totalPending: 0.00,
        balance: 20.00,
        carryForward: 0.00
      });

      const response = await request(app)
        .post(`/api/restore/leave-balances/${leaveBalance.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('not deleted');
    });
  });

  // Test 6: Restore soft-deleted user
  describe('POST /api/restore/users/:id', () => {
    it('should restore soft-deleted user as admin', async () => {
      // Create a test user
      const testUser = await helper.createTestUser('employee', false);
      
      // Soft delete the user
      await testUser.destroy();

      // Restore the user
      const response = await request(app)
        .post(`/api/restore/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.password).toBeUndefined(); // Password should be excluded
    });
  });

  // Test 7: Authorization tests
  describe('Authorization', () => {
    it('should require authentication for GET employee-reviews', async () => {
      const response = await request(app)
        .get('/api/restore/employee-reviews');

      expect(response.status).toBe(401);
    });

    it('should require authentication for POST restore', async () => {
      const response = await request(app)
        .post('/api/restore/users/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(401);
    });

    it('should require admin role for restore operations', async () => {
      const response = await request(app)
        .get('/api/restore/leave-balances')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
    });
  });
});
