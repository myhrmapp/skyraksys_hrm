import http from '../http-common';

class PayrollService {
  // Payslip Templates
  async getPayslipTemplates() {
    return http.get('/payslip-templates');
  }

  async getPayslipTemplate(id) {
    return http.get(`/payslip-templates/${id}`);
  }

  async createPayslipTemplate(data) {
    return http.post('/payslip-templates', data);
  }

  async updatePayslipTemplate(id, data) {
    return http.put(`/payslip-templates/${id}`, data);
  }

  async deletePayslipTemplate(id) {
    return http.delete(`/payslip-templates/${id}`);
  }

  async setDefaultPayslipTemplate(id) {
    return http.post(`/payslip-templates/${id}/set-default`);
  }

  async toggleTemplateStatus(id) {
    return http.post(`/payslip-templates/${id}/toggle-status`);
  }

  async duplicateTemplate(id, name) {
    return http.post(`/payslip-templates/${id}/duplicate`, { name });
  }

  async getActiveTemplates() {
    return http.get('/payslip-templates/active');
  }

  // Payroll Processing
  async processPayroll(data) {
    return http.post('/payslips/generate', data);
  }

  async getPayrollHistory(filters) {
    return http.get('/payslips', { params: filters });
  }

  // CSV Import
  async importPayrollCsv(file) {
    const formData = new FormData();
    formData.append('csvFile', file);
    return http.post('/payroll-data/import-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Payslip Calculation Preview
  async calculatePreview({ employeeId, salaryStructure, attendance = {}, options = {} }) {
    return http.post('/payslips/calculate-preview', {
      employeeId,
      salaryStructure,
      attendance,
      options,
    });
  }

  // Aliases used by usePayrollQueries hooks
  async getPayslips(filters) {
    return this.getPayrollHistory(filters);
  }

  async getPayslipById(id) {
    return http.get(`/payslips/${id}`);
  }

  async getPayrollRuns(filters) {
    return http.get('/payslips', { params: { ...filters, groupBy: 'run' } });
  }

  async generatePayslips(data) {
    return this.processPayroll(data);
  }

  async updatePayslip(id, data) {
    return http.put(`/payslips/${id}`, data);
  }

  async approvePayslip(id) {
    return http.put(`/payslips/${id}`, { status: 'Approved' });
  }

  async downloadPayslip(id) {
    return http.get(`/payslips/${id}/pdf`, { responseType: 'blob' });
  }
}

export const payrollService = new PayrollService();
export default payrollService;
