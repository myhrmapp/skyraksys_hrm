import api from './client';

export interface TimesheetEntry {
  id?: string;
  employeeId: string;
  projectId: string;
  taskId: string;
  weekStartDate: string;
  weekEndDate?: string;
  mondayHours: number;
  tuesdayHours: number;
  wednesdayHours: number;
  thursdayHours: number;
  fridayHours: number;
  saturdayHours: number;
  sundayHours: number;
  totalHoursWorked: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  notes?: string;
  project?: { name: string };
  task?: { name: string };
  employee?: { firstName: string; lastName: string };
}

export const timesheetsApi = {
  getWeek: async (weekStart: string, employeeId?: string): Promise<TimesheetEntry[]> => {
    const config = employeeId ? { params: { employeeId } } : {};
    const { data } = await api.get(`/timesheets/week/${weekStart}`, config);
    return data.data || data;
  },

  getMy: async (): Promise<TimesheetEntry[]> => {
    const { data } = await api.get('/timesheets/me');
    return data.data || data;
  },

  bulkSave: async (entries: Partial<TimesheetEntry>[]): Promise<TimesheetEntry[]> => {
    const { data } = await api.post('/timesheets/bulk-save', { timesheets: entries });
    return data.data || data;
  },

  submitWeek: async (weekStart: string) => {
    const { data } = await api.post('/timesheets/week/submit', { weekStartDate: weekStart });
    return data;
  },

  // Manager endpoints
  getPending: async (): Promise<TimesheetEntry[]> => {
    const { data } = await api.get('/timesheets/approval/pending');
    return data.data || data;
  },

  approve: async (id: string) => {
    const { data } = await api.post(`/timesheets/${id}/approve`);
    return data;
  },

  reject: async (id: string, reason?: string) => {
    const { data } = await api.post(`/timesheets/${id}/reject`, { reason });
    return data;
  },
};
