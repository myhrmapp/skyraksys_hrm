import api from './api.service';

const clientService = {
  getAll: () => {
    return api.get('/clients');
  },

  getById: (id) => {
    return api.get(`/clients/${id}`);
  },

  create: (data) => {
    return api.post('/clients', data);
  },

  update: (id, data) => {
    return api.put(`/clients/${id}`, data);
  },

  delete: (id) => {
    return api.delete(`/clients/${id}`);
  }
};

export default clientService;
