import http from '../http-common';
import logger from '../utils/logger';

class TimesheetService {
  // Get all timesheets (filtered by role)
  async getAll(params = {}) {
    const response = await http.get('/timesheets', { params });
    return response.data;
  }

  // Get timesheet by ID
  async get(id) {
    const response = await http.get(`/timesheets/${id}`);
    return response.data.data;
  }

  // Alias used by useTimesheetQueries hook
  async getById(id) {
    return this.get(id);
  }

  // Create timesheet entry (save as draft)
  async create(data) {
    const response = await http.post('/timesheets', data);
    return response.data.data;
  }

  // Update timesheet status (approve/reject)
  async updateStatus(id, status, comments = '') {
    // Route to correct endpoint based on action
    const endpoint = (status === 'rejected' || status === 'reject')
      ? `/timesheets/${id}/reject`
      : `/timesheets/${id}/approve`;
    
    const response = await http.post(endpoint, {
      comments // Backend expects 'comments' in body for approve/reject
    });
    return response.data.data;
  }

  // Submit timesheet for approval
  async submit(id) {
    const response = await http.patch(`/timesheets/${id}/submit`);
    return response.data.data;
  }

  // Update timesheet data
  async update(id, data) {
    const response = await http.put(`/timesheets/${id}`, data);
    return response.data.data;
  }

  // Get timesheet summary
  async getSummary(employeeId = null, params = {}) {
    const url = '/timesheets/stats/summary';
    const queryParams = { ...params };
    if (employeeId) {
      queryParams.employeeId = employeeId;
    }
    const response = await http.get(url, { params: queryParams });
    return response.data.data;
  }

  // Get projects
  async getProjects() {
    const response = await http.get('/projects');
    return response.data.data;
  }

  // Get tasks for a project
  async getTasks(projectId) {
    const response = await http.get(`/projects/${projectId}/tasks`);
    return response.data.data;
  }

  // Get timesheet history for an employee
  async getHistory(employeeId = null, params = {}) {
    const url = employeeId && (params.userRole === 'admin' || params.userRole === 'hr')
      ? `/timesheets?employeeId=${employeeId}`
      : '/timesheets';
    
    const response = await http.get(url, { params: { ...params, limit: 50, sortBy: 'weekStartDate', sortOrder: 'DESC' } });
    return response.data;
  }

  // Get pending timesheets for approval
  async getPending() {
    const response = await http.get('/timesheets', { params: { status: 'submitted' } });
    return response.data;
  }

  // Create batch of timesheets
  async createBatch(timesheets) {
    const response = await http.post('/timesheets/bulk-save', { entries: timesheets });
    return response;
  }

  // Get timesheets by week
  async getByWeek(weekStartDate, employeeId = null) {
    const params = { weekStartDate: weekStartDate };
    
    // Include employeeId if provided (for admin users to filter specific employee)
    if (employeeId) {
      params.employeeId = employeeId;
    }
    
    const response = await http.get('/timesheets', { params });
    
    // Detailed data analysis
    if (response.data && response.data.data && response.data.data.length > 0) {
      // Check if all timesheets belong to the requested week
      const requestedWeekStart = weekStartDate;
      const mismatchedTimesheets = response.data.data.filter(ts => ts.weekStartDate !== requestedWeekStart);
      if (mismatchedTimesheets.length > 0) {
        logger.warn('⚠️ WEEK MISMATCH DETECTED:', {
          requested: requestedWeekStart,
          mismatched: mismatchedTimesheets.map(ts => ({
            id: ts.id,
            actualWeekStart: ts.weekStartDate,
            status: ts.status
          }))
        });
      }
    }
    
    return response;
  }

  // Bulk submit multiple timesheets
  async bulkSubmit(timesheetIds) {
    const response = await http.post('/timesheets/bulk-submit', {
      timesheetIds
    });
    return response.data;
  }

  // Bulk save multiple timesheets
  async bulkSave(timesheets) {
    const response = await http.post('/timesheets/bulk-save', {
      entries: timesheets
    });
    return response.data;
  }

  // Bulk update multiple timesheets
  async bulkUpdate(timesheets) {
    const response = await http.put('/timesheets/bulk-update', {
      updates: timesheets
    });
    return response.data;
  }

  // Bulk approve multiple timesheets
  async bulkApprove(timesheetIds, comments = '') {
    const response = await http.post('/timesheets/bulk-approve', {
      timesheetIds,
      comments
    });
    return response.data;
  }

  // Bulk reject multiple timesheets
  async bulkReject(timesheetIds, comments) {
    const response = await http.post('/timesheets/bulk-reject', {
      timesheetIds,
      comments
    });
    return response.data;
  }

  // Get pending timesheets for approval (admin/manager/hr)
  async getPendingApprovals(params = {}) {
    const response = await http.get('/timesheets/approval/pending', { params });
    return response.data;
  }

  // Get timesheet statistics summary
  async getStats(params = {}) {
    const response = await http.get('/timesheets/stats/summary', { params });
    return response.data;
  }

  // Approve a timesheet
  async approve(id, data) {
    const response = await http.post(`/timesheets/${id}/approve`, data);
    return response.data;
  }
}

export const timesheetService = new TimesheetService();
