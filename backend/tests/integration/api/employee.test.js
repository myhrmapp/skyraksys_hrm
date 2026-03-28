const request = require('supertest');
const app = require('../../../server');
const TestHelper = require('../../helpers/testHelper');
const { loadTestData } = require('../../helpers/dataLoader');
const { v4: uuidv4 } = require('uuid');

describe('Employee API', () => {
  let helper, adminUser, hrUser, managerUser, employeeUser;
  let adminToken, hrToken, managerToken, employeeToken;
  let testDepartment, testPosition;

  beforeAll(async () => {
    helper = new TestHelper(app);
    
    // Create test users
    ({ user: adminUser, token: adminToken } = await helper.createAdminUser());
    ({ user: hrUser, token: hrToken } = await helper.createHRUser());
    ({ user: managerUser, token: managerToken } = await helper.createManagerUser());
    ({ user: employeeUser, token: employeeToken } = await helper.createEmployeeUser());

    // Create test department and position
    testDepartment = await helper.createDepartment();
    testPosition = await helper.createPosition();
  });

  afterAll(async () => {
    await helper.cleanup();
  });

  describe('GET /api/employees', () => {
    it('should get all employees for admin', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get all employees for HR', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should get only own data for employee', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].id).toBe(employeeUser.employee.id);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/employees?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.currentPage).toBe(1);
    });

    it('should support search', async () => {
      const response = await request(app)
        .get(`/api/employees?search=${employeeUser.employee.firstName}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/employees', () => {
    it('should create employee as admin', async () => {
      const employeeData = {
        // Don't send employeeId - let system auto-generate in SKYT#### format
        firstName: 'New',
        lastName: 'Employee',
        email: `new${Date.now()}@company.com`,
        phone: '9876543210',
        dateOfBirth: '1990-01-01',
        hireDate: new Date().toISOString().split('T')[0],
        departmentId: testDepartment.id,
        positionId: testPosition.id,
        status: 'Active',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(employeeData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.employeeId).toMatch(/^SKYT\d{4}$/);
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Test'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: `EMP${Date.now()}`,
          firstName: 'Test',
          lastName: 'User',
          email: 'invalid-email',
          hireDate: new Date(),
          departmentId: testDepartment.id,
          positionId: testPosition.id
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should deny access for regular employee', async () => {
      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          employeeId: `EMP${Date.now()}`,
          firstName: 'Test',
          lastName: 'User',
          email: `test${Date.now()}@company.com`,
          hireDate: new Date(),
          departmentId: testDepartment.id,
          positionId: testPosition.id
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/employees/:id', () => {
    it('should get employee by id as admin', async () => {
      const response = await request(app)
        .get(`/api/employees/${employeeUser.employee.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(employeeUser.employee.id);
    });

    it('should get own profile as employee', async () => {
      const response = await request(app)
        .get(`/api/employees/${employeeUser.employee.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should deny access to other employee data', async () => {
      const response = await request(app)
        .get(`/api/employees/${adminUser.employee.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent employee', async () => {
      const fakeId = uuidv4(); // Dynamic valid UUID
      const response = await request(app)
        .get(`/api/employees/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/employees/:id', () => {
    it('should update employee as admin', async () => {
      const response = await request(app)
        .put(`/api/employees/${employeeUser.employee.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          phone: '9999999999'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.phone).toBe('9999999999');
    });

    it('should allow employee to update own profile', async () => {
      const response = await request(app)
        .put(`/api/employees/${employeeUser.employee.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          phone: '8888888888'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should deny employee updating others', async () => {
      const response = await request(app)
        .put(`/api/employees/${adminUser.employee.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          phone: '7777777777'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/employees/:id', () => {
    it('should soft delete employee as admin', async () => {
      const testEmployee = await helper.createTestUser('employee', true);

      const response = await request(app)
        .delete(`/api/employees/${testEmployee.employee.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should deny delete for non-admin', async () => {
      const response = await request(app)
        .delete(`/api/employees/${employeeUser.employee.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Validation Tests', () => {
    it('should validate Aadhaar number format', async () => {
      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: `EMP${Date.now()}`,
          firstName: 'Test',
          lastName: 'User',
          email: `test${Date.now()}@company.com`,
          hireDate: new Date(),
          departmentId: testDepartment.id,
          positionId: testPosition.id,
          aadhaarNumber: '123' // Invalid
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate PAN number format', async () => {
      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: `EMP${Date.now()}`,
          firstName: 'Test',
          lastName: 'User',
          email: `test${Date.now()}@company.com`,
          hireDate: new Date(),
          departmentId: testDepartment.id,
          positionId: testPosition.id,
          panNumber: 'INVALID'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
