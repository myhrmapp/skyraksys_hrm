const db = require('../../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { testDataHelpers } = require('./testDataHelpers');

const setupTestDb = async () => {
  // Ensure database is connected and synced
  // In a real test environment, we might want to force sync once at the start
  // For now, we assume tables exist or are created by migrations
  // await db.sequelize.sync({ force: false }); 
};

const cleanupTestDb = async () => {
  await testDataHelpers.clearTestData();
};

/**
 * Generate token for an existing user (better for integration tests)
 * Creates user in database if userId not provided
 */
const generateTestToken = async (userId, role = 'employee') => {
  let user;
  
  if (userId) {
    // Use existing user ID
    user = await db.User.findByPk(userId);
    if (!user) {
      // User doesn't exist, create it
      const timestamp = Date.now();
      user = await db.User.create({
        firstName: 'Test',
        lastName: 'User',
        email: `test.user.${timestamp}@example.com`,
        password: await bcrypt.hash('Password123!', 4),
        role: role,
        isActive: true
      });
    }
  } else {
    // Create new user
    const timestamp = Date.now();
    user = await db.User.create({
      firstName: 'Test',
      lastName: 'User',
      email: `test.user.${timestamp}@example.com`,
      password: await bcrypt.hash('Password123!', 4),
      role: role,
      isActive: true
    });
  }
  
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      role: user.role 
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

/**
 * Generate token WITHOUT creating user (for unit tests with mocks)
 */
const generateMockToken = (userId, role = 'employee') => {
  const id = userId || uuidv4();
  return jwt.sign(
    { 
      id: id, 
      email: `test.user.${id}@example.com`,
      role: role 
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

const generateMockEmployee = (overrides = {}) => {
  const timestamp = Date.now();
  const fourDigit = String(timestamp).slice(-4);
  return {
    employeeId: `SKYT${fourDigit}`,
    firstName: 'Test',
    lastName: 'Employee',
    email: `test.employee.${timestamp}@example.com`,
    password: 'Password123!',
    // departmentId and positionId should be valid UUIDs if foreign keys are enforced
    // For unit tests with mocks, we might need to create them first or mock the DB
    hireDate: new Date(),
    status: 'Active',
    ...overrides
  };
};

const assertDatabaseHas = async (modelName, condition) => {
  if (!db[modelName]) {
    throw new Error(`Model ${modelName} not found in db object`);
  }
  const record = await db[modelName].findOne({ where: condition });
  if (!record) {
    throw new Error(`Record not found in ${modelName} with condition ${JSON.stringify(condition)}`);
  }
  return record;
};

module.exports = {
  setupTestDb,
  cleanupTestDb,
  generateTestToken,
  generateMockToken,
  generateMockEmployee,
  assertDatabaseHas
};
