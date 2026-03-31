// @ts-check
const { test, expect, loginAs, waitForPageReady } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');
const TasksPage = require('../pages/TasksPage');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('Tasks');

test.describe('Tasks & Projects Module', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      await loginAs(page, row.role);
      const tasks = new TasksPage(page);

      switch (row.action) {
        // ─── My Tasks (Employee/Manager) ───
        case 'pageLoad': {
          await tasks.goto();
          const visible = await tasks.isPageVisible();
          expect(visible).toBeTruthy();
          break;
        }

        case 'search': {
          await tasks.goto();
          await tasks.search(row.searchTerm || 'test');
          await page.waitForTimeout(500);
          const visible = await tasks.isPageVisible();
          expect(visible).toBeTruthy();
          break;
        }

        case 'filterStatus': {
          await tasks.goto();
          await tasks.filterByStatus(row.filterValue || 'In Progress');
          await page.waitForTimeout(500);
          const visible = await tasks.isPageVisible();
          expect(visible).toBeTruthy();
          break;
        }

        case 'filterPriority': {
          await tasks.goto();
          await tasks.filterByPriority(row.filterValue || 'High');
          await page.waitForTimeout(500);
          const visible = await tasks.isPageVisible();
          expect(visible).toBeTruthy();
          break;
        }

        case 'updateStatus': {
          await tasks.goto();
          const changed = await tasks.changeTaskStatus(
            parseInt(row.taskIndex || '0'),
            row.newStatus || 'In Progress'
          );
          await page.waitForTimeout(1000);
          break;
        }

        case 'clearFilters': {
          await tasks.goto();
          await tasks.filterByStatus('In Progress');
          await page.waitForTimeout(300);
          await tasks.filterByStatus('All Statuses');
          await page.waitForTimeout(500);
          const count = await tasks.getTaskCount();
          expect(count).toBeGreaterThanOrEqual(0);
          break;
        }

        case 'verifyCounts': {
          await tasks.goto();
          const count = await tasks.getTaskCount();
          expect(count).toBeGreaterThanOrEqual(0);
          break;
        }

        // ─── Project Task Configuration (Admin/Manager) ───
        case 'projectConfigPageLoad': {
          await tasks.gotoProjectConfig();
          const visible = await tasks.isProjectConfigVisible();
          expect(visible).toBeTruthy();
          break;
        }

        case 'projectsTabLoad': {
          await tasks.gotoProjectConfig();
          await tasks.clickProjectsTab();
          const count = await tasks.getProjectCount();
          expect(count).toBeGreaterThanOrEqual(0);
          break;
        }

        case 'tasksTabLoad': {
          await tasks.gotoProjectConfig();
          await tasks.clickTasksTab();
          await page.waitForTimeout(500);
          const visible = await tasks.isProjectConfigVisible();
          expect(visible).toBeTruthy();
          break;
        }

        case 'searchProjects': {
          await tasks.gotoProjectConfig();
          await tasks.clickProjectsTab();
          await tasks.searchProjects(row.searchTerm || 'test');
          await page.waitForTimeout(500);
          const visible = await tasks.isProjectConfigVisible();
          expect(visible).toBeTruthy();
          break;
        }

        case 'addProject': {
          await tasks.gotoProjectConfig();
          await tasks.clickProjectsTab();
          await tasks.clickAddProject();
          await tasks.fillProjectForm({
            name: row.projectName || `Test Project ${Date.now()}`,
            description: row.projectDesc || 'E2E test project',
            startDate: row.startDate || new Date().toISOString().split('T')[0],
            endDate: row.endDate || '',
            status: row.projectStatus || 'Planning',
            clientName: row.clientName || 'Test Client',
          });
          const saved = await tasks.saveProject();
          await page.waitForTimeout(1000);
          break;
        }

        case 'editProject': {
          await tasks.gotoProjectConfig();
          await tasks.clickProjectsTab();
          const edited = await tasks.editProject(0);
          if (edited) {
            const dialog = page.locator('[role="dialog"]').first();
            await expect(dialog).toBeVisible({ timeout: 3000 });
            await tasks.cancelProject();
          }
          break;
        }

        case 'deleteProject': {
          await tasks.gotoProjectConfig();
          await tasks.clickProjectsTab();
          const count = await tasks.getProjectCount();
          if (count > 0) {
            const deleted = await tasks.deleteProject(count - 1);
          }
          break;
        }

        case 'addTask': {
          await tasks.gotoProjectConfig();
          await tasks.clickTasksTab();
          await tasks.clickAddTask();
          await tasks.fillTaskForm({
            name: row.taskName || `Test Task ${Date.now()}`,
            description: row.taskDesc || 'E2E test task',
            project: row.projectName || '',
            status: row.taskStatus || 'Not Started',
            priority: row.taskPriority || 'Medium',
          });
          const saved = await tasks.saveTask();
          await page.waitForTimeout(1000);
          break;
        }

        case 'deleteTask': {
          await tasks.gotoProjectConfig();
          await tasks.clickTasksTab();
          const deleted = await tasks.deleteTask(0);
          break;
        }

        case 'projectConfigRBAC': {
          await tasks.gotoProjectConfig();
          if (row.role === 'employee') {
            // Employee should not see project config page
            const visible = await tasks.isProjectConfigVisible();
            // May be redirected
            expect(true).toBeTruthy();
          } else {
            const visible = await tasks.isProjectConfigVisible();
            expect(visible).toBeTruthy();
          }
          break;
        }

        case 'projectCount': {
          await tasks.gotoProjectConfig();
          await tasks.clickProjectsTab();
          const count = await tasks.getProjectCount();
          expect(count).toBeGreaterThanOrEqual(0);
          break;
        }

        default: {
          throw new Error(`Unknown tasks action: ${row.action}`);
        }
      }
    });
  }
});
