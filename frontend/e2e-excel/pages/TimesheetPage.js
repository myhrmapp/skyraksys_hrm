/**
 * Timesheet Page Object Model — Weekly Entry, Approval, History
 * Covers weekly timesheet CRUD, approval workflow, and history across all roles.
 */
const selectors = require('../lib/object-repository');
const { waitForPageReady, API_URL } = require('../fixtures/test-fixtures');

class TimesheetPage {
  constructor(page) {
    this.page = page;
    this.s = selectors.timesheet;
  }

  // ─── Navigation ─────────────────────────────
  async goto() {
    await this.page.goto('/timesheets');
    await waitForPageReady(this.page);
  }

  async isHubVisible() {
    return this.page.locator(this.s.hub).isVisible({ timeout: 5000 }).catch(() => false);
  }

  // ─── Tab Navigation ─────────────────────────
  async clickTab(label) {
    await this.page.getByRole('tab', { name: new RegExp(label, 'i') }).click();
    await waitForPageReady(this.page);
  }

  async isTabVisible(label) {
    return this.page.getByRole('tab', { name: new RegExp(label, 'i') })
      .isVisible({ timeout: 3000 }).catch(() => false);
  }

  // ─── Week Navigation ───────────────────────
  async clickPrevWeek() {
    await this.page.locator(this.s.prevWeek).click();
    await waitForPageReady(this.page);
  }

  async clickNextWeek() {
    const btn = this.page.locator(this.s.nextWeek);
    if (await btn.isDisabled().catch(() => true)) return false;
    await btn.click();
    await waitForPageReady(this.page);
    return true;
  }

  async clickToday() {
    await this.page.locator(this.s.todayBtn).click();
    await waitForPageReady(this.page);
  }

  async isPrevWeekVisible() {
    return this.page.locator(this.s.prevWeek).isVisible({ timeout: 3000 }).catch(() => false);
  }

  async isNextWeekVisible() {
    return this.page.locator(this.s.nextWeek).isVisible({ timeout: 3000 }).catch(() => false);
  }

  async isTodayBtnVisible() {
    return this.page.locator(this.s.todayBtn).isVisible({ timeout: 3000 }).catch(() => false);
  }

  // ─── Weekly Entry Grid ─────────────────────
  async isEntryTableVisible() {
    return this.page.locator(this.s.entryTable).isVisible({ timeout: 5000 }).catch(() => false);
  }

  async clickAddTask() {
    await this.page.locator(this.s.addTask).click();
    await this.page.waitForTimeout(500);
  }

  async isAddTaskVisible() {
    return this.page.locator(this.s.addTask).isVisible({ timeout: 3000 }).catch(() => false);
  }

  async getTaskRowCount() {
    // Count project selects to determine number of task rows
    return this.page.locator('[data-testid^="timesheet-project-select-"]').count();
  }

  async selectProject(rowIndex, projectName) {
    const sel = this.page.locator(`[data-testid="timesheet-project-select-${rowIndex}"]`);
    await sel.locator('[role="combobox"], [role="button"]').first().click();
    await this.page.waitForTimeout(300);
    const option = this.page.locator(`[role="option"]`).filter({ hasText: projectName }).first();
    if (await option.isVisible({ timeout: 5000 }).catch(() => false)) {
      await option.click();
    } else {
      // Select first available option that isn't a placeholder
      const anyOption = this.page.locator('[role="option"]').first();
      if (await anyOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await anyOption.click();
      }
    }
    await this.page.waitForTimeout(300);
  }

  async selectTask(rowIndex, taskName) {
    const sel = this.page.locator(`[data-testid="timesheet-task-select-${rowIndex}"]`);
    await sel.locator('[role="combobox"], [role="button"]').first().click();
    await this.page.waitForTimeout(300);
    const option = this.page.locator(`[role="option"]`).filter({ hasText: taskName }).first();
    if (await option.isVisible({ timeout: 5000 }).catch(() => false)) {
      await option.click();
    } else {
      const anyOption = this.page.locator('[role="option"]').first();
      if (await anyOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await anyOption.click();
      }
    }
    await this.page.waitForTimeout(300);
  }

  async fillHours(rowIndex, day, hours) {
    const input = this.page.locator(`[data-testid="timesheet-hours-${rowIndex}-${day}"]`);
    if (!await input.isVisible({ timeout: 2000 }).catch(() => false)) return;
    const disabled = await input.isDisabled().catch(() => true);
    if (disabled) return; // weekend / submitted — field locked by design
    await input.fill(String(hours));
  }

  async fillWeekHours(rowIndex, hoursMap) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of days) {
      if (hoursMap[day] !== undefined && hoursMap[day] !== '') {
        await this.fillHours(rowIndex, day, hoursMap[day]);
      }
    }
  }

  async fillNotes(rowIndex, text) {
    const notes = this.page.locator(`[data-testid="timesheet-notes-${rowIndex}"] input, [data-testid="timesheet-notes-${rowIndex}"] textarea`);
    if (await notes.isVisible({ timeout: 2000 }).catch(() => false)) {
      await notes.fill(text);
    }
  }

  async deleteTaskRow(rowIndex) {
    await this.page.locator(`[data-testid="timesheet-delete-task-${rowIndex}"]`).click();
    await this.page.waitForTimeout(300);
  }

  async isDeleteTaskVisible(rowIndex) {
    return this.page.locator(`[data-testid="timesheet-delete-task-${rowIndex}"]`)
      .isVisible({ timeout: 2000 }).catch(() => false);
  }

  // ─── Action Buttons ────────────────────────
  async clickSaveDraft() {
    await this.page.locator(this.s.saveDraft).click();
    await this.page.waitForTimeout(1000);
  }

  async isSaveDraftVisible() {
    return this.page.locator(this.s.saveDraft).isVisible({ timeout: 3000 }).catch(() => false);
  }

  async isSaveDraftEnabled() {
    const btn = this.page.locator(this.s.saveDraft);
    if (!await btn.isVisible({ timeout: 2000 }).catch(() => false)) return false;
    return !(await btn.isDisabled());
  }

  async clickSubmit() {
    await this.page.locator(this.s.submitBtn).click();
    await this.page.waitForTimeout(1000);
  }

  async isSubmitVisible() {
    return this.page.locator(this.s.submitBtn).isVisible({ timeout: 3000 }).catch(() => false);
  }

  // ─── Status Detection ─────────────────────
  async getTimesheetStatus() {
    // Look for status chip/indicator on the page
    const statusChip = this.page.locator('.MuiChip-root').first();
    if (await statusChip.isVisible({ timeout: 3000 }).catch(() => false)) {
      return statusChip.textContent();
    }
    return null;
  }

  // ─── Approval Tab ──────────────────────────
  async gotoApprovals() {
    await this.goto();
    await this.clickTab('Approvals');
  }

  async isApprovalSearchVisible() {
    return this.page.locator(this.s.approvalSearch).isVisible({ timeout: 5000 }).catch(() => false);
  }

  async searchApprovals(term) {
    const input = this.page.locator(`${this.s.approvalSearch} input, ${this.s.approvalSearch}`);
    await input.fill(term);
    await this.page.waitForTimeout(500);
  }

  async getApprovalTableRowCount() {
    return this.page.locator('table tbody tr').count();
  }

  async clickApproveFirst() {
    const approveBtn = this.page.locator('button[color="success"], [aria-label*="approve" i], button:has(svg)').filter({ hasText: /approve/i }).first();
    if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await approveBtn.click();
      return true;
    }
    // Try icon button approach
    const iconBtn = this.page.locator('table tbody tr').first().locator('button').nth(1);
    if (await iconBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await iconBtn.click();
      return true;
    }
    return false;
  }

  async clickRejectFirst() {
    const rejectBtn = this.page.locator('button[color="error"], [aria-label*="reject" i], button:has(svg)').filter({ hasText: /reject/i }).first();
    if (await rejectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await rejectBtn.click();
      return true;
    }
    const iconBtn = this.page.locator('table tbody tr').first().locator('button').nth(2);
    if (await iconBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await iconBtn.click();
      return true;
    }
    return false;
  }

  async fillApprovalComments(text) {
    const textarea = this.page.locator('textarea, [role="dialog"] input[type="text"]').first();
    if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textarea.fill(text);
    }
  }

  async confirmApprovalDialog() {
    const confirmBtn = this.page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button').filter({ hasText: /approve|reject|confirm|submit/i }).first();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async cancelApprovalDialog() {
    const cancelBtn = this.page.locator('[role="dialog"] button').filter({ hasText: /cancel/i }).first();
    if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cancelBtn.click();
    }
  }

  // ─── History Tab ───────────────────────────
  async gotoHistory() {
    await this.goto();
    await this.clickTab('History');
  }

  async isHistoryFilterToggleVisible() {
    return this.page.locator(this.s.historyFilterToggle).isVisible({ timeout: 3000 }).catch(() => false);
  }

  async clickHistoryFilter() {
    await this.page.locator(this.s.historyFilterToggle).click();
    await this.page.waitForTimeout(300);
  }

  async isHistoryExportVisible() {
    return this.page.locator(this.s.historyExport).isVisible({ timeout: 3000 }).catch(() => false);
  }

  async filterHistoryByStatus(status) {
    await this.page.locator(this.s.historyStatusSelect).click();
    await this.page.waitForTimeout(300);
    const opt = this.page.locator(`[role="option"]`).filter({ hasText: new RegExp(status, 'i') });
    if (await opt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await opt.click();
    }
    await this.page.waitForTimeout(300);
  }

  async getHistoryRowCount() {
    return this.page.locator('table tbody tr').count();
  }

  // ─── Multiple Task Rows ─────────────────────
  async addMultipleTasks(count) {
    for (let i = 0; i < count; i++) {
      await this.clickAddTask();
    }
  }

  async selectProjectByIndex(rowIndex) {
    // Click to open dropdown (MUI Select with inputProps testid on native input)
    const wrapper = this.page.locator(`[data-testid="timesheet-project-select-${rowIndex}"]`).locator('..').locator('..');
    const trigger = wrapper.locator('[role="combobox"]').first();
    if (await trigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      const ariaDisabled = await trigger.getAttribute('aria-disabled').catch(() => null);
      if (ariaDisabled === 'true') return null; // submitted week — selects are locked
      await trigger.click();
    } else {
      // fallback: click the parent select area
      await wrapper.click();
    }
    await this.page.waitForTimeout(500);
    // Pick first non-placeholder option
    const options = this.page.locator('[role="listbox"] [role="option"]');
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent();
      if (text && !text.match(/select project/i)) {
        await options.nth(i).click();
        await this.page.waitForTimeout(300);
        return text.trim();
      }
    }
    // If all are placeholders, click first anyway
    if (count > 0) { await options.first().click(); }
    await this.page.waitForTimeout(300);
    return null;
  }

  async selectTaskByIndex(rowIndex) {
    const wrapper = this.page.locator(`[data-testid="timesheet-task-select-${rowIndex}"]`).locator('..').locator('..');
    const trigger = wrapper.locator('[role="combobox"]').first();
    if (await trigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await trigger.click();
    } else {
      await wrapper.click();
    }
    await this.page.waitForTimeout(500);
    const options = this.page.locator('[role="listbox"] [role="option"]');
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent();
      if (text && !text.match(/select task/i)) {
        await options.nth(i).click();
        await this.page.waitForTimeout(300);
        return text.trim();
      }
    }
    if (count > 0) { await options.first().click(); }
    await this.page.waitForTimeout(300);
    return null;
  }

  async isProjectSelectVisible(rowIndex) {
    const el = this.page.locator(`[data-testid="timesheet-project-select-${rowIndex}"]`);
    return el.isVisible({ timeout: 3000 }).catch(() => false);
  }

  async isNotesFieldVisible(rowIndex) {
    const el = this.page.locator(`[data-testid="timesheet-notes-${rowIndex}"]`);
    return el.isVisible({ timeout: 3000 }).catch(() => false);
  }

  // ─── Status Detection ─────────────────────
  async getTimesheetStatusText() {
    // Try a dedicated testid first
    const statusEl = this.page.locator('[data-testid="timesheet-status"]');
    if (await statusEl.isVisible({ timeout: 1500 }).catch(() => false)) {
      return (await statusEl.textContent()).trim().toLowerCase();
    }
    // Scan all chips and return the first one matching a known timesheet status
    const chips = this.page.locator('.MuiChip-root');
    const count = await chips.count();
    const known = ['draft', 'submitted', 'approved', 'rejected', 'pending'];
    for (let i = 0; i < count; i++) {
      const text = (await chips.nth(i).textContent()).trim().toLowerCase();
      if (known.includes(text)) return text;
    }
    return null;
  }

  async isReadOnlyAlertVisible() {
    const alert = this.page.locator('[role="alert"]').filter({ hasText: /has been submitted|has been approved|read-only/i });
    return alert.isVisible({ timeout: 3000 }).catch(() => false);
  }

  async isFormEditable() {
    // Check if an hour input is NOT disabled
    const input = this.page.locator('[data-testid="timesheet-hours-0-monday"]');
    if (!await input.isVisible({ timeout: 3000 }).catch(() => false)) return false;
    return !(await input.isDisabled());
  }

  // ─── Approval Workflow ─────────────────────
  async getApprovalRowCount() {
    await this.page.waitForTimeout(500);
    return this.page.locator('table tbody tr').count();
  }

  async clickApproveByRow(rowIndex) {
    const row = this.page.locator('table tbody tr').nth(rowIndex);
    const btn = row.locator('[aria-label="Approve timesheet"]');
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async clickRejectByRow(rowIndex) {
    const row = this.page.locator('table tbody tr').nth(rowIndex);
    const btn = row.locator('[aria-label="Reject timesheet"]');
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async isApprovalDialogOpen() {
    return this.page.locator('[role="dialog"]').isVisible({ timeout: 3000 }).catch(() => false);
  }

  async fillDialogComments(text) {
    const textarea = this.page.locator('[role="dialog"] textarea').first();
    if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textarea.fill(text);
      return true;
    }
    return false;
  }

  async clickDialogApprove() {
    const btn = this.page.locator('[role="dialog"] button').filter({ hasText: /^approve$/i }).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(1500);
      return true;
    }
    return false;
  }

  async clickDialogReject() {
    const btn = this.page.locator('[role="dialog"] button').filter({ hasText: /^reject$/i }).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const isDisabled = await btn.isDisabled();
      if (!isDisabled) {
        await btn.click();
        await this.page.waitForTimeout(1500);
        return true;
      }
    }
    return false;
  }

  async isDialogRejectDisabled() {
    const btn = this.page.locator('[role="dialog"] button').filter({ hasText: /^reject$/i }).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      return btn.isDisabled();
    }
    return false;
  }

  async clickDialogCancel() {
    const btn = this.page.locator('[role="dialog"] button').filter({ hasText: /cancel/i }).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(300);
    }
  }

  // ─── Bulk Approval ────────────────────────
  async selectApprovalCheckbox(rowIndex) {
    const row = this.page.locator('table tbody tr').nth(rowIndex);
    const checkbox = row.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await checkbox.click();
      return true;
    }
    return false;
  }

  async isBulkApproveVisible() {
    return this.page.locator('button').filter({ hasText: /approve.*\(/i })
      .isVisible({ timeout: 3000 }).catch(() => false);
  }

  async isBulkRejectVisible() {
    return this.page.locator('button').filter({ hasText: /reject.*\(/i })
      .isVisible({ timeout: 3000 }).catch(() => false);
  }

  // ─── History Status Checks ────────────────
  async getHistoryStatusChips() {
    const chips = this.page.locator('table tbody .MuiChip-root');
    const count = await chips.count();
    const statuses = [];
    for (let i = 0; i < count; i++) {
      statuses.push((await chips.nth(i).textContent()).trim());
    }
    return statuses;
  }

  // ─── Snackbar / Toast Verification ─────────
  async waitForSnackbar(textPattern) {
    const snackbar = this.page.locator('.MuiSnackbar-root, [role="alert"]');
    try {
      await snackbar.waitFor({ state: 'visible', timeout: 5000 });
      if (textPattern) {
        const text = await snackbar.textContent();
        return new RegExp(textPattern, 'i').test(text);
      }
      return true;
    } catch {
      return false;
    }
  }

  async waitForToast(textPattern, timeout = 8000) {
    // Broader snackbar/notistack toast detection
    const selectors = [
      '.MuiSnackbar-root',
      '[role="alert"]',
      '.notistack-SnackbarContainer',
      '#notistack-snackbar',
    ];
    for (const sel of selectors) {
      const el = this.page.locator(sel).first();
      try {
        await el.waitFor({ state: 'visible', timeout: timeout / selectors.length });
        if (textPattern) {
          const text = await el.textContent();
          if (new RegExp(textPattern, 'i').test(text)) return true;
        } else {
          return true;
        }
      } catch { /* try next selector */ }
    }
    return false;
  }

  // ─── Daily / Weekly Totals ─────────────────
  async getDailyTotal(day) {
    // Daily totals row — last row of the table with bold values
    const totalCells = this.page.locator('table tfoot td, table tr:last-child td').filter({ hasText: /^\d+(\.\d+)?$/ });
    // Try data-testid first
    const cell = this.page.locator(`[data-testid="timesheet-daily-total-${day}"]`);
    if (await cell.isVisible({ timeout: 2000 }).catch(() => false)) {
      return parseFloat(await cell.textContent()) || 0;
    }
    return null;
  }

  async getWeeklyTotal() {
    // Look for the grand total (usually bold, in the Total column of summary row)
    const totalEl = this.page.locator('[data-testid="timesheet-weekly-total"]');
    if (await totalEl.isVisible({ timeout: 2000 }).catch(() => false)) {
      return parseFloat(await totalEl.textContent()) || 0;
    }
    // Fallback: look for a bold number in the totals row
    const summaryRow = this.page.locator('table tr').last();
    const cells = summaryRow.locator('td');
    const count = await cells.count();
    if (count > 2) {
      const lastNumCell = cells.nth(count - 3); // Total column is typically 3rd from end
      const text = await lastNumCell.textContent().catch(() => '');
      const val = parseFloat(text);
      if (!isNaN(val)) return val;
    }
    return null;
  }

  // ─── Hours field value getter ──────────────
  async getHoursValue(rowIndex, day) {
    const input = this.page.locator(`[data-testid="timesheet-hours-${rowIndex}-${day}"]`);
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      return await input.inputValue();
    }
    return '';
  }

  // ─── Check if hours field shows error state ──
  async isHoursFieldError(rowIndex, day) {
    const input = this.page.locator(`[data-testid="timesheet-hours-${rowIndex}-${day}"]`);
    const hasError = await input.evaluate(el => {
      return el.classList.contains('Mui-error') ||
        el.closest('.MuiFormControl-root')?.classList.contains('Mui-error') ||
        el.getAttribute('aria-invalid') === 'true';
    }).catch(() => false);
    return hasError;
  }

  // ─── Summary Dashboard Cards ───────────────
  async getSummaryCardValue(cardLabel) {
    // Cards typically have a title and a value — search by label
    const card = this.page.locator('.MuiCard-root, .MuiPaper-root').filter({ hasText: new RegExp(cardLabel, 'i') }).first();
    if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = await card.textContent();
      const nums = text.match(/\d+(\.\d+)?/);
      return nums ? parseFloat(nums[0]) : null;
    }
    return null;
  }

  async areSummaryCardsVisible() {
    const cards = this.page.locator('.MuiCard-root, .MuiPaper-root').filter({ hasText: /pending|approved|rejected|hours/i });
    return (await cards.count()) >= 2;
  }

  // ─── Bulk operations ──────────────────────
  async selectAllApprovalCheckboxes() {
    const headerCheckbox = this.page.locator('table thead input[type="checkbox"]').first();
    if (await headerCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await headerCheckbox.click();
      return true;
    }
    return false;
  }

  async clickBulkApprove() {
    const btn = this.page.locator('button').filter({ hasText: /approve.*\(/i }).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async clickBulkReject() {
    const btn = this.page.locator('button').filter({ hasText: /reject.*\(/i }).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  // ─── Approval search/filter ────────────────
  async searchApproval(text) {
    const search = this.page.locator('[data-testid="ts-approval-search-input"] input, [data-testid="ts-approval-search-input"]').first();
    if (await search.isVisible({ timeout: 3000 }).catch(() => false)) {
      await search.fill(text);
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async filterApprovalByStatus(status) {
    // Open filters panel first
    const filterBtn = this.page.locator('button').filter({ hasText: /filter/i }).first();
    if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterBtn.click();
      await this.page.waitForTimeout(500);
    }
    // MUI Select: data-testid is on hidden <input>; click the visible combobox sibling instead
    const wrapper = this.page.locator('[data-testid="ts-approval-status-select-wrapper"]');
    if (await wrapper.isVisible({ timeout: 3000 }).catch(() => false)) {
      await wrapper.scrollIntoViewIfNeeded();
      await wrapper.click({ force: true });
      await this.page.locator('[role="option"]').filter({ hasText: new RegExp(status, 'i') }).first().click();
      await this.page.waitForTimeout(500);
      return true;
    }
    // Fallback: try combobox role near the status select
    const combobox = this.page.locator('[data-testid="ts-approval-status-select"]').locator('..');
    if (await combobox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await combobox.click({ force: true });
      await this.page.locator('[role="option"]').filter({ hasText: new RegExp(status, 'i') }).first().click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  // ─── History filters ───────────────────────
  async filterHistoryByStatus(status) {
    const select = this.page.locator('[data-testid="ts-history-status-select"]');
    if (await select.isVisible({ timeout: 3000 }).catch(() => false)) {
      await select.click();
      await this.page.locator(`li`).filter({ hasText: new RegExp(status, 'i') }).first().click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async filterHistoryByDateRange(fromDate, toDate) {
    if (fromDate) {
      const from = this.page.locator('[data-testid="ts-history-start-date"] input');
      if (await from.isVisible({ timeout: 2000 }).catch(() => false)) {
        await from.fill(fromDate);
      }
    }
    if (toDate) {
      const to = this.page.locator('[data-testid="ts-history-end-date"] input');
      if (await to.isVisible({ timeout: 2000 }).catch(() => false)) {
        await to.fill(toDate);
      }
    }
    await this.page.waitForTimeout(500);
  }

  // ─── View Details Dialog ───────────────────
  async clickViewDetailsOnRow(rowIndex) {
    const viewBtns = this.page.locator('table tbody tr').nth(rowIndex).locator('button, [aria-label*="View" i]');
    const first = viewBtns.first();
    if (await first.isVisible({ timeout: 3000 }).catch(() => false)) {
      await first.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async isViewDetailsDialogOpen() {
    return this.page.locator('[role="dialog"]').isVisible({ timeout: 3000 }).catch(() => false);
  }

  async getViewDetailsDialogContent() {
    const dialog = this.page.locator('[role="dialog"]');
    if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      return dialog.textContent();
    }
    return '';
  }

  async closeViewDetailsDialog() {
    const closeBtn = this.page.locator('[role="dialog"] button').filter({ hasText: /close/i }).first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
      await this.page.waitForTimeout(300);
    }
  }

  // ─── Approval table row count ──────────────
  async getApprovalTableRowCount() {
    const rows = this.page.locator('table tbody tr');
    return rows.count();
  }
  async getRejectionReason() {
    const alert = this.page.locator('[role="alert"]').filter({ hasText: /rejected/i });
    if (await alert.isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = await alert.textContent();
      const match = text.match(/Reason: (.*)/);
      return match ? match[1].trim() : text;
    }
    return null;
  }

  async clickHistoryRow(rowIndex) {
    const row = this.page.locator('table tbody tr').nth(rowIndex);
    if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
      await row.click();
      await waitForPageReady(this.page);
      return true;
    }
    return false;
  }

  async isSubmitDisabled() {
    const btn = this.page.locator(this.s.submitBtn);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      return btn.isDisabled();
    }
    return true; // Not visible = effectively disabled
  }

  async navigateToWeek(offset = 0) {
    await this.goto();
    if (offset > 0) {
      for (let i = 0; i < offset; i++) {
        const ok = await this.clickNextWeek();
        if (!ok) break; // next-week button disabled — future nav blocked by design
      }
    } else if (offset < 0) {
      for (let i = 0; i < Math.abs(offset); i++) {
        await this.clickPrevWeek();
      }
    }
    await waitForPageReady(this.page);
  }

  /**
   * Navigate to a past week that has no submitted timesheet (editable/empty).
   * Starts at `startOffset` weeks back and keeps going further if still locked.
   */
  async gotoEditableWeek(startOffset = 20) {
    await this.goto();
    for (let i = 0; i < startOffset; i++) {
      await this.clickPrevWeek();
    }
    await waitForPageReady(this.page);
    // If still looks locked, go further until addTask is visible
    for (let j = 0; j < 8; j++) {
      const addVisible = await this.isAddTaskVisible();
      if (addVisible) return;
      await this.clickPrevWeek();
      await this.page.waitForTimeout(400);
    }
  }
}

module.exports = TimesheetPage;
