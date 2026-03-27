import http from '../http-common';
import { normalizeResponse } from './serviceHelpers';

class LeaveService {
  // Get all leaves (filtered by role)
  async getAll(params = {}) {
    const response = await http.get('/leaves', { params });
    return normalizeResponse(response);
  }

  // Get leave by ID
  async get(id) {
    const response = await http.get(`/leaves/${id}`);
    return normalizeResponse(response);
  }

  // Alias used by useLeaveQueries hook
  async getById(id) {
    return this.get(id);
  }

  // Create leave request
  async create(data) {
    const response = await http.post('/leaves', data);
    return normalizeResponse(response);
  }

  // Update leave status (approve/reject)
  async updateStatus(id, status, approverComments = '') {
    const endpoint = status === 'Approved' ? 'approve' : 'reject';
    const response = await http.put(`/leaves/${id}/${endpoint}`, {
      comments: approverComments
    });
    return normalizeResponse(response);
  }

  // Approve leave request
  async approve(id, comments = '') {
    return this.updateStatus(id, 'Approved', comments);
  }

  // Reject leave request
  async reject(id, comments = '') {
    return this.updateStatus(id, 'Rejected', comments);
  }

  // Get leave balance
  async getBalance(employeeId = null) {
    const url = employeeId ? `/leaves/balance/${employeeId}` : '/leaves/balance';
    const response = await http.get(url);
    return normalizeResponse(response);
  }

  // Alias used by useLeaveQueries hook
  async getBalances(employeeId) {
    return this.getBalance(employeeId);
  }

  // Get pending leave approvals
  async getPendingApprovals() {
    const response = await http.get('/leaves', { params: { status: 'Pending' } });
    return normalizeResponse(response);
  }

  // Get leave types
  async getLeaveTypes() {
    const response = await http.get('/leaves/meta/types');
    return normalizeResponse(response);
  }

  // Get leave statistics
  async getStatistics(params = {}) {
    const response = await http.get('/leaves/statistics', { params });
    return normalizeResponse(response);
  }

  // Cancel leave request
  async cancel(id) {
    const response = await http.post(`/leaves/${id}/cancel`);
    return normalizeResponse(response);
  }

  // --- Admin Methods ---

  // Create a new leave balance
  async createBalance(data) {
    const response = await http.post("/admin/leave-balances", data);
    return normalizeResponse(response);
  }

  // Update an existing leave balance
  async updateBalance(id, data) {
    const response = await http.put(`/admin/leave-balances/${id}`, data);
    return normalizeResponse(response);
  }

  // Initialize balances for all employees
  async initializeBalances(data) {
    const response = await http.post("/admin/leave-balances/bulk/initialize", data);
    return normalizeResponse(response);
  }

  // Get leave balances by employee and type (Admin)
  async getLeaveBalanceAdmin(employeeId, leaveTypeId) {
    let url = "/admin/leave-balances?limit=100";
    if (employeeId) url += `&employeeId=${employeeId}`;
    if (leaveTypeId) url += `&leaveTypeId=${leaveTypeId}`;
    const response = await http.get(url);
    return normalizeResponse(response);
  }

  // Get ALL leave balances for admin view (all employees, all types)
  async getAllBalances(params = {}) {
    const response = await http.get('/admin/leave-balances', { params: { limit: 500, ...params } });
    // Response shape: { data: { balances: [...], pagination: {...} } }
    const d = response.data;
    if (Array.isArray(d?.data?.balances)) return d.data.balances;
    if (Array.isArray(d?.data)) return d.data;
    if (Array.isArray(d)) return d;
    return [];
  }

  // --- Manager Methods ---

  // Get pending leave requests for manager approval
  async getPendingForManager() {
    const response = await http.get("/leaves/pending-for-manager");
    return normalizeResponse(response);
  }

  // Approve leave request (used by ManagerLeaveApproval)
  async approveLeave(leaveId, comments = '') {
    const response = await http.put(`/leaves/${leaveId}/approve`, { comments });
    return normalizeResponse(response);
  }

  // Reject leave request (used by ManagerLeaveApproval)
  async rejectLeave(leaveId, comments) {
    const response = await http.put(`/leaves/${leaveId}/reject`, { comments });
    return normalizeResponse(response);
  }

  // Get recent approvals
  async getRecentApprovals() {
    const response = await http.get("/leaves/recent-approvals");
    return normalizeResponse(response);
  }

  // Get current user's own leave balance (any role)
  async getMyBalance() {
    const response = await http.get('/leaves/meta/balance');
    return normalizeResponse(response);
  }
}

export const leaveService = new LeaveService();
