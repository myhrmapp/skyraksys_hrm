import http from "../http-common";

class DashboardService {
  async getStats() {
    try {
      const response = await http.get('/dashboard/stats');
      // Backend returns { success, data } — unwrap Axios layer
      return response.data;
    } catch (error) {
      console.error('Dashboard stats error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getAdminStats() {
    return this.getStats();
  }

  async getEmployeeStats() {
    try {
      const response = await http.get('/dashboard/employee-stats');
      // Backend returns { success, data } — unwrap Axios layer
      return response.data;
    } catch (error) {
      console.error('Employee stats error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getManagerStats() {
    // Manager stats are served via /dashboard/stats (auto-detects role)
    return this.getStats();
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
