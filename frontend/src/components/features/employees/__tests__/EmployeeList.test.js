import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, createMockUser, createMockEmployee } from '../../../../test-utils/testUtils';
import EmployeeList from '../EmployeeList';
import { employeeService } from '../../../../services/employee.service';

// Mock the services
jest.mock('../../../../services/employee.service', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../services/employee.service');
  }
  const mod = jest.createMockFromModule('../../../../services/employee.service');
  return mod;
});
jest.mock('../../../../services/auth.service', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../services/auth.service');
  }
  return {
    authService: { createUserAccount: jest.fn() },
  };
});

// Mock file-saver and xlsx (used for export)
jest.mock('file-saver', () => ({ saveAs: jest.fn() }));
jest.mock('xlsx', () => ({
  utils: { json_to_sheet: jest.fn(), book_new: jest.fn(() => ({})), book_append_sheet: jest.fn() },
  write: jest.fn(() => []),
}));

describe('EmployeeList Component', () => {
  const adminUser = createMockUser('admin');
  const employeeUser = createMockUser('employee');

  const mockEmployees = [
    createMockEmployee({ id: 1, employeeId: 'EMP001', firstName: 'John', lastName: 'Doe', status: 'Active' }),
    createMockEmployee({ id: 2, employeeId: 'EMP002', firstName: 'Jane', lastName: 'Smith', status: 'Active' }),
    createMockEmployee({ id: 3, employeeId: 'EMP003', firstName: 'Bob', lastName: 'Johnson', status: 'Inactive' }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock getAll to return employees in the normalized response shape
    employeeService.getAll = jest.fn().mockResolvedValue({
      data: mockEmployees,
      total: 3,
      pagination: { totalItems: 3, currentPage: 1, totalPages: 1 },
    });
    // Mock getDepartments
    employeeService.getDepartments = jest.fn().mockResolvedValue({
      data: { success: true, data: [{ id: 1, name: 'Engineering' }, { id: 2, name: 'HR' }] },
    });
    // Mock delete
    employeeService.delete = jest.fn().mockResolvedValue({ data: { success: true } });
  });

  // ─── Rendering ───────────────────────────────────────────

  describe('Rendering', () => {
    it('should render the Employee Directory header', async () => {
      render(<EmployeeList />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByText('Employee Directory')).toBeInTheDocument();
      });
    });

    it('should render the subtitle text', async () => {
      render(<EmployeeList />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByText(/manage your workforce/i)).toBeInTheDocument();
      });
    });

    it('should display employee names after loading', async () => {
      render(<EmployeeList />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });
  });

  // ─── Search & Filters ────────────────────────────────────

  describe('Search & Filters', () => {
    it('should render search input', async () => {
      render(<EmployeeList />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
      });
    });

    it('should call service with search term when typing', async () => {
      const user = userEvent.setup();
      render(<EmployeeList />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search by name/i);
      await user.type(searchInput, 'John');

      // Server-side search: service should be called with search param
      await waitFor(() => {
        const lastCall = employeeService.getAll.mock.calls[employeeService.getAll.mock.calls.length - 1];
        expect(lastCall[0]).toHaveProperty('search', 'John');
      });
    });
  });

  // ─── View Toggle ─────────────────────────────────────────

  describe('View Toggle', () => {
    it('should render view toggle buttons', async () => {
      render(<EmployeeList />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByLabelText(/list view/i)).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/card view/i)).toBeInTheDocument();
    });

    it('should default to card view', async () => {
      render(<EmployeeList />, { authValue: { user: adminUser } });

      await waitFor(() => {
        const cardViewBtn = screen.getByLabelText(/card view/i);
        expect(cardViewBtn).toHaveAttribute('aria-pressed', 'true');
      });
    });
  });

  // ─── Quick Actions / Permissions ─────────────────────────

  describe('Permissions', () => {
    it('should show Add Employee button for admin', async () => {
      render(<EmployeeList />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add employee/i })).toBeInTheDocument();
      });
    });

    it('should not show Add Employee button for regular employee', async () => {
      render(<EmployeeList />, { authValue: { user: employeeUser } });

      await waitFor(() => {
        expect(screen.getByText('Employee Directory')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /add employee/i })).not.toBeInTheDocument();
    });

    it('should show Export button', async () => {
      render(<EmployeeList />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
      });
    });
  });

  // ─── Navigation ──────────────────────────────────────────

  describe('Navigation', () => {
    it('should navigate to add employee route when clicking Add Employee', async () => {
      const user = userEvent.setup();
      render(<EmployeeList />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add employee/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add employee/i }));

      expect(window.location.pathname).toBe('/employees/add');
    });
  });

  // ─── Error Handling ──────────────────────────────────────

  describe('Error Handling', () => {
    it('should display error when service fails', async () => {
      employeeService.getAll.mockRejectedValue(new Error('Network Error'));

      render(<EmployeeList />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByText('Network Error')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should show retry button on error', async () => {
      employeeService.getAll.mockRejectedValue(new Error('Network Error'));

      render(<EmployeeList />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  // ─── Data Fetching ──────────────────────────────────────

  describe('Data Fetching', () => {
    it('should call employeeService.getAll on mount', async () => {
      render(<EmployeeList />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(employeeService.getAll).toHaveBeenCalled();
      });
    });

    it('should fetch departments on mount', async () => {
      render(<EmployeeList />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(employeeService.getDepartments).toHaveBeenCalled();
      });
    });
  });

  // ─── Pagination ──────────────────────────────────────────

  describe('Pagination', () => {
    it('should render pagination component', async () => {
      render(<EmployeeList />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });
    });
  });

  // ─── Export ──────────────────────────────────────────────

  describe('Export', () => {
    it('should call saveAs when clicking Export button', async () => {
      const { saveAs } = require('file-saver');
      const user = userEvent.setup();
      render(<EmployeeList />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /export/i }));

      await waitFor(() => {
        expect(saveAs).toHaveBeenCalled();
      });
    });
  });

  // ─── View Toggle Interaction ─────────────────────────────

  describe('View Toggle Interaction', () => {
    it('should switch to list view when clicking list toggle', async () => {
      const user = userEvent.setup();
      render(<EmployeeList />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByLabelText(/list view/i)).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText(/list view/i));

      await waitFor(() => {
        expect(screen.getByLabelText(/list view/i)).toHaveAttribute('aria-pressed', 'true');
      });
    });
  });

  // ─── Retry on Error ─────────────────────────────────────

  describe('Retry on Error', () => {
    it('should re-fetch data when clicking Retry button', async () => {
      employeeService.getAll
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValue({
          data: mockEmployees,
          total: 3,
          pagination: { totalItems: 3, currentPage: 1, totalPages: 1 },
        });

      const user = userEvent.setup();
      render(<EmployeeList />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      await user.click(screen.getByRole('button', { name: /retry/i }));

      // After retry, employeeService.getAll should be called again
      await waitFor(() => {
        expect(employeeService.getAll.mock.calls.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  // ─── Empty State ─────────────────────────────────────────

  describe('Empty State', () => {
    it('should handle empty employee list', async () => {
      employeeService.getAll.mockResolvedValue({
        data: [],
        total: 0,
        pagination: { totalItems: 0, currentPage: 1, totalPages: 0 },
      });

      render(<EmployeeList />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByText('Employee Directory')).toBeInTheDocument();
      });

      // No employee names should appear
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });
});
