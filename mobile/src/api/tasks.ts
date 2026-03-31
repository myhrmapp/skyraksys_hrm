import api from './client';

/** Unwrap paginated or flat array from ApiResponse.success({ data: rows, pagination }) */
function extractArray<T>(raw: any): T[] {
  if (Array.isArray(raw)) return raw;
  if (raw?.data && Array.isArray(raw.data)) return raw.data;
  return [];
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  projectId: string;
  project?: { name: string };
  assignedTo?: string;
}

export const tasksApi = {
  getAll: async (): Promise<Task[]> => {
    const { data } = await api.get('/tasks');
    return extractArray<Task>(data.data ?? data);
  },

  getMyTasks: async (): Promise<Task[]> => {
    const { data } = await api.get('/tasks/my-tasks');
    return extractArray<Task>(data.data ?? data);
  },

  update: async (id: string, updates: Partial<Task>): Promise<Task> => {
    const { data } = await api.put(`/tasks/${id}`, updates);
    return data.data || data;
  },
};
