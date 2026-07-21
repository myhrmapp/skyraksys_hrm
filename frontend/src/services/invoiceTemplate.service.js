import apiService from './api.service';

const invoiceTemplateService = {
  getAll: () => {
    return apiService.get('/invoice-templates');
  },

  getById: (id) => {
    return apiService.get(`/invoice-templates/${id}`);
  },

  create: (data) => {
    return apiService.post('/invoice-templates', data);
  },

  update: (id, data) => {
    return apiService.put(`/invoice-templates/${id}`, data);
  },

  delete: (id) => {
    return apiService.delete(`/invoice-templates/${id}`);
  }
};

export default invoiceTemplateService;
