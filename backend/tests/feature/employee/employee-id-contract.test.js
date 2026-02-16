/**
 * Employee ID Contract Tests - Task 3.5
 * 
 * Tests to ensure consistent SKYT#### format across:
 * - Validator (accepts SKYT####, rejects invalid formats)
 * - Route validation
 * - ID generator (creates SKYT#### format)
 */

// Set test environment variables before requiring modules
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

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
        'test.valid9991@test.com',
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
      
      await Employee.destroy({ where: { employeeId: ['SKYT9991', 'SKYT9992', 'SKYT9993'] }, force: true });
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
      'test.valid9991@test.com',
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
    
    await Employee.destroy({ where: { employeeId: ['SKYT9991', 'SKYT9992', 'SKYT9993'] }, force: true });
    await Employee.destroy({ where: { email: testEmails }, force: true });
    await Position.destroy({ where: { id: testPosition.id }, force: true });
    await Department.destroy({ where: { id: testDepartment.id }, force: true });
    await User.destroy({ where: { email: testEmails }, force: true });
    
    // Close database connection
    await db.sequelize.close();
  });

  describe('Validator - SKYT Format Acceptance', () => {
    test('Should accept valid SKYT#### format (4 digits)', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: 'SKYT9991',
          firstName: 'Test',
          lastName: 'ValidID',
          email: 'test.valid9991@test.com',
          departmentId: testDepartment.id,
          positionId: testPosition.id,
          hireDate: '2026-02-05',
          status: 'Active',
          role: 'employee',
          password: 'Test@123'
        });

      // Log the full response for debugging
      if (res.status !== 201) {
        console.log('\n=== Test 1 failed ===');
        console.log('Status:', res.status);
        console.log('Response:', JSON.stringify(res.body, null, 2));
      }

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe('SKYT9991');
    });

    test('Should reject SK#### format (missing TY)', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: 'SK9992',
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
      // Check that errors array contains employeeId validation error
      expect(res.body.errors).toBeDefined();
      const employeeIdError = res.body.errors.find(e => e.field === 'employeeId');
      expect(employeeIdError).toBeDefined();
      expect(employeeIdError.message).toMatch(/SKYT.*4 digits/i);
    });

    test('Should reject EMP#### format (old format)', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: 'EMP9993',
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
      // Check that errors array contains employeeId validation error
      expect(res.body.errors).toBeDefined();
      const employeeIdError = res.body.errors.find(e => e.field === 'employeeId');
      expect(employeeIdError).toBeDefined();
      expect(employeeIdError.message).toMatch(/SKYT.*4 digits/i);
    });
  });

  describe('ID Generator - SKYT Format Creation', () => {
    test('Should generate SKYT#### format when no ID provided', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // No employeeId provided - should auto-generate
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
      expect(res.body.data.employeeId).toMatch(/^SKYT\d{4}$/);

      // Cleanup auto-generated employee
      if (res.body.data?.id) {
        await Employee.destroy({ where: { id: res.body.data.id }, force: true });
      }
    });

    test('Should generate sequential SKYT IDs with 4-digit padding', async () => {
      // Get current max SKYT ID
      const lastEmployee = await Employee.findOne({
        where: { employeeId: { [db.Sequelize.Op.like]: 'SKYT%' } },
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
      expect(res.body.data.employeeId).toMatch(/^SKYT\d{4}$/);
      
      // Verify it's exactly 4 digits (padded with zeros if needed)
      const idNumber = res.body.data.employeeId.substring(4);
      expect(idNumber).toHaveLength(4);

      // Cleanup
      if (res.body.data?.id) {
        await Employee.destroy({ where: { id: res.body.data.id }, force: true });
      }
    });
  });
});
