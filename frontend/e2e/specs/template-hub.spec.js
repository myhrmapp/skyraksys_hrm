const { test, expect } = require('@playwright/test');
const { setupAuthMatrix } = require('../fixtures/test-fixtures');

test.describe('Template Hub (Payslip & Invoice Templates)', () => {
  let adminPage;
  let employeePage;

  test.beforeAll(async ({ browser }) => {
    const matrix = await setupAuthMatrix(browser);
    adminPage = matrix.adminPage;
    employeePage = matrix.employeePage;
  });

  test('TC-TMP-01: Admin can access Template Hub and default tab is Payslip Templates', async () => {
    await adminPage.goto('/admin/payslip-templates');
    
    // Check if the tabs exist
    const payslipTab = adminPage.getByRole('tab', { name: /Payslip Templates/i });
    const invoiceTab = adminPage.getByRole('tab', { name: /Invoice Templates/i });
    
    await expect(payslipTab).toBeVisible({ timeout: 5000 });
    await expect(invoiceTab).toBeVisible();
    
    // Payslip should be active by default (aria-selected="true")
    await expect(payslipTab).toHaveAttribute('aria-selected', 'true');
  });

  test('TC-TMP-02: Admin can switch to Invoice Templates Tab', async () => {
    await adminPage.goto('/admin/payslip-templates');
    
    const invoiceTab = adminPage.getByRole('tab', { name: /Invoice Templates/i });
    await invoiceTab.click();
    
    await expect(invoiceTab).toHaveAttribute('aria-selected', 'true');
    
    // Verify Create button exists for Invoice Templates
    const createBtn = adminPage.getByRole('button', { name: /Create Template/i });
    await expect(createBtn).toBeVisible();
  });

  test('TC-TMP-03: RBAC - Employee is denied access to Template Hub', async () => {
    await employeePage.goto('/admin/payslip-templates');
    
    const currentUrl = employeePage.url();
    const denied = !currentUrl.includes('/admin/payslip-templates') || 
                   await employeePage.locator('text=Access Denied, text=Unauthorized').isVisible();
    expect(denied).toBeTruthy();
  });
});
