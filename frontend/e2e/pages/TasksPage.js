/**
 * Tasks & Projects Page Object Model
 * Covers: MyTasks (employee), ProjectTaskConfiguration (admin/manager)
 */
const selectors = require('../lib/object-repository');
const { waitForPageReady } = require('../fixtures/test-fixtures');

class TasksPage {
  constructor(page) {
    this.page = page;
    this.s = selectors.tasks;
    this.ptc = selectors.projectTaskConfig;
  }

  // ─── My Tasks (Employee/Manager) ──────────
  async goto() {
    await this.page.goto('/my-tasks');
    await waitForPageReady(this.page);
  }

  async isPageVisible() {
    return this.page.locator(this.s.page).isVisible({ timeout: 5000 }).catch(() => false);
  }

  async search(term) {
    const input = this.page.locator(`${this.s.search} input`);
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill(term);
      await this.page.waitForTimeout(500);
    }
  }

  async filterByStatus(status) {
    const select = this.page.locator(this.s.statusFilter);
    const wrapper = select.locator('xpath=ancestor::div[contains(@class,"MuiSelect") or contains(@class,"MuiInputBase")]').first();
    if (await wrapper.isVisible({ timeout: 3000 }).catch(() => false)) {
      await wrapper.scrollIntoViewIfNeeded();
      await wrapper.click({ force: true });
      await this.page.locator('[role="option"], li').filter({ hasText: new RegExp(`^${status}$`, 'i') }).first().click();
      await this.page.waitForTimeout(500);
    }
  }

  async filterByPriority(priority) {
    const select = this.page.locator(this.s.priorityFilter);
    const wrapper = select.locator('xpath=ancestor::div[contains(@class,"MuiSelect") or contains(@class,"MuiInputBase")]').first();
    if (await wrapper.isVisible({ timeout: 3000 }).catch(() => false)) {
      await wrapper.scrollIntoViewIfNeeded();
      await wrapper.click({ force: true });
      await this.page.locator('[role="option"], li').filter({ hasText: new RegExp(`^${priority}$`, 'i') }).first().click();
      await this.page.waitForTimeout(500);
    }
  }

  async getTaskCount() {
    const cards = this.page.locator('.MuiCard-root').filter({ hasText: /priority|status/i });
    const count = await cards.count();
    if (count > 0) return count;
    return this.page.locator('table tbody tr').count();
  }

  async changeTaskStatus(rowIndex, newStatus) {
    const cards = this.page.locator('.MuiCard-root').filter({ hasText: /priority|status/i });
    const count = await cards.count();
    if (count > rowIndex) {
      const card = cards.nth(rowIndex);
      const statusSelect = card.locator('select, [role="combobox"]').first();
      if (await statusSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await statusSelect.click();
        await this.page.locator('[role="option"], li').filter({ hasText: new RegExp(newStatus, 'i') }).first().click();
        await this.page.waitForTimeout(500);
        return true;
      }
    }
    // Fall back to table rows
    const row = this.page.locator('table tbody tr').nth(rowIndex);
    if (await row.isVisible({ timeout: 2000 }).catch(() => false)) {
      await row.locator('select, [role="combobox"]').click();
      await this.page.locator(`li[data-value="${newStatus}"]`).click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  // ─── Project Task Configuration (Admin/Manager) ───
  async gotoProjectConfig() {
    await this.page.goto('/project-task-config');
    await waitForPageReady(this.page);
  }

  async isProjectConfigVisible() {
    return this.page.locator(this.ptc.page).isVisible({ timeout: 5000 }).catch(() => false);
  }

  async clickProjectsTab() {
    const tab = this.page.locator(this.ptc.tabProjects);
    if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tab.click();
      await this.page.waitForTimeout(500);
    }
  }

  async clickTasksTab() {
    const tab = this.page.locator(this.ptc.tabTasks);
    if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tab.click();
      await this.page.waitForTimeout(500);
    }
  }

  async searchProjects(term) {
    const input = this.page.locator(`${this.ptc.search} input`);
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill(term);
      await this.page.waitForTimeout(500);
    }
  }

  async clickAddProject() {
    await this.page.locator(this.ptc.addProjectBtn).click();
    await this.page.waitForTimeout(500);
  }

  async fillProjectForm({ name, description, startDate, endDate, status, clientName }) {
    if (name) {
      const nameInput = this.page.locator('[data-testid="project-name-input"]');
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill(name);
      }
    }
    if (description) {
      const descInput = this.page.locator('[data-testid="project-description-input"]');
      if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descInput.fill(description);
      }
    }
    if (startDate) {
      const sDate = this.page.locator('[data-testid="project-start-date"]');
      if (await sDate.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sDate.fill(startDate);
      }
    }
    if (endDate) {
      const eDate = this.page.locator('[data-testid="project-end-date"]');
      if (await eDate.isVisible({ timeout: 2000 }).catch(() => false)) {
        await eDate.fill(endDate);
      }
    }
    if (status) {
      const sel = this.page.locator('[data-testid="project-status-select"]');
      if (await sel.isVisible({ timeout: 2000 }).catch(() => false)) {
        const parent = sel.locator('..');
        await parent.click({ force: true });
        await this.page.locator('[role="option"]').filter({ hasText: new RegExp(`^${status}$`, 'i') }).first().click();
        await this.page.waitForTimeout(300);
      }
    }
    if (clientName) {
      const cInput = this.page.locator('[data-testid="project-client-name-input"]');
      if (await cInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cInput.fill(clientName);
      }
    }
  }

  async saveProject() {
    const btn = this.page.locator('[data-testid="project-save-button"]');
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(1000);
      return true;
    }
    // Fallback: submit button inside form
    const submitBtn = this.page.locator('button[type="submit"]').filter({ hasText: /save|create|update/i }).first();
    if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitBtn.click();
      await this.page.waitForTimeout(1000);
      return true;
    }
    return false;
  }

  async cancelProject() {
    const btn = this.page.locator('[data-testid="project-cancel-button"]');
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click();
    }
  }

  async getProjectCount() {
    // Card view
    const cards = this.page.locator('.MuiCard-root').filter({ hasText: /status|tasks/i });
    const cardCount = await cards.count();
    if (cardCount > 0) return cardCount;
    // Table view
    return this.page.locator('table tbody tr').count();
  }

  async editProject(index = 0) {
    // Look for edit icons in card or table rows
    const editBtns = this.page.locator('button, [role="button"]').filter({ has: this.page.locator('svg[data-testid="EditIcon"], [data-testid*="edit"]') });
    if (await editBtns.nth(index).isVisible({ timeout: 3000 }).catch(() => false)) {
      await editBtns.nth(index).click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async deleteProject(index = 0) {
    const deleteBtns = this.page.locator('button, [role="button"]').filter({ has: this.page.locator('svg[data-testid="DeleteIcon"], [data-testid*="delete"]') });
    if (await deleteBtns.nth(index).isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtns.nth(index).click();
      await this.page.waitForTimeout(500);
      // Confirm dialog
      const confirmBtn = this.page.locator('[data-testid="confirm-dialog-confirm-btn"]');
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await this.page.waitForTimeout(500);
      }
      return true;
    }
    return false;
  }

  async clickAddTask() {
    await this.page.locator(this.ptc.addTaskBtn).click();
    await this.page.waitForTimeout(500);
  }

  async fillTaskForm({ name, description, project, status, priority, assignee }) {
    if (name) {
      const nameInput = this.page.getByLabel(/task name/i);
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill(name);
      }
    }
    if (description) {
      const descInput = this.page.getByLabel(/description/i);
      if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descInput.fill(description);
      }
    }
    if (project) {
      const projSelect = this.page.getByLabel(/project/i).first();
      if (await projSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        const parent = projSelect.locator('..');
        await parent.click({ force: true });
        await this.page.locator('[role="option"]').filter({ hasText: new RegExp(project, 'i') }).first().click();
        await this.page.waitForTimeout(300);
      }
    }
    if (status) {
      const statSelect = this.page.getByLabel(/^status$/i);
      if (await statSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        const parent = statSelect.locator('..');
        await parent.click({ force: true });
        await this.page.locator('[role="option"]').filter({ hasText: new RegExp(`^${status}$`, 'i') }).first().click();
        await this.page.waitForTimeout(300);
      }
    }
    if (priority) {
      const prioSelect = this.page.getByLabel(/priority/i);
      if (await prioSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        const parent = prioSelect.locator('..');
        await parent.click({ force: true });
        await this.page.locator('[role="option"]').filter({ hasText: new RegExp(`^${priority}$`, 'i') }).first().click();
        await this.page.waitForTimeout(300);
      }
    }
    // Assignee field (for task assignment workflows)
    if (assignee) {
      const assignSelect = this.page.getByLabel(/assign|assigned/i).first();
      if (await assignSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        const parent = assignSelect.locator('..');
        await parent.click({ force: true });
        await this.page.locator('[role="option"]').filter({ hasText: new RegExp(assignee, 'i') }).first().click();
        await this.page.waitForTimeout(300);
      }
    }
  }

  async saveTask() {
    const btn = this.page.locator('button[type="submit"]').filter({ hasText: /save|create|update/i }).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(1000);
      return true;
    }
    return false;
  }

  async deleteTask(index = 0) {
    const deleteBtns = this.page.locator('button, [role="button"]').filter({ has: this.page.locator('svg[data-testid="DeleteIcon"]') });
    if (await deleteBtns.nth(index).isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtns.nth(index).click();
      await this.page.waitForTimeout(500);
      const confirmBtn = this.page.locator('[data-testid="confirm-dialog-confirm-btn"]');
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await this.page.waitForTimeout(500);
      }
      return true;
    }
    return false;
  }
}

module.exports = TasksPage;
