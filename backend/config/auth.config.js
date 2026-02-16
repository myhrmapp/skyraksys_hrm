require('dotenv').config();

// In production, JWT secrets MUST be set via environment variables
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable must be set in production');
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('FATAL: JWT_REFRESH_SECRET environment variable must be set in production');
  }
}

// Fallback values only for development/test environments
const fallbackSecret = process.env.NODE_ENV === 'test' ? 'test-secret-key-do-not-use-in-production' : undefined;
const fallbackRefreshSecret = process.env.NODE_ENV === 'test' ? 'test-refresh-secret-key-do-not-use-in-production' : undefined;

module.exports = {
  secret: process.env.JWT_SECRET || fallbackSecret,
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  // Refresh secret MUST differ from access secret to prevent token type confusion
  refreshSecret: process.env.JWT_REFRESH_SECRET || fallbackRefreshSecret,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};
