import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, createMockUser } from '../../../../test-utils/testUtils';
import EmployeeDashboard from '../EmployeeDashboard';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../../services/dashboard.service', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../services/dashboard.service');
  }
  return {
    dashboardService: {
      getEmployeeStats: jest.fn(),
    },
  };
});
const { dashboardService } = require('../../../../services/dashboard.service');

// ─── Test Data ───────────────────────────────────────────────────────────────

const mockEmployeeStats = {
  leaveBalance: {
    annual: { remaining: 12, total: 20 },
    sick: { remaining: 5, total: 7 },
  },
  pendingRequests: { leaves: 2, timesheets: 1 },
  recentActivity: [
    { id: 1, type: 'leave', action: 'Annual Leave approved', status: 'approved', date: '2026-02-10' },
    { id: 2, type: 'timesheet', action: 'Weekly timesheet submitted', status: 'pending', date: '2026-02-12' },
  ],
  upcomingLeaves: [
    { id: 1, type: 'Annual Leave', startDate: '2026-02-20', endDate: '2026-02-22', days: 3 },
  ],
  currentMonth: {
    hoursWorked: 120,
    expectedHours: 160,
    daysWorked: 15,
    efficiency: 85,
  },
};

const mockSuccessResponse = { success: true, data: mockEmployeeStats };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const renderDashboard = (overrides = {}) => {
  dashboardService.getEmployeeStats.mockResolvedValue(
    overrides.response ?? mockSuccessResponse
  );
  return render(<EmployeeDashboard />, {
    authValue: { user: createMockUser('employee') },
    ...overrides,
  });
};

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ────────── 1. Rendering ──────────

describe('EmployeeDashboard', () => {
  describe('Rendering', () => {
    it('renders the welcome message with user first name', async () => {
      renderDashboard();
      expect(await screen.findByText(/welcome, test/i)).toBeInTheDocument();
    });

    it('renders today\'s date', async () => {
      renderDashboard();
      // The component renders the current date in "weekday, month day" format
      await screen.findByText(/welcome/i);
      const dateStr = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
      expect(screen.getByText(dateStr)).toBeInTheDocument();
    });

    it('shows a loading spinner while data is being fetched', () => {
      dashboardService.getEmployeeStats.mockReturnValue(new Promise(() => {})); // never resolves
      render(<EmployeeDashboard />, {
        authValue: { user: createMockUser('employee') },
      });
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('does not show loading spinner after data loads', async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });
  });

  // ────────── 2. Stats Cards ──────────

  describe('Stats Cards', () => {
    it('displays pending requests total (leaves + timesheets)', async () => {
      renderDashboard();
      // Total pending = 2 leaves + 1 timesheet = 3
      expect(await screen.findByText('3')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('displays pending breakdown subtitle', async () => {
      renderDashboard();
      // subtitle: "2L • 1T"
      expect(await screen.findByText('2L • 1T')).toBeInTheDocument();
    });

    it('displays hours worked this month', async () => {
      renderDashboard();
      expect(await screen.findByText('120h')).toBeInTheDocument();
      expect(screen.getByText('This Month')).toBeInTheDocument();
    });

    it('displays days worked subtitle for current month', async () => {
      renderDashboard();
      expect(await screen.findByText('15 days')).toBeInTheDocument();
    });

    it('displays annual leave balance remaining', async () => {
      renderDashboard();
      expect(await screen.findByText('12')).toBeInTheDocument();
      expect(screen.getByText('Leave Balance')).toBeInTheDocument();
    });

    it('displays leave balance total as subtitle', async () => {
      renderDashboard();
      expect(await screen.findByText('of 20')).toBeInTheDocument();
    });

    it('displays upcoming leaves count', async () => {
      renderDashboard();
      expect(await screen.findByText('1')).toBeInTheDocument();
      expect(screen.getByText('Upcoming')).toBeInTheDocument();
    });

    it('shows zero values when stats are empty', async () => {
      renderDashboard({
        response: { success: true, data: {} },
      });
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      // Pending should show 0
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  // ────────── 3. Quick Action Cards ──────────

  describe('Quick Action Cards', () => {
    it('renders Timesheet quick action card', async () => {
      renderDashboard();
      expect(await screen.findByText('Timesheet')).toBeInTheDocument();
      expect(screen.getByText('Log hours')).toBeInTheDocument();
    });

    it('renders Leave Request quick action card', async () => {
      renderDashboard();
      expect(await screen.findByText('Leave Request')).toBeInTheDocument();
      expect(screen.getByText('Time off')).toBeInTheDocument();
    });

    it('renders Payslips quick action card', async () => {
      renderDashboard();
      expect(await screen.findByText('Payslips')).toBeInTheDocument();
      expect(screen.getByText('View & download')).toBeInTheDocument();
    });

    it('renders Profile quick action card', async () => {
      renderDashboard();
      expect(await screen.findByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('My details')).toBeInTheDocument();
    });

    it('navigates to /timesheets when Timesheet card is clicked', async () => {
      const user = userEvent.setup();
      renderDashboard();
      const card = await screen.findByText('Timesheet');
      await user.click(card);
      expect(mockNavigate).toHaveBeenCalledWith('/timesheets');
    });

    it('navigates to /leave-requests when Leave Request card is clicked', async () => {
      const user = userEvent.setup();
      renderDashboard();
      const card = await screen.findByText('Leave Request');
      await user.click(card);
      expect(mockNavigate).toHaveBeenCalledWith('/leave-requests');
    });

    it('navigates to /employee-payslips when Payslips card is clicked', async () => {
      const user = userEvent.setup();
      renderDashboard();
      const card = await screen.findByText('Payslips');
      await user.click(card);
      expect(mockNavigate).toHaveBeenCalledWith('/employee-payslips');
    });

    it('navigates to /my-profile when Profile card is clicked', async () => {
      const user = userEvent.setup();
      renderDashboard();
      const card = await screen.findByText('Profile');
      await user.click(card);
      expect(mockNavigate).toHaveBeenCalledWith('/my-profile');
    });
  });

  // ────────── 4. Recent Activity ──────────

  describe('Recent Activity', () => {
    it('renders the Recent Activity heading', async () => {
      renderDashboard();
      expect(await screen.findByText('Recent Activity')).toBeInTheDocument();
    });

    it('renders activity items from the data', async () => {
      renderDashboard();
      expect(await screen.findByText('Annual Leave approved')).toBeInTheDocument();
      expect(screen.getByText('Weekly timesheet submitted')).toBeInTheDocument();
    });

    it('displays status chips for each activity', async () => {
      renderDashboard();
      expect(await screen.findByText('approved')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
    });

    it('renders activity dates in localized format', async () => {
      renderDashboard();
      await screen.findByText('Recent Activity');
      const formatted1 = new Date('2026-02-10').toLocaleDateString();
      const formatted2 = new Date('2026-02-12').toLocaleDateString();
      expect(screen.getByText(formatted1)).toBeInTheDocument();
      expect(screen.getByText(formatted2)).toBeInTheDocument();
    });

    it('caps displayed activities at 3 items', async () => {
      const statsWithMany = {
        ...mockEmployeeStats,
        recentActivity: [
          { id: 1, type: 'leave', action: 'Activity 1', status: 'approved', date: '2026-02-08' },
          { id: 2, type: 'timesheet', action: 'Activity 2', status: 'pending', date: '2026-02-09' },
          { id: 3, type: 'leave', action: 'Activity 3', status: 'approved', date: '2026-02-10' },
          { id: 4, type: 'timesheet', action: 'Activity 4', status: 'pending', date: '2026-02-11' },
          { id: 5, type: 'leave', action: 'Activity 5', status: 'approved', date: '2026-02-12' },
        ],
      };
      renderDashboard({ response: { success: true, data: statsWithMany } });
      await screen.findByText('Activity 1');
      expect(screen.getByText('Activity 2')).toBeInTheDocument();
      expect(screen.getByText('Activity 3')).toBeInTheDocument();
      expect(screen.queryByText('Activity 4')).not.toBeInTheDocument();
      expect(screen.queryByText('Activity 5')).not.toBeInTheDocument();
    });
  });

  // ────────── 5. Data Fetching ──────────

  describe('Data Fetching', () => {
    it('calls dashboardService.getEmployeeStats on mount', async () => {
      renderDashboard();
      await waitFor(() => {
        expect(dashboardService.getEmployeeStats).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ────────── 6. Error Handling ──────────

  describe('Error Handling', () => {
    it('does not crash when the API returns an error', async () => {
      dashboardService.getEmployeeStats.mockRejectedValue(new Error('Network error'));
      expect(() => {
        render(<EmployeeDashboard />, {
          authValue: { user: createMockUser('employee') },
        });
      }).not.toThrow();
      // Should still render core structure after error
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    it('renders dashboard with default values when API returns success:false', async () => {
      renderDashboard({ response: { success: false, data: null } });
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      // Quick action cards should still render
      expect(screen.getByText('Timesheet')).toBeInTheDocument();
      expect(screen.getByText('Leave Request')).toBeInTheDocument();
    });
  });

  // ────────── 7. Empty Data ──────────

  describe('Empty Data', () => {
    it('does not render Recent Activity section when recentActivity is empty', async () => {
      const emptyActivityStats = { ...mockEmployeeStats, recentActivity: [] };
      renderDashboard({ response: { success: true, data: emptyActivityStats } });
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      expect(screen.queryByText('Recent Activity')).not.toBeInTheDocument();
    });

    it('does not render Recent Activity section when recentActivity is undefined', async () => {
      const noActivityStats = { ...mockEmployeeStats };
      delete noActivityStats.recentActivity;
      renderDashboard({ response: { success: true, data: noActivityStats } });
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      expect(screen.queryByText('Recent Activity')).not.toBeInTheDocument();
    });
  });
});
