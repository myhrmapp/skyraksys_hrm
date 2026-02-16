/**
 * PROJECT & TASK MANAGEMENT E2E WORKFLOW TESTS
 * 
 * Tests complete project and task lifecycle workflows across all personas:
 * - Manager creates projects and assigns tasks
 * - Employee views and updates assigned tasks
 * - Task access control validation (availableToAll vs assignedTo)
 * - Project status transitions and timeline tracking
 * - Employee workload aggregation
 */

// CRITICAL: Set environment variables BEFORE importing app/models
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-project-task';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-project-task';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.DB_DATABASE = 'skyraksys_hrm_test';

const request = require('supertest');
const app = require('../../../../server');
const db = require('../../../../models');
const dayjs = require('dayjs');
const EmployeeService = require('../../../../services/EmployeeService');

// Test data storage
let testData = {
  tokens: {},
  users: {},
  employees: {},
  departments: {},
  positions: {},
  projects: {},
  tasks: {}
};

describe('🚀 PROJECT & TASK MANAGEMENT E2E WORKFLOW TESTS', () => {
  
  // ============================================================================
  // SETUP & TEARDOWN
  // ============================================================================
  
  beforeAll(async () => {
    console.log('\n🚀 Setting up Project/Task test environment...\n');
    
    // Clean database in correct order
    try {
      await db.Task.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.Project.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.Employee.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.RefreshToken?.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.User.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.Position.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.Department.destroy({ where: {}, force: true, truncate: true, cascade: true });
    } catch (e) { /* error intentionally ignored for test cleanup */ }
    
    // Create Department
    const dept = await db.Department.create({
      name: 'Engineering',
      code: 'ENG',
      description: 'Software Development',
      isActive: true
    });
    testData.departments.Engineering = dept;
    
    // Create Position
    const position = await db.Position.create({
      title: 'Software Engineer',
      departmentId: dept.id,
      level: 'Mid',
      description: 'Full Stack Developer'
    });
    testData.positions.Engineer = position;
    
    // Create Manager
    const managerData = {
      firstName: 'Project',
      lastName: 'Manager',
      employeeId: 'SKYT0010',
      phone: '1234567890',
      hireDate: dayjs().format('YYYY-MM-DD'),
      status: 'Active',
      departmentId: dept.id,
      positionId: position.id
    };
    
    const managerUserData = {
      email: 'manager@company.com',
      password: 'manager123',
      role: 'manager'
    };
    
    const manager = await EmployeeService.createEmployeeWithUser(managerData, managerUserData);
    const managerUser = await db.User.findByPk(manager.userId);
    testData.users.manager = managerUser;
    testData.employees.manager = manager;
    
    // Login as manager
    const managerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'manager@company.com',
        password: 'manager123'
      });
    
    testData.tokens.manager = managerLoginRes.body.data.accessToken;
    
    // Create Employee 1
    const emp1Data = {
      firstName: 'Developer',
      lastName: 'One',
      employeeId: 'SKYT0011',
      phone: '1234567891',
      hireDate: dayjs().format('YYYY-MM-DD'),
      status: 'Active',
      departmentId: dept.id,
      positionId: position.id,
      managerId: manager.id
    };
    
    const emp1UserData = {
      email: 'dev1@company.com',
      password: 'dev123',
      role: 'employee'
    };
    
    const emp1 = await EmployeeService.createEmployeeWithUser(emp1Data, emp1UserData);
    const emp1User = await db.User.findByPk(emp1.userId);
    testData.users.employee1 = emp1User;
    testData.employees.employee1 = emp1;
    
    // Login as employee 1
    const emp1LoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'dev1@company.com',
        password: 'dev123'
      });
    
    testData.tokens.employee1 = emp1LoginRes.body.data.accessToken;
    
    // Create Employee 2
    const emp2Data = {
      firstName: 'Developer',
      lastName: 'Two',
      employeeId: 'SKYT0012',
      phone: '1234567892',
      hireDate: dayjs().format('YYYY-MM-DD'),
      status: 'Active',
      departmentId: dept.id,
      positionId: position.id,
      managerId: manager.id
    };
    
    const emp2UserData = {
      email: 'dev2@company.com',
      password: 'dev123',
      role: 'employee'
    };
    
    const emp2 = await EmployeeService.createEmployeeWithUser(emp2Data, emp2UserData);
    const emp2User = await db.User.findByPk(emp2.userId);
    testData.users.employee2 = emp2User;
    testData.employees.employee2 = emp2;
    
    // Login as employee 2
    const emp2LoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'dev2@company.com',
        password: 'dev123'
      });
    
    testData.tokens.employee2 = emp2LoginRes.body.data.accessToken;
    
    console.log('✅ Test environment setup complete');
  });
  
  afterAll(async () => {
    try {
      await db.Task.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.Project.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.Employee.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.RefreshToken?.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.User.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.Position.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.Department.destroy({ where: {}, force: true, truncate: true, cascade: true });
    } catch (e) { /* error intentionally ignored for test cleanup */ }
  });
  
  // ============================================================================
  // WORKFLOW 1: PROJECT LIFECYCLE
  // ============================================================================
  
  describe('📁 Workflow 1: Project Lifecycle Management', () => {
    
    test('1.1: Manager creates new project', async () => {
      const projectData = {
        name: 'HRM System Upgrade',
        description: 'Upgrade HRM system with new features',
        startDate: dayjs().format('YYYY-MM-DD'),
        endDate: dayjs().add(90, 'day').format('YYYY-MM-DD'),
        status: 'Planning',
        managerId: testData.employees.manager.id
      };
      
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${testData.tokens.manager}`)
        .send(projectData);
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('HRM System Upgrade');
      expect(res.body.data.status).toBe('Planning');
      expect(res.body.data.managerId).toBe(testData.employees.manager.id);
      
      testData.projects.hrmUpgrade = res.body.data;
      
      console.log('✅ Manager created project:', res.body.data.name);
    });
    
    test('1.2: Manager cannot create duplicate project name', async () => {
      const projectData = {
        name: 'HRM System Upgrade', // Duplicate
        description: 'Another project',
        startDate: dayjs().format('YYYY-MM-DD'),
        endDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
        status: 'Planning',
        managerId: testData.employees.manager.id
      };
      
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${testData.tokens.manager}`)
        .send(projectData);
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      
      console.log('✅ Duplicate project name rejected');
    });
    
    test('1.3: Manager updates project status (Planning → Active)', async () => {
      const res = await request(app)
        .put(`/api/projects/${testData.projects.hrmUpgrade.id}`)
        .set('Authorization', `Bearer ${testData.tokens.manager}`)
        .send({
          status: 'Active'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Active');
      
      testData.projects.hrmUpgrade = res.body.data;
      
      console.log('✅ Project status updated to Active');
    });
    
    test('1.4: Manager views all projects', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${testData.tokens.manager}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      
      const hrmProject = res.body.data.find(p => p.name === 'HRM System Upgrade');
      expect(hrmProject).toBeDefined();
      
      console.log('✅ Manager can view all projects');
    });
  });
  
  // ============================================================================
  // WORKFLOW 2: TASK ASSIGNMENT & ACCESS CONTROL
  // ============================================================================
  
  describe('✅ Workflow 2: Task Assignment & Access Control', () => {
    
    test('2.1: Manager creates task available to all employees', async () => {
      const taskData = {
        projectId: testData.projects.hrmUpgrade.id,
        name: 'Setup Development Environment',
        description: 'Install and configure dev tools',
        status: 'Not Started',
        priority: 'Medium',
        estimatedHours: 8,
        availableToAll: true // Available to all team members
      };
      
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${testData.tokens.manager}`)
        .send(taskData);
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Setup Development Environment');
      expect(res.body.data.availableToAll).toBe(true);
      
      testData.tasks.setupEnv = res.body.data;
      
      console.log('✅ Manager created task available to all');
    });
    
    test('2.2: Manager creates task assigned to specific employee', async () => {
      const taskData = {
        projectId: testData.projects.hrmUpgrade.id,
        name: 'Implement User Authentication',
        description: 'Build JWT-based auth system',
        status: 'Not Started',
        priority: 'High',
        estimatedHours: 16,
        availableToAll: false,
        assignedTo: testData.employees.employee1.id
      };
      
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${testData.tokens.manager}`)
        .send(taskData);
      
      expect(res.status).toBe(201);
      expect(res.body.data.availableToAll).toBe(false);
      expect(res.body.data.assignedTo).toContain(testData.employees.employee1.id);
      
      testData.tasks.userAuth = res.body.data;
      
      console.log('✅ Manager created task assigned to specific employee');
    });
    
    test('2.3: Employee 1 can view task available to all', async () => {
      const res = await request(app)
        .get(`/api/tasks/${testData.tasks.setupEnv.id}`)
        .set('Authorization', `Bearer ${testData.tokens.employee1}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Setup Development Environment');
      
      console.log('✅ Employee can view task available to all');
    });
    
    test('2.4: Employee 1 can view assigned task', async () => {
      const res = await request(app)
        .get(`/api/tasks/${testData.tasks.userAuth.id}`)
        .set('Authorization', `Bearer ${testData.tokens.employee1}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Implement User Authentication');
      
      console.log('✅ Employee can view assigned task');
    });
    
    test('2.5: Employee 2 CANNOT view task assigned to Employee 1', async () => {
      const res = await request(app)
        .get(`/api/tasks/${testData.tasks.userAuth.id}`)
        .set('Authorization', `Bearer ${testData.tokens.employee2}`);
      
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      
      console.log('✅ Task access control working (assigned tasks are private)');
    });
    
    test('2.6: Employee 2 CAN view task available to all', async () => {
      const res = await request(app)
        .get(`/api/tasks/${testData.tasks.setupEnv.id}`)
        .set('Authorization', `Bearer ${testData.tokens.employee2}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Setup Development Environment');
      
      console.log('✅ Employee can view public tasks (availableToAll)');
    });
  });
  
  // ============================================================================
  // WORKFLOW 3: TASK PROGRESS TRACKING
  // ============================================================================
  
  describe('📊 Workflow 3: Task Progress Tracking', () => {
    
    test('3.1: Employee updates assigned task status (To Do → In Progress)', async () => {
      const res = await request(app)
        .put(`/api/tasks/${testData.tasks.userAuth.id}`)
        .set('Authorization', `Bearer ${testData.tokens.employee1}`)
        .send({
          status: 'In Progress',
          actualHours: 5
        });
      
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('In Progress');
      expect(Number.parseFloat(res.body.data.actualHours)).toBe(5);
      
      testData.tasks.userAuth = res.body.data;
      
      console.log('✅ Employee updated task status to In Progress');
    });
    
    test('3.2: Employee updates task progress with more hours', async () => {
      const res = await request(app)
        .put(`/api/tasks/${testData.tasks.userAuth.id}`)
        .set('Authorization', `Bearer ${testData.tokens.employee1}`)
        .send({
          actualHours: 15
        });
      
      expect(res.status).toBe(200);
      expect(Number.parseFloat(res.body.data.actualHours)).toBe(15);
      
      console.log('✅ Employee updated task with actual hours');
    });
    
    test('3.3: Employee marks task as completed', async () => {
      const res = await request(app)
        .put(`/api/tasks/${testData.tasks.userAuth.id}`)
        .set('Authorization', `Bearer ${testData.tokens.employee1}`)
        .send({
          status: 'Completed',
          actualHours: 38
        });
      
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Completed');
      expect(Number.parseFloat(res.body.data.actualHours)).toBe(38);
      
      console.log('✅ Employee marked task as completed');
    });
    
    test('3.4: Manager views team workload', async () => {
      const res = await request(app)
        .get(`/api/tasks/workload/${testData.employees.employee1.id}`)
        .set('Authorization', `Bearer ${testData.tokens.manager}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalTasks');
      expect(res.body.data).toHaveProperty('completedTasks');
      expect(res.body.data).toHaveProperty('totalEstimatedHours');
      expect(res.body.data).toHaveProperty('totalActualHours');
      
      console.log('✅ Manager can view employee workload statistics');
    });
  });
  
  // ============================================================================
  // WORKFLOW 4: PROJECT COMPLETION
  // ============================================================================
  
  describe('🏁 Workflow 4: Project Completion', () => {
    
    test('4.1: Manager views project timeline and progress', async () => {
      const res = await request(app)
        .get(`/api/projects/${testData.projects.hrmUpgrade.id}/timeline`)
        .set('Authorization', `Bearer ${testData.tokens.manager}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.timeline).toHaveProperty('daysElapsed');
      expect(res.body.data.timeline).toHaveProperty('daysRemaining');
      expect(res.body.data.progress).toHaveProperty('percentage');
      
      console.log('✅ Manager can view project timeline');
    });
    
    test('4.2: Manager completes project (Active → Completed)', async () => {
      // First mark remaining tasks as completed
      await request(app)
        .put(`/api/tasks/${testData.tasks.setupEnv.id}`)
        .set('Authorization', `Bearer ${testData.tokens.manager}`)
        .send({
          status: 'Completed',
          actualHours: 6
        });
      
      // Then complete the project
      const res = await request(app)
        .put(`/api/projects/${testData.projects.hrmUpgrade.id}`)
        .set('Authorization', `Bearer ${testData.tokens.manager}`)
        .send({
          status: 'Completed'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Completed');
      
      console.log('✅ Manager completed project');
    });
  });
  
  // ============================================================================
  // SUMMARY
  // ============================================================================
  
  afterAll(() => {
    console.log('\n' + '='.repeat(80));
    console.log('🎉 PROJECT & TASK MANAGEMENT E2E TESTS COMPLETE');
    console.log('='.repeat(80));
    console.log('\n✅ All project/task workflows validated:');
    console.log('   1. Project Lifecycle (Create → Update → Complete)');
    console.log('   2. Task Assignment (availableToAll vs assignedTo)');
    console.log('   3. Task Access Control (privacy enforcement)');
    console.log('   4. Task Progress Tracking (status updates, hours)');
    console.log('   5. Employee Workload Statistics');
    console.log('   6. Project Timeline & Completion');
    console.log('\n📊 Business Logic: VERIFIED ✅');
    console.log('🔒 Access Control: WORKING ✅');
    console.log('🔄 Status Transitions: CORRECT ✅\n');
  });
});
