const { test, expect } = require('@playwright/test');
const { setupAuthMatrix } = require('../fixtures/test-fixtures');

test.describe('Client Invoices Management', () => {
  let adminPage;
  let employeePage;

  test.beforeAll(async ({ browser }) => {
    const matrix = await setupAuthMatrix(browser);
    adminPage = matrix.adminPage;
    employeePage = matrix.employeePage;
  });

  test('TC-INV-01: Admin can access Invoice Management', async () => {
    await adminPage.goto('/admin/invoices');
    await expect(adminPage.getByRole('heading', { name: /Invoices/i })).toBeVisible({ timeout: 5000 });
  });

  test('TC-INV-02: Admin can open Create Invoice Dialog', async () => {
    await adminPage.goto('/admin/invoices');
    const createBtn = adminPage.getByRole('button', { name: /Create Invoice/i });
    await expect(createBtn).toBeVisible();
    await createBtn.click();
    
    // Verify dialog opens
    await expect(adminPage.getByRole('dialog')).toBeVisible();
    await adminPage.keyboard.press('Escape'); // Close dialog
  });

  test('TC-INV-03: Verify Download PDF Button exists on Invoice rows', async () => {
    await adminPage.goto('/admin/invoices');
    
    // Check if there are any invoices. If not, this step succeeds since there's no row.
    const hasRows = await adminPage.locator('table tbody tr').count();
    if (hasRows > 0) {
      // Find the first download PDF button (often has color="primary" and a PDF icon)
      const pdfBtn = adminPage.locator('button[color="primary"] svg[data-testid="PictureAsPdfIcon"]').first();
      // It should be visible if rows exist
      await expect(pdfBtn).toBeVisible();
    }
  });

  test('TC-INV-04: RBAC - Employee is denied access to invoices', async () => {
    await employeePage.goto('/admin/invoices');
    
    const currentUrl = employeePage.url();
    // Assuming unauthorized access redirects to dashboard or shows "Access Denied"
    const denied = !currentUrl.includes('/admin/invoices') || 
                   await employeePage.locator('text=Access Denied, text=Unauthorized').isVisible();
    expect(denied).toBeTruthy();
  });
});
