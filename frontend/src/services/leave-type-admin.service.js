import http from '../http-common';

class LeaveTypeAdminService {
  async getAll() {
    const response = await http.get('/admin/leave-types');
    return response.data;
  }

  async create(data) {
    const response = await http.post('/admin/leave-types', data);
    return response.data;
  }

  async update(id, data) {
    const response = await http.put(`/admin/leave-types/${id}`, data);
    return response.data;
  }

  async remove(id) {
    const response = await http.delete(`/admin/leave-types/${id}`);
    return response.data;
  }
}

export default new LeaveTypeAdminService();
