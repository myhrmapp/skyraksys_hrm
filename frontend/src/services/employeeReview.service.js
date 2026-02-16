/**
 * Employee Review Service
 * API service for employee review/performance management
 */
import http from '../http-common';

class EmployeeReviewService {
  /**
   * Get all employee reviews (paginated, filtered, role-based)
   * @param {Object} params - { employeeId, reviewerId, status, reviewType, reviewPeriod, page, limit }
   */
  async getAll(params = {}) {
    const response = await http.get('/employee-reviews', { params });
    return response.data;
  }

  /**
   * Get a single employee review by ID
   */
  async getById(id) {
    const response = await http.get(`/employee-reviews/${id}`);
    return response.data;
  }

  /**
   * Create a new employee review (admin/hr/manager only)
   */
  async create(data) {
    const response = await http.post('/employee-reviews', data);
    return response.data;
  }

  /**
   * Update an employee review
   * Employee: can only update employeeSelfAssessment
   * Manager: own reviews. Admin/HR: any.
   */
  async update(id, data) {
    const response = await http.put(`/employee-reviews/${id}`, data);
    return response.data;
  }

  /**
   * Update review status (submit, approve, etc.)
   */
  async updateStatus(id, data) {
    const response = await http.put(`/employee-reviews/${id}/status`, data);
    return response.data;
  }

  /**
   * HR Approve a review
   */
  async hrApprove(id, reason = '') {
    return this.updateStatus(id, { hrApproved: true, reason });
  }

  /**
   * Delete an employee review (admin/hr only, soft delete)
   */
  async delete(id) {
    const response = await http.delete(`/employee-reviews/${id}`);
    return response.data;
  }

  /**
   * Get review dashboard stats
   */
  async getDashboardStats() {
    const response = await http.get('/employee-reviews/meta/dashboard');
    return response.data;
  }
}

export const employeeReviewService = new EmployeeReviewService();
