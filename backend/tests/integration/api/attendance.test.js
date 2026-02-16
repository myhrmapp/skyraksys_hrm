const request = require('supertest');
const app = require('../../../server');
const TestHelper = require('../../helpers/testHelper');

describe('Attendance API Integration Tests', () => {
  let helper, adminUser, hrUser, managerUser, employeeUser;
  let adminToken, hrToken, managerToken, employeeToken;

  beforeAll(async () => {
    helper = new TestHelper(app);
    
    // Create test users
    ({ user: adminUser, token: adminToken } = await helper.createAdminUser());
    ({ user: hrUser, token: hrToken } = await helper.createHRUser());
    ({ user: managerUser, token: managerToken } = await helper.createManagerUser());
    ({ user: employeeUser, token: employeeToken } = await helper.createEmployeeUser());
  });

  afterEach(async () => {
    // Clean up attendance records between tests to avoid conflicts
    const db = require('../../../models');
    await db.Attendance.destroy({ where: {}, force: true });
  });

  afterAll(async () => {
    await helper.cleanup();
  });

  // Test 1: Get all attendance records
  describe('GET /api/attendance', () => {
    it('should get all attendance records for admin', async () => {
      const response = await request(app)
        .get('/api/attendance')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get own attendance records for employee', async () => {
      const response = await request(app)
        .get('/api/attendance')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should get team attendance for manager', async () => {
      const response = await request(app)
        .get('/api/attendance')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 2: Clock in
  describe('POST /api/attendance/clock-in', () => {
    it('should allow employee to clock in', async () => {
      const clockInData = {
        date: new Date().toISOString().split('T')[0],
        checkIn: new Date().toISOString(),
        location: 'Office',
        notes: 'Regular clock in'
      };

      const response = await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(clockInData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.checkIn).toBeDefined();
    });

    it('should not allow double clock in', async () => {
      // First clock in
      await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ date: new Date().toISOString().split('T')[0] });

      // Try to clock in again
      const response = await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ date: new Date().toISOString().split('T')[0] });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // Test 3: Clock out
  describe('POST /api/attendance/clock-out', () => {
    it('should allow employee to clock out', async () => {
      // First clock in
      const clockIn = await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ 
          date: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString().split('T')[0]
        });

      const attendanceId = clockIn.body.data.id;

      // Then clock out
      const response = await request(app)
        .post('/api/attendance/clock-out')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          attendanceId,
          checkOut: new Date().toISOString(),
          notes: 'Regular clock out'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.checkOut).toBeDefined();
    });
  });

  // Test 4: Get attendance by ID
  describe('GET /api/attendance/:id', () => {
    it('should get attendance record by id', async () => {
      const attendance = await helper.createAttendance({
        employeeId: employeeUser.employee.id
      });

      const response = await request(app)
        .get(`/api/attendance/${attendance.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(attendance.id);
    });
  });

  // Test 5: Update attendance
  describe('PUT /api/attendance/:id', () => {
    it('should update attendance as admin', async () => {
      const attendance = await helper.createAttendance({
        employeeId: employeeUser.employee.id
      });

      const updateData = {
        status: 'present',
        notes: 'Updated by admin'
      };

      const response = await request(app)
        .put(`/api/attendance/${attendance.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow employee to update others attendance', async () => {
      const attendance = await helper.createAttendance({
        employeeId: adminUser.employee.id
      });

      const response = await request(app)
        .put(`/api/attendance/${attendance.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ notes: 'Unauthorized update' });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // Test 6: Get attendance summary
  describe('GET /api/attendance/summary', () => {
    it('should get attendance summary for date range', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/attendance/summary?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 7: Filter by date range
  describe('GET /api/attendance with date filters', () => {
    it('should support date range filter', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/attendance?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should support employee filter', async () => {
      const response = await request(app)
        .get(`/api/attendance?employeeId=${employeeUser.employee.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 8: Authorization tests
  describe('Authorization', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/attendance');

      expect(response.status).toBe(401);
    });
  });
});
