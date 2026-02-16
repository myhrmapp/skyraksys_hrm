const request = require('supertest');
const app = require('../../../server');
const TestHelper = require('../../helpers/testHelper');

describe('Position API Integration Tests', () => {
  let helper, adminUser, hrUser, managerUser, employeeUser;
  let adminToken, hrToken, managerToken, employeeToken;
  let testDepartment;

  beforeAll(async () => {
    helper = new TestHelper(app);
    
    // Create test users
    ({ user: adminUser, token: adminToken } = await helper.createAdminUser());
    ({ user: hrUser, token: hrToken } = await helper.createHRUser());
    ({ user: managerUser, token: managerToken } = await helper.createManagerUser());
    ({ user: employeeUser, token: employeeToken } = await helper.createEmployeeUser());

    // Create test department
    testDepartment = await helper.createDepartment();
  });

  afterAll(async () => {
    await helper.cleanup();
  });

  // Test 1: Get all positions
  describe('GET /api/positions', () => {
    it('should get all positions for admin', async () => {
      const response = await request(app)
        .get('/api/positions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get all positions for HR', async () => {
      const response = await request(app)
        .get('/api/positions')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow employees to view positions', async () => {
      const response = await request(app)
        .get('/api/positions')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 2: Create position
  describe('POST /api/positions', () => {
    it('should create position as admin', async () => {
      const positionData = {
        title: `Test Position ${Date.now()}`,
        code: `TP${Date.now()}`.substring(0, 10),
        description: 'Test position description',
        departmentId: testDepartment.id,
        level: 'Mid',
        salaryRange: '50000-80000'
      };

      const response = await request(app)
        .post('/api/positions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(positionData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(positionData.title);
    });

    it('should not allow employee to create position', async () => {
      const positionData = {
        title: `Unauthorized Position ${Date.now()}`,
        code: `UP${Date.now()}`.substring(0, 10),
        departmentId: testDepartment.id
      };

      const response = await request(app)
        .post('/api/positions')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(positionData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // Test 3: Get position by ID
  describe('GET /api/positions/:id', () => {
    it('should get position by id', async () => {
      const position = await helper.createPosition();

      const response = await request(app)
        .get(`/api/positions/${position.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(position.id);
    });
  });

  // Test 4: Update position
  describe('PUT /api/positions/:id', () => {
    it('should update position as admin', async () => {
      const position = await helper.createPosition();
      const updateData = {
        title: `Updated Position ${Date.now()}`,
        description: 'Updated description',
        level: 'Senior'
      };

      const response = await request(app)
        .put(`/api/positions/${position.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
    });
  });

  // Test 5: Delete position
  describe('DELETE /api/positions/:id', () => {
    it('should delete position as admin', async () => {
      const position = await helper.createPosition();

      const response = await request(app)
        .delete(`/api/positions/${position.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow employee to delete position', async () => {
      const position = await helper.createPosition();

      const response = await request(app)
        .delete(`/api/positions/${position.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // Test 6: Validation tests
  describe('Validation', () => {
    it('should require position title', async () => {
      const response = await request(app)
        .post('/api/positions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'TEST', departmentId: testDepartment.id });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // Test 7: Authorization tests
  describe('Authorization', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/positions');

      expect(response.status).toBe(401);
    });
  });
});
