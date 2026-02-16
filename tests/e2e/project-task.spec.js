// E2E Test: Project and Task Management Workflow
// Framework: Playwright/Cypress compatible syntax
// Test complete project lifecycle from creation to task completion

describe('Project and Task Management E2E Workflow', () => {
  let testAdmin, testManager, testEmployee;
  let adminToken, managerToken, employeeToken;
  let createdProjectId;
  
  beforeAll(async () => {
    // Setup test users
    testAdmin = await createTestUser('admin');
    testManager = await createTestUser('manager');
    testEmployee = await createTestUser('employee');
    
    adminToken = await loginUser(testAdmin);
    managerToken = await loginUser(testManager);
    employeeToken = await loginUser(testEmployee);
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  describe('Admin Create Project', () => {
    it('should allow admin to create a new project', async () => {
      await loginAs(testAdmin);
      await page.goto('/projects');
      
      // Click create project button
      await page.click('[data-testid="create-project-btn"]');
      await page.waitForSelector('[data-testid="project-form"]');
      
      // Fill project details
      const projectName = `Test Project ${Date.now()}`;
      await page.fill('[data-testid="project-name"]', projectName);
      await page.fill('[data-testid="project-code"]', `PRJ-${Date.now()}`);
      await page.fill('[data-testid="project-description"]', 
        'E2E test project for task management testing');
      
      // Set client information
      await page.fill('[data-testid="client-name"]', 'Test Client Corp');
      
      // Set dates
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await page.fill('[data-testid="start-date"]', startDate);
      await page.fill('[data-testid="end-date"]', endDate);
      
      // Set budget
      await page.fill('[data-testid="budget"]', '50000');
      
      // Select status
      await page.selectOption('[data-testid="status"]', { value: 'Planning' });
      
      // Assign project manager
      await page.click('[data-testid="manager-select"]');
      await page.fill('[data-testid="manager-search"]', testManager.name);
      await page.click(`[data-manager-id="${testManager.id}"]`);
      
      // Save project
      await page.click('[data-testid="save-project-btn"]');
      await page.waitForSelector('[data-testid="success-message"]');
      expect(await page.textContent('[data-testid="success-message"]')).toContain('created');
      
      // Capture project ID for later tests
      const url = page.url();
      createdProjectId = url.match(/projects\/(\d+)/)?.[1];
      expect(createdProjectId).toBeTruthy();
      
      // Verify project details displayed
      expect(await page.textContent('[data-testid="project-name"]')).toContain(projectName);
      expect(await page.textContent('[data-testid="status-badge"]')).toContain('Planning');
    });
  });

  describe('Admin Add Tasks', () => {
    it('should allow admin to add multiple tasks to project', async () => {
      await loginAs(testAdmin);
      await page.goto(`/projects/${createdProjectId}`);
      
      // Navigate to tasks tab
      await page.click('[data-testid="tasks-tab"]');
      await page.waitForSelector('[data-testid="tasks-section"]');
      
      // Create first task
      await page.click('[data-testid="add-task-btn"]');
      await page.waitForSelector('[data-testid="task-form"]');
      
      await page.fill('[data-testid="task-name"]', 'Setup Development Environment');
      await page.fill('[data-testid="task-description"]', 'Configure development tools and dependencies');
      await page.selectOption('[data-testid="priority"]', { value: 'High' });
      await page.fill('[data-testid="estimated-hours"]', '8');
      
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await page.fill('[data-testid="due-date"]', dueDate);
      
      // Assign to employee
      await page.click('[data-testid="assignee-select"]');
      await page.click(`[data-employee-id="${testEmployee.id}"]`);
      
      await page.click('[data-testid="save-task-btn"]');
      await page.waitForSelector('[data-testid="success-message"]');
      
      // Create second task
      await page.click('[data-testid="add-task-btn"]');
      await page.waitForSelector('[data-testid="task-form"]');
      
      await page.fill('[data-testid="task-name"]', 'Design Database Schema');
      await page.fill('[data-testid="task-description"]', 'Create ERD and database structure');
      await page.selectOption('[data-testid="priority"]', { value: 'Medium' });
      await page.fill('[data-testid="estimated-hours"]', '16');
      
      const dueDate2 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await page.fill('[data-testid="due-date"]', dueDate2);
      
      await page.click('[data-testid="assignee-select"]');
      await page.click(`[data-employee-id="${testEmployee.id}"]`);
      
      await page.click('[data-testid="save-task-btn"]');
      await page.waitForSelector('[data-testid="success-message"]');
      
      // Verify tasks in list
      const taskCount = await page.locator('[data-testid="task-item"]').count();
      expect(taskCount).toBeGreaterThanOrEqual(2);
      
      // Verify task details
      const firstTask = await page.locator('[data-testid="task-item"]').first();
      expect(await firstTask.textContent()).toContain('Setup Development Environment');
      expect(await firstTask.locator('[data-testid="assignee-name"]').textContent()).toContain(testEmployee.name);
    });
  });

  describe('Employee View Assigned Tasks', () => {
    it('should allow employee to view their assigned tasks', async () => {
      await loginAs(testEmployee);
      await page.goto('/my-tasks');
      
      // Wait for tasks list
      await page.waitForSelector('[data-testid="my-tasks-list"]');
      
      // Verify assigned tasks visible
      const taskCount = await page.locator('[data-testid="task-card"]').count();
      expect(taskCount).toBeGreaterThan(0);
      
      // Click task to view details
      await page.click('[data-testid="task-card"]:first-child');
      await page.waitForSelector('[data-testid="task-detail"]');
      
      // Verify task information
      expect(await page.locator('[data-testid="task-name"]')).toBeTruthy();
      expect(await page.locator('[data-testid="task-description"]')).toBeTruthy();
      expect(await page.locator('[data-testid="project-name"]')).toBeTruthy();
      expect(await page.locator('[data-testid="due-date"]')).toBeTruthy();
      expect(await page.locator('[data-testid="priority-badge"]')).toBeTruthy();
      
      // Check status is 'Not Started'
      const status = await page.textContent('[data-testid="status-badge"]');
      expect(status).toContain('Not Started');
      
      // Navigate to project from task
      await page.click('[data-testid="view-project-link"]');
      await page.waitForURL(`**/projects/${createdProjectId}`);
      expect(page.url()).toContain(`projects/${createdProjectId}`);
    });
  });

  describe('Employee Update Task Status', () => {
    it('should allow employee to update task status and progress', async () => {
      await loginAs(testEmployee);
      await page.goto('/my-tasks');
      
      // Click first task
      await page.click('[data-testid="task-card"]:first-child');
      await page.waitForSelector('[data-testid="task-detail"]');
      
      // Start task
      await page.click('[data-testid="start-task-btn"]');
      await page.waitForSelector('[data-testid="confirm-dialog"]');
      await page.click('[data-testid="confirm-start"]');
      
      // Verify status changed to 'In Progress'
      await page.waitForSelector('[data-testid="success-message"]');
      const status = await page.textContent('[data-testid="status-badge"]');
      expect(status).toContain('In Progress');
      
      // Update progress
      await page.click('[data-testid="update-progress-btn"]');
      await page.waitForSelector('[data-testid="progress-form"]');
      
      await page.fill('[data-testid="progress-percentage"]', '50');
      await page.fill('[data-testid="actual-hours"]', '4');
      await page.fill('[data-testid="progress-notes"]', 'Environment setup completed. Starting database design.');
      
      await page.click('[data-testid="save-progress-btn"]');
      await page.waitForSelector('[data-testid="success-message"]');
      
      // Verify progress bar updated
      const progressBar = await page.locator('[data-testid="progress-bar"]');
      const progressValue = await progressBar.getAttribute('aria-valuenow');
      expect(progressValue).toBe('50');
      
      // Complete task
      await page.click('[data-testid="complete-task-btn"]');
      await page.waitForSelector('[data-testid="complete-dialog"]');
      
      await page.fill('[data-testid="completion-notes"]', 'Task completed successfully. All requirements met.');
      await page.fill('[data-testid="final-hours"]', '8');
      await page.click('[data-testid="confirm-complete"]');
      
      // Verify task completed
      await page.waitForSelector('[data-testid="success-message"]');
      const finalStatus = await page.textContent('[data-testid="status-badge"]');
      expect(finalStatus).toContain('Completed');
      
      // Verify completion timestamp
      expect(await page.locator('[data-testid="completed-at"]')).toBeTruthy();
    });
  });

  describe('Manager Track Project Progress', () => {
    it('should allow manager to view overall project progress', async () => {
      await loginAs(testManager);
      await page.goto(`/projects/${createdProjectId}`);
      
      // Wait for project dashboard
      await page.waitForSelector('[data-testid="project-dashboard"]');
      
      // Verify project statistics
      expect(await page.locator('[data-testid="total-tasks"]')).toBeTruthy();
      expect(await page.locator('[data-testid="completed-tasks"]')).toBeTruthy();
      expect(await page.locator('[data-testid="pending-tasks"]')).toBeTruthy();
      expect(await page.locator('[data-testid="overall-progress"]')).toBeTruthy();
      
      // View tasks by status
      await page.click('[data-testid="tasks-tab"]');
      await page.waitForSelector('[data-testid="tasks-kanban"]');
      
      // Verify kanban columns
      expect(await page.locator('[data-testid="column-not-started"]')).toBeTruthy();
      expect(await page.locator('[data-testid="column-in-progress"]')).toBeTruthy();
      expect(await page.locator('[data-testid="column-completed"]')).toBeTruthy();
      
      // View Gantt chart
      await page.click('[data-testid="gantt-view-btn"]');
      await page.waitForSelector('[data-testid="gantt-chart"]');
      expect(await page.locator('[data-testid="gantt-chart"]').isVisible()).toBe(true);
      
      // Check team workload
      await page.click('[data-testid="team-tab"]');
      await page.waitForSelector('[data-testid="team-workload"]');
      
      const teamMembers = await page.locator('[data-testid="team-member"]');
      expect(await teamMembers.count()).toBeGreaterThan(0);
      
      // View task assignments
      const firstMember = teamMembers.first();
      const assignedTasks = await firstMember.locator('[data-testid="assigned-tasks-count"]').textContent();
      expect(assignedTasks).toBeTruthy();
      
      // Update project status to Active
      await page.click('[data-testid="project-settings-btn"]');
      await page.selectOption('[data-testid="project-status"]', { value: 'Active' });
      await page.click('[data-testid="save-settings-btn"]');
      
      await page.waitForSelector('[data-testid="success-message"]');
      expect(await page.textContent('[data-testid="status-badge"]')).toContain('Active');
    });
  });
});

// Helper functions
async function createTestUser(role) {
  return { 
    id: Math.floor(Math.random() * 1000), 
    name: `Test ${role}`, 
    email: `${role}@test.com`, 
    role 
  };
}

async function loginUser(user) {
  return 'test-token-' + user.id;
}

async function loginAs(user) {
  await page.goto('/login');
  await page.fill('[name="email"]', user.email);
  await page.fill('[name="password"]', 'testPassword123');
  await page.click('[type="submit"]');
  await page.waitForURL('**/dashboard');
}

async function cleanupTestUsers() {
  // Cleanup implementation
}
