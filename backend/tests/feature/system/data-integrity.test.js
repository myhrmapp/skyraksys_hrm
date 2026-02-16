const request = require('supertest');
const app = require('../../../server');
const db = require('../../../models');
const bcrypt = require('bcryptjs');

const { User, Employee, Department, Position, LeaveType, Project, Task } = db;

describe('Data Integrity - Week 3 Implementation', () => {
  let adminToken;
  let employeeToken;
  let adminUser;
  let employeeUser;
  let testDepartment;
  let testPosition;
  let testEmployee;

  beforeAll(async () => {
    // Cleanup any existing test data first
    await Employee.destroy({ where: { employeeId: 'SKYT9998' }, force: true });
    await Position.destroy({ where: { title: 'Test Position Integrity' }, force: true });
    await Department.destroy({ where: { name: 'Test Department Integrity' }, force: true });
    await User.destroy({ where: { email: 'admin.integrity.test@test.com' }, force: true });
    await User.destroy({ where: { email: 'employee.integrity.test@test.com' }, force: true });

    // Create admin user
    const hashedAdminPassword = await bcrypt.hash('Admin@123', 4);
    adminUser = await User.create({
      email: 'admin.integrity.test@test.com',
      password: hashedAdminPassword,
      firstName: 'Admin',
      lastName: 'Integrity',
      role: 'admin',
      isActive: true
    });

    // Create employee user
    const hashedEmployeePassword = await bcrypt.hash('Employee@123', 4);
    employeeUser = await User.create({
      email: 'employee.integrity.test@test.com',
      password: hashedEmployeePassword,
      firstName: 'Employee',
      lastName: 'Integrity',
      role: 'employee',
      isActive: true
    });

    // Login admin
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin.integrity.test@test.com',
        password: 'Admin@123'
      });
    adminToken = adminLoginRes.body.data.accessToken;

    // Login employee
    const employeeLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'employee.integrity.test@test.com',
        password: 'Employee@123'
      });
    employeeToken = employeeLoginRes.body.data.accessToken;

    // Create test department
    testDepartment = await Department.create({
      name: 'Test Department Integrity',
      description: 'Test department for data integrity tests'
    });

    // Create test position
    testPosition = await Position.create({
      title: 'Test Position Integrity',
      departmentId: testDepartment.id,
      level: 'Entry'
    });

    // Create test employee
    testEmployee = await Employee.create({
      employeeId: 'SKYT9998',
      firstName: 'Test',
      lastName: 'Integrity',
      email: 'test.integrity@test.com',
      hireDate: new Date(),
      status: 'Active',
      departmentId: testDepartment.id,
      positionId: testPosition.id
    });
  });

  afterAll(async () => {
    // Cleanup - check if objects exist before destroying
    if (testEmployee) await testEmployee.destroy({ force: true });
    if (testPosition) await testPosition.destroy({ force: true });
    if (testDepartment) await testDepartment.destroy({ force: true });
    if (employeeUser) await employeeUser.destroy({ force: true });
    if (adminUser) await adminUser.destroy({ force: true });
    
    // Close database connections
    await db.sequelize.close();
  });

  describe('Position Level Enum Fix', () => {
    test('Should create position with Entry level (enum fix)', async () => {
      const res = await request(app)
        .post('/api/positions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Entry Level Developer',
          departmentId: testDepartment.id,
          level: 'Entry'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.level).toBe('Entry');

      // Cleanup
      if (res.body.data?.id) {
        await Position.destroy({ where: { id: res.body.data.id }, force: true });
      }
    });

    test('Should default to Entry level when not specified', async () => {
      const res = await request(app)
        .post('/api/positions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Default Level Position',
          departmentId: testDepartment.id
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.level).toBe('Entry');

      // Cleanup
      if (res.body.data?.id) {
        await Position.destroy({ where: { id: res.body.data.id }, force: true });
      }
    });
  });

  describe('Department RBAC', () => {
    test('Should allow admin to create department', async () => {
      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Created Department',
          description: 'Test'
        })
        .expect(201);

      expect(res.body.success).toBe(true);

      // Cleanup
      if (res.body.data?.id) {
        await Department.destroy({ where: { id: res.body.data.id }, force: true });
      }
    });

    test('Should deny employee from creating department', async () => {
      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          name: 'Employee Attempt Department',
          description: 'Test'
        })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    test('Should deny employee from updating department', async () => {
      const res = await request(app)
        .put(`/api/departments/${testDepartment.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          name: 'Updated Name'
        })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    test('Should deny deleting department with employees', async () => {
      const res = await request(app)
        .delete(`/api/departments/${testDepartment.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('active employees');
    });
  });

  describe('Position RBAC', () => {
    test('Should allow admin to create position', async () => {
      const res = await request(app)
        .post('/api/positions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin Created Position',
          departmentId: testDepartment.id
        })
        .expect(201);

      expect(res.body.success).toBe(true);

      // Cleanup
      if (res.body.data?.id) {
        await Position.destroy({ where: { id: res.body.data.id }, force: true });
      }
    });

    test('Should deny employee from creating position', async () => {
      const res = await request(app)
        .post('/api/positions')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          title: 'Employee Attempt Position',
          departmentId: testDepartment.id
        })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    test('Should deny deleting position with employees', async () => {
      const res = await request(app)
        .delete(`/api/positions/${testPosition.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('assigned employees');
    });
  });

  describe('Debug Endpoint Security', () => {
    test('Should deny unauthenticated access to debug endpoint', async () => {
      const res = await request(app)
        .get('/api/payslip-templates/debug/test')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    test('Should deny non-admin access to debug endpoint', async () => {
      const res = await request(app)
        .get('/api/payslip-templates/debug/test')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    test('Should allow admin access to debug endpoint (non-production)', async () => {
      // Only test if not in production
      if (process.env.NODE_ENV !== 'production') {
        const res = await request(app)
          .get('/api/payslip-templates/debug/test')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.success).toBe(true);
      }
    });
  });

  describe('Foreign Key Validation - Leave Type', () => {
    test('Should reject leave request with invalid leaveTypeId', async () => {
      const fakeLeaveTypeId = '00000000-0000-0000-0000-000000000000';
      
      const res = await request(app)
        .post('/api/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveTypeId: fakeLeaveTypeId,
          startDate: '2026-03-01',
          endDate: '2026-03-02',
          reason: 'Test'
        });

      // Leave endpoint rejects invalid requests
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Foreign Key Validation - Department', () => {
    test('Should reject position with invalid departmentId', async () => {
      const fakeDepartmentId = '00000000-0000-0000-0000-000000000000';
      
      const res = await request(app)
        .post('/api/positions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Position',
          departmentId: fakeDepartmentId
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Department not found');
    });
  });

  describe('Foreign Key Validation - Project/Task', () => {
    test('Should reject timesheet with invalid projectId', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000';
      
      const res = await request(app)
        .post('/api/timesheets')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          projectId: fakeProjectId,
          taskId: '00000000-0000-0000-0000-000000000000',
          date: '2026-02-05',
          hoursWorked: 8,
          description: 'Test'
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      // Accept either 'project' or 'Validation error' in message
      expect(res.body.message.toLowerCase()).toMatch(/project|validation/);
    });
  });
});
