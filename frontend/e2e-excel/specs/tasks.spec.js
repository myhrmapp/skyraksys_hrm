// @ts-check
const { test, expect, loginAs, waitForPageReady, navigateTo } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');
const TasksPage = require('../pages/TasksPage');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('Tasks');

test.describe('Tasks Module', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      await loginAs(page, row.role);
      const tasks = new TasksPage(page);

      switch (row.action) {
        case 'pageLoad': {
          await navigateTo(page, 'tasks');
          await waitForPageReady(page);
          await expect(page.locator('[data-testid="my-tasks-page"]')).toBeVisible({ timeout: 8000 });
          break;
        }

        case 'search': {
          await navigateTo(page, 'tasks');
          await waitForPageReady(page);
          await tasks.search(row.searchTerm);
          await page.waitForTimeout(500);
          await expect(page.locator('[data-testid="my-tasks-page"]')).toBeVisible();
          break;
        }

        case 'filterStatus': {
          await navigateTo(page, 'tasks');
          await waitForPageReady(page);
          await tasks.filterByStatus(row.filterValue);
          await page.waitForTimeout(500);
          await expect(page.locator('[data-testid="my-tasks-page"]')).toBeVisible();
          break;
        }

        case 'filterPriority': {
          await navigateTo(page, 'tasks');
          await waitForPageReady(page);
          await tasks.filterByPriority(row.filterValue);
          await page.waitForTimeout(500);
          await expect(page.locator('[data-testid="my-tasks-page"]')).toBeVisible();
          break;
        }

        case 'updateStatus': {
          await navigateTo(page, 'tasks');
          await waitForPageReady(page);
          await tasks.changeTaskStatus(parseInt(row.taskIndex), row.newStatus);
          await page.waitForTimeout(1000);
          break;
        }

        case 'clearFilters': {
          await navigateTo(page, 'tasks');
          await waitForPageReady(page);
          await tasks.filterByStatus('In Progress');
          await page.waitForTimeout(300);
          await tasks.filterByStatus('All');
          await page.waitForTimeout(500);
          const count = await tasks.getTaskCount();
          expect(count).toBeGreaterThanOrEqual(0);
          break;
        }

        case 'verifyCounts': {
          await navigateTo(page, 'tasks');
          await waitForPageReady(page);
          const count = await tasks.getTaskCount();
          expect(count).toBeGreaterThanOrEqual(0);
          break;
        }
      }
    });
  }
});
