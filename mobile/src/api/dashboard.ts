import api from './client';

export interface LeaveBalanceMap {
  [key: string]: { remaining: number; total: number; used: number };
}

export interface DashboardStats {
  // Top-level flat fields (from /dashboard/stats)
  totalEmployees?: number;
  presentToday?: number;
  onLeaveToday?: number;
  pendingLeaves?: number;
  pendingTimesheets?: number;
  attendancePercentage?: number;
  openTasks?: number;
  hoursThisWeek?: number;
  // Fields from /dashboard/employee-stats (nested)
  leaveBalance?: LeaveBalanceMap | number;
  currentMonth?: {
    hoursWorked: number;
    expectedHours: number;
    daysWorked: number;
    efficiency: number;
  };
  pendingRequests?: {
    leaves: number;
    timesheets: number;
  };
  recentActivity?: unknown[];
  upcomingLeaves?: unknown[];
  [key: string]: unknown;
}

export const dashboardApi = {
  getEmployeeStats: async (): Promise<DashboardStats> => {
    const { data } = await api.get('/dashboard/employee-stats');
    return data.data || data;
  },

  getStats: async (): Promise<DashboardStats> => {
    const { data } = await api.get('/dashboard/stats');
    return data.data || data;
  },

  getAdminStats: async (): Promise<DashboardStats> => {
    const { data } = await api.get('/dashboard/admin-stats');
    return data.data || data;
  },
};
