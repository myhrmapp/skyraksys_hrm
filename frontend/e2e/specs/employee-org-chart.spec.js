const { test, expect } = require('@playwright/test');
const { doLogin, setupAuthMatrix } = require('../fixtures/test-fixtures');
const EmployeePage = require('../pages/EmployeePage');

test.describe('Organization Chart (Employee Directory)', () => {
  let adminPage;
  let empPage;

  test.beforeAll(async ({ browser }) => {
    // We only need admin auth for viewing the directory with full access
    const matrix = await setupAuthMatrix(browser);
    adminPage = matrix.adminPage;
    empPage = new EmployeePage(adminPage);
  });

  test('TC-ORG-01: Directory defaults to List View', async () => {
    await empPage.gotoList();
    
    // The list view button should be active/selected
    const listToggle = adminPage.getByTestId('employee-list-view-toggle-list');
    await expect(listToggle).toBeVisible();
    
    // DataGrid should be visible
    const table = adminPage.locator('[data-testid="employee-table-view"], table').first();
    await expect(table).toBeVisible({ timeout: 5000 });
  });

  test('TC-ORG-02: Toggle to Organization Chart View', async () => {
    // Click the Org Chart toggle
    const orgToggle = adminPage.getByTestId('employee-list-view-toggle-org');
    await orgToggle.click();

    // Verify Org Chart rendering
    const orgContainer = adminPage.locator('text=Board').first(); // Assumes the CEO/Board root
    // Fallback if Board doesn't exist but employee cards do
    const employeeCard = adminPage.locator('.MuiCard-root, .MuiPaper-root', { hasText: 'Company' }).first();
    
    await expect(orgContainer.or(employeeCard)).toBeVisible({ timeout: 5000 });
  });

  test('TC-ORG-03: Toggle back to List View', async () => {
    const listToggle = adminPage.getByTestId('employee-list-view-toggle-list');
    await listToggle.click();
    
    const table = adminPage.locator('[data-testid="employee-table-view"], table').first();
    await expect(table).toBeVisible({ timeout: 5000 });
  });
});
