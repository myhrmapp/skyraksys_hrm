import api from './client';

export interface Payslip {
  id: string;
  employeeId: string;
  payrollDataId?: string;
  payPeriod: string;
  month: number;
  year: number;
  earnings: Record<string, number>;
  deductions: Record<string, number>;
  employeeInfo?: Record<string, unknown>;
  companyInfo?: Record<string, unknown>;
  status: string;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  totalEarnings?: number;
  netPay?: number;
  createdAt: string;
}

export const payslipsApi = {
  getMy: async (): Promise<Payslip[]> => {
    const { data } = await api.get('/payslips/my');
    return data.data || data;
  },

  getById: async (id: string): Promise<Payslip> => {
    const { data } = await api.get(`/payslips/${id}`);
    return data.data || data;
  },

  downloadPdf: async (id: string): Promise<string> => {
    const { data } = await api.get(`/payslips/${id}/pdf`, { responseType: 'blob' });
    return data;
  },
};
