const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// CRITICAL: Set environment variables BEFORE importing app
process.env.JWT_SECRET = 'test-secret-key-token-lifetime';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-token-lifetime';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const app = require('../../../server');
const db = require('../../../models');
const { resetRateLimiter } = require('../../../middleware/login-rate-limiter');

describe('Token Lifetime & Refresh - 15min Access + 7-day Refresh', () => {
  let adminUser, testUser, adminPassword = 'AdminPass123!', testPassword = 'TestPass123!';
  let accessToken, refreshToken;

  beforeAll(async () => {
    // Reset rate limiter to avoid cross-test interference
    resetRateLimiter();
    
    // Don't force sync - use existing tables
    // await db.sequelize.sync({ force: true });
    
    // Clean up existing data using direct SQL (delete in correct order - FK constraints)
    await db.sequelize.query('TRUNCATE TABLE refresh_tokens CASCADE');
    await db.sequelize.query('TRUNCATE TABLE employees CASCADE');
    await db.sequelize.query('TRUNCATE TABLE users CASCADE');
    
    // Environment already set above before app import

    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
    const hashedTestPassword = await bcrypt.hash(testPassword, 10);

    adminUser = await db.User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@token-test.com',
      password: hashedAdminPassword,
      role: 'admin',
      isActive: true
    });

    testUser = await db.User.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@token-test.com',
      password: hashedTestPassword,
      role: 'employee',
      isActive: true
    });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('POST /api/auth/login - Access & Refresh Token Generation', () => {
    it('should return both access token (15min) and refresh token (7 days)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@token-test.com', password: adminPassword });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Verify access token expires in 15 minutes
      const decodedAccess = jwt.decode(response.body.data.accessToken);
      const accessExpiry = decodedAccess.exp - decodedAccess.iat;
      expect(accessExpiry).toBe(15 * 60); // 900 seconds = 15 minutes

      // Verify refresh token expires in 7 days
      const decodedRefresh = jwt.decode(response.body.data.refreshToken);
      const refreshExpiry = decodedRefresh.exp - decodedRefresh.iat;
      expect(refreshExpiry).toBe(7 * 24 * 60 * 60); // 604800 seconds = 7 days

      // Store for subsequent tests
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should store refresh token in database with user agent and IP', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('User-Agent', 'Test Agent')
        .send({ email: 'test@token-test.com', password: testPassword });

      expect(response.status).toBe(200);

      const storedToken = await db.RefreshToken.findOne({
        where: { userId: testUser.id, isRevoked: false }
      });

      expect(storedToken).toBeDefined();
      expect(storedToken.token).toBeDefined();
      expect(storedToken.userAgent).toContain('Test Agent');
      expect(storedToken.ipAddress).toBeDefined();
      expect(storedToken.expiresAt).toBeDefined();
      expect(new Date(storedToken.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('should set httpOnly cookie with 15-minute expiry for access token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@token-test.com', password: adminPassword });

      expect(response.status).toBe(200);
      
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      const accessTokenCookie = cookies.find(c => c.startsWith('accessToken='));
      expect(accessTokenCookie).toBeDefined();
      expect(accessTokenCookie).toContain('HttpOnly');
      expect(accessTokenCookie).toContain('Max-Age=900'); // 15 minutes
    });
  });

  describe('POST /api/auth/refresh-token - Token Refresh Endpoint', () => {
    it('should reject refresh request without refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Refresh token is required');
    });

    it('should reject expired refresh token', async () => {
      // Create token with -1 hour expiry (already expired)
      const expiredToken = jwt.sign(
        { id: adminUser.id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '-1h' }
      );

      await db.RefreshToken.create({
        token: expiredToken,
        userId: adminUser.id,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        isRevoked: false
      });

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: expiredToken });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('expired');
    });

    it('should reject revoked refresh token', async () => {
      // Create valid but revoked token
      const revokedToken = jwt.sign(
        { id: testUser.id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      await db.RefreshToken.create({
        token: revokedToken,
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: true,
        revokedAt: new Date()
      });

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: revokedToken });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('revoked');
    });

    it('should issue new access token with valid refresh token', async () => {
      // Login to get valid tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@token-test.com', password: adminPassword });

      const validRefreshToken = loginResponse.body.data.refreshToken;

      // Use refresh token to get new access token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: validRefreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data.accessToken).toBeDefined();
      expect(refreshResponse.body.data.accessToken).not.toBe(loginResponse.body.data.accessToken);

      // Verify new access token is valid
      const decoded = jwt.verify(refreshResponse.body.data.accessToken, process.env.JWT_SECRET);
      expect(decoded.id).toBe(adminUser.id);
      expect(decoded.email).toBe(adminUser.email);
    });

    it('should issue new access token AND new refresh token (rotation)', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@token-test.com', password: testPassword });

      const oldRefreshToken = loginResponse.body.data.refreshToken;

      const refreshResponse = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: oldRefreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.data.refreshToken).toBeDefined();
      expect(refreshResponse.body.data.refreshToken).not.toBe(oldRefreshToken);

      // Old refresh token should be revoked
      const oldToken = await db.RefreshToken.findOne({
        where: { token: oldRefreshToken }
      });
      expect(oldToken.isRevoked).toBe(true);
      expect(oldToken.revokedAt).toBeDefined();

      // New refresh token should exist in database
      const newToken = await db.RefreshToken.findOne({
        where: { token: refreshResponse.body.data.refreshToken }
      });
      expect(newToken).toBeDefined();
      expect(newToken.isRevoked).toBe(false);
    });
  });

  describe('POST /api/auth/logout - Revoke Refresh Tokens', () => {
    it('should revoke all user refresh tokens on logout', async () => {
      // Login to get tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@token-test.com', password: adminPassword });

      const userAccessToken = loginResponse.body.data.accessToken;

      // Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send();

      expect(logoutResponse.status).toBe(200);

      // All refresh tokens for user should be revoked
      const tokens = await db.RefreshToken.findAll({
        where: { userId: adminUser.id, isRevoked: false }
      });
      expect(tokens.length).toBe(0);
    });
  });

  describe('Access Token Expiry Validation', () => {
    it('should reject expired access token (simulated)', async () => {
      // Create token that expired 1 minute ago
      const expiredAccessToken = jwt.sign(
        { id: adminUser.id, email: adminUser.email, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '-1m' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredAccessToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('expired');
    });

    it('should accept valid access token within 15-minute window', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@token-test.com', password: adminPassword });

      const validAccessToken = loginResponse.body.data.accessToken;

      // Should work immediately after login
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validAccessToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Refresh Token Cleanup', () => {
    it('should clean up expired refresh tokens', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { id: testUser.id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '-1d' }
      );

      await db.RefreshToken.create({
        token: expiredToken,
        userId: testUser.id,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isRevoked: false
      });

      // Call cleanup endpoint (admin only)
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@token-test.com', password: adminPassword });

      const adminToken = loginResponse.body.data.accessToken;

      const cleanupResponse = await request(app)
        .post('/api/auth/cleanup-tokens')
        .set('Authorization', `Bearer ${adminToken}`)
        .send();

      expect(cleanupResponse.status).toBe(200);
      expect(cleanupResponse.body.data.deletedCount).toBeGreaterThan(0);
    });
  });

  describe('Multiple Device Support', () => {
    it('should allow multiple active refresh tokens per user (multi-device)', async () => {
      // Login from "device 1"
      const login1 = await request(app)
        .post('/api/auth/login')
        .set('User-Agent', 'Device 1')
        .send({ email: 'test@token-test.com', password: testPassword });

      // Login from "device 2"
      const login2 = await request(app)
        .post('/api/auth/login')
        .set('User-Agent', 'Device 2')
        .send({ email: 'test@token-test.com', password: testPassword });

      expect(login1.body.data.refreshToken).not.toBe(login2.body.data.refreshToken);

      // Both tokens should be valid in database
      const device1Token = await db.RefreshToken.findOne({
        where: { token: login1.body.data.refreshToken }
      });
      const device2Token = await db.RefreshToken.findOne({
        where: { token: login2.body.data.refreshToken }
      });

      expect(device1Token).toBeDefined();
      expect(device1Token.isRevoked).toBe(false);
      expect(device2Token).toBeDefined();
      expect(device2Token.isRevoked).toBe(false);
      expect(device1Token.userAgent).toContain('Device 1');
      expect(device2Token.userAgent).toContain('Device 2');
    });

    it('should allow refreshing from one device without affecting other device tokens', async () => {
      // Login from two devices
      const login1 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@token-test.com', password: adminPassword });

      expect(login1.status).toBe(200);

      const login2 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@token-test.com', password: adminPassword });

      expect(login2.status).toBe(200);

      const device1RefreshToken = login1.body.data.refreshToken;
      const device2RefreshToken = login2.body.data.refreshToken;

      // Refresh device 1 token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: device1RefreshToken });

      expect(refreshResponse.status).toBe(200);

      // Device 1 old token should be revoked
      const device1Old = await db.RefreshToken.findOne({
        where: { token: device1RefreshToken }
      });
      expect(device1Old.isRevoked).toBe(true);

      // Device 2 token should still be valid
      const device2Token = await db.RefreshToken.findOne({
        where: { token: device2RefreshToken }
      });
      expect(device2Token.isRevoked).toBe(false);
    });
  });

  describe('Security: Token Reuse Detection', () => {
    it('should detect and block refresh token reuse (replay attack)', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@token-test.com', password: testPassword });

      const refreshToken = loginResponse.body.data.refreshToken;

      // Use refresh token once (valid)
      const refresh1 = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken });

      expect(refresh1.status).toBe(200);

      // Try to reuse old refresh token (should fail - already revoked)
      const refresh2 = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken });

      expect(refresh2.status).toBe(401);
      expect(refresh2.body.message).toContain('revoked');

      // SECURITY: Revoke all tokens for this user (token family invalidation)
      const allTokens = await db.RefreshToken.findAll({
        where: { userId: testUser.id, isRevoked: false }
      });
      expect(allTokens.length).toBe(0); // All tokens revoked due to reuse detection
    });
  });
});
