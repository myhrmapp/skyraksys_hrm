/**
 * Jest Environment Setup
 * Runs before each test file to set environment variables
 */

// Disable rate limiting in test environment to prevent cross-test interference
process.env.RATE_LIMIT_DISABLED = 'true';

// Auth tokens moved to httpOnly cookies; most integration tests assert on the
// response body, so enable legacy JSON-body tokens by default. Individual
// suites (e.g. token-lifetime.test.js) may override this to verify cookie-only behavior.
if (process.env.ALLOW_TOKEN_RESPONSE === undefined) {
  process.env.ALLOW_TOKEN_RESPONSE = 'true';
}
