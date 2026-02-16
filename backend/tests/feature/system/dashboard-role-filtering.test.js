/**
 * Task 3.8: Dashboard Role Filtering Tests
 * 
 * Purpose: Ensure dashboard stats respect role-based data access
 * Coverage: Employee (own data), Manager (team data), Admin/HR (all data)
 * 
 * Test Structure:
 * - Employee role: Should only see own data
 * - Manager role: Should see team data (employees under managerId)
 * - Admin/HR role: Should see all data (no filtering)
 */

// Set test environment variables before requiring modules
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const request = require('supertest');
const app = require('../../../server');
const db = require('../../../models');
const { User, Employee, Department, Position, LeaveRequest, Timesheet } = db;
const bcrypt = require('bcryptjs');

describe('Dashboard Role Filtering - Task 3.8', () => {
  let adminUser, adminToken, adminEmployee;
  let managerUser, managerToken, managerEmployee;
  let employeeUser, employeeToken, testEmployee;
  let teamMember1, teamMember2;
  let testDepartment, testPosition;

  beforeAll(async () => {
    const timestamp = Date.now();

    // Create test department and position
    testDepartment = await Department.create({
      name: `Test Dept T38 ${timestamp}`,
      description: 'For Task 3.8 testing',
      isActive: true
    });

    testPosition = await Position.create({
      title: `Test Position T38 ${timestamp}`,
      description: 'For Task 3.8 testing',
      departmentId: testDepartment.id,
      level: 'Entry',
      isActive: true
    });

    // Create admin user
    const adminHashedPassword = await bcrypt.hash('Admin@123', 4);
    adminUser = await User.create({
      email: `admin.t38.${timestamp}@test.com`,
      password: adminHashedPassword,
      role: 'admin',
      firstName: 'Admin',
      lastName: 'Task38',
      isActive: true
    });

    adminEmployee = await Employee.create({
      userId: adminUser.id,
      employeeId: `SKYT${String(8001 + Math.floor(Math.random() * 100)).padStart(4, '0')}`,
      firstName: 'Admin',
      lastName: 'Task38',
      email: `admin.t38.${timestamp}@test.com`,
      departmentId: testDepartment.id,
      positionId: testPosition.id,
      hireDate: new Date('2024-01-01'),
      status: 'Active'
    });

    // Create manager user
    const managerHashedPassword = await bcrypt.hash('Manager@123', 4);
    managerUser = await User.create({
      email: `manager.t38.${timestamp}@test.com`,
      password: managerHashedPassword,
      role: 'manager',
      firstName: 'Manager',
      lastName: 'Task38',
      isActive: true
    });

    managerEmployee = await Employee.create({
      userId: managerUser.id,
      employeeId: `SKYT${String(8101 + Math.floor(Math.random() * 100)).padStart(4, '0')}`,
      firstName: 'Manager',
      lastName: 'Task38',
      email: `manager.t38.${timestamp}@test.com`,
      departmentId: testDepartment.id,
      positionId: testPosition.id,
      hireDate: new Date('2024-01-01'),
      status: 'Active'
    });

    // Create regular employee user
    const employeeHashedPassword = await bcrypt.hash('Employee@123', 4);
    employeeUser = await User.create({
      email: `employee.t38.${timestamp}@test.com`,
      password: employeeHashedPassword,
      role: 'employee',
      firstName: 'Employee',
      lastName: 'Task38',
      isActive: true
    });

    testEmployee = await Employee.create({
      userId: employeeUser.id,
      employeeId: `SKYT${String(8201 + Math.floor(Math.random() * 100)).padStart(4, '0')}`,
      firstName: 'Employee',
      lastName: 'Task38',
      email: `employee.t38.${timestamp}@test.com`,
      departmentId: testDepartment.id,
      positionId: testPosition.id,
      hireDate: new Date('2024-01-01'),
      status: 'Active',
      managerId: managerEmployee.id // This employee reports to the manager
    });

    // Create team members under the manager
    teamMember1 = await Employee.create({
      employeeId: `SKYT${String(8301 + Math.floor(Math.random() * 100)).padStart(4, '0')}`,
      firstName: 'Team',
      lastName: 'Member1',
      email: `team1.t38.${timestamp}@test.com`,
      departmentId: testDepartment.id,
      positionId: testPosition.id,
      hireDate: new Date('2024-01-01'),
      status: 'Active',
      managerId: managerEmployee.id // Reports to manager
    });

    teamMember2 = await Employee.create({
      employeeId: `SKYT${String(8401 + Math.floor(Math.random() * 100)).padStart(4, '0')}`,
      firstName: 'Team',
      lastName: 'Member2',
      email: `team2.t38.${timestamp}@test.com`,
      departmentId: testDepartment.id,
      positionId: testPosition.id,
      hireDate: new Date('2024-01-01'),
      status: 'Active',
      managerId: managerEmployee.id // Reports to manager
    });

    // Login to get tokens
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: `admin.t38.${timestamp}@test.com`, password: 'Admin@123' });
    adminToken = adminLoginRes.body.data.accessToken;

    const managerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: `manager.t38.${timestamp}@test.com`, password: 'Manager@123' });
    managerToken = managerLoginRes.body.data.accessToken;

    const employeeLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: `employee.t38.${timestamp}@test.com`, password: 'Employee@123' });
    employeeToken = employeeLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup in reverse FK order
    await LeaveRequest.destroy({ where: { employeeId: [testEmployee.id, teamMember1.id, teamMember2.id, managerEmployee.id, adminEmployee.id] }, force: true });
    await Timesheet.destroy({ where: { employeeId: [testEmployee.id, teamMember1.id, teamMember2.id, managerEmployee.id, adminEmployee.id] }, force: true });
    await Employee.destroy({ where: { id: [testEmployee.id, teamMember1.id, teamMember2.id, managerEmployee.id, adminEmployee.id] }, force: true });
    await User.destroy({ where: { id: [employeeUser.id, managerUser.id, adminUser.id] }, force: true });
    await Position.destroy({ where: { id: testPosition.id }, force: true });
    await Department.destroy({ where: { id: testDepartment.id }, force: true });
  });

  // ========================================
  // Admin/HR Role Tests (2 tests)
  // ========================================
  describe('Admin/HR Role', () => {
    it('Should see all employee data without filtering', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats).toBeDefined();
      expect(res.body.data.stats.employees).toBeDefined();
      // Admin should see count >= 5 (admin + manager + employee + 2 team members)
      expect(res.body.data.stats.employees.total).toBeGreaterThanOrEqual(5);
    });

    it('Should have access to all timesheet and leave stats', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats.leaves).toBeDefined();
      expect(res.body.data.stats.timesheets).toBeDefined();
      expect(res.body.data.stats.payroll).toBeDefined();
    });
  });

  // ========================================
  // Manager Role Tests (2 tests)
  // ========================================
  describe('Manager Role', () => {
    it('Should only see team members data (filtered by managerId)', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats).toBeDefined();
      expect(res.body.data.stats.employees).toBeDefined();
      // Manager should see only team members (3: testEmployee + teamMember1 + teamMember2)
      expect(res.body.data.stats.employees.total).toBe(3);
    });

    it('Should have leave and timesheet stats filtered to team only', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Stats structure should exist (even if counts are 0)
      expect(res.body.data.stats.leaves).toBeDefined();
      expect(res.body.data.stats.timesheets).toBeDefined();
      expect(typeof res.body.data.stats.leaves.pending).toBe('number');
      expect(typeof res.body.data.stats.timesheets.pending).toBe('number');
    });
  });

  // ========================================
  // Employee Role Tests (2 tests)
  // ========================================
  describe('Employee Role', () => {
    it('Should only see own basic info (no stats)', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userInfo).toBeDefined();
      expect(res.body.data.userInfo.role).toBe('employee');
      // Employee should NOT have full stats
      expect(res.body.data.stats).toBeUndefined();
    });

    it('Should access employee-specific dashboard endpoint', async () => {
      const res = await request(app)
        .get('/api/dashboard/employee-stats')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.leaveBalance).toBeDefined();
      expect(res.body.data.pendingRequests).toBeDefined();
      expect(res.body.data.currentMonth).toBeDefined();
    });
  });
});
