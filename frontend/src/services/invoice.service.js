import http from '../http-common';

class InvoiceService {
  buildConfig(secretPhrase, params = undefined) {
    const config = {};
    if (params) {
      config.params = params;
    }
    if (secretPhrase) {
      config.headers = {
        'x-invoice-secret-phrase': secretPhrase
      };
    }
    return config;
  }

  async getInvoices(params = {}, secretPhrase = '') {
    return http.get('/invoices', this.buildConfig(secretPhrase, params));
  }

  async getInvoiceById(id, secretPhrase = '') {
    return http.get(`/invoices/${id}`, this.buildConfig(secretPhrase));
  }

  async createInvoice(payload, secretPhrase = '') {
    return http.post('/invoices', payload, this.buildConfig(secretPhrase));
  }

  async updateInvoice(id, payload, secretPhrase = '') {
    return http.put(`/invoices/${id}`, payload, this.buildConfig(secretPhrase));
  }

  async deleteInvoice(id) {
    return http.delete(`/invoices/${id}`);
  }

  async updateStatus(id, status) {
    return http.patch(`/invoices/${id}/status`, { status });
  }

  async getTemplates(secretPhrase = '') {
    return http.get('/invoices/templates', this.buildConfig(secretPhrase));
  }

  async createTemplate(payload, secretPhrase = '') {
    return http.post('/invoices/templates', payload, this.buildConfig(secretPhrase));
  }

  async updateTemplate(id, payload, secretPhrase = '') {
    return http.put(`/invoices/templates/${id}`, payload, this.buildConfig(secretPhrase));
  }

  async rotateSecretPhrase(payload) {
    return http.post('/invoices/secret-phrase/rotate', payload);
  }

  async getHoursSummary(month, year, employeeId = '') {
    const params = { month, year };
    if (employeeId) params.employeeId = employeeId;
    return http.get('/invoices/hours-summary', { params });
  }
}

export const invoiceService = new InvoiceService();
export default invoiceService;
