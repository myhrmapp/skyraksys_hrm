
// backend/tests/testUtils.js
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../models');

// Test database setup
const setupTestDb = async () => {
  await db.sequelize.sync({ force: true });
  await seedTestData();
};

const cleanupTestDb = async () => {
  await db.sequelize.drop();
};

// Seed test data
const seedTestData = async () => {
  // Create departments
  const itDepartment = await db.Department.create({
    name: 'Information Technology',
    description: 'IT Department'
  });

  const hrDepartment = await db.Department.create({
    name: 'Human Resources', 
    description: 'HR Department'
  });

  // Create positions
  const adminPosition = await db.Position.create({
    title: 'System Administrator',
    description: 'Admin',
    departmentId: itDepartment.id
  });

  const devPosition = await db.Position.create({
    title: 'Software Developer',
    description: 'Developer',
    departmentId: itDepartment.id
  });

  // Create test users
  const hashedPassword = await bcrypt.hash('Password123!', 12);
  
  const adminUser = await db.User.create({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@test.com',
    password: hashedPassword,
    role: 'admin',
    isActive: true
  });

  const employeeUser = await db.User.create({
    firstName: 'Test',
    lastName: 'Employee',
    email: 'employee@test.com',
    password: hashedPassword,
    role: 'employee',
    isActive: true
  });

  // Create test employees
  const adminEmployee = await db.Employee.create({
    userId: adminUser.id,
    employeeId: 'EMP001',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@test.com',
    departmentId: itDepartment.id,
    positionId: adminPosition.id,
    hireDate: new Date(),
    status: 'Active'
  });

  const testEmployee = await db.Employee.create({
    userId: employeeUser.id,
    employeeId: 'EMP002',
    firstName: 'Test',
    lastName: 'Employee',
    email: 'employee@test.com',
    departmentId: itDepartment.id,
    positionId: devPosition.id,
    hireDate: new Date(),
    status: 'Active'
  });

  return {
    users: { adminUser, employeeUser },
    employees: { adminEmployee, testEmployee },
    departments: { itDepartment, hrDepartment },
    positions: { adminPosition, devPosition }
  };
};

// Auth helpers
const generateTestToken = (userId, role = 'employee') => {
  return jwt.sign(
    { 
      id: userId,
      email: `test.user.${userId}@example.com`,
      role: role
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

const authenticateRequest = (req, user) => {
  const token = generateTestToken(user.id, user.role);
  return req.set('Authorization', `Bearer ${token}`);
};

// API test helpers
const testApiEndpoint = async (app, method, endpoint, data = null, auth = null) => {
  let req = request(app)[method.toLowerCase()](endpoint);
  
  if (auth) {
    req = authenticateRequest(req, auth);
  }
  
  if (data) {
    req = req.send(data);
  }
  
  return req;
};

// Mock data generators
const generateMockEmployee = (overrides = {}) => ({
  employeeId: 'EMP' + Math.random().toString(36).substr(2, 9),
  firstName: 'Test',
  lastName: 'Employee',
  email: `test${Math.random().toString(36).substr(2, 9)}@example.com`,
  hireDate: new Date(),
  status: 'Active',
  ...overrides
});

const generateMockLeaveRequest = (employeeId, overrides = {}) => ({
  employeeId,
  leaveTypeId: '1',
  startDate: new Date(Date.now() + 86400000), // Tomorrow
  endDate: new Date(Date.now() + 259200000), // In 3 days
  reason: 'Test leave request',
  status: 'Pending',
  ...overrides
});

const generateMockTimesheet = (employeeId, overrides = {}) => ({
  employeeId,
  projectId: '1',
  taskId: '1',
  date: new Date(),
  hours: 8,
  description: 'Test work',
  ...overrides
});

// Database assertions
const assertDatabaseHas = async (model, conditions) => {
  const record = await db[model].findOne({ where: conditions });
  expect(record).toBeTruthy();
  return record;
};

const assertDatabaseMissing = async (model, conditions) => {
  const record = await db[model].findOne({ where: conditions });
  expect(record).toBeFalsy();
};

module.exports = {
  setupTestDb,
  cleanupTestDb,
  seedTestData,
  generateTestToken,
  authenticateRequest,
  testApiEndpoint,
  generateMockEmployee,
  generateMockLeaveRequest,
  generateMockTimesheet,
  assertDatabaseHas,
  assertDatabaseMissing
};
