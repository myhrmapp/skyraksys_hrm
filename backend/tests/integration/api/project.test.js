const request = require('supertest');
const app = require('../../../server');
const TestHelper = require('../../helpers/testHelper');

describe('Project API Integration Tests', () => {
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

  // Test 1: Get all projects
  describe('GET /api/projects', () => {
    it('should get all projects for admin', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get assigned projects for employee', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 2: Create project
  describe('POST /api/projects', () => {
    it('should create project as admin', async () => {
      const projectData = {
        name: `Test Project ${Date.now()}`,
        code: `PRJ${Date.now()}`.substring(0, 10),
        description: 'Test project description',
        clientName: 'Test Client',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Planning',
        budget: 100000,
        managerId: managerUser.employee.id
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(projectData.name);
    });

    it('should not allow employee to create project', async () => {
      const projectData = {
        name: `Unauthorized Project ${Date.now()}`,
        code: `UP${Date.now()}`.substring(0, 10),
        startDate: new Date().toISOString().split('T')[0]
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(projectData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // Test 3: Get project by ID
  describe('GET /api/projects/:id', () => {
    it('should get project by id', async () => {
      const project = await helper.createProject();

      const response = await request(app)
        .get(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(project.id);
    });
  });

  // Test 4: Update project
  describe('PUT /api/projects/:id', () => {
    it('should update project as admin', async () => {
      const project = await helper.createProject();
      const updateData = {
        name: `Updated Project ${Date.now()}`,
        description: 'Updated description',
        status: 'Active'
      };

      const response = await request(app)
        .put(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
    });

    it('should allow manager to update assigned project', async () => {
      const project = await helper.createProject({ managerId: managerUser.employee.id });
      const updateData = {
        status: 'Active',
        description: 'Manager updated'
      };

      const response = await request(app)
        .put(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 5: Delete project
  describe('DELETE /api/projects/:id', () => {
    it('should delete project as admin', async () => {
      const project = await helper.createProject();

      const response = await request(app)
        .delete(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow employee to delete project', async () => {
      const project = await helper.createProject();

      const response = await request(app)
        .delete(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // Test 6: Validation tests
  describe('Validation', () => {
    it('should require project name', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'TEST' });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // Test 9: Search and filter
  describe('GET /api/projects with filters', () => {
    it('should support status filter', async () => {
      const response = await request(app)
        .get('/api/projects?status=Active')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 10: Authorization tests
  describe('Authorization', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/projects');

      expect(response.status).toBe(401);
    });
  });
});
