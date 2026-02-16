/**
 * Leave Accrual Service
 * API service for leave accrual management (admin/hr)
 */
import http from '../http-common';

class LeaveAccrualService {
  /**
   * Get accrual status for all employees
   * @param {Object} params - { year }
   */
  async getStatus(params = {}) {
    const response = await http.get('/leave-accrual/status', { params });
    return response.data;
  }

  /**
   * Preview next accrual (dry-run)
   * @param {Object} params - { year, month }
   */
  async preview(params = {}) {
    const response = await http.get('/leave-accrual/preview', { params });
    return response.data;
  }

  /**
   * Run monthly accrual
   * @param {Object} data - { year, month }
   */
  async runAccrual(data = {}) {
    const response = await http.post('/leave-accrual/run', data);
    return response.data;
  }

  /**
   * Run year-end carry-forward
   * @param {Object} data - { newYear }
   */
  async carryForward(data = {}) {
    const response = await http.post('/leave-accrual/carry-forward', data);
    return response.data;
  }
}

export const leaveAccrualService = new LeaveAccrualService();
