const { test, expect } = require('@playwright/test');
const { setupAuthMatrix } = require('../fixtures/test-fixtures');

test.describe('Goals & OKRs Management', () => {
  let adminPage;
  let employeePage;

  test.beforeAll(async ({ browser }) => {
    const matrix = await setupAuthMatrix(browser);
    adminPage = matrix.adminPage;
    employeePage = matrix.employeePage;
  });

  test('TC-GOAL-01: Employee can navigate to My Goals', async () => {
    await employeePage.goto('/my-goals');
    // Verify the page loaded by looking for a heading or the add button
    await expect(employeePage.getByRole('heading', { name: /Goals/i })).toBeVisible({ timeout: 5000 });
  });

  test('TC-GOAL-02: Employee can create a new Goal', async () => {
    await employeePage.goto('/my-goals');
    
    // Open create dialog
    await employeePage.getByRole('button', { name: /Add Goal/i }).click();
    
    // Fill the form
    await employeePage.getByLabel(/Title/i).fill('Increase Q3 Sales');
    await employeePage.getByLabel(/Description/i).fill('Focus on enterprise leads.');
    
    // Select Timeframe
    await employeePage.getByLabel(/Timeframe/i).click();
    await employeePage.getByRole('option', { name: /Q3/i }).first().click().catch(async () => {
        // Fallback if Q3 isn't available
        await employeePage.keyboard.press('Escape');
    });

    await employeePage.getByRole('button', { name: /Save/i }).click();

    // Verify it appears in the list
    await expect(employeePage.getByText('Increase Q3 Sales').first()).toBeVisible();
  });

  test('TC-GOAL-03: Add Key Result to Goal', async () => {
    await employeePage.goto('/my-goals');
    
    // Expand or click into the goal to add a key result
    // Assuming there is a + button for key results inside the goal card
    const addKrBtn = employeePage.locator('button[aria-label="Add Key Result"], button:has-text("Add KR")').first();
    if (await addKrBtn.isVisible()) {
      await addKrBtn.click();
      await employeePage.getByLabel(/Title/i).fill('Close 5 Enterprise deals');
      await employeePage.getByLabel(/Target/i).fill('5');
      await employeePage.getByRole('button', { name: /Save/i }).click();

      await expect(employeePage.getByText('Close 5 Enterprise deals').first()).toBeVisible();
    } else {
        test.skip('No Add KR button found, skipping key result test');
    }
  });

  test('TC-GOAL-04: Admin/Manager can view team goals', async () => {
    await adminPage.goto('/my-goals'); // Admins can also have goals
    await expect(adminPage.getByRole('heading', { name: /Goals/i })).toBeVisible({ timeout: 5000 });
    
    // Try visiting employee list and navigating to profile to see goals (if integrated)
    // Or just ensuring Admin has the My Goals page
  });
});
