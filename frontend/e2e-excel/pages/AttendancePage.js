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
    await this.page.goto('/attendance');
    await waitForPageReady(this.page);
  }

  async checkIn() {
    await this.page.locator(this.s.checkInBtn).click();
  }

  async checkOut() {
    await this.page.locator(this.s.checkOutBtn).click();
  }

  async isCheckedIn() {
    return this.page.locator(this.s.checkOutBtn).isVisible({ timeout: 3000 }).catch(() => false);
  }

  async getStatusText() {
    return this.page.locator(this.s.statusChip).textContent();
  }

  async selectMonth(month) {
    await this.page.locator(this.s.monthSelect).click();
    await this.page.locator(`li[data-value="${month}"]`).click();
  }

  async selectYear(year) {
    await this.page.locator(this.s.yearSelect).click();
    await this.page.locator(`li[data-value="${year}"]`).click();
  }

  // ─── Attendance Management (Admin/HR) ──
  async gotoManagement() {
    await this.page.goto('/attendance/manage');
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

  async isDataGridVisible() {
    return this.page.locator(this.s.dataGrid).isVisible({ timeout: 5000 }).catch(() => false);
  }

  // Aliases used by specs
  async getStatus() { return this.getStatusText(); }
  async filterByDate(date) { return this.setDateFilter(date); }
}

module.exports = AttendancePage;
