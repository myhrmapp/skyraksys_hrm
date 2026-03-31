import api from './client';
import { Platform } from 'react-native';

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
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  /** @deprecated alias — use grossEarnings */
  grossSalary?: number;
  /** @deprecated alias — use netPay */
  netSalary?: number;
  totalEarnings?: number;
  createdAt: string;
}

/** Unwrap paginated or flat array */
function extractArray<T>(raw: any): T[] {
  if (Array.isArray(raw)) return raw;
  if (raw?.data && Array.isArray(raw.data)) return raw.data;
  return [];
}

export const payslipsApi = {
  getMy: async (): Promise<Payslip[]> => {
    const { data } = await api.get('/payslips/my');
    return extractArray<Payslip>(data.data ?? data);
  },

  getById: async (id: string): Promise<Payslip> => {
    const { data } = await api.get(`/payslips/${id}`);
    return data.data || data;
  },

  downloadPdf: async (id: string): Promise<void> => {
    if (Platform.OS === 'web') {
      // Web: fetch as blob, create download link
      const response = await api.get(`/payslips/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Native: open in browser (users can save from there)
      const { getAccessToken } = await import('./client');
      const token = await getAccessToken();
      const baseURL = api.defaults.baseURL;
      const url = `${baseURL}/payslips/${id}/pdf?token=${token}`;
      const { Linking } = await import('react-native');
      await Linking.openURL(url);
    }
  },
};
