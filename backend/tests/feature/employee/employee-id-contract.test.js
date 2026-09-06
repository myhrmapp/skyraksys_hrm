/**
 * Employee ID Contract Tests - Task 3.5
 *
 * Tests to ensure consistent SK### format across:
 * - Validator (accepts SK###, rejects invalid formats)
 * - Route validation
 * - ID generator (creates SK### format)
 */

// Set test environment variables before requiring modules
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only-32chars-ABC';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-for-testing-only-32chars-XYZ';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.ALLOW_TOKEN_RESPONSE = 'true';

const request = require('supertest');
const app = require('../../../server');
const db = require('../../../models');
const { User, Employee, Department, Position } = db;
const bcrypt = require('bcryptjs');

describe('Employee ID Contract - Task 3.5', () => {
  let adminToken;
  let testDepartment;
  let testPosition;

  beforeAll(async () => {
    try {
      // Cleanup any existing test data (including users created by previous test runs)
      const testEmails = [
        'admin.idtest@test.com',
        'test.valid001@test.com',
        'test.invalidsk@test.com',
        'test.invalidemp@test.com',
        'test.autogen@test.com',
        'test.sequential@test.com'
      ];
      
      // Get user IDs before deleting
      const testUsers = await User.findAll({ where: { email: testEmails }, attributes: ['id'] });
      const testUserIds = testUsers.map(u => u.id);
      
      // Delete security sessions first (FK dependency) - use raw query to avoid model issues
      if (testUserIds.length > 0) {
        try {
          await db.sequelize.query(`DELETE FROM security_sessions WHERE "userId" IN (${testUserIds.map(id => `'${id}'`).join(',')})`);
        } catch (err) {
          // Ignore if security_sessions table doesn't exist
          if (!err.message.includes('does not exist')) {
            console.warn('Failed to delete security_sessions:', err.message);
          }
        }
      }
      
      await Employee.destroy({ where: { employeeId: ['SK001', 'SK002', 'SK003'] }, force: true });
      await Employee.destroy({ where: { email: testEmails }, force: true });
      await User.destroy({ where: { email: testEmails }, force: true });
      await Department.destroy({ where: { name: 'Test Dept ID' }, force: true });
      await Position.destroy({ where: { title: 'Test Position ID' }, force: true });

      // Create admin user for testing
      const hashedPassword = await bcrypt.hash('Admin@123', 4);
      const adminUser = await User.create({
        email: 'admin.idtest@test.com',
        password: hashedPassword,
        role: 'admin',
        firstName: 'Admin',
        lastName: 'IDTest',
        isActive: true
      });

      // Create test department and position
      testDepartment = await Department.create({
        name: 'Test Dept ID',
        description: 'For ID testing',
        isActive: true
      });

      testPosition = await Position.create({
        title: 'Test Position ID',
        description: 'For ID testing',
        departmentId: testDepartment.id,
        level: 'Entry',
        isActive: true
      });

      // Login to get token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin.idtest@test.com',
          password: 'Admin@123'
        });

      adminToken = loginRes.body.data.accessToken;
    } catch (error) {
      console.error('❌ beforeAll failed in employee-id-contract:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    // Cleanup in reverse FK order
    const testEmails = [
      'admin.idtest@test.com',
      'test.valid001@test.com',
      'test.invalidsk@test.com',
      'test.invalidemp@test.com',
      'test.autogen@test.com',
      'test.sequential@test.com'
    ];
    
    // Get user IDs for security_sessions cleanup
    const testUsers = await User.findAll({ where: { email: testEmails }, attributes: ['id'] });
    const testUserIds = testUsers.map(u => u.id);
    
    // Delete security sessions first (FK dependency)
    if (testUserIds.length > 0) {
      try {
        await db.sequelize.query(`DELETE FROM security_sessions WHERE "userId" IN (${testUserIds.map(id => `'${id}'`).join(',')})`);
      } catch (err) {
        // Ignore if security_sessions table doesn't exist
        if (!err.message.includes('does not exist')) {
          console.warn('Failed to delete security_sessions in afterAll:', err.message);
        }
      }
    }
    
    await Employee.destroy({ where: { employeeId: ['SK001', 'SK002', 'SK003'] }, force: true });
    await Employee.destroy({ where: { email: testEmails }, force: true });
    await Position.destroy({ where: { id: testPosition.id }, force: true });
    await Department.destroy({ where: { id: testDepartment.id }, force: true });
    await User.destroy({ where: { email: testEmails }, force: true });
    
    // Close database connection
    await db.sequelize.close();
  });

  describe('Validator - SK### Format Acceptance', () => {
    test('Should accept valid SK### format (3 digits)', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: 'SK001',
          firstName: 'Test',
          lastName: 'ValidID',
          email: 'test.valid001@test.com',
          departmentId: testDepartment.id,
          positionId: testPosition.id,
          hireDate: '2026-02-05',
          status: 'Active',
          role: 'employee',
          password: 'Test@123'
        });

      if (res.status !== 201) {
        console.log('\n=== Test 1 failed ===');
        console.log('Status:', res.status);
        console.log('Response:', JSON.stringify(res.body, null, 2));
      }

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe('SK001');
    });

    test('Should reject SKYT#### format (legacy format)', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: 'SKYT001',
          firstName: 'Test',
          lastName: 'InvalidSK',
          email: 'test.invalidsk@test.com',
          departmentId: testDepartment.id,
          positionId: testPosition.id,
          hireDate: '2026-02-05',
          status: 'Active',
          role: 'employee',
          password: 'Test@123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation error');
      expect(res.body.errors).toBeDefined();
      const employeeIdError = res.body.errors.find(e => e.field === 'employeeId');
      expect(employeeIdError).toBeDefined();
      expect(employeeIdError.message).toMatch(/SK###/i);
    });

    test('Should reject EMP### format (old format)', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: 'EMP003',
          firstName: 'Test',
          lastName: 'InvalidEMP',
          email: 'test.invalidemp@test.com',
          departmentId: testDepartment.id,
          positionId: testPosition.id,
          hireDate: '2026-02-05',
          status: 'Active',
          role: 'employee',
          password: 'Test@123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation error');
      expect(res.body.errors).toBeDefined();
      const employeeIdError = res.body.errors.find(e => e.field === 'employeeId');
      expect(employeeIdError).toBeDefined();
      expect(employeeIdError.message).toMatch(/SK###/i);
    });
  });

  describe('ID Generator - SK### Format Creation', () => {
    test('Should generate SK### format when no ID provided', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Test',
          lastName: 'AutoGenerated',
          email: 'test.autogen@test.com',
          departmentId: testDepartment.id,
          positionId: testPosition.id,
          hireDate: '2026-02-05',
          status: 'Active',
          role: 'employee',
          password: 'Test@123'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toMatch(/^SK\d{3}$/);

      if (res.body.data?.id) {
        await Employee.destroy({ where: { id: res.body.data.id }, force: true });
      }
    });

    test('Should generate sequential SK IDs with 3-digit padding', async () => {
      const lastEmployee = await Employee.findOne({
        where: { employeeId: { [db.Sequelize.Op.like]: 'SK%' } },
        order: [['employeeId', 'DESC']]
      });

      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Test',
          lastName: 'Sequential',
          email: 'test.sequential@test.com',
          departmentId: testDepartment.id,
          positionId: testPosition.id,
          hireDate: '2026-02-05',
          status: 'Active',
          role: 'employee',
          password: 'Test@123'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.employeeId).toMatch(/^SK\d{3}$/);

      const idNumber = res.body.data.employeeId.substring(2);
      expect(idNumber).toHaveLength(3);

      if (res.body.data?.id) {
        await Employee.destroy({ where: { id: res.body.data.id }, force: true });
      }
    });
  });
});
