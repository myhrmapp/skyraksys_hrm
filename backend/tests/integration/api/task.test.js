const request = require('supertest');
const app = require('../../../server');
const TestHelper = require('../../helpers/testHelper');

describe('Task API Integration Tests', () => {
  let helper, adminUser, hrUser, managerUser, employeeUser;
  let adminToken, hrToken, managerToken, employeeToken;
  let testProject;

  beforeAll(async () => {
    helper = new TestHelper(app);
    
    // Create test users
    ({ user: adminUser, token: adminToken } = await helper.createAdminUser());
    ({ user: hrUser, token: hrToken } = await helper.createHRUser());
    ({ user: managerUser, token: managerToken } = await helper.createManagerUser());
    ({ user: employeeUser, token: employeeToken } = await helper.createEmployeeUser());

    // Create test project
    testProject = await helper.createProject();
  });

  afterAll(async () => {
    await helper.cleanup();
  });

  // Test 1: Get all tasks
  describe('GET /api/tasks', () => {
    it('should get all tasks for admin', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get assigned tasks for employee', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 2: Create task
  describe('POST /api/tasks', () => {
    it('should create task as admin', async () => {
      const taskData = {
        name: `Test Task ${Date.now()}`,
        description: 'Test task description',
        projectId: testProject.id,
        assignedTo: employeeUser.employee.id,
        status: 'Not Started',
        priority: 'Medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        estimatedHours: 16
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(taskData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(taskData.name);
    });

    it('should allow manager to create task', async () => {
      const taskData = {
        name: `Manager Task ${Date.now()}`,
        description: 'Task created by manager',
        projectId: testProject.id,
        priority: 'High'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(taskData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 3: Get task by ID
  describe('GET /api/tasks/:id', () => {
    it('should get task by id', async () => {
      const task = await helper.createTask({ projectId: testProject.id });

      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(task.id);
    });
  });

  // Test 4: Update task
  describe('PUT /api/tasks/:id', () => {
    it('should update task as admin', async () => {
      const task = await helper.createTask({ projectId: testProject.id });
      const updateData = {
        name: `Updated Task ${Date.now()}`,
        status: 'In Progress',
        priority: 'High'
      };

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
    });

    it('should allow employee to update own task status', async () => {
      const task = await helper.createTask({ 
        projectId: testProject.id,
        assignedTo: employeeUser.employee.id 
      });

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'In Progress' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 5: Delete task
  describe('DELETE /api/tasks/:id', () => {
    it('should delete task as admin', async () => {
      const task = await helper.createTask({ projectId: testProject.id });

      const response = await request(app)
        .delete(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow employee to delete task', async () => {
      const task = await helper.createTask({ projectId: testProject.id });

      const response = await request(app)
        .delete(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // Test 6: Update task progress
  describe('PATCH /api/tasks/:id/progress', () => {
    it('should update task progress', async () => {
      const task = await helper.createTask({ 
        projectId: testProject.id,
        assignedTo: employeeUser.employee.id 
      });

      const response = await request(app)
        .patch(`/api/tasks/${task.id}/progress`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ progress: 50, actualHours: 8 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 7: Get my tasks
  describe('GET /api/tasks/my-tasks', () => {
    it('should get tasks assigned to current user', async () => {
      await helper.createTask({ 
        projectId: testProject.id,
        assignedTo: employeeUser.employee.id 
      });

      const response = await request(app)
        .get('/api/tasks/my-tasks')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // Test 8: Validation tests
  describe('Validation', () => {
    it('should require task name', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ projectId: testProject.id });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // Test 9: Filter tasks by status
  describe('GET /api/tasks with filters', () => {
    it('should support status filter', async () => {
      const response = await request(app)
        .get('/api/tasks?status=In%20Progress')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 10: Authorization tests
  describe('Authorization', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/tasks');

      expect(response.status).toBe(401);
    });
  });
});
