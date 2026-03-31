import http from '../http-common';
import logger from '../utils/logger';

/**
 * TimesheetService
 *
 * Thin API wrapper — only methods actively consumed by components are kept.
 *
 * Consumers:
 *   ModernWeeklyTimesheet  → getAll, getByWeek, createBatch, bulkUpdate, bulkSubmit
 *   TimesheetApproval      → getPendingApprovals, getStats, bulkApprove, bulkReject
 *   TimesheetHistory       → getAll
 */
class TimesheetService {
  // ---- Read ----------------------------------------------------------------

  /** Get all timesheets (RBAC-filtered by the backend). */
  async getAll(params = {}) {
    const response = await http.get('/timesheets', { params });
    return response.data;
  }

  /** Get a single timesheet by UUID. */
  async getById(id) {
    const response = await http.get(`/timesheets/${id}`);
    return response.data.data;
  }

  /**
   * Get timesheets for a specific ISO week.
   * Logs a warning if the backend returns entries from a different week.
   */
  async getByWeek(weekStartDate, employeeId = null) {
    const params = { weekStartDate };
    if (employeeId) params.employeeId = employeeId;

    const response = await http.get('/timesheets', { params });

    if (response.data?.data?.length > 0) {
      const mismatched = response.data.data.filter((ts) => ts.weekStartDate !== weekStartDate);
      if (mismatched.length > 0) {
        logger.warn('Week mismatch in getByWeek response', {
          requested: weekStartDate,
          mismatched: mismatched.map((ts) => ({ id: ts.id, actualWeekStart: ts.weekStartDate })),
        });
      }
    }

    return response.data; // H-03: normalised — matches all other service methods
  }

  /** Get pending timesheets for manager/admin/HR approval. */
  async getPendingApprovals(params = {}) {
    const response = await http.get('/timesheets/approval/pending', { params });
    return response.data;
  }

  /** Get aggregated timesheet statistics. */
  async getStats(params = {}) {
    const response = await http.get('/timesheets/stats/summary', { params });
    return response.data;
  }

  /** Get all historical timesheets. Replaces the generic getAll. */
  async getHistory(params = {}) {
    const response = await http.get('/timesheets/history', { params });
    return response.data;
  }

  // ---- Write (employee) ---------------------------------------------------

  /** Create multiple new timesheet entries in one request. */
  async createBatch(timesheets) {
    const response = await http.post('/timesheets/bulk-save', { entries: timesheets });
    return response.data; // H-03: normalised — matches all other service methods
  }

  /** Update multiple existing timesheet entries. */
  async bulkUpdate(timesheets) {
    const response = await http.put('/timesheets/bulk-update', { updates: timesheets });
    return response.data;
  }

  /** Submit multiple timesheets for approval. */
  async bulkSubmit(timesheetIds) {
    const response = await http.post('/timesheets/bulk-submit', { timesheetIds });
    return response.data;
  }

  // ---- Write (manager / admin / HR) ---------------------------------------

  /** Approve multiple submitted timesheets. */
  async bulkApprove(timesheetIds, comments = '') {
    const response = await http.post('/timesheets/bulk-approve', { timesheetIds, comments });
    return response.data;
  }

  /** Reject multiple submitted timesheets (comments required by backend). */
  async bulkReject(timesheetIds, comments) {
    const response = await http.post('/timesheets/bulk-reject', { timesheetIds, comments });
    return response.data;
  }
}

export const timesheetService = new TimesheetService();
