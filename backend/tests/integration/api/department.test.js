const request = require('supertest');
const app = require('../../../server');
const TestHelper = require('../../helpers/testHelper');

describe('Department API Integration Tests', () => {
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

  afterAll(async () => {
    await helper.cleanup();
  });

  // Test 1: Get all departments
  describe('GET /api/departments', () => {
    it('should get all departments for admin', async () => {
      const response = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get all departments for HR', async () => {
      const response = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow employees to view departments', async () => {
      const response = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 2: Create department
  describe('POST /api/departments', () => {
    it('should create department as admin', async () => {
      const departmentData = {
        name: `Test Department ${Date.now()}`,
        code: `TD${Date.now()}`.substring(0, 10),
        description: 'Test department description',
        headOfDepartment: adminUser.employee.id
      };

      const response = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(departmentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(departmentData.name);
    });

    it('should not allow employee to create department', async () => {
      const departmentData = {
        name: `Unauthorized Dept ${Date.now()}`,
        code: `UD${Date.now()}`.substring(0, 10)
      };

      const response = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(departmentData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // Test 3: Get department by ID
  describe('GET /api/departments/:id', () => {
    it('should get department by id', async () => {
      const department = await helper.createDepartment();

      const response = await request(app)
        .get(`/api/departments/${department.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(department.id);
    });
  });

  // Test 4: Update department
  describe('PUT /api/departments/:id', () => {
    it('should update department as admin', async () => {
      const department = await helper.createDepartment();
      const updateData = {
        name: `Updated Department ${Date.now()}`,
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/departments/${department.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
    });
  });

  // Test 5: Delete department
  describe('DELETE /api/departments/:id', () => {
    it('should delete department as admin', async () => {
      const department = await helper.createDepartment();

      const response = await request(app)
        .delete(`/api/departments/${department.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow employee to delete department', async () => {
      const department = await helper.createDepartment();

      const response = await request(app)
        .delete(`/api/departments/${department.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // Test 6: Validation tests
  describe('Validation', () => {
    it('should require department name', async () => {
      const response = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'TEST' });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // Test 7: Authorization tests
  describe('Authorization', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/departments');

      expect(response.status).toBe(401);
    });
  });
});
