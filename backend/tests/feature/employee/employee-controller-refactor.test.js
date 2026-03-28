/**
 * Employee Controller Refactoring Validation Tests
 * Tests that the refactored controller routes work correctly
 * 
 * @author SkyrakSys Development Team
 * @created 2026-02-07
 */

const request = require('supertest');
const app = require('../../../server');
const db = require('../../../models');
const jwt = require('jsonwebtoken');

describe('Employee Controller Refactoring - Smoke Tests', () => {
  let adminToken, testDepartment, testPosition;

  beforeAll(async () => {
    // Create test department and position
    testDepartment = await db.Department.create({
      name: `Test Department ${Date.now()}`,
      description: 'Test department for refactoring validation',
      status: 'Active'
    });

    testPosition = await db.Position.create({
      title: `Test Position ${Date.now()}`,
      description: 'Test position for refactoring validation',
      status: 'Active',
      departmentId: testDepartment.id
    });

    // Create admin user
    const adminUser = await db.User.create({
      firstName: 'Refactor',
      lastName: 'Admin',
      email: `refactor.admin.${Date.now()}@test.com`,
      password: 'TestPassword123!',
      role: 'admin',
      isActive: true
    });

    // Generate token (auth middleware expects decoded.id, not decoded.userId)
    adminToken = jwt.sign(
      { id: adminUser.id, role: adminUser.role, email: adminUser.email },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Cleanup
    if (testPosition) await testPosition.destroy({ force: true });
    if (testDepartment) await testDepartment.destroy({ force: true });
    
    // Force close database connections
    await db.sequelize.close();
  });

  describe('Controller Integration', () => {
    test('GET /api/employees should work with refactored controller', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/employees/me should work with refactored controller', async () => {
      const response = await request(app)
        .get('/api/employees/me')
        .set('Authorization', `Bearer ${adminToken}`);

      // Should either return 200 (if user has employee record) or 404 (if not)
      expect([200, 404]).toContain(response.status);
    });

    test('GET /api/employees/statistics should work for admin', async () => {
      const response = await request(app)
        .get('/api/employees/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
    });

    test('POST /api/employees should work with refactored controller', async () => {
      const employeeData = {
        firstName: 'Test',
        lastName: 'Employee',
        email: `test.employee.${Date.now()}@test.com`,
        password: 'Password123!',
        phone: '9876543210',
        hireDate: new Date().toISOString().split('T')[0],
        departmentId: testDepartment.id,
        positionId: testPosition.id,
        status: 'Active',
        basicSalary: 50000
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(employeeData);

      expect([200, 201]).toContain(response.status);
      expect(response.body.success).toBe(true);
      
      if (response.body.data) {
        expect(response.body.data.email).toBe(employeeData.email);
        
        // Cleanup
        const createdEmployee = await db.Employee.findOne({ 
          where: { email: employeeData.email } 
        });
        if (createdEmployee) {
          await createdEmployee.destroy({ force: true });
          const user = await db.User.findOne({ 
            where: { email: employeeData.email } 
          });
          if (user) await user.destroy({ force: true });
        }
      }
    });

    test('Refactored routes should maintain RBAC (401 without auth)', async () => {
      const response = await request(app)
        .get('/api/employees');

      expect(response.status).toBe(401);
    });
  });

  describe('Response Format Consistency', () => {
    test('All refactored endpoints should use ApiResponse format', async () => {
      const endpoints = [
        '/api/employees',
        '/api/employees/me',
        '/api/employees/statistics'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${adminToken}`);

        // Should have success property
        expect(response.body).toHaveProperty('success');
        
        // If successful, should have data
        if (response.body.success) {
          expect(response.body).toHaveProperty('data');
        }
      }
    });
  });
});
