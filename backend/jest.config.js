/**
 * Jest Configuration
 * 
 * @see https://jestjs.io/docs/configuration
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Run tests sequentially to avoid database conflicts
  maxWorkers: 1,

  // Test timeout (30 seconds for database operations)
  testTimeout: 30000,

  // Coverage settings
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'models/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],

  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],

  // Setup files
  setupFiles: ['./tests/env-setup.js'],
  globalSetup: './tests/setup.js',
  globalTeardown: './tests/teardown.js',

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: false,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: false
};
