import http from '../http-common';

class AttendanceService {
  // Get today's attendance status for the current user
  async getToday() {
    const response = await http.get('/attendance/today');
    return response.data;
  }

  // Get monthly attendance report for the current user
  async getMyReport(year, month) {
    const response = await http.get('/attendance/my/report', { params: { year, month } });
    return response.data;
  }

  // Check in
  async checkIn() {
    const response = await http.post('/attendance/check-in');
    return response.data;
  }

  // Check out
  async checkOut() {
    const response = await http.post('/attendance/check-out');
    return response.data;
  }

  // --- Admin/Manager Methods ---

  // Get daily attendance report for all employees
  async getDailyReport(params = {}) {
    const response = await http.get('/attendance/daily', { params });
    return response.data;
  }

  // Get attendance summary for a date range
  async getSummary(params = {}) {
    const response = await http.get('/attendance/summary', { params });
    return response.data;
  }

  // Manually mark attendance for an employee (admin/manager)
  async markAttendance(data) {
    const response = await http.post('/attendance/mark', data);
    return response.data;
  }
}

export const attendanceService = new AttendanceService();
