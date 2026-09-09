
// frontend/src/utils/testUtils.js
import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';

// Custom theme for testing
const testTheme = createTheme();

// Mock user data
export const mockUser = {
  id: '1',
  email: 'test@example.com',
  role: 'employee',
  firstName: 'Test',
  lastName: 'User'
};

export const mockAdmin = {
  id: '2',
  email: 'admin@example.com',
  role: 'admin',
  firstName: 'Admin',
  lastName: 'User'
};

// Custom render function with providers
export function renderWithProviders(
  ui,
  {
    preloadedState = {},
    route = '/',
    user = mockUser,
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <ThemeProvider theme={testTheme}>
          <AuthProvider value={{ user, isAuthenticated: !!user }}>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );
  }

  return {
    user,
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  };
}

// API mocking utilities
export const mockApiResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data)
});

export const mockApiError = (message = 'API Error', status = 500) => ({
  ok: false,
  status,
  statusText: message,
  json: async () => ({ error: message })
});

// Common test data
export const mockEmployee = {
  id: '123',
  employeeId: 'EMP001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  department: { id: '1', name: 'IT' },
  position: { id: '1', title: 'Developer' },
  status: 'Active'
};

export const mockProject = {
  id: '1',
  name: 'Test Project',
  description: 'Test project description',
  status: 'Active'
};

export const mockTask = {
  id: '1',
  name: 'Test Task',
  description: 'Test task description',
  projectId: '1',
  status: 'Active'
};

export const mockTimesheet = {
  id: '1',
  employeeId: '123',
  projectId: '1',
  taskId: '1',
  date: '2025-09-06',
  hours: 8,
  description: 'Test work'
};

export const mockLeaveRequest = {
  id: '1',
  employeeId: '123',
  leaveType: 'Annual Leave',
  startDate: '2025-09-10',
  endDate: '2025-09-12',
  reason: 'Vacation',
  status: 'Pending'
};

// Test helper functions
export const waitForLoadingToFinish = () =>
  new Promise(resolve => setTimeout(resolve, 0));

export const createMockEvent = (value) => ({
  target: { value },
  preventDefault: jest.fn(),
  stopPropagation: jest.fn()
});

export default {
  renderWithProviders,
  mockApiResponse,
  mockApiError,
  mockUser,
  mockAdmin,
  mockEmployee,
  mockProject,
  mockTask,
  mockTimesheet,
  mockLeaveRequest,
  waitForLoadingToFinish,
  createMockEvent
};
