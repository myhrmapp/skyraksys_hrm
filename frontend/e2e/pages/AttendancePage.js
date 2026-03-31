/**
 * Attendance Page Object Model — My Attendance & Management
 */
const selectors = require('../lib/object-repository');
const { waitForPageReady } = require('../fixtures/test-fixtures');

class AttendancePage {
  constructor(page) {
    this.page = page;
    this.s = selectors.attendance;
  }

  // ─── My Attendance (Employee) ──────────
  async gotoMyAttendance() {
    await this.page.goto('/my-attendance');
    await waitForPageReady(this.page);
  }

  async checkIn() {
    const btn = this.page.locator(this.s.checkInBtn);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      return true;
    }
    return false;
  }

  async checkOut() {
    const btn = this.page.locator(this.s.checkOutBtn);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      return true;
    }
    return false;
  }

  async isCheckedIn() {
    return this.page.locator(this.s.checkOutBtn).isVisible({ timeout: 3000 }).catch(() => false);
  }

  async getStatusText() {
    const chip = this.page.locator(this.s.statusChip);
    if (await chip.isVisible({ timeout: 3000 }).catch(() => false)) {
      return chip.textContent();
    }
    return '';
  }

  async selectMonth(month) {
    await this.page.locator(this.s.monthSelect).locator('[role="combobox"]').click();
    // MUI Select renders options with role="option"; try data-value first, then text
    const byValue = this.page.locator(`li[data-value="${month}"]`);
    const byText = this.page.locator(`[role="option"]`).filter({ hasText: new RegExp(`^${month}$`, 'i') });
    if (await byValue.isVisible({ timeout: 2000 }).catch(() => false)) {
      await byValue.click();
    } else {
      await byText.first().click();
    }
  }

  async selectYear(year) {
    await this.page.locator(this.s.yearSelect).locator('[role="combobox"]').click();
    const byValue = this.page.locator(`li[data-value="${year}"]`);
    const byText = this.page.locator(`[role="option"]`).filter({ hasText: new RegExp(`^${year}$`, 'i') });
    if (await byValue.isVisible({ timeout: 2000 }).catch(() => false)) {
      await byValue.click();
    } else {
      await byText.first().click();
    }
  }

  // ─── Attendance Management (Admin/HR) ──
  async gotoManagement() {
    await this.page.goto('/attendance-management');
    await waitForPageReady(this.page);
  }

  async setDateFilter(date) {
    await this.page.locator(`${this.s.dateFilter} input`).fill(date);
  }

  async clickMarkAttendance() {
    await this.page.locator(this.s.markBtn).click();
  }

  async saveMarkAttendance() {
    await this.page.locator(this.s.markSaveBtn).click();
  }

  async cancelMarkDialog() {
    const btn = this.page.locator('[role="dialog"] button:has-text("Cancel"), button[data-testid*="cancel"]').first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      return true;
    }
    return false;
  }

  async isDataGridVisible() {
    return this.page.locator(this.s.dataGrid).isVisible({ timeout: 5000 }).catch(() => false);
  }

  async isMyPageVisible() {
    return this.page.locator(this.s.myPage).isVisible({ timeout: 5000 }).catch(() => false);
  }

  // Aliases used by specs
  async getStatus() { return this.getStatusText(); }
  async filterByDate(date) { return this.setDateFilter(date); }
}

module.exports = AttendancePage;
