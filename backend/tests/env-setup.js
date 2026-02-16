/**
 * Jest Environment Setup
 * Runs before each test file to set environment variables
 */

// Disable rate limiting in test environment to prevent cross-test interference
process.env.RATE_LIMIT_DISABLED = 'true';
