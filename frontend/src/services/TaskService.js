import http from "../http-common";

class TaskService {
  getAll(params = {}) {
    return http.get('/tasks', { params });
  }

  get(id) {
    return http.get(`/tasks/${id}`);
  }

  create(data) {
    // Ensure required fields are present
    const payload = {
      name: data.name,
      projectId: data.projectId,
      description: data.description || '',
      assignedTo: data.assignedTo || null,
      availableToAll: data.availableToAll || false,
      status: data.status || 'Not Started',
      priority: data.priority || 'Medium',
      estimatedHours: data.estimatedHours || null
    };
    
    return http.post("/tasks", payload);
  }

  update(id, data) {
    return http.put(`/tasks/${id}`, data);
  }

  delete(id) {
    return http.delete(`/tasks/${id}`);
  }

  // Get tasks by project
  getByProject(projectId) {
    return this.getAll({ projectId });
  }

  // Bulk create tasks
  bulkCreate(tasks) {
    return http.post("/tasks/bulk", { tasks });
  }

  // Update task status (for quick status changes)
  updateStatus(id, status) {
    return this.update(id, { status });
  }
}

export const taskService = new TaskService();
export default taskService;
