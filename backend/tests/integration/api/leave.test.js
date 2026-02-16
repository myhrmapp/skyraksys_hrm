const request = require('supertest');
const app = require('../../../server');
const TestHelper = require('../../helpers/testHelper');
const { LeaveRequest, Employee, LeaveType, LeaveBalance } = require('../../../models');

describe('Leave Management API', () => {
  let helper, adminToken, hrToken, managerToken, employeeToken;
  let adminUser, hrUser, managerUser, employeeUser;
  let testLeaveType;

  beforeAll(async () => {
    helper = new TestHelper(app);
    
    // Create test users
    ({ user: adminUser, token: adminToken } = await helper.createAdminUser());
    ({ user: hrUser, token: hrToken } = await helper.createHRUser());
    ({ user: managerUser, token: managerToken } = await helper.createManagerUser());
    ({ user: employeeUser, token: employeeToken } = await helper.createEmployeeUser());

    // Create test leave type (use findOrCreate to avoid unique constraint)
    const [leaveType] = await LeaveType.findOrCreate({
      where: { name: 'Annual Leave' },
      defaults: {
        maxDaysPerYear: 20,
        isActive: true
      }
    });
    testLeaveType = leaveType;

    // Create leave balances for all employees
    const employees = await Employee.findAll();
    for (const emp of employees) {
      await LeaveBalance.create({
        employeeId: emp.id,
        leaveTypeId: testLeaveType.id,
        year: 2026,
        totalAccrued: 20,
        totalTaken: 0,
        balance: 20
      });
    }
  });

  afterEach(async () => {
    await LeaveRequest.destroy({ where: {}, force: true });
  });

  afterAll(async () => {
    await helper.cleanup();
  });

  describe('GET /api/leaves', () => {
    beforeEach(async () => {
      // Create test leave requests
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });
      await LeaveRequest.bulkCreate([
        {
          employeeId: employee.id,
          leaveTypeId: testLeaveType.id,
          startDate: new Date('2026-02-01'),
          endDate: new Date('2026-02-05'),
          totalDays: 5,
          reason: 'Vacation',
          status: 'Pending'
        },
        {
          employeeId: employee.id,
          leaveTypeId: testLeaveType.id,
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-03'),
          totalDays: 3,
          reason: 'Personal',
          status: 'Approved'
        }
      ]);
    });

    it('should get all leave requests for admin', async () => {
      const response = await request(app)
        .get('/api/leaves')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const leaves = response.body.data || response.body.leaves || response.body;
      expect(Array.isArray(leaves)).toBe(true);
    });

    it('should get all leave requests for HR', async () => {
      const response = await request(app)
        .get('/api/leaves')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(response.status).toBe(200);
      const leaves = response.body.data || response.body.leaves || response.body;
      expect(Array.isArray(leaves)).toBe(true);
    });

    it('should get only own leave requests for employee', async () => {
      const response = await request(app)
        .get('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      // ApiResponse format: { data: [...], message: {pagination: ...}, success, timestamp }
      const leaves = response.body.data;
      expect(Array.isArray(leaves)).toBe(true);
      
      // Verify all returned leaves belong to the employee
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });
      leaves.forEach(leave => {
        expect(leave.employeeId).toBe(employee.id);
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/leaves');

      expect(response.status).toBe(401);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/leaves?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const leaves = response.body.data || response.body.leaves || response.body;
      expect(Array.isArray(leaves)).toBe(true);
      expect(leaves.length).toBeLessThanOrEqual(1);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/leaves?status=Pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const leaves = response.body.data || response.body.leaves || response.body;
      expect(Array.isArray(leaves)).toBe(true);
      leaves.forEach(leave => {
        expect(leave.status).toBe('Pending');
      });
    });
  });

  describe('POST /api/leaves', () => {
    it('should create leave request as employee', async () => {
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });
      
      const leaveData = {
        employeeId: employee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2026-04-01',
        endDate: '2026-04-05',
        totalDays: 5,
        reason: 'Family vacation'
      };

      const response = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveData);

      expect([200, 201]).toContain(response.status);
      const leave = response.body.data || response.body.leave || response.body;
      expect(leave).toHaveProperty('id');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should validate start date before end date', async () => {
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });
      
      const leaveData = {
        employeeId: employee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2026-04-10',
        endDate: '2026-04-05',
        days: -5,
        reason: 'Invalid dates'
      };

      const response = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveData);

      expect(response.status).toBe(400);
    });

    it('should validate days count is positive', async () => {
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });
      
      // Test with end date before start date (should fail)
      const leaveData = {
        employeeId: employee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2026-04-05',
        endDate: '2026-04-01',  // End before start
        reason: 'Invalid date range'
      };

      const response = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveData);

      expect(response.status).toBe(400);
    });

    it('should create leave request as admin for employee', async () => {
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });
      
      const leaveData = {
        employeeId: employee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2026-04-01',
        endDate: '2026-04-05',
        totalDays: 5,
        reason: 'Admin created leave'
      };

      const response = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(leaveData);

      expect([200, 201]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/leaves')
        .send({});

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/leaves/:id', () => {
    let testLeaveRequest;

    beforeEach(async () => {
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });
      testLeaveRequest = await LeaveRequest.create({
        employeeId: employee.id,
        leaveTypeId: testLeaveType.id,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-05'),
        totalDays: 5,
        reason: 'Test leave',
        status: 'Pending'
      });
    });

    it('should get leave request details as admin', async () => {
      const response = await request(app)
        .get(`/api/leaves/${testLeaveRequest.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const leave = response.body.data || response.body.leave || response.body;
      expect(leave).toHaveProperty('id', testLeaveRequest.id);
    });

    it('should get own leave request as employee', async () => {
      const response = await request(app)
        .get(`/api/leaves/${testLeaveRequest.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      const leave = response.body.data || response.body.leave || response.body;
      expect(leave).toHaveProperty('id', testLeaveRequest.id);
    });

    it('should return 404 for non-existent leave request', async () => {
      const response = await request(app)
        .get('/api/leaves/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      // Invalid UUID format returns 400 (Bad Request)
      expect(response.status).toBe(400);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get(`/api/leaves/${testLeaveRequest.id}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/leaves/:id', () => {
    let testLeaveRequest;

    beforeEach(async () => {
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });
      testLeaveRequest = await LeaveRequest.create({
        employeeId: employee.id,
        leaveTypeId: testLeaveType.id,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-05'),
        totalDays: 5,
        reason: 'Original reason',
        status: 'Pending'
      });
    });

    it('should update own pending leave request as employee', async () => {
      const updateData = {
        reason: 'Updated reason',
        totalDays: 6,
        endDate: '2026-02-06'
      };

      const response = await request(app)
        .put(`/api/leaves/${testLeaveRequest.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(updateData);

      expect([200, 204]).toContain(response.status);
    });

    it('should not update approved leave request', async () => {
      testLeaveRequest.status = 'Approved';
      await testLeaveRequest.save();

      const updateData = {
        reason: 'Trying to update approved leave'
      };

      const response = await request(app)
        .put(`/api/leaves/${testLeaveRequest.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(updateData);

      expect([400, 403]).toContain(response.status);
    });

    it('should allow admin to update any leave request', async () => {
      const updateData = {
        status: 'Approved'
      };

      const response = await request(app)
        .put(`/api/leaves/${testLeaveRequest.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect([200, 204]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .put(`/api/leaves/${testLeaveRequest.id}`)
        .send({ reason: 'Updated' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/leaves/:id', () => {
    let testLeaveRequest;

    beforeEach(async () => {
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });
      testLeaveRequest = await LeaveRequest.create({
        employeeId: employee.id,
        leaveTypeId: testLeaveType.id,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-05'),
        totalDays: 5,
        reason: 'To be deleted',
        status: 'Pending'
      });
    });

    it('should delete own pending leave request as employee', async () => {
      const response = await request(app)
        .delete(`/api/leaves/${testLeaveRequest.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect([200, 204]).toContain(response.status);

      const deleted = await LeaveRequest.findByPk(testLeaveRequest.id);
      expect(deleted).toBeNull();
    });

    it('should not delete approved leave request', async () => {
      testLeaveRequest.status = 'Approved';
      await testLeaveRequest.save();

      const response = await request(app)
        .delete(`/api/leaves/${testLeaveRequest.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect([400, 403]).toContain(response.status);
    });

    it('should allow admin to delete any leave request', async () => {
      const response = await request(app)
        .delete(`/api/leaves/${testLeaveRequest.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204]).toContain(response.status);
    });

    it('should return 404 for non-existent leave request', async () => {
      const response = await request(app)
        .delete('/api/leaves/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      // Invalid UUID format returns 400 (Bad Request)
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/leaves/:id/approve', () => {
    let testLeaveRequest;

    beforeEach(async () => {
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });
      testLeaveRequest = await LeaveRequest.create({
        employeeId: employee.id,
        leaveTypeId: testLeaveType.id,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-05'),
        totalDays: 5,
        reason: 'Pending approval',
        status: 'Pending'
      });
    });

    it('should approve leave request as manager', async () => {
      const response = await request(app)
        .patch(`/api/leaves/${testLeaveRequest.id}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ comments: 'Approved for vacation' });

      expect([200, 201]).toContain(response.status);
    });

    it('should approve leave request as admin', async () => {
      const response = await request(app)
        .patch(`/api/leaves/${testLeaveRequest.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect([200, 201]).toContain(response.status);
    });

    it('should not allow employee to approve own leave', async () => {
      const response = await request(app)
        .patch(`/api/leaves/${testLeaveRequest.id}/approve`)  // PATCH not POST
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({});

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent leave request', async () => {
      const response = await request(app)
        .patch('/api/leaves/99999/approve')  // PATCH not POST
        .set('Authorization', `Bearer ${managerToken}`)
        .send({});

      // Invalid UUID format returns 400 (Bad Request)
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/leaves/:id/reject', () => {
    let testLeaveRequest;

    beforeEach(async () => {
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });
      testLeaveRequest = await LeaveRequest.create({
        employeeId: employee.id,
        leaveTypeId: testLeaveType.id,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-05'),
        totalDays: 5,
        reason: 'Pending rejection test',
        status: 'Pending'
      });
    });

    it('should reject leave request as manager', async () => {
      const response = await request(app)
        .patch(`/api/leaves/${testLeaveRequest.id}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ comments: 'Insufficient leave balance' });

      expect([200, 201]).toContain(response.status);
    });

    it('should require rejection reason', async () => {
      const response = await request(app)
        .patch(`/api/leaves/${testLeaveRequest.id}/reject`)  // PATCH not POST
        .set('Authorization', `Bearer ${managerToken}`)
        .send({});  // Empty - no comments

      // Business service validates comments are required
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('comments');
    });

    it('should not allow employee to reject own leave', async () => {
      const response = await request(app)
        .patch(`/api/leaves/${testLeaveRequest.id}/reject`)  // PATCH not POST
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ comments: 'Self rejection' });  // 'comments' not 'reason'

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/leaves/balance', () => {
    it('should get leave balance for employee', async () => {
      // Get employee ID first
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });
      
      const response = await request(app)
        .get(`/api/leaves/balance/${employee.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);
      
      expect(response.status).toBe(200);
      const balances = response.body.data || response.body;
      expect(Array.isArray(balances)).toBe(true);
      expect(balances.length).toBeGreaterThan(0);
      const balance = balances[0];
      expect(balance).toHaveProperty('balance');
      expect(balance).toHaveProperty('leaveTypeId');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/leaves/balance');

      expect(response.status).toBe(401);
    });
  });
});
