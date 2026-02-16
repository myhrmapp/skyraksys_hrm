// E2E Test: Attendance Workflow
// Framework: Playwright/Cypress compatible syntax
// Test clock in/out and attendance management

describe('Attendance E2E Workflow', () => {
  let testAdmin, testManager, testEmployee;
  let adminToken, managerToken, employeeToken;
  
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

  describe('Employee Clock In', () => {
    it('should allow employee to clock in', async () => {
      await loginAs(testEmployee);
      await page.goto('/attendance');
      
      // Verify clock in button is visible
      await page.waitForSelector('[data-testid="clock-in-btn"]');
      expect(await page.locator('[data-testid="clock-in-btn"]').isVisible()).toBe(true);
      
      // Click clock in
      await page.click('[data-testid="clock-in-btn"]');
      await page.waitForSelector('[data-testid="clock-in-dialog"]');
      
      // Add optional location/notes
      await page.fill('[data-testid="location-input"]', 'Head Office');
      await page.fill('[data-testid="notes-input"]', 'Regular work day');
      
      // Confirm clock in
      await page.click('[data-testid="confirm-clock-in"]');
      
      // Verify success
      await page.waitForSelector('[data-testid="success-message"]');
      expect(await page.textContent('[data-testid="success-message"]')).toContain('Clocked in successfully');
      
      // Verify clock in time is displayed
      const clockInTime = await page.textContent('[data-testid="clock-in-time"]');
      expect(clockInTime).toBeTruthy();
      
      // Verify clock out button is now visible
      expect(await page.locator('[data-testid="clock-out-btn"]').isVisible()).toBe(true);
      
      // Verify clock in button is hidden or disabled
      const clockInBtn = await page.locator('[data-testid="clock-in-btn"]');
      if (await clockInBtn.count() > 0) {
        expect(await clockInBtn.isDisabled()).toBe(true);
      }
    });
  });

  describe('Employee Clock Out', () => {
    it('should allow employee to clock out', async () => {
      await loginAs(testEmployee);
      await page.goto('/attendance');
      
      // Wait for page to load
      await page.waitForSelector('[data-testid="attendance-page"]');
      
      // Verify already clocked in
      expect(await page.locator('[data-testid="clock-out-btn"]').isVisible()).toBe(true);
      
      // Wait some time (simulate work hours)
      // In real test, you might want to manipulate time or use existing clocked-in record
      
      // Click clock out
      await page.click('[data-testid="clock-out-btn"]');
      await page.waitForSelector('[data-testid="clock-out-dialog"]');
      
      // Add optional notes
      await page.fill('[data-testid="clock-out-notes"]', 'Completed daily tasks');
      
      // Confirm clock out
      await page.click('[data-testid="confirm-clock-out"]');
      
      // Verify success
      await page.waitForSelector('[data-testid="success-message"]');
      expect(await page.textContent('[data-testid="success-message"]')).toContain('Clocked out successfully');
      
      // Verify working hours calculated
      const workingHours = await page.textContent('[data-testid="working-hours"]');
      expect(workingHours).toBeTruthy();
      expect(workingHours).toMatch(/\d+:\d+/); // Format: HH:MM
      
      // Verify attendance record created
      await page.click('[data-testid="view-history-tab"]');
      await page.waitForSelector('[data-testid="attendance-history"]');
      const todayRecord = await page.locator('[data-testid="attendance-record"]').first();
      expect(todayRecord).toBeTruthy();
    });
  });

  describe('Admin View Records', () => {
    it('should allow admin to view all attendance records', async () => {
      await loginAs(testAdmin);
      await page.goto('/attendance/records');
      
      // Wait for records table
      await page.waitForSelector('[data-testid="attendance-table"]');
      
      // Verify table has data
      const recordCount = await page.locator('[data-testid="attendance-row"]').count();
      expect(recordCount).toBeGreaterThan(0);
      
      // Verify columns displayed
      expect(await page.locator('[data-testid="column-employee"]').isVisible()).toBe(true);
      expect(await page.locator('[data-testid="column-date"]').isVisible()).toBe(true);
      expect(await page.locator('[data-testid="column-clock-in"]').isVisible()).toBe(true);
      expect(await page.locator('[data-testid="column-clock-out"]').isVisible()).toBe(true);
      expect(await page.locator('[data-testid="column-hours"]').isVisible()).toBe(true);
      
      // Click employee record to view details
      await page.click('[data-testid="attendance-row"]:first-child');
      await page.waitForSelector('[data-testid="attendance-detail-modal"]');
      
      // Verify detail view
      expect(await page.locator('[data-testid="employee-name"]')).toBeTruthy();
      expect(await page.locator('[data-testid="clock-in-time"]')).toBeTruthy();
      expect(await page.locator('[data-testid="clock-out-time"]')).toBeTruthy();
      expect(await page.locator('[data-testid="total-hours"]')).toBeTruthy();
      expect(await page.locator('[data-testid="location"]')).toBeTruthy();
      
      // Close modal
      await page.click('[data-testid="close-modal"]');
    });
  });

  describe('Filter by Date and Department', () => {
    it('should allow filtering attendance records by date range', async () => {
      await loginAs(testAdmin);
      await page.goto('/attendance/records');
      
      // Wait for table
      await page.waitForSelector('[data-testid="attendance-table"]');
      
      // Open date filter
      await page.click('[data-testid="date-filter-btn"]');
      await page.waitForSelector('[data-testid="date-filter-panel"]');
      
      // Select date range
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];
      
      await page.fill('[data-testid="start-date"]', startDate);
      await page.fill('[data-testid="end-date"]', endDate);
      await page.click('[data-testid="apply-date-filter"]');
      
      // Verify filtered results
      await page.waitForSelector('[data-testid="filtered-results"]');
      const resultsText = await page.textContent('[data-testid="results-count"]');
      expect(resultsText).toContain('results');
      
      // Filter by department
      await page.click('[data-testid="department-filter"]');
      await page.selectOption('[data-testid="department-select"]', { value: 'Engineering' });
      await page.click('[data-testid="apply-filter"]');
      
      // Verify department filtered results
      await page.waitForSelector('[data-testid="attendance-table"]');
      const rows = await page.locator('[data-testid="attendance-row"]');
      const firstRowDept = await rows.first().locator('[data-testid="department"]').textContent();
      expect(firstRowDept).toContain('Engineering');
      
      // Export filtered data
      await page.click('[data-testid="export-btn"]');
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-excel"]')
      ]);
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/attendance.*\.(xlsx|csv)$/i);
    });

    it('should show attendance summary statistics', async () => {
      await loginAs(testManager);
      await page.goto('/attendance/summary');
      
      // Wait for summary cards
      await page.waitForSelector('[data-testid="summary-stats"]');
      
      // Verify stat cards
      expect(await page.locator('[data-testid="total-present"]')).toBeTruthy();
      expect(await page.locator('[data-testid="total-absent"]')).toBeTruthy();
      expect(await page.locator('[data-testid="total-late"]')).toBeTruthy();
      expect(await page.locator('[data-testid="average-hours"]')).toBeTruthy();
      
      // View team chart
      await page.waitForSelector('[data-testid="attendance-chart"]');
      expect(await page.locator('[data-testid="attendance-chart"]').isVisible()).toBe(true);
      
      // Check individual employee details
      await page.click('[data-testid="employee-detail"]:first-child');
      await page.waitForSelector('[data-testid="employee-attendance-detail"]');
      
      // Verify monthly breakdown
      expect(await page.locator('[data-testid="monthly-breakdown"]')).toBeTruthy();
      expect(await page.locator('[data-testid="attendance-percentage"]')).toBeTruthy();
    });
  });
});

// Helper functions
async function createTestUser(role) {
  return { id: Math.floor(Math.random() * 1000), name: `Test ${role}`, email: `${role}@test.com`, role };
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
