const request = require('supertest');
const app = require('../../../server');
const TestHelper = require('../../helpers/testHelper');

describe('Holiday API Integration Tests', () => {
  let helper, adminUser, hrUser, managerUser, employeeUser;
  let adminToken, hrToken, managerToken, employeeToken;

  beforeAll(async () => {
    helper = new TestHelper(app);
    
    // Create test users
    ({ user: adminUser, token: adminToken } = await helper.createAdminUser());
    ({ user: hrUser, token: hrToken } = await helper.createHRUser());
    ({ user: managerUser, token: managerToken } = await helper.createManagerUser());
    ({ user: employeeUser, token: employeeToken } = await helper.createEmployeeUser());
  });

  afterAll(async () => {
    await helper.cleanup();
  });

  // Test 1: Get all holidays
  describe('GET /api/holidays', () => {
    it('should get all holidays for any authenticated user', async () => {
      const response = await request(app)
        .get('/api/holidays')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support year filter', async () => {
      const currentYear = new Date().getFullYear();
      const response = await request(app)
        .get(`/api/holidays?year=${currentYear}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 2: Create holiday
  describe('POST /api/holidays', () => {
    it('should create holiday as admin', async () => {
      const date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const holidayData = {
        name: `Test Holiday ${Date.now()}`,
        date,
        type: 'public',
        description: 'Test holiday description',
        isRecurring: false
      };

      const response = await request(app)
        .post('/api/holidays')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(holidayData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(holidayData.name);
    });

    it('should not allow employee to create holiday', async () => {
      const date = new Date().toISOString().split('T')[0];
      const holidayData = {
        name: `Unauthorized Holiday ${Date.now()}`,
        date,
        type: 'public'
      };

      const response = await request(app)
        .post('/api/holidays')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(holidayData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // Test 3: Get holiday by ID
  describe('GET /api/holidays/:id', () => {
    it('should get holiday by id', async () => {
      const holiday = await helper.createHoliday();

      const response = await request(app)
        .get(`/api/holidays/${holiday.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(holiday.id);
    });
  });

  // Test 4: Update holiday
  describe('PUT /api/holidays/:id', () => {
    it('should update holiday as admin', async () => {
      const holiday = await helper.createHoliday();
      const updateData = {
        name: `Updated Holiday ${Date.now()}`,
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/holidays/${holiday.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
    });
  });

  // Test 5: Delete holiday
  describe('DELETE /api/holidays/:id', () => {
    it('should delete holiday as admin', async () => {
      const holiday = await helper.createHoliday();

      const response = await request(app)
        .delete(`/api/holidays/${holiday.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 6: Validation and authorization
  describe('Validation and Authorization', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/holidays');

      expect(response.status).toBe(401);
    });

    it('should require holiday name', async () => {
      const response = await request(app)
        .post('/api/holidays')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: new Date().toISOString().split('T')[0] });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
