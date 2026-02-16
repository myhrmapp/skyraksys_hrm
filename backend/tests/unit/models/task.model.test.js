const db = require('../../../models');

describe('Task Model', () => {
  let testProject, testEmployee, testUser, testDepartment, testPosition;

  beforeEach(async () => {
    // Create dependencies
    const uniqueId = Math.floor(Math.random() * 100000);
    testDepartment = await db.Department.create({
      name: `Test Department ${uniqueId}`,
      code: `TD${uniqueId}`
    });

    testPosition = await db.Position.create({
      title: `Test Position ${uniqueId}`,
      code: `TP${uniqueId}`,
      departmentId: testDepartment.id
    });

    testUser = await db.User.create({
      firstName: 'Test',
      lastName: 'User',
      email: `test${uniqueId}@example.com`,
      password: 'hashedpassword',
      role: 'employee'
    });

    testEmployee = await db.Employee.create({
      userId: testUser.id,
      employeeId: `EMP${uniqueId}`,
      firstName: 'Test',
      lastName: 'Employee',
      email: `emp${uniqueId}@company.com`,
      hireDate: '2024-01-01',
      departmentId: testDepartment.id,
      positionId: testPosition.id,
      status: 'Active'
    });

    testProject = await db.Project.create({
      name: `Test Project ${uniqueId}`,
      managerId: testEmployee.id
    });
  });

  afterEach(async () => {
    await db.Task.destroy({ where: {}, force: true });
    await db.Project.destroy({ where: {}, force: true });
    await db.Employee.destroy({ where: {}, force: true });
    await db.User.destroy({ where: {}, force: true });
    await db.Position.destroy({ where: {}, force: true });
    await db.Department.destroy({ where: {}, force: true });
  });

  describe('Required Fields', () => {
    it('should create task with required name', async () => {
      const task = await db.Task.create({
        name: 'Test Task',
        projectId: testProject.id
      });

      expect(task.id).toBeDefined();
      expect(task.name).toBe('Test Task');
      expect(task.projectId).toBe(testProject.id);
    });

    it('should fail without name', async () => {
      await expect(db.Task.create({
        projectId: testProject.id
      })).rejects.toThrow();
    });
  });

  describe('Status Enum Validation', () => {
    const validStatuses = ['Not Started', 'In Progress', 'Completed', 'On Hold'];

    validStatuses.forEach(status => {
      it(`should accept valid status: ${status}`, async () => {
        const task = await db.Task.create({
          name: `Task ${status}`,
          projectId: testProject.id,
          status
        });
        expect(task.status).toBe(status);
      });
    });

    it('should reject invalid status', async () => {
      await expect(db.Task.create({
        name: 'Invalid Status Task',
        projectId: testProject.id,
        status: 'InvalidStatus'
      })).rejects.toThrow();
    });
  });

  describe('Priority Enum Validation', () => {
    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];

    validPriorities.forEach(priority => {
      it(`should accept valid priority: ${priority}`, async () => {
        const task = await db.Task.create({
          name: `Task ${priority}`,
          projectId: testProject.id,
          priority
        });
        expect(task.priority).toBe(priority);
      });
    });

    it('should reject invalid priority', async () => {
      await expect(db.Task.create({
        name: 'Invalid Priority Task',
        projectId: testProject.id,
        priority: 'InvalidPriority'
      })).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    it('should apply default status as Not Started', async () => {
      const task = await db.Task.create({
        name: 'New Task',
        projectId: testProject.id
      });

      expect(task.status).toBe('Not Started');
    });

    it('should apply default priority as Medium', async () => {
      const task = await db.Task.create({
        name: 'Normal Task',
        projectId: testProject.id
      });

      expect(task.priority).toBe('Medium');
    });

    it('should apply default availableToAll as false', async () => {
      const task = await db.Task.create({
        name: 'Assigned Task',
        projectId: testProject.id
      });

      expect(task.availableToAll).toBe(false);
    });

    it('should apply default isActive as true', async () => {
      const task = await db.Task.create({
        name: 'Active Task',
        projectId: testProject.id
      });

      expect(task.isActive).toBe(true);
    });

    it('should apply default actualHours as 0', async () => {
      const task = await db.Task.create({
        name: 'Untracked Task',
        projectId: testProject.id
      });

      expect(parseFloat(task.actualHours)).toBe(0);
    });
  });

  describe('Optional Fields', () => {
    it('should store description', async () => {
      const task = await db.Task.create({
        name: 'Documented Task',
        description: 'This is a detailed task description',
        projectId: testProject.id
      });

      expect(task.description).toBe('This is a detailed task description');
    });

    it('should store estimatedHours and actualHours', async () => {
      const task = await db.Task.create({
        name: 'Estimated Task',
        estimatedHours: 8.5,
        actualHours: 6.25,
        projectId: testProject.id
      });

      expect(parseFloat(task.estimatedHours)).toBe(8.5);
      expect(parseFloat(task.actualHours)).toBe(6.25);
    });

    it('should store assignedTo employee', async () => {
      const task = await db.Task.create({
        name: 'Assigned Task',
        projectId: testProject.id,
        assignedTo: testEmployee.id
      });

      expect(task.assignedTo).toBe(testEmployee.id);
    });
  });

  describe('Available To All Feature', () => {
    it('should allow availableToAll to be true', async () => {
      const task = await db.Task.create({
        name: 'Public Task',
        projectId: testProject.id,
        availableToAll: true
      });

      expect(task.availableToAll).toBe(true);
    });

    it('should allow availableToAll with assignedTo', async () => {
      const task = await db.Task.create({
        name: 'Hybrid Task',
        projectId: testProject.id,
        assignedTo: testEmployee.id,
        availableToAll: true
      });

      expect(task.assignedTo).toBe(testEmployee.id);
      expect(task.availableToAll).toBe(true);
    });
  });

  describe('Foreign Key Relationships', () => {
    it('should have projectId foreign key', async () => {
      const task = await db.Task.create({
        name: 'Project Task',
        projectId: testProject.id
      });

      expect(task.projectId).toBe(testProject.id);
    });
  });

  describe('Soft Delete (Paranoid)', () => {
    it('should soft delete task', async () => {
      const task = await db.Task.create({
        name: 'Deletable Task',
        projectId: testProject.id
      });

      await task.destroy();

      const foundTask = await db.Task.findByPk(task.id);
      expect(foundTask).toBeNull();

      const deletedTask = await db.Task.findByPk(task.id, { paranoid: false });
      expect(deletedTask).not.toBeNull();
      expect(deletedTask.deletedAt).not.toBeNull();
    });
  });
});
