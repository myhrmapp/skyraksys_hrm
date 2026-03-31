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

/** Unwrap paginated or flat array */
function extractArray<T>(raw: any): T[] {
  if (Array.isArray(raw)) return raw;
  if (raw?.data && Array.isArray(raw.data)) return raw.data;
  return [];
}

export const attendanceApi = {
  getToday: async (): Promise<TodayAttendance> => {
    const { data } = await api.get('/attendance/today');
    const raw = data.data || data;
    // Backend returns raw Attendance record (or null); derive checkedIn
    return {
      id: raw?.id,
      checkedIn: !!raw?.checkIn,
      checkIn: raw?.checkIn ?? null,
      checkOut: raw?.checkOut ?? null,
      status: raw?.status ?? 'absent',
    };
  },

  getMy: async (params?: { month?: number; year?: number }): Promise<AttendanceRecord[]> => {
    // Backend /my requires startDate & endDate; compute from month/year
    const month = params?.month ?? new Date().getMonth() + 1;
    const year = params?.year ?? new Date().getFullYear();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const { data } = await api.get('/attendance/my', { params: { startDate, endDate } });
    return extractArray<AttendanceRecord>(data.data ?? data);
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
