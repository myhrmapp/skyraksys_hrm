import http from '../http-common';

class LeaveBalanceAdminService {
  // Get all leave balances with pagination
  async getAll(params = {}) {
    const response = await http.get('/admin/leave-balances', { params });
    return response.data;
  }

  // Get specific leave balance
  async get(id) {
    const response = await http.get(`/admin/leave-balances/${id}`);
    return response.data;
  }

  // Create new leave balance
  async create(data) {
    const response = await http.post('/admin/leave-balances', data);
    return response.data;
  }

  // Update leave balance
  async update(id, data) {
    const response = await http.put(`/admin/leave-balances/${id}`, data);
    return response.data;
  }

  // Delete leave balance
  async delete(id) {
    const response = await http.delete(`/admin/leave-balances/${id}`);
    return response.data;
  }

  // Bulk initialize leave balances for all employees
  async bulkInitialize(data) {
    const response = await http.post('/admin/leave-balances/bulk/initialize', data);
    return response.data;
  }

  // Get leave balance summary
  async getSummary(params = {}) {
    const response = await http.get('/admin/leave-balances/summary/overview', { params });
    return response.data;
  }

  // Get all employees for leave balance management
  async getEmployees() {
    const response = await http.get('/employees', {
      params: { limit: 1000 }
    });
    return response.data;
  }

  // Get all leave types
  async getLeaveTypes() {
    const response = await http.get('/leaves/meta/types');
    return response.data;
  }
}

export const leaveBalanceAdminService = new LeaveBalanceAdminService();
