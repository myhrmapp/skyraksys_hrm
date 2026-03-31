import api from './client';

/** Unwrap paginated or flat array from ApiResponse.success({ data: rows, pagination }) */
function extractArray<T>(raw: any): T[] {
  if (Array.isArray(raw)) return raw;
  if (raw?.data && Array.isArray(raw.data)) return raw.data;
  return [];
}

export type TimesheetStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected';

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
  status: TimesheetStatus;
  description?: string;
  notes?: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  approvedBy?: string;
  rejectedBy?: string;
  approverComments?: string;
  project?: { name: string };
  task?: { name: string };
  employee?: { firstName: string; lastName: string };
}

export const timesheetsApi = {
  getWeek: async (weekStart: string, employeeId?: string): Promise<TimesheetEntry[]> => {
    const config = employeeId ? { params: { employeeId } } : {};
    const { data } = await api.get(`/timesheets/week/${weekStart}`, config);
    return extractArray<TimesheetEntry>(data.data ?? data);
  },

  getMy: async (): Promise<TimesheetEntry[]> => {
    const { data } = await api.get('/timesheets/me');
    return extractArray<TimesheetEntry>(data.data ?? data);
  },

  bulkSave: async (entries: Partial<TimesheetEntry>[]): Promise<TimesheetEntry[]> => {
    const { data } = await api.post('/timesheets/bulk-save', { entries });
    return extractArray<TimesheetEntry>(data.data ?? data);
  },

  create: async (entry: {
    projectId: string;
    taskId: string;
    weekStartDate: string;
    weekEndDate: string;
  }): Promise<TimesheetEntry> => {
    const { data } = await api.post('/timesheets', entry);
    return data.data || data;
  },

  submitWeek: async (weekStart: string) => {
    const { data } = await api.post('/timesheets/week/submit', { weekStartDate: weekStart });
    return data;
  },

  // Manager endpoints
  getPending: async (): Promise<TimesheetEntry[]> => {
    const { data } = await api.get('/timesheets/approval/pending');
    return extractArray<TimesheetEntry>(data.data ?? data);
  },

  approve: async (id: string, comments?: string) => {
    const { data } = await api.post(`/timesheets/${id}/approve`, { comments });
    return data;
  },

  reject: async (id: string, comments: string) => {
    const { data } = await api.post(`/timesheets/${id}/reject`, { action: 'reject', comments });
    return data;
  },

  bulkApprove: async (ids: string[], comments?: string) => {
    const { data } = await api.post('/timesheets/bulk-approve', { timesheetIds: ids, comments });
    return data;
  },

  bulkReject: async (ids: string[], comments: string) => {
    const { data } = await api.post('/timesheets/bulk-reject', { timesheetIds: ids, comments });
    return data;
  },
};
