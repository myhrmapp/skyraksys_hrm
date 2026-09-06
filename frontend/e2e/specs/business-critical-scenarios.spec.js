// @ts-check
const { test, expect, loginAs, waitForPageReady } = require('../fixtures/test-fixtures');

async function openBusinessPage(page, route, pageTestId) {
  console.log(`[E2E] Opening ${route} and waiting for test-id ${pageTestId}`);
  await page.goto(route);
  console.log(`[E2E] After goto, current URL is ${page.url()}`);
  await waitForPageReady(page);

  const target = page.locator(`[data-testid="${pageTestId}"]`);
  const targetVisible = await target.isVisible().catch(() => false);
  console.log(`[E2E] Route ${route} target visible: ${targetVisible}. URL=${page.url()}`);
  await expect(target).toBeVisible();
}

test.describe('Critical business scenarios', () => {
  test.describe.configure({ mode: 'serial' });

  test('Employee can open the leave request workflow', async ({ page }) => {
    await loginAs(page, 'employee');
    await openBusinessPage(page, '/add-leave-request', 'leave-request-page');

    await expect(page).toHaveURL(/\/add-leave-request$/);
    await expect(page.getByText(/new leave request/i)).toBeVisible();
    await expect(page.locator('#leaveTypeId')).toBeVisible();
    await expect(page.locator('[data-testid="leave-type-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="leave-reason-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="leave-submit-btn"]')).toBeVisible();
  });

  test('Manager can review employee leave requests', async ({ page }) => {
    await loginAs(page, 'manager');
    await openBusinessPage(page, '/leave-management?view=management', 'leave-management-page');

    await expect(page).toHaveURL(/\/leave-management\?view=management/);
    await expect(page.getByText(/leave management/i)).toBeVisible();
    await expect(page.locator('[data-testid="leave-mgmt-requests-table"]')).toBeVisible();
    const rowCount = await page.locator('[data-testid="leave-mgmt-requests-table"] tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('Employee can reach attendance and has an actionable attendance state', async ({ page }) => {
    await loginAs(page, 'employee');
    await openBusinessPage(page, '/attendance', 'my-attendance-page');

    await expect(page).toHaveURL(/\/attendance$/);
    await expect(page.getByRole('heading', { name: /my attendance/i })).toBeVisible();
    await expect(page.locator('[data-testid="attendance-status-chip"]')).toBeVisible();

    const checkIn = page.locator('[data-testid="attendance-checkin-btn"]');
    const checkOut = page.locator('[data-testid="attendance-checkout-btn"]');
    await expect(checkIn.or(checkOut)).toBeVisible();
  });

  test('Employee can reach the timesheet workflow', async ({ page }) => {
    await loginAs(page, 'employee');
    await page.goto('/timesheets');
    await waitForPageReady(page);

    await expect(page).toHaveURL(/\/timesheets/);
    await expect(page.getByText(/timesheet/i).first()).toBeVisible();
    const tableOrSummary = page.locator('table, [data-testid*="timesheet"], [role="table"]').first();
    await expect(tableOrSummary).toBeVisible();
  });

  test('Admin can reach payroll processing', async ({ page }) => {
    await loginAs(page, 'admin');
    await openBusinessPage(page, '/payroll-management', 'payroll-management-page');

    await expect(page).toHaveURL(/\/payroll-management$/);
    await expect(page.getByText(/payroll management system/i)).toBeVisible();
    await expect(page.locator('[data-testid="payroll-tabs"]')).toBeVisible();
    await expect(page.locator('[data-testid="payroll-generate-btn"]')).toBeVisible();
  });

  test('Employee can view personal payslips', async ({ page }) => {
    await loginAs(page, 'employee');
    await openBusinessPage(page, '/employee-payslips', 'employee-payslips-page');

    await expect(page).toHaveURL(/\/employee-payslips$/);
    await expect(page.getByText(/payslip/i).first()).toBeVisible();
    const payslipCard = page.locator('[data-testid="employee-payslips-page"]').first();
    await expect(payslipCard).toBeVisible();
  });

  test('Admin can reach employee records', async ({ page }) => {
    await loginAs(page, 'admin');
    await openBusinessPage(page, '/employees', 'employee-table');

    await expect(page).toHaveURL(/\/employees$/);
    await expect(page.locator('[data-testid="employee-table"]')).toBeVisible();
    const employeeRows = page.locator('[data-testid="employee-table"] tbody tr');
    const rowCount = await employeeRows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('Employee cannot use administrative invoice workflow', async ({ page }) => {
    await loginAs(page, 'employee');
    await page.goto('/billing-invoices');
    await waitForPageReady(page);

    const accessDenied = await page.getByText(/access denied|unauthorized|forbidden/i).isVisible().catch(() => false);
    const stillOnInvoicePage = page.url().includes('/billing-invoices');

    expect(stillOnInvoicePage && !accessDenied).toBeFalsy();
    expect(accessDenied || !stillOnInvoicePage).toBeTruthy();
  });
});
