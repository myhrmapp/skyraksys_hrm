/**
 * Soft Delete Tests
 * Tests for paranoid mode (soft delete) on Employee Review, Leave Balance, and User models
 * Coverage: deletion, restore, query exclusion
 */

const request = require('supertest');
const { sequelize } = require('../../../models');
const app = require('../../../server');
const db = require('../../../models');
const bcrypt = require('bcryptjs');

const { User, Employee, EmployeeReview, LeaveBalance } = db;

describe('Soft Delete Implementation', () => {
  let adminToken, adminUser;
  let testEmployee, testReview, testLeaveBalance, testUser;

  beforeAll(async () => {
    // Create admin user for authentication
    const hashedPassword = await bcrypt.hash('Admin@123', 4); // Lower rounds for faster tests
    adminUser = await User.create({
      email: 'admin.softdelete@test.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'SoftDelete',
      role: 'admin',
      isActive: true
    });

    // Login admin
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin.softdelete@test.com',
        password: 'Admin@123'
      });

    if (!loginRes.body.data?.accessToken) {
      console.error('Login failed:', loginRes.body);
      throw new Error('Failed to get admin token');
    }
    
    adminToken = loginRes.body.data.accessToken;

    // Create test employee
    testEmployee = await Employee.create({
      employeeId: 'SKYT9999',
      firstName: 'Test',
      lastName: 'SoftDelete',
      email: 'test.softdelete@test.com',
      phone: '1234567890',
      dateOfBirth: '1990-01-01',
      dateOfJoining: '2020-01-01',
      hireDate: '2020-01-01', // Required field
      departmentId: null,
      positionId: null,
      managerId: null
    });
  });

  afterAll(async () => {
    // Clean up test data (force delete)
    if (testReview) await testReview.destroy({ force: true });
    if (testLeaveBalance) await testLeaveBalance.destroy({ force: true });
    if (testEmployee) await testEmployee.destroy({ force: true });
    if (testUser) await testUser.destroy({ force: true });
    await adminUser.destroy({ force: true });
    
    await sequelize.close();
  });

  describe('Employee Review Soft Delete', () => {
    beforeEach(async () => {
      // Create test review before each test
      testReview = await EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: adminUser.id,
        reviewPeriod: 'Q1 2024',
        reviewPeriodStart: '2024-01-01',
        reviewPeriodEnd: '2024-06-30',
        overallRating: 4,
        comments: 'Test review for soft delete',
        status: 'draft',
        hrApproved: false
      });
    });

    afterEach(async () => {
      // Force delete after each test
      if (testReview) {
        await testReview.destroy({ force: true });
      }
    });

    test('Should soft delete employee review (deletedAt set)', async () => {
      // Soft delete the review
      await testReview.destroy();

      // Reload to get updated data
      const deletedReview = await EmployeeReview.findByPk(testReview.id, { paranoid: false });

      // Assertions
      expect(deletedReview).toBeTruthy();
      expect(deletedReview.deletedAt).toBeTruthy();
      expect(deletedReview.deletedAt).toBeInstanceOf(Date);
    });

    test('Should exclude soft-deleted reviews from normal queries', async () => {
      const reviewId = testReview.id;
      
      // Soft delete the review
      await testReview.destroy();

      // Try to find without paranoid: false (should not find)
      const foundReview = await EmployeeReview.findByPk(reviewId);

      // Assertions
      expect(foundReview).toBeNull();

      // Verify it exists with paranoid: false
      const deletedReview = await EmployeeReview.findByPk(reviewId, { paranoid: false });
      expect(deletedReview).toBeTruthy();
      expect(deletedReview.deletedAt).toBeTruthy();
    });

    test('Should restore soft-deleted employee review via API', async () => {
      const reviewId = testReview.id;
      
      // Soft delete the review
      await testReview.destroy();

      // Restore via API
      const res = await request(app)
        .post(`/api/restore/employee-reviews/${reviewId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Assertions
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('restored');
      expect(res.body.data.deletedAt).toBeNull();

      // Verify it's now findable in normal queries
      const restoredReview = await EmployeeReview.findByPk(reviewId);
      expect(restoredReview).toBeTruthy();
      expect(restoredReview.deletedAt).toBeNull();
    });
  });

  describe('Leave Balance Soft Delete', () => {
    beforeEach(async () => {
      // Create test leave balance before each test (no leaveTypeId needed for testing)
      testLeaveBalance = await LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: null, // Can be null for testing
        year: 2024,
        totalDays: 15,
        usedDays: 5,
        remainingDays: 10
      });
    });

    afterEach(async () => {
      // Force delete after each test
      if (testLeaveBalance) {
        await testLeaveBalance.destroy({ force: true });
      }
    });

    test('Should soft delete leave balance (deletedAt set)', async () => {
      // Soft delete the leave balance
      await testLeaveBalance.destroy();

      // Reload to get updated data
      const deletedBalance = await LeaveBalance.findByPk(testLeaveBalance.id, { paranoid: false });

      // Assertions
      expect(deletedBalance).toBeTruthy();
      expect(deletedBalance.deletedAt).toBeTruthy();
      expect(deletedBalance.deletedAt).toBeInstanceOf(Date);
    });

    test('Should exclude soft-deleted leave balances from normal queries', async () => {
      const balanceId = testLeaveBalance.id;
      
      // Soft delete the leave balance
      await testLeaveBalance.destroy();

      // Try to find without paranoid: false (should not find)
      const foundBalance = await LeaveBalance.findByPk(balanceId);

      // Assertions
      expect(foundBalance).toBeNull();

      // Verify it exists with paranoid: false
      const deletedBalance = await LeaveBalance.findByPk(balanceId, { paranoid: false });
      expect(deletedBalance).toBeTruthy();
      expect(deletedBalance.deletedAt).toBeTruthy();
    });

    test('Should restore soft-deleted leave balance via API', async () => {
      const balanceId = testLeaveBalance.id;
      
      // Soft delete the leave balance
      await testLeaveBalance.destroy();

      // Restore via API
      const res = await request(app)
        .post(`/api/restore/leave-balances/${balanceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Assertions
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('restored');
      expect(res.body.data.deletedAt).toBeNull();

      // Verify it's now findable in normal queries
      const restoredBalance = await LeaveBalance.findByPk(balanceId);
      expect(restoredBalance).toBeTruthy();
      expect(restoredBalance.deletedAt).toBeNull();
    });
  });

  describe('User Soft Delete', () => {
    beforeEach(async () => {
      // Create test user before each test
      const hashedPassword = await bcrypt.hash('User@123', 4);
      testUser = await User.create({
        email: 'user.softdelete@test.com',
        password: hashedPassword,
        firstName: 'User',
        lastName: 'SoftDelete',
        role: 'employee',
        isActive: true
      });
    });

    afterEach(async () => {
      // Force delete after each test
      if (testUser) {
        await testUser.destroy({ force: true });
      }
    });

    test('Should soft delete user (deletedAt set)', async () => {
      // Soft delete the user
      await testUser.destroy();

      // Reload to get updated data
      const deletedUser = await User.findByPk(testUser.id, { paranoid: false });

      // Assertions
      expect(deletedUser).toBeTruthy();
      expect(deletedUser.deletedAt).toBeTruthy();
      expect(deletedUser.deletedAt).toBeInstanceOf(Date);
    });

    test('Should exclude soft-deleted users from normal queries', async () => {
      const userId = testUser.id;
      
      // Soft delete the user
      await testUser.destroy();

      // Try to find without paranoid: false (should not find)
      const foundUser = await User.findByPk(userId);

      // Assertions
      expect(foundUser).toBeNull();

      // Verify it exists with paranoid: false
      const deletedUser = await User.findByPk(userId, { paranoid: false });
      expect(deletedUser).toBeTruthy();
      expect(deletedUser.deletedAt).toBeTruthy();
    });

    test('Should restore soft-deleted user via API', async () => {
      const userId = testUser.id;
      
      // Soft delete the user
      await testUser.destroy();

      // Restore via API
      const res = await request(app)
        .post(`/api/restore/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Assertions
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('restored');
      expect(res.body.data.deletedAt).toBeNull();
      expect(res.body.data.password).toBeUndefined(); // Password should be excluded

      // Verify it's now findable in normal queries
      const restoredUser = await User.findByPk(userId);
      expect(restoredUser).toBeTruthy();
      expect(restoredUser.deletedAt).toBeNull();
    });
  });

  describe('Admin Authorization for Restore', () => {
    let employeeToken, employeeUser;

    beforeAll(async () => {
      // Create employee user
      const hashedPassword = await bcrypt.hash('Employee@123', 4);
      employeeUser = await User.create({
        email: 'employee.restore@test.com',
        password: hashedPassword,
        firstName: 'Employee',
        lastName: 'Restore',
        role: 'employee',
        isActive: true
      });

      // Login employee
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'employee.restore@test.com',
          password: 'Employee@123'
        });

      employeeToken = loginRes.body.data.accessToken;
    });

    afterAll(async () => {
      await employeeUser.destroy({ force: true });
    });

    test('Should deny non-admin access to restore endpoints', async () => {
      // Create and delete a review
      const review = await EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: adminUser.id,
        reviewPeriod: 'Q1 2024',
        reviewPeriodStart: '2024-01-01',
        reviewPeriodEnd: '2024-06-30',
        overallRating: 3,
        comments: 'Test',
        status: 'draft',
        hrApproved: false
      });
      await review.destroy();

      // Try to restore as employee (should fail)
      const res = await request(app)
        .post(`/api/restore/employee-reviews/${review.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');

      // Clean up
      await review.destroy({ force: true });
    });

    test('Should allow admin to list soft-deleted records', async () => {
      // Create and delete a user
      const hashedPassword = await bcrypt.hash('User@123', 4);
      const user = await User.create({
        email: 'deleted.user.list@test.com',
        password: hashedPassword,
        firstName: 'Deleted',
        lastName: 'User',
        role: 'employee',
        isActive: true
      });
      await user.destroy();

      // List deleted users as admin
      const res = await request(app)
        .get('/api/restore/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data)).toBe(true);

      // Verify all returned users have deletedAt
      res.body.data.forEach(u => {
        expect(u.deletedAt).toBeTruthy();
      });

      // Clean up
      await user.destroy({ force: true });
    });
  });
});
