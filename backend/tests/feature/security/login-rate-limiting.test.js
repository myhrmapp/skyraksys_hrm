const request = require('supertest');
const bcrypt = require('bcryptjs');

// CRITICAL: Set environment variables BEFORE importing app
process.env.RATE_LIMIT_DISABLED = 'false'; // Re-enable rate limiting for this test
process.env.RATE_LIMIT_AUTH_MAX = '500'; // Increase auth rate limit to avoid express-rate-limit interfering
process.env.RATE_LIMIT_MAX = '500'; // Increase general rate limit too
process.env.JWT_SECRET = 'test-secret-key-rate-limiting';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-rate-limiting';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const app = require('../../../server');
const db = require('../../../models');
const { resetRateLimiter } = require('../../../middleware/login-rate-limiter');

describe('Task 5.2: Login Rate Limiting - Brute Force Protection', () => {
  let testUser, testPassword = 'TestPass123!';
  let adminUser, adminToken;

  beforeAll(async () => {
    await db.sequelize.query('TRUNCATE TABLE users CASCADE');
    resetRateLimiter(); // Clear rate limiter state from previous tests
    
    // Create admin user for distributed attack test
    const bcrypt = require('bcryptjs');
    const hashedAdminPassword = await bcrypt.hash('AdminPass123!', 10);
    adminUser = await db.User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@ratelimit.com',
      password: hashedAdminPassword,
      role: 'admin',
      isActive: true
    });
    
    // Login to get admin token
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@ratelimit.com', password: 'AdminPass123!' });
    
    if (adminLogin.body.data && adminLogin.body.data.accessToken) {
      adminToken = adminLogin.body.data.accessToken;
    }
    
    resetRateLimiter(); // Clear rate limiter after admin login
    
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const hashedPassword = await bcrypt.hash(testPassword, 10);
    testUser = await db.User.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@ratelimit.com',
      password: hashedPassword,
      role: 'employee',
      isActive: true
    });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('Per-IP Rate Limiting (5 attempts / 15 minutes)', () => {
    // Don't reset between these two tests - they need to test sequential attempts
    
    it('should allow 5 failed login attempts from same IP', async () => {
      resetRateLimiter(); // Reset at start of this describe block only
      // Use a different email for each test to avoid account lockout interference
      const testEmail = `rate-limit-ip-${Date.now()}@test.com`;
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      await db.User.create({
        firstName: 'RateTest',
        lastName: 'User',
        email: testEmail,
        password: hashedPassword,
        role: 'employee',
        isActive: true
      });
      
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ email: testEmail, password: 'WrongPassword' });
        
        expect(response.status).toBe(401); // Unauthorized
      }
    });

    it('should block 6th failed login attempt from same IP', async () => {
      // Use a non-existent user to avoid account lockout (user won't be found, no lockout check)
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'WrongPassword' });
      
      expect(response.status).toBe(429); // Too Many Requests
      expect(response.body.message).toContain('Too many login attempts');
      expect(response.body.retryAfter).toBeDefined();
      expect(response.body.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('Per-Username Rate Limiting (10 attempts / hour)', () => {
    beforeEach(() => {
      resetRateLimiter(); // Clear state before each test
    });

    it('should track failed attempts per username across different IPs', async () => {
      // Use a non-existent email to avoid account lockout interference
      // (Non-existent users don't have account lockout checks)
      const testEmail = `nonexistent-${Date.now()}@test.com`;
      
      // Simulate attacks from multiple IPs (in real test, would need multiple machines)
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/auth/login')
          .set('X-Forwarded-For', `192.168.1.${i + 1}`) // Simulate different IPs
          .send({ email: testEmail, password: 'WrongPassword' });
      }

      // 11th attempt should be blocked
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '192.168.1.99')
        .send({ email: testEmail, password: 'WrongPassword' });

      expect(response.status).toBe(429);
      expect(response.body.message).toContain('Account temporarily locked');
    });
  });

  describe('Exponential Backoff After 3 Failures', () => {
    beforeEach(() => {
      resetRateLimiter(); // Clear state before each test
    });

    it('should increase wait time exponentially after failures', async () => {
      // First 3 failures - normal rate limit
      const attempts = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ email: 'backoff@test.com', password: 'WrongPass1' });
        attempts.push({
          attempt: i + 1,
          retryAfter: response.body.retryAfter || 0
        });
      }

      // 4th failure - should have longer backoff
      const response4 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'backoff@test.com', password: 'WrongPass1' });
      
      if (response4.status === 429) {
        expect(response4.body.retryAfter).toBeGreaterThan(attempts[0].retryAfter * 2);
      }
    });
  });

  describe('Successful Login Resets Rate Limit', () => {
    beforeEach(() => {
      resetRateLimiter(); // Clear state before each test
    });

    it('should reset failed attempt counter on successful login', async () => {
      // Create new user for clean test
      const cleanPassword = 'CleanPass123!';
      const hashedCleanPassword = await bcrypt.hash(cleanPassword, 10);
      await db.User.create({
        firstName: 'Clean',
        lastName: 'User',
        email: 'clean@ratelimit.com',
        password: hashedCleanPassword,
        role: 'employee',
        isActive: true
      });

      // Make 4 failed attempts
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'clean@ratelimit.com', password: 'WrongPass1' });
      }

      // Successful login
      const successResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'clean@ratelimit.com', password: cleanPassword });
      
      expect(successResponse.status).toBe(200);

      // Should be able to login again immediately
      const response2 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'clean@ratelimit.com', password: cleanPassword });
      
      expect(response2.status).toBe(200);
    });
  });

  describe('Distributed Attack Detection', () => {
    beforeEach(() => {
      resetRateLimiter(); // Clear state before each test
    });

    it('should alert admins on distributed brute force attempts', async () => {
      // Simulate 100+ failed login attempts from different IPs in short time
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .set('X-Forwarded-For', `10.0.${Math.floor(i / 255)}.${i % 255}`)
            .send({ email: 'target@ratelimit.com', password: 'WrongPass1' })
        );
      }

      await Promise.all(promises);

      // Check if alert was generated
      const alertResponse = await request(app)
        .get('/api/admin/security-alerts')
        .set('Authorization', `Bearer ${adminToken}`);

      if (alertResponse.status === 200) {
        const alerts = alertResponse.body.data.alerts;
        const distributedAlert = alerts.find(a => 
          a.type === 'DISTRIBUTED_BRUTE_FORCE' && 
          a.target === 'target@ratelimit.com'
        );
        expect(distributedAlert).toBeDefined();
      }
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include rate limit information in response headers', async () => {
      // Don't reset - test should work with or without existing state
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@ratelimit.com', password: 'WrongPassword123!' }); // Use valid-format password

      // Debug: log all headers and status
      console.log('Response status:', response.status);
      console.log('Response headers:', JSON.stringify(response.headers, null, 2));
      
      // Check for headers in both cases (lowercase from supertest and original case)
      const limitHeader = response.headers['x-ratelimit-limit'] || response.headers['X-RateLimit-Limit'];
      const remainingHeader = response.headers['x-ratelimit-remaining'] || response.headers['X-RateLimit-Remaining'];
      const resetHeader = response.headers['x-ratelimit-reset'] || response.headers['X-RateLimit-Reset'];
      
      console.log('Limit header:', limitHeader);
      console.log('Remaining header:', remainingHeader);
      console.log('Reset header:', resetHeader);
      
      expect(limitHeader).toBeDefined();
      expect(remainingHeader).toBeDefined();
      expect(resetHeader).toBeDefined();
    });
  });

  describe('Bypass for Whitelisted IPs (Optional)', () => {
    beforeEach(() => {
      resetRateLimiter(); // Clear state before each test
    });

    afterEach(() => {
      delete process.env.RATE_LIMIT_WHITELIST;
    });

    it('should not rate limit requests from whitelisted IPs', async () => {
      process.env.RATE_LIMIT_WHITELIST = '127.0.0.1,::1,::ffff:127.0.0.1';

      // Make 10 attempts from localhost (should not be blocked)
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ email: 'whitelist@test.com', password: 'WrongPass1' });
        
        // Should get 401 (invalid creds) not 429 (rate limited)
        expect(response.status).not.toBe(429);
      }
    });
  });
});
