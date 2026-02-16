const request = require('supertest');
const app = require('../../../server');
const TestHelper = require('../../helpers/testHelper');

// Note: The current implementation only exposes payslip template settings
// under /api/settings/payslip-template. These tests are aligned with that
// actual behavior instead of generic key/value settings.

describe('Settings API Integration Tests (Payslip Template)', () => {
  let helper, adminUser, hrUser, employeeUser;
  let adminToken, hrToken, employeeToken;

  beforeAll(async () => {
    helper = new TestHelper(app);

    ({ user: adminUser, token: adminToken } = await helper.createAdminUser());
    ({ user: hrUser, token: hrToken } = await helper.createHRUser());
    ({ user: employeeUser, token: employeeToken } = await helper.createEmployeeUser());
  });

  afterAll(async () => {
    await helper.cleanup();
  });

  // Test 1: Get payslip template (any authenticated user)
  describe('GET /api/settings/payslip-template', () => {
    it('should return payslip template for admin (creates default if missing)', async () => {
      const response = await request(app)
        .get('/api/settings/payslip-template')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      // PayslipTemplate model exposes `name` and template configuration
      expect(response.body.data).toHaveProperty('name');
    });

    it('should also allow employee to read payslip template', async () => {
      const response = await request(app)
        .get('/api/settings/payslip-template')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 2: Update payslip template (admin/HR only)
  describe('PUT /api/settings/payslip-template', () => {
    it('should allow admin to update payslip template', async () => {
      const updateData = {
        name: `Test Template ${Date.now()}`,
        description: 'Updated template description from admin.'
      };

      const response = await request(app)
        .put('/api/settings/payslip-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should allow HR to update payslip template', async () => {
      const updateData = {
        name: `HR Template ${Date.now()}`,
        description: 'Updated by HR.'
      };

      const response = await request(app)
        .put('/api/settings/payslip-template')
        .set('Authorization', `Bearer ${hrToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow regular employee to update payslip template', async () => {
      const updateData = {
        companyName: 'Unauthorized Change'
      };

      const response = await request(app)
        .put('/api/settings/payslip-template')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
    });
  });

  // Test 3: Authentication requirements
  describe('Authentication', () => {
    it('should require authentication for GET /api/settings/payslip-template', async () => {
      const response = await request(app)
        .get('/api/settings/payslip-template');

      expect(response.status).toBe(401);
    });

    it('should require authentication for PUT /api/settings/payslip-template', async () => {
      const response = await request(app)
        .put('/api/settings/payslip-template')
        .send({ companyName: 'No Auth Co' });

      expect(response.status).toBe(401);
    });
  });
});
