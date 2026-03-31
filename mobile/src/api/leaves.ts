import api from './client';

/** Unwrap paginated or flat array */
function extractArray<T>(raw: any): T[] {
  if (Array.isArray(raw)) return raw;
  if (raw?.data && Array.isArray(raw.data)) return raw.data;
  return [];
}

export interface LeaveType {
  id: string;
  name: string;
  maxDaysPerYear: number;
}

export interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  totalAccrued: number;
  totalTaken: number;
  totalPending: number;
  balance: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  leaveType?: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  approverComments?: string;
  rejectionReason?: string;
  isHalfDay: boolean;
  createdAt: string;
  employee?: { firstName: string; lastName: string };
}

export interface CreateLeavePayload {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  isHalfDay?: boolean;
  halfDayType?: 'First Half' | 'Second Half';
}

export const leavesApi = {
  getMy: async (): Promise<LeaveRequest[]> => {
    const { data } = await api.get('/leaves/me');
    return extractArray<LeaveRequest>(data.data ?? data);
  },

  getTypes: async (): Promise<LeaveType[]> => {
    const { data } = await api.get('/leaves/meta/types');
    return extractArray<LeaveType>(data.data ?? data);
  },

  getBalance: async (): Promise<LeaveBalance[]> => {
    const { data } = await api.get('/leaves/meta/balance');
    return extractArray<LeaveBalance>(data.data ?? data);
  },

  create: async (payload: CreateLeavePayload): Promise<LeaveRequest> => {
    const { data } = await api.post('/leaves', payload);
    return data.data || data;
  },

  // Manager endpoints
  getPending: async (): Promise<LeaveRequest[]> => {
    const { data } = await api.get('/leaves/pending-for-manager');
    return extractArray<LeaveRequest>(data.data ?? data);
  },

  approve: async (id: string, comments?: string) => {
    const { data } = await api.put(`/leaves/${id}/approve`, { approverComments: comments });
    return data;
  },

  reject: async (id: string, reason: string) => {
    const { data } = await api.put(`/leaves/${id}/reject`, { rejectionReason: reason });
    return data;
  },

  cancel: async (id: string) => {
    const { data } = await api.patch(`/leaves/${id}/cancel`);
    return data;
  },
};
