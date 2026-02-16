import http from "../http-common";

class ProjectService {
  getAll(params = {}) {
    return http.get('/projects', { params });
  }

  get(id) {
    return http.get(`/projects/${id}`);
  }

  create(data) {
    // Ensure required fields are present
    const payload = {
      name: data.name,
      description: data.description || '',
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      status: data.status || 'Planning',
      clientName: data.clientName || '',
      managerId: data.managerId || null
    };
    
    return http.post("/projects", payload);
  }

  update(id, data) {
    return http.put(`/projects/${id}`, data);
  }

  delete(id) {
    return http.delete(`/projects/${id}`);
  }

  // Get project statistics
  getStats(id) {
    return http.get(`/projects/${id}/stats`);
  }

  // Get projects with their tasks
  getProjectsWithTasks(params) {
    return this.getAll(params);
  }

  // Get active projects only
  getActiveProjects() {
    return this.getAll({ status: 'Active' });
  }
}

export const projectService = new ProjectService();
export default projectService;
