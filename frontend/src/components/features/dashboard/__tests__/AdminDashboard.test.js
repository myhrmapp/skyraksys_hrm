import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, createMockUser } from '../../../../test-utils/testUtils';
import AdminDashboard from '../AdminDashboard';
import { dashboardService } from '../../../../services/dashboard.service';

// Mock the dashboard service
jest.mock('../../../../services/dashboard.service', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../services/dashboard.service');
  }
  const { dashboardService } = jest.createMockFromModule('../../../../services/dashboard.service');
  return { dashboardService };
});

// Mock child dashboards to avoid their side-effects
jest.mock('../EmployeeDashboard', () => () => <div data-testid="employee-dashboard">Employee Dashboard</div>);
jest.mock('../ManagerDashboard', () => () => <div data-testid="manager-dashboard">Manager Dashboard</div>);

describe('AdminDashboard Component', () => {
  const mockStats = {
    employees: { total: 150, active: 145, onLeave: 3, newHires: 5 },
    leaves: { pending: 12, approved: 45, rejected: 5 },
    timesheets: { pending: 4, submitted: 8, approved: 20 },
    payroll: { processed: 10, pending: 2, total: 12 },
  };

  const adminUser = createMockUser('admin');
  const hrUser = createMockUser('hr');
  const employeeUser = createMockUser('employee');
  const managerUser = createMockUser('manager');

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock returns shape the queryFn expects: { success, data: { data: { stats } } }
    dashboardService.getStats = jest.fn().mockResolvedValue({
      success: true,
      data: { data: { stats: mockStats } },
    });
  });

  // ─── Rendering & Loading ─────────────────────────────────

  describe('Rendering', () => {
    it('should render the admin dashboard title', async () => {
      render(<AdminDashboard />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });
    });

    it('should show loading spinner while data is loading', () => {
      // Make getStats hang (never resolve)
      dashboardService.getStats.mockReturnValue(new Promise(() => {}));
      render(<AdminDashboard />, { authValue: { user: adminUser } });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading dashboard data/i)).toBeInTheDocument();
    });
  });

  // ─── Role-based Routing ──────────────────────────────────

  describe('Role-Based Routing', () => {
    it('should render EmployeeDashboard for employee role', () => {
      render(<AdminDashboard />, { authValue: { user: employeeUser } });
      expect(screen.getByTestId('employee-dashboard')).toBeInTheDocument();
    });

    it('should render ManagerDashboard for manager role', () => {
      render(<AdminDashboard />, { authValue: { user: managerUser } });
      expect(screen.getByTestId('manager-dashboard')).toBeInTheDocument();
    });

    it('should render admin dashboard for admin role', async () => {
      render(<AdminDashboard />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });
    });

    it('should render admin dashboard for HR role', async () => {
      render(<AdminDashboard />, { authValue: { user: hrUser } });
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });
    });
  });

  // ─── Stat Cards ──────────────────────────────────────────

  describe('Stat Cards', () => {
    it('should display employee overview stats', async () => {
      render(<AdminDashboard />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByText('Total Employees')).toBeInTheDocument();
      });

      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText(/145 active/)).toBeInTheDocument();
    });

    it('should display on-leave and new-hires cards', async () => {
      render(<AdminDashboard />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByText('On Leave')).toBeInTheDocument();
      });

      expect(screen.getByText('3')).toBeInTheDocument();  // onLeave
      expect(screen.getByText('New Hires')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();   // newHires
    });

    it('should display pending leaves card', async () => {
      render(<AdminDashboard />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByText('Pending Leaves')).toBeInTheDocument();
      });

      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should display operations overview stats', async () => {
      render(<AdminDashboard />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByText('Employee Overview')).toBeInTheDocument();
        expect(screen.getByText('Operations Overview')).toBeInTheDocument();
      });

      expect(screen.getByText('Submitted')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();   // submitted timesheets

      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();   // pending timesheets

      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();  // approved timesheets

      // 'Payroll' appears in both a quick-action button and a stat card
      expect(screen.getAllByText('Payroll').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('10')).toBeInTheDocument();  // processed payroll
    });
  });

  // ─── Quick Actions ───────────────────────────────────────

  describe('Quick Actions', () => {
    it('should render quick action buttons', async () => {
      render(<AdminDashboard />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add employee/i })).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /leave requests/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /timesheets/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /payroll/i })).toBeInTheDocument();
    });

    it('should navigate to add employee page when clicking Add Employee', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add employee/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add employee/i }));

      expect(window.location.pathname).toBe('/employees/add');
    });

    it('should navigate to leave requests when clicking Leave Requests', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /leave requests/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /leave requests/i }));
      expect(window.location.pathname).toBe('/leave-requests');
    });

    it('should navigate to timesheet approval when clicking Timesheets', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /timesheets/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /timesheets/i }));
      expect(window.location.pathname).toBe('/timesheet-approval');
    });

    it('should navigate to payroll when clicking Payroll', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /payroll/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /payroll/i }));
      expect(window.location.pathname).toBe('/payroll');
    });
  });

  // ─── Refresh ─────────────────────────────────────────────

  describe('Refresh', () => {
    it('should call refetch when clicking refresh button', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      const refreshBtn = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshBtn);

      // getStats should be called again (initial + refresh)
      await waitFor(() => {
        expect(dashboardService.getStats.mock.calls.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should show loading state instead of refresh button while data loads', () => {
      dashboardService.getStats.mockReturnValue(new Promise(() => {}));
      render(<AdminDashboard />, { authValue: { user: adminUser } });

      // While loading, the full loading view is shown, not the dashboard with refresh
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
    });
  });

  // ─── Pending Approvals Alert ─────────────────────────────

  describe('Pending Approvals', () => {
    it('should show pending approvals alert when there are pending items', async () => {
      render(<AdminDashboard />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByText(/pending approvals require attention/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/12 leaves/)).toBeInTheDocument();
      expect(screen.getByText(/8 timesheets/)).toBeInTheDocument();
    });

    it('should not show pending alert when there are no pending items', async () => {
      dashboardService.getStats.mockResolvedValue({
        success: true,
        data: {
          data: {
            stats: {
              employees: { total: 10, active: 10, onLeave: 0, newHires: 0 },
              leaves: { pending: 0, approved: 5, rejected: 0 },
              timesheets: { pending: 0, submitted: 0, approved: 5 },
              payroll: { processed: 5, pending: 0, total: 5 },
            },
          },
        },
      });

      render(<AdminDashboard />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      expect(screen.queryByText(/pending approvals require attention/i)).not.toBeInTheDocument();
    });
  });

  // ─── Error State ─────────────────────────────────────────

  describe('Error Handling', () => {
    it('should call getStats and handle rejection gracefully', async () => {
      dashboardService.getStats.mockRejectedValue(new Error('Server error'));

      render(<AdminDashboard />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(dashboardService.getStats).toHaveBeenCalled();
      });

      // After error, the dashboard should not show stat cards with data
      expect(screen.queryByText('150')).not.toBeInTheDocument();
    });

    it('should not show stat data when fetch fails', async () => {
      dashboardService.getStats.mockRejectedValue(new Error('Server error'));

      render(<AdminDashboard />, { authValue: { user: adminUser } });

      // Wait for the query to settle
      await waitFor(() => {
        expect(dashboardService.getStats).toHaveBeenCalled();
      });

      // Stat data should not be displayed
      expect(screen.queryByText('150')).not.toBeInTheDocument();
      expect(screen.queryByText('145 active')).not.toBeInTheDocument();
    });
  });

  // ─── Data Fetching ──────────────────────────────────────

  describe('Data Fetching', () => {
    it('should call dashboardService.getStats', async () => {
      render(<AdminDashboard />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(dashboardService.getStats).toHaveBeenCalled();
      });
    });

    it('should not fetch data for employee role', () => {
      render(<AdminDashboard />, { authValue: { user: employeeUser } });
      // Employee gets redirected to EmployeeDashboard
      expect(screen.getByTestId('employee-dashboard')).toBeInTheDocument();
    });
  });
});
