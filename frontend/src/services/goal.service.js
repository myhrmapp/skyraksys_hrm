import apiService from './api.service';

const goalService = {
  getMyGoals: () => {
    return apiService.get('/goals/my-goals');
  },

  getEmployeeGoals: (employeeId) => {
    return apiService.get(`/goals/employee/${employeeId}`);
  },

  createGoal: (data) => {
    return apiService.post('/goals', data);
  },

  updateGoal: (id, data) => {
    return apiService.put(`/goals/${id}`, data);
  },

  deleteGoal: (id) => {
    return apiService.delete(`/goals/${id}`);
  },

  addKeyResult: (goalId, data) => {
    return apiService.post(`/goals/${goalId}/key-results`, data);
  },

  updateKeyResult: (goalId, krId, data) => {
    return apiService.put(`/goals/${goalId}/key-results/${krId}`, data);
  },

  deleteKeyResult: (goalId, krId) => {
    return apiService.delete(`/goals/${goalId}/key-results/${krId}`);
  }
};

export default goalService;
