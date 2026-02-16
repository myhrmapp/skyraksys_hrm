// E2E Test: Timesheet Workflow
// Framework: Playwright/Cypress compatible syntax
// Test entire flow from employee submission to manager approval

describe('Timesheet E2E Workflow', () => {
  let testEmployee, testManager, testAdmin;
  let employeeToken, managerToken, adminToken;
  
  beforeAll(async () => {
    // Setup test users
    testEmployee = await createTestUser('employee');
    testManager = await createTestUser('manager');
    testAdmin = await createTestUser('admin');
    
    employeeToken = await loginUser(testEmployee);
    managerToken = await loginUser(testManager);
    adminToken = await loginUser(testAdmin);
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestUsers();
  });

  describe('Employee Timesheet Submission', () => {
    it('should allow employee to create and submit timesheet', async () => {
      // Navigate to timesheet page
      await page.goto('/timesheets/create');
      await page.waitForSelector('[data-testid="timesheet-form"]');
      
      // Select week
      await page.click('[data-testid="week-selector"]');
      const currentWeek = await getCurrentWeek();
      await page.click(`[data-week="${currentWeek}"]`);
      
      // Add daily entries
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      for (const day of days) {
        await page.fill(`[data-testid="hours-${day}"]`, '8');
        await page.fill(`[data-testid="description-${day}"]`, `Work done on ${day}`);
      }
      
      // Save as draft first
      await page.click('[data-testid="save-draft-btn"]');
      await page.waitForSelector('[data-testid="success-message"]');
      expect(await page.textContent('[data-testid="success-message"]')).toContain('saved');
      
      // Submit timesheet
      await page.click('[data-testid="submit-btn"]');
      await page.waitForSelector('[data-testid="confirm-dialog"]');
      await page.click('[data-testid="confirm-submit"]');
      
      // Verify submission
      await page.waitForSelector('[data-testid="success-message"]');
      expect(await page.textContent('[data-testid="success-message"]')).toContain('submitted');
      
      // Verify redirect to history
      await page.waitForURL('**/timesheets/history');
      const status = await page.textContent('[data-testid="timesheet-status"]');
      expect(status).toContain('Pending');
    });
  });

  describe('Manager Timesheet Approval', () => {
    it('should allow manager to approve timesheet', async () => {
      // Login as manager
      await loginAs(testManager);
      await page.goto('/timesheets/pending');
      
      // Wait for pending list
      await page.waitForSelector('[data-testid="pending-timesheets"]');
      
      // Click first pending timesheet
      await page.click('[data-testid="timesheet-item"]:first-child');
      await page.waitForSelector('[data-testid="timesheet-detail"]');
      
      // Review details
      const totalHours = await page.textContent('[data-testid="total-hours"]');
      expect(totalHours).toBe('40');
      
      // Approve timesheet
      await page.click('[data-testid="approve-btn"]');
      await page.waitForSelector('[data-testid="approval-dialog"]');
      await page.fill('[data-testid="approval-comments"]', 'Approved for this week');
      await page.click('[data-testid="confirm-approval"]');
      
      // Verify approval
      await page.waitForSelector('[data-testid="success-message"]');
      expect(await page.textContent('[data-testid="success-message"]')).toContain('approved');
      
      // Verify status updated
      const updatedStatus = await page.textContent('[data-testid="status-badge"]');
      expect(updatedStatus).toContain('Approved');
    });
  });

  describe('Employee View History', () => {
    it('should display approved timesheet in history', async () => {
      // Login as employee
      await loginAs(testEmployee);
      await page.goto('/timesheets/history');
      
      // Wait for history list
      await page.waitForSelector('[data-testid="timesheet-history"]');
      
      // Find approved timesheet
      const approvedTimesheet = await page.locator('[data-status="Approved"]').first();
      expect(approvedTimesheet).toBeTruthy();
      
      // Click to view details
      await approvedTimesheet.click();
      await page.waitForSelector('[data-testid="timesheet-detail"]');
      
      // Verify details
      const status = await page.textContent('[data-testid="status-badge"]');
      expect(status).toContain('Approved');
      
      const approverName = await page.textContent('[data-testid="approver-name"]');
      expect(approverName).toContain(testManager.name);
    });
  });

  describe('Edge Cases', () => {
    it('should prevent submitting duplicate week', async () => {
      await loginAs(testEmployee);
      await page.goto('/timesheets/create');
      
      // Try to select same week again
      await page.click('[data-testid="week-selector"]');
      const existingWeek = await page.locator('[data-week][data-submitted="true"]').first();
      
      // Click should be disabled or show warning
      await existingWeek.click();
      await page.waitForSelector('[data-testid="error-message"]');
      expect(await page.textContent('[data-testid="error-message"]')).toContain('already submitted');
    });

    it('should not allow editing after approval attempt', async () => {
      await loginAs(testEmployee);
      await page.goto('/timesheets/history');
      
      // Find approved timesheet
      await page.click('[data-status="Approved"]:first-child');
      await page.waitForSelector('[data-testid="timesheet-detail"]');
      
      // Edit button should be disabled or hidden
      const editButton = await page.locator('[data-testid="edit-btn"]');
      if (editButton) {
        expect(await editButton.isDisabled()).toBe(true);
      } else {
        expect(await page.locator('[data-testid="edit-btn"]').count()).toBe(0);
      }
    });

    it('should support bulk approval operations', async () => {
      await loginAs(testManager);
      await page.goto('/timesheets/pending');
      
      // Select multiple timesheets
      await page.click('[data-testid="select-all-checkbox"]');
      
      // Click bulk approve
      await page.click('[data-testid="bulk-approve-btn"]');
      await page.waitForSelector('[data-testid="bulk-action-dialog"]');
      
      // Confirm bulk approval
      await page.fill('[data-testid="bulk-comments"]', 'Batch approval for the week');
      await page.click('[data-testid="confirm-bulk-action"]');
      
      // Verify success
      await page.waitForSelector('[data-testid="success-message"]');
      expect(await page.textContent('[data-testid="success-message"]')).toContain('approved');
    });
  });
});

// Helper functions
async function createTestUser(role) {
  // Implementation depends on your test setup
  return { id: 1, name: `Test ${role}`, email: `${role}@test.com`, role };
}

async function loginUser(user) {
  // Implementation for getting auth token
  return 'test-token-' + user.id;
}

async function loginAs(user) {
  // Implementation for logging in as specific user
  await page.goto('/login');
  await page.fill('[name="email"]', user.email);
  await page.fill('[name="password"]', 'testPassword123');
  await page.click('[type="submit"]');
  await page.waitForURL('**/dashboard');
}

async function getCurrentWeek() {
  const today = new Date();
  const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
  return startOfWeek.toISOString().split('T')[0];
}

async function cleanupTestUsers() {
  // Cleanup implementation
}
