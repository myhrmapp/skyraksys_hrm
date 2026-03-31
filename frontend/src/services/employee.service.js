import http from '../http-common';
import { normalizeResponse } from './serviceHelpers';

class EmployeeService {
  // Get all employees (filtered by role)
  async getAll(params = {}) {
    const response = await http.get('/employees', { params });
    return normalizeResponse(response);
  }

  // Get employee by ID
  async getById(id) {
    const response = await http.get(`/employees/${id}`);
    return normalizeResponse(response);
  }

  // Get current user's employee profile
  async getMyProfile() {
    const response = await http.get('/employees/me');
    if (response && response.data && response.data.data) {
      return response.data.data;
    }
    // Fallback to normalizeResponse if structure changes
    const normalized = normalizeResponse(response);
    return normalized;
  }

  // Get audit history for employee (placeholder)
  async getAuditHistory(employeeId) {
    // Return empty audit history for now since the endpoint doesn't exist yet
    return Promise.resolve({ 
      data: { 
        success: true, 
        data: [] 
      } 
    });
  }

  // Create new employee
  async create(data) {
    const response = await http.post('/employees', data);
    return normalizeResponse(response);
  }

  // Create new employee with photo
  async createWithPhoto(data, photo) {
    const formData = new FormData();
    
    // Handle complex objects separately - they need to be stringified for FormData
    const { salaryStructure, salary, ...employeeData } = data;
    
    // Add all simple employee form data (strings, numbers, dates)
    Object.keys(employeeData).forEach(key => {
      const value = employeeData[key];
      // Skip null, undefined, empty strings, and objects (objects should be handled separately)
      if (value !== null && value !== undefined && value !== '' && typeof value !== 'object') {
        formData.append(key, value);
      }
    });
    
    // Add salary as JSON string if it exists (comprehensive salary structure)
    if (salary && typeof salary === 'object') {
      formData.append('salary', JSON.stringify(salary));
    }
    
    // Add salary structure as JSON string if it exists (legacy format)
    if (salaryStructure && typeof salaryStructure === 'object') {
      formData.append('salaryStructure', JSON.stringify(salaryStructure));
    }
    
    // Add photo if provided
    if (photo) {
      formData.append('photo', photo);
    }
    
    const response = await http.post('/employees', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return normalizeResponse(response);
  }

  // Upload photo for existing employee
  async uploadPhoto(employeeId, photo) {
    const formData = new FormData();
    formData.append('photo', photo);
    
    const response = await http.post(`/employees/${employeeId}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return normalizeResponse(response);
  }

  // Update employee
  async update(id, data) {
    const response = await http.put(`/employees/${id}`, data);
    return normalizeResponse(response);
  }

  // Update employee compensation (salary)
  async updateCompensation(id, salary) {
    const response = await http.put(`/employees/${id}/compensation`, { salary });
    return normalizeResponse(response);
  }

  // Delete/deactivate employee
  async delete(id) {
    const response = await http.delete(`/employees/${id}`);
    return normalizeResponse(response);
  }

  // Get departments
  async getDepartments() {
    const response = await http.get('/employees/departments');
    return normalizeResponse(response);
  }

  // Get positions
  async getPositions() {
    const response = await http.get('/employees/meta/positions');
    return normalizeResponse(response);
  }

  // Search employees
  async search(query, filters = {}) {
    const params = { search: query, ...filters };
    const response = await http.get('/employees', { params });
    return normalizeResponse(response);
  }

  // Check if an employee email already exists (async uniqueness)
  async checkEmailExists(email) {
    if (!email) return false;
    try {
      const res = await this.search(email);
      const list = res?.data || res || [];
      return Array.isArray(list) && list.some(emp => (emp.email || '').toLowerCase() === email.toLowerCase());
    } catch {
      return false; // fail-open to avoid blocking
    }
  }

  // Check if an employeeId already exists
  async checkEmployeeIdExists(employeeId) {
    if (!employeeId) return false;
    try {
      const res = await http.get(`/employees/by-employee-id/${employeeId}`);
      const data = res?.data?.data || res?.data;
      return !!data; // exists if data returned
    } catch {
      return false;
    }
  }

  // Get employee statistics
  async getStatistics() {
    try {
      const response = await http.get('/employees/statistics');
      return response.data;
    } catch (error) {
      // Fallback to basic count if statistics endpoint doesn't exist
      const allEmployees = await this.getAll();
      const employees = allEmployees.data || allEmployees;
      
      const active = employees.filter(emp => emp.status === 'Active').length;
      const inactive = employees.filter(emp => emp.status === 'Inactive').length;
      const thisMonth = employees.filter(emp => {
        const hireDate = new Date(emp.hireDate);
        const now = new Date();
        return hireDate.getMonth() === now.getMonth() && hireDate.getFullYear() === now.getFullYear();
      }).length;

      return {
        data: {
          total: employees.length,
          active,
          inactive,
          newThisMonth: thisMonth
        }
      };
    }
  }

  // Update employee status
  async updateStatus(id, status) {
    const response = await http.patch(`/employees/${id}/status`, { status });
    return response.data;
  }

  // Export employees
  async exportEmployees(filters = {}) {
    const response = await http.get('/employees/export', { 
      params: filters,
      responseType: 'blob'
    });
    return response;
  }

  // Get managers for dropdown (admin/hr/manager only)
  async getManagers() {
    try {
      const response = await http.get('/employees/managers');
      return { data: { data: response.data?.data || response.data } };
    } catch (error) {
      console.error('Error fetching managers:', error);
      return { data: { data: [] } };
    }
  }

  // Bulk operations
  async bulkUpdate(employeeIds, updateData) {
    const response = await http.post('/employees/bulk-update', {
      employeeIds,
      updateData
    });
    return response.data;
  }

  // Get employee by employee ID (not database ID)
  async getByEmployeeId(employeeId) {
    const response = await http.get(`/employees/by-employee-id/${employeeId}`);
    return response.data;
  }

  // --- Consolidated Methods from EmployeeService.js ---

  // Get team members for a manager (by explicit manager employee ID — admin/hr use)
  async getTeamMembers(managerId) {
    const response = await http.get(`/employees/manager/${managerId}/team`);
    return response.data;
  }

  // Get current user's own team (manager self-service — no ID needed)
  async getMyTeam() {
    const response = await http.get('/employees/team-members');
    return response.data;
  }

  // Get active employees
  async getActiveEmployees() {
    return this.getAll({ status: 'Active' });
  }

  // Get current user profile (alias)
  async getCurrentProfile() {
    return this.getMyProfile();
  }
}

export const employeeService = new EmployeeService();
