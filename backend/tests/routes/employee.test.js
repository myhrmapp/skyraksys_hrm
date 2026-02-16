
// backend/routes/employee.test.js
const request = require('supertest');
const app = require('../../server');
const db = require('../../models');
const { 
  setupTestDb, 
  cleanupTestDb, 
  generateTestToken, 
  generateMockEmployee,
  assertDatabaseHas 
} = require('../utils/testUtils');

describe('Employee API Endpoints', () => {
  let adminToken, employeeToken, testEmployee;

  beforeAll(async () => {
    await setupTestDb();
    
    // Create test employee (and user)
    const { testDataHelpers } = require('../utils/testDataHelpers');
    testEmployee = await testDataHelpers.createTestEmployee();
    
    // Create admin user
    const adminUser = await db.User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: `admin.${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'admin',
      isActive: true
    });

    // Create test tokens using real user IDs
    adminToken = await generateTestToken(adminUser.id, 'admin');
    employeeToken = await generateTestToken(testEmployee.userId, 'employee');
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  describe('GET /api/employees', () => {
    test('should return employees list for admin', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should return 401 for unauthenticated request', async () => {
      await request(app)
        .get('/api/employees')
        .expect(401);
    });

    test('should return 200 for non-admin user but restrict access to own record', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);
      
      // Should only return 1 record (themselves)
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].id).toBe(testEmployee.id);
    });
  });

  describe('POST /api/employees', () => {
    test('should create new employee with valid data', async () => {
      const employeeData = generateMockEmployee({
        departmentId: testEmployee.departmentId,
        positionId: testEmployee.positionId
      });
      
      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(employeeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(employeeData.email);
      
      // Verify employee was created in database
      await assertDatabaseHas('Employee', { 
        email: employeeData.email 
      });
    });

    test('should return 400 for invalid employee data', async () => {
      const invalidData = {
        // Missing required fields
        firstName: 'Test'
      };
      
      await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);
    });

    test('should return 409 for duplicate email', async () => {
      const duplicateData = generateMockEmployee({
        email: testEmployee.email,
        departmentId: testEmployee.departmentId,
        positionId: testEmployee.positionId
      });
      
      await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateData)
        .expect(409);
    });
  });

  describe('PUT /api/employees/:id', () => {
    test('should update employee with valid data', async () => {
      const updateData = {
        firstName: 'Updated Name'
      };
      
      const response = await request(app)
        .put(`/api/employees/${testEmployee.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(updateData.firstName);
    });

    test('should return 404 for non-existent employee', async () => {
      const { v4: uuidv4 } = require('uuid');
      await request(app)
        .put(`/api/employees/${uuidv4()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /api/employees/:id', () => {
    test('should delete employee (soft delete)', async () => {
      // Create a new employee to delete
      const { testDataHelpers } = require('../utils/testDataHelpers');
      const employeeToDelete = await testDataHelpers.createTestEmployee();
      
      await request(app)
        .delete(`/api/employees/${employeeToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify employee was soft deleted (status Terminated)
      const deletedEmployee = await db.Employee.findByPk(employeeToDelete.id, { paranoid: false });
      expect(deletedEmployee).toBeTruthy();
      expect(deletedEmployee.status).toBe('Terminated');
    });
  });
});
