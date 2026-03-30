import api from './client';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: 'present' | 'absent' | 'half-day' | 'on-leave' | 'holiday' | 'weekend' | 'late';
  hoursWorked: number | null;
  lateMinutes: number | null;
  source: string;
  notes: string | null;
}

export interface TodayAttendance {
  id?: string;
  checkedIn: boolean;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
}

export const attendanceApi = {
  getToday: async (): Promise<TodayAttendance> => {
    const { data } = await api.get('/attendance/today');
    return data.data || data;
  },

  getMy: async (params?: { month?: number; year?: number }): Promise<AttendanceRecord[]> => {
    const { data } = await api.get('/attendance/my', { params });
    return data.data || data;
  },

  getMyReport: async (params?: { month?: number; year?: number }) => {
    const { data } = await api.get('/attendance/my/report', { params });
    return data.data || data;
  },

  checkIn: async (): Promise<AttendanceRecord> => {
    const { data } = await api.post('/attendance/check-in');
    return data.data || data;
  },

  checkOut: async (): Promise<AttendanceRecord> => {
    const { data } = await api.post('/attendance/check-out');
    return data.data || data;
  },

  // Manager: team summary
  getSummary: async (params?: { date?: string }) => {
    const { data } = await api.get('/attendance/summary', { params });
    return data.data || data;
  },
};
