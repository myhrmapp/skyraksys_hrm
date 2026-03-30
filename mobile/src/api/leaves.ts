import api from './client';

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
}

export const leavesApi = {
  getMy: async (): Promise<LeaveRequest[]> => {
    const { data } = await api.get('/leaves/me');
    return data.data || data;
  },

  getTypes: async (): Promise<LeaveType[]> => {
    const { data } = await api.get('/leaves/meta/types');
    return data.data || data;
  },

  getBalance: async (): Promise<LeaveBalance[]> => {
    const { data } = await api.get('/leaves/meta/balance');
    return data.data || data;
  },

  create: async (payload: CreateLeavePayload): Promise<LeaveRequest> => {
    const { data } = await api.post('/leaves', payload);
    return data.data || data;
  },

  // Manager endpoints
  getPending: async (): Promise<LeaveRequest[]> => {
    const { data } = await api.get('/leaves/pending-for-manager');
    return data.data || data;
  },

  approve: async (id: string, comments?: string) => {
    const { data } = await api.put(`/leaves/${id}/approve`, { approverComments: comments });
    return data;
  },

  reject: async (id: string, reason: string) => {
    const { data } = await api.put(`/leaves/${id}/reject`, { rejectionReason: reason });
    return data;
  },
};
