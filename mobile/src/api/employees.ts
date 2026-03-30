import api from './client';

export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  hireDate?: string;
  status: string;
  department?: { name: string };
  position?: { title: string };
  managerId?: string;
  address?: string;
  city?: string;
  state?: string;
  bankName?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
}

export const employeesApi = {
  getMe: async (): Promise<Employee> => {
    const { data } = await api.get('/employees/me');
    return data.data || data;
  },

  update: async (id: string, updates: Partial<Employee>): Promise<Employee> => {
    const { data } = await api.put(`/employees/${id}`, updates);
    return data.data || data;
  },

  getTeamMembers: async (): Promise<Employee[]> => {
    const { data } = await api.get('/employees/team-members');
    return data.data || data;
  },
};
