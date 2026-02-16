const db = require('../../../models');
const TaskService = require('../../../services/task/TaskService');
const { Project, Task, Employee, User, Department, Position, Timesheet } = db;

describe('TaskService', () => {
  let testProject;
  let testManager;
  let testEmployee1;
  let testEmployee2;
  let testUser1;
  let testUser2;
  let testDepartment;
  let testPosition;

  afterAll(async () => {
    try {
      await Timesheet.destroy({ where: {}, force: true });
      await Task.destroy({ where: {}, force: true });
      await Project.destroy({ where: {}, force: true });
      await Employee.destroy({ where: {}, force: true, paranoid: false });
      await User.destroy({ where: {}, force: true });
      await Department.destroy({ where: {}, force: true });
      await Position.destroy({ where: {}, force: true });
    } catch (error) {
      /* error intentionally ignored for test cleanup */
    }
    await db.sequelize.close();
  });

  beforeEach(async () => {
    try {
      await Timesheet.destroy({ where: {}, force: true });
      await Task.destroy({ where: {}, force: true });
      await Project.destroy({ where: {}, force: true });
      await Employee.destroy({ where: {}, force: true, paranoid: false });
      await User.destroy({ where: {}, force: true });
      await Department.destroy({ where: {}, force: true });
      await Position.destroy({ where: {}, force: true });
    } catch (error) {
      /* error intentionally ignored for test cleanup */
    }

    // Create test department and position
    testDepartment = await Department.create({
      name: 'Engineering',
      description: 'Tech team',
      isActive: true
    });

    testPosition = await Position.create({
      title: 'Developer',
      description: 'Software developer',
      level: 'Mid',
      departmentId: testDepartment.id,
      isActive: true
    });

    // Create test users and employees
    testUser1 = await User.create({
      email: 'employee1@test.com',
      password: 'hashedpassword',
      role: 'employee',
      firstName: 'Employee',
      lastName: 'One',
      isActive: true
    });

    testEmployee1 = await Employee.create({
      userId: testUser1.id,
      employeeId: 'SKYT0001',
      firstName: 'Employee',
      lastName: 'One',
      email: 'employee1@test.com',
      departmentId: testDepartment.id,
      positionId: testPosition.id,
      hireDate: new Date(),
      status: 'Active'
    });

    testUser2 = await User.create({
      email: 'employee2@test.com',
      password: 'hashedpassword',
      role: 'employee',
      firstName: 'Employee',
      lastName: 'Two',
      isActive: true
    });

    testEmployee2 = await Employee.create({
      userId: testUser2.id,
      employeeId: 'SKYT0002',
      firstName: 'Employee',
      lastName: 'Two',
      email: 'employee2@test.com',
      departmentId: testDepartment.id,
      positionId: testPosition.id,
      hireDate: new Date(),
      status: 'Active'
    });

    const managerUser = await User.create({
      email: 'manager@test.com',
      password: 'hashedpassword',
      role: 'manager',
      firstName: 'Test',
      lastName: 'Manager',
      isActive: true
    });

    testManager = await Employee.create({
      userId: managerUser.id,
      employeeId: 'SKYT0003',
      firstName: 'Test',
      lastName: 'Manager',
      email: 'manager@test.com',
      departmentId: testDepartment.id,
      positionId: testPosition.id,
      hireDate: new Date(),
      status: 'Active'
    });

    // Create test project
    testProject = await Project.create({
      name: 'Test Project',
      status: 'Active',
      startDate: new Date(),
      managerId: testManager.id
    });
  });

  describe('Task Access Control', () => {
    test('should allow admin to access any task', async () => {
      const task = await Task.create({
        projectId: testProject.id,
        name: 'Admin Test Task',
        status: 'Not Started',
        availableToAll: false,
        assignedTo: testEmployee1.id
      });

      const canAccess = await TaskService.canAccessTask(task.id, testUser2.id, 'admin');
      expect(canAccess).toBe(true);
    });

    test('should allow manager to access any task', async () => {
      const task = await Task.create({
        projectId: testProject.id,
        name: 'Manager Test Task',
        status: 'Not Started',
        availableToAll: false,
        assignedTo: testEmployee1.id
      });

      const canAccess = await TaskService.canAccessTask(task.id, testUser2.id, 'manager');
      expect(canAccess).toBe(true);
    });

    test('should allow employee to access task available to all', async () => {
      const task = await Task.create({
        projectId: testProject.id,
        name: 'Public Task',
        status: 'Not Started',
        availableToAll: true
      });

      const canAccess = await TaskService.canAccessTask(task.id, testUser2.id, 'employee');
      expect(canAccess).toBe(true);
    });

    test('should allow employee to access assigned task', async () => {
      const task = await Task.create({
        projectId: testProject.id,
        name: 'Assigned Task',
        status: 'Not Started',
        availableToAll: false,
        assignedTo: testEmployee1.id
      });

      const canAccess = await TaskService.canAccessTask(task.id, testUser1.id, 'employee');
      expect(canAccess).toBe(true);
    });

    test('should deny employee access to task assigned to others', async () => {
      const task = await Task.create({
        projectId: testProject.id,
        name: 'Other Task',
        status: 'Not Started',
        availableToAll: false,
        assignedTo: testEmployee1.id
      });

      const canAccess = await TaskService.canAccessTask(task.id, testUser2.id, 'employee');
      expect(canAccess).toBe(false);
    });
  });

  describe('Task Retrieval with Filtering', () => {
    test('should retrieve all tasks for admin', async () => {
      await Task.create({ projectId: testProject.id, name: 'Task1', status: 'Not Started', availableToAll: true });
      await Task.create({ projectId: testProject.id, name: 'Task2', status: 'Not Started', availableToAll: false, assignedTo: testEmployee1.id });

      const tasks = await TaskService.getTasks({}, testUser1.id, 'admin');
      expect(tasks.length).toBe(2);
    });

    test('should filter tasks by project', async () => {
      const project2 = await Project.create({ name: 'Project 2', status: 'Active', startDate: new Date(), managerId: testManager.id });
      
      await Task.create({ projectId: testProject.id, name: 'Task1', status: 'Not Started', availableToAll: true });
      await Task.create({ projectId: project2.id, name: 'Task2', status: 'Not Started', availableToAll: true });

      const tasks = await TaskService.getTasks({ projectId: testProject.id }, testUser1.id, 'admin');
      expect(tasks.length).toBe(1);
      expect(tasks[0].name).toBe('Task1');
    });

    test('should filter tasks by status', async () => {
      await Task.create({ projectId: testProject.id, name: 'Task1', status: 'Not Started', availableToAll: true });
      await Task.create({ projectId: testProject.id, name: 'Task2', status: 'In Progress', availableToAll: true });

      const tasks = await TaskService.getTasks({ status: 'In Progress' }, testUser1.id, 'admin');
      expect(tasks.length).toBe(1);
      expect(tasks[0].status).toBe('In Progress');
    });

    test('should retrieve only accessible tasks for employee', async () => {
      await Task.create({ projectId: testProject.id, name: 'Public', status: 'Not Started', availableToAll: true });
      await Task.create({ projectId: testProject.id, name: 'Assigned', status: 'Not Started', availableToAll: false, assignedTo: testEmployee1.id });
      await Task.create({ projectId: testProject.id, name: 'Other', status: 'Not Started', availableToAll: false, assignedTo: testEmployee2.id });

      const tasks = await TaskService.getTasks({}, testUser1.id, 'employee');
      expect(tasks.length).toBe(2); // Public + Assigned
    });
  });

  describe('Task Creation Validation', () => {
    test('should validate project exists', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000';
      const taskData = {
        projectId: fakeProjectId,
        name: 'Invalid Task',
        status: 'Not Started'
      };

      await expect(TaskService.validateTaskCreation(taskData)).rejects.toThrow('Project not found');
    });

    test('should validate assignee exists and is active', async () => {
      const fakeEmployeeId = '00000000-0000-0000-0000-000000000000';
      const taskData = {
        projectId: testProject.id,
        name: 'Task',
        assignedTo: fakeEmployeeId,
        availableToAll: false
      };

      await expect(TaskService.validateTaskCreation(taskData)).rejects.toThrow('Assignee not found');
    });

    test('should reject inactive assignee', async () => {
      await testEmployee1.update({ status: 'Terminated' });
      
      const taskData = {
        projectId: testProject.id,
        name: 'Task',
        assignedTo: testEmployee1.id,
        availableToAll: false
      };

      await expect(TaskService.validateTaskCreation(taskData)).rejects.toThrow('Cannot assign to inactive employee');
    });
  });

  describe('Task Creation', () => {
    test('should create task with valid data', async () => {
      const taskData = {
        projectId: testProject.id,
        name: 'New Task',
        description: 'Test description',
        status: 'Not Started',
        priority: 'High',
        availableToAll: true,
        estimatedHours: 10
      };

      const task = await TaskService.createTask(taskData);
      expect(task.name).toBe('New Task');
      expect(task.status).toBe('Not Started');
    });

    test('should reject duplicate task name in same project', async () => {
      const taskData = {
        projectId: testProject.id,
        name: 'Duplicate Task',
        status: 'Not Started',
        availableToAll: true
      };

      await TaskService.createTask(taskData);
      await expect(TaskService.createTask(taskData))
        .rejects.toThrow('Task with this name already exists in project');
    });
  });

  describe('Task Statistics', () => {
    test('should calculate statistics correctly', async () => {
      await Task.create({ projectId: testProject.id, name: 'T1', status: 'Not Started', priority: 'High', availableToAll: true });
      await Task.create({ projectId: testProject.id, name: 'T2', status: 'In Progress', priority: 'Medium', availableToAll: true });
      await Task.create({ projectId: testProject.id, name: 'T3', status: 'In Progress', priority: 'Low', availableToAll: false, assignedTo: testEmployee1.id });
      await Task.create({ projectId: testProject.id, name: 'T4', status: 'Completed', priority: 'High', availableToAll: true });

      const stats = await TaskService.getTaskStatistics({ projectId: testProject.id });
      expect(stats.total).toBe(4);
      expect(stats.byStatus.inProgress).toBe(2);
      expect(stats.byPriority.high).toBe(2);
      expect(stats.availableToAll).toBe(3);
    });
  });

  describe('Employee Workload', () => {
    test('should calculate employee workload correctly', async () => {
      await Task.create({ 
        projectId: testProject.id, 
        name: 'T1', 
        status: 'In Progress', 
        availableToAll: false, 
        assignedTo: testEmployee1.id,
        estimatedHours: 10,
        actualHours: 5
      });

      await Task.create({ 
        projectId: testProject.id, 
        name: 'T2', 
        status: 'Not Started', 
        availableToAll: false, 
        assignedTo: testEmployee1.id,
        estimatedHours: 8,
        actualHours: 0
      });

      const workload = await TaskService.getEmployeeWorkload(testEmployee1.id);
      expect(workload.totalTasks).toBe(2);
      expect(workload.estimatedHours.total).toBe(18);
      expect(workload.actualHours.total).toBe(5);
    });
  });

  describe('Bulk Operations', () => {
    test('should bulk assign tasks to employee', async () => {
      const t1 = await Task.create({ projectId: testProject.id, name: 'BulkT1', status: 'Not Started', availableToAll: true });
      const t2 = await Task.create({ projectId: testProject.id, name: 'BulkT2', status: 'Not Started', availableToAll: true });

      const result = await TaskService.bulkAssignTasks([t1.id, t2.id], testEmployee1.id);
      expect(result.success.length).toBe(2);
      expect(result.failed.length).toBe(0);
    });

    test('should handle partial failures in bulk assign', async () => {
      const t1 = await Task.create({ projectId: testProject.id, name: 'BulkT3', status: 'Not Started', availableToAll: true });
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const result = await TaskService.bulkAssignTasks([t1.id, fakeId], testEmployee1.id);
      expect(result.success.length).toBe(1);
      expect(result.failed.length).toBe(1);
    });
  });

  describe('Task Deletion', () => {
    test('should prevent deletion of task with timesheets', async () => {
      const task = await Task.create({
        projectId: testProject.id,
        name: 'Task with Timesheet',
        status: 'In Progress',
        availableToAll: true
      });

      const monday = new Date('2026-02-02'); // A Monday
      const sunday = new Date('2026-02-08'); // Following Sunday
      await Timesheet.create({
        employeeId: testEmployee1.id,
        projectId: testProject.id,
        taskId: task.id,
        weekStartDate: monday,
        weekEndDate: sunday,
        weekNumber: 6,
        year: 2026,
        totalHoursWorked: 8,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        status: 'Draft'
      });

      const result = await TaskService.canDelete(task.id);
      expect(result.canDelete).toBe(false);
      expect(result.reason).toContain('timesheet');
    });

    test('should allow deletion of task without timesheets', async () => {
      const task = await Task.create({
        projectId: testProject.id,
        name: 'Empty Task',
        status: 'Not Started',
        availableToAll: true
      });

      const result = await TaskService.canDelete(task.id);
      expect(result.canDelete).toBe(true);
      expect(result.reason).toBeNull();
    });
  });
});
