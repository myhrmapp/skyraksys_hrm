const db = require('../../models');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.DB_NAME = 'skyraksys_hrm_test';

// Global test setup
beforeAll(async () => {
  // Sync database - create all tables
  await db.sequelize.sync({ force: true });
  console.log('✅ Test database synced');
});

// Clean up after all tests
afterAll(async () => {
  await db.sequelize.close();
  console.log('✅ Database connection closed');
});

// Reset database before each test suite
beforeEach(async () => {
  try {
    // Truncate all tables to ensure test isolation
    const models = Object.keys(db.sequelize.models);
    
    for (const modelName of models) {
      await db.sequelize.models[modelName].destroy({
        where: {},
        force: true,
        truncate: true,
        cascade: true
      });
    }
  } catch (error) {
    console.error('⚠️ Table truncation failed:', error.message);
    // Don't throw - allow test to continue
  }
});

// Global test utilities
global.testHelpers = {
  async createTestUser(userData = {}) {
    const bcrypt = require('bcryptjs');
    const defaultUser = {
      firstName: 'Test',
      lastName: 'User',
      email: `test${Date.now()}@example.com`,
      password: await bcrypt.hash('Password123!', 10),
      role: 'employee',
      isActive: true,
      ...userData
    };
    return await db.User.create(defaultUser);
  },

  async createTestEmployee(employeeData = {}) {
    const defaultEmployee = {
      employeeId: `EMP${Date.now()}`,
      firstName: 'Test',
      lastName: 'Employee',
      email: `emp${Date.now()}@example.com`,
      phone: '1234567890',
      hireDate: new Date(),
      status: 'Active',
      ...employeeData
    };
    return await db.Employee.create(defaultEmployee);
  },

  generateToken(user) {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }
};
