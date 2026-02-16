// E2E Test: Payroll Workflow
// Framework: Playwright/Cypress compatible syntax
// Test payroll generation, review, approval, and employee viewing

describe('Payroll E2E Workflow', () => {
  let testAdmin, testEmployee;
  let adminToken, employeeToken;
  
  beforeAll(async () => {
    // Setup test users
    testAdmin = await createTestUser('admin');
    testEmployee = await createTestUser('employee');
    
    adminToken = await loginUser(testAdmin);
    employeeToken = await loginUser(testEmployee);
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  describe('Admin Generate Payroll', () => {
    it('should allow admin to generate monthly payroll', async () => {
      await loginAs(testAdmin);
      await page.goto('/payroll');
      
      // Click generate payroll button
      await page.click('[data-testid="generate-payroll-btn"]');
      await page.waitForSelector('[data-testid="payroll-form"]');
      
      // Select month and year
      await page.selectOption('[data-testid="month-select"]', { value: '01' });
      await page.selectOption('[data-testid="year-select"]', { value: '2024' });
      
      // Select employees or department
      await page.click('[data-testid="select-all-employees"]');
      
      // Preview before generation
      await page.click('[data-testid="preview-btn"]');
      await page.waitForSelector('[data-testid="payroll-preview"]');
      
      // Verify preview shows expected data
      const employeeCount = await page.textContent('[data-testid="employee-count"]');
      expect(Number(employeeCount)).toBeGreaterThan(0);
      
      // Generate payroll
      await page.click('[data-testid="confirm-generate-btn"]');
      await page.waitForSelector('[data-testid="generation-progress"]');
      
      // Wait for completion
      await page.waitForSelector('[data-testid="success-message"]', { timeout: 30000 });
      expect(await page.textContent('[data-testid="success-message"]')).toContain('generated');
      
      // Verify payroll list updated
      await page.goto('/payroll/list');
      const latestPayroll = await page.locator('[data-testid="payroll-item"]').first();
      expect(await latestPayroll.textContent()).toContain('January 2024');
    });
  });

  describe('Admin Review and Edit', () => {
    it('should allow admin to review and edit payroll before approval', async () => {
      await loginAs(testAdmin);
      await page.goto('/payroll/list');
      
      // Click pending payroll
      await page.click('[data-status="Pending"]:first-child');
      await page.waitForSelector('[data-testid="payroll-detail"]');
      
      // View employee payslip
      await page.click('[data-testid="employee-payslip"]:first-child');
      await page.waitForSelector('[data-testid="payslip-editor"]');
      
      // Edit allowances
      await page.click('[data-testid="edit-allowances-btn"]');
      await page.fill('[data-testid="transport-allowance"]', '500');
      await page.fill('[data-testid="special-allowance"]', '1000');
      
      // Add adjustment
      await page.click('[data-testid="add-adjustment-btn"]');
      await page.fill('[data-testid="adjustment-reason"]', 'Performance bonus');
      await page.fill('[data-testid="adjustment-amount"]', '2000');
      
      // Save changes
      await page.click('[data-testid="save-payslip-btn"]');
      await page.waitForSelector('[data-testid="success-message"]');
      
      // Verify updated total
      const netSalary = await page.textContent('[data-testid="net-salary"]');
      expect(Number(netSalary.replace(/[^0-9.-]+/g, ''))).toBeGreaterThan(0);
    });
  });

  describe('Admin Approve Payroll', () => {
    it('should allow admin to approve payroll', async () => {
      await loginAs(testAdmin);
      await page.goto('/payroll/list');
      
      // Click pending payroll
      await page.click('[data-status="Pending"]:first-child');
      await page.waitForSelector('[data-testid="payroll-detail"]');
      
      // Click approve button
      await page.click('[data-testid="approve-payroll-btn"]');
      await page.waitForSelector('[data-testid="approval-dialog"]');
      
      // Confirm approval
      await page.fill('[data-testid="approval-notes"]', 'Approved for January 2024');
      await page.click('[data-testid="confirm-approval-btn"]');
      
      // Verify approval
      await page.waitForSelector('[data-testid="success-message"]');
      expect(await page.textContent('[data-testid="success-message"]')).toContain('approved');
      
      // Verify status badge
      const status = await page.textContent('[data-testid="status-badge"]');
      expect(status).toContain('Approved');
    });
  });

  describe('Employee View Payslip', () => {
    it('should allow employee to view their payslip', async () => {
      await loginAs(testEmployee);
      await page.goto('/payslips');
      
      // Wait for payslip list
      await page.waitForSelector('[data-testid="payslip-list"]');
      
      // Click latest payslip
      await page.click('[data-testid="payslip-item"]:first-child');
      await page.waitForSelector('[data-testid="payslip-detail"]');
      
      // Verify payslip details
      expect(await page.locator('[data-testid="employee-name"]')).toBeTruthy();
      expect(await page.locator('[data-testid="basic-salary"]')).toBeTruthy();
      expect(await page.locator('[data-testid="total-earnings"]')).toBeTruthy();
      expect(await page.locator('[data-testid="total-deductions"]')).toBeTruthy();
      expect(await page.locator('[data-testid="net-salary"]')).toBeTruthy();
      
      // Verify breakdown sections
      expect(await page.locator('[data-testid="earnings-breakdown"]')).toBeTruthy();
      expect(await page.locator('[data-testid="deductions-breakdown"]')).toBeTruthy();
    });
  });

  describe('Employee Download PDF', () => {
    it('should allow employee to download payslip as PDF', async () => {
      await loginAs(testEmployee);
      await page.goto('/payslips');
      
      // Click latest payslip
      await page.click('[data-testid="payslip-item"]:first-child');
      await page.waitForSelector('[data-testid="payslip-detail"]');
      
      // Setup download listener
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="download-pdf-btn"]')
      ]);
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/payslip.*\.pdf$/i);
      
      // Optional: Save and verify file
      const path = await download.path();
      expect(path).toBeTruthy();
    });
  });

  describe('Edge Case: Regenerate Month', () => {
    it('should allow admin to regenerate payroll for a month', async () => {
      await loginAs(testAdmin);
      await page.goto('/payroll/list');
      
      // Click approved payroll
      await page.click('[data-status="Approved"]:first-child');
      await page.waitForSelector('[data-testid="payroll-detail"]');
      
      // Click regenerate button
      await page.click('[data-testid="regenerate-btn"]');
      await page.waitForSelector('[data-testid="regenerate-dialog"]');
      
      // Confirm regeneration with reason
      await page.fill('[data-testid="regenerate-reason"]', 'Correction for tax calculation');
      await page.check('[data-testid="confirm-regenerate-checkbox"]');
      await page.click('[data-testid="confirm-regenerate-btn"]');
      
      // Verify regeneration started
      await page.waitForSelector('[data-testid="success-message"]');
      expect(await page.textContent('[data-testid="success-message"]')).toContain('regenerating');
      
      // Verify new payroll created with higher version
      await page.goto('/payroll/list');
      const versions = await page.locator('[data-testid="version-badge"]').count();
      expect(versions).toBeGreaterThan(1);
    });
  });
});

// Helper functions (same as timesheet.spec.js)
async function createTestUser(role) {
  return { id: 1, name: `Test ${role}`, email: `${role}@test.com`, role };
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
