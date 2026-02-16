import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, createMockUser } from '../../../../test-utils/testUtils';
import MyAttendance from '../MyAttendance';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../../../../http-common', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../http-common');
  }
  return {
    __esModule: true,
    default: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    },
  };
});
const mockHttp = require('../../../../http-common').default;

// ─── Test Data ───────────────────────────────────────────────────────────────

// Not checked in yet
const mockTodayNoCheckIn = null;

// Checked in, not out
const mockTodayCheckedIn = {
  id: 1,
  date: '2026-02-13',
  status: 'present',
  checkIn: '2026-02-13T09:00:00Z',
  checkOut: null,
  lateMinutes: 0,
};

// Checked in and out
const mockTodayComplete = {
  id: 1,
  date: '2026-02-13',
  status: 'present',
  checkIn: '2026-02-13T09:00:00Z',
  checkOut: '2026-02-13T17:30:00Z',
  lateMinutes: 0,
};

// Checked in late
const mockTodayLate = {
  id: 1,
  date: '2026-02-13',
  status: 'late',
  checkIn: '2026-02-13T10:30:00Z',
  checkOut: null,
  lateMinutes: 90,
};

const mockMonthlyReport = {
  summary: {
    workingDays: 20,
    presentDays: 18,
    absentDays: 1,
    lateDays: 1,
    halfDays: 0,
    leaveDays: 0,
    holidays: 0,
    averageHoursPerDay: 8,
    totalHoursWorked: 144,
    totalOvertimeHours: 2,
  },
};

const employeeUser = createMockUser('employee');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setupMocks(todayData = mockTodayNoCheckIn, reportData = mockMonthlyReport) {
  mockHttp.get.mockImplementation((url) => {
    if (url === '/attendance/today') {
      if (todayData === null) {
        return Promise.reject({ response: { status: 404 } });
      }
      return Promise.resolve({ data: { data: todayData } });
    }
    if (url === '/attendance/my/report') {
      return Promise.resolve({ data: { data: reportData } });
    }
    return Promise.resolve({ data: {} });
  });
  mockHttp.post.mockResolvedValue({ data: { success: true } });
}

function renderComponent() {
  return render(<MyAttendance />, {
    authValue: { user: employeeUser },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MyAttendance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Rendering / Initial State ──────────────────────────────────────────

  describe('Rendering', () => {
    it('shows a loading spinner while data is being fetched', () => {
      // Never resolve so the component stays in loading state
      mockHttp.get.mockReturnValue(new Promise(() => {}));
      renderComponent();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders the "My Attendance" title after loading', async () => {
      setupMocks(mockTodayNoCheckIn);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('My Attendance')).toBeInTheDocument();
      });
    });

    it('renders the Monthly Report section heading', async () => {
      setupMocks(mockTodayNoCheckIn);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Monthly Report')).toBeInTheDocument();
      });
    });
  });

  // ── 2. Check In Flow ──────────────────────────────────────────────────────

  describe('Check In Flow', () => {
    it('shows Check In button when user has not checked in', async () => {
      setupMocks(mockTodayNoCheckIn);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /check in/i })).toBeInTheDocument();
      });
    });

    it('does not show Check Out button when user has not checked in', async () => {
      setupMocks(mockTodayNoCheckIn);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('My Attendance')).toBeInTheDocument();
      });
      expect(screen.queryByRole('button', { name: /check out/i })).not.toBeInTheDocument();
    });

    it('calls POST /attendance/check-in when Check In is clicked', async () => {
      setupMocks(mockTodayNoCheckIn);
      renderComponent();
      const user = userEvent.setup();

      const checkInBtn = await screen.findByRole('button', { name: /check in/i });
      await user.click(checkInBtn);

      expect(mockHttp.post).toHaveBeenCalledWith('/attendance/check-in');
    });

    it('refetches today status after successful check-in', async () => {
      setupMocks(mockTodayNoCheckIn);
      renderComponent();
      const user = userEvent.setup();

      const checkInBtn = await screen.findByRole('button', { name: /check in/i });

      // After check-in, return checked-in status
      mockHttp.get.mockImplementation((url) => {
        if (url === '/attendance/today') {
          return Promise.resolve({ data: { data: mockTodayCheckedIn } });
        }
        return Promise.resolve({ data: { data: mockMonthlyReport } });
      });

      await user.click(checkInBtn);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /check out/i })).toBeInTheDocument();
      });
    });
  });

  // ── 3. Check Out Flow ─────────────────────────────────────────────────────

  describe('Check Out Flow', () => {
    it('shows Check Out button when user has checked in but not out', async () => {
      setupMocks(mockTodayCheckedIn);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /check out/i })).toBeInTheDocument();
      });
    });

    it('does not show Check In button when user has already checked in', async () => {
      setupMocks(mockTodayCheckedIn);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('My Attendance')).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /check in/i })).not.toBeInTheDocument();
      });
    });

    it('calls POST /attendance/check-out when Check Out is clicked', async () => {
      setupMocks(mockTodayCheckedIn);
      renderComponent();
      const user = userEvent.setup();

      const checkOutBtn = await screen.findByRole('button', { name: /check out/i });
      await user.click(checkOutBtn);

      expect(mockHttp.post).toHaveBeenCalledWith('/attendance/check-out');
    });
  });

  // ── 4. Done State ─────────────────────────────────────────────────────────

  describe('Done State', () => {
    it('shows "Done for today" alert when both check-in and check-out exist', async () => {
      setupMocks(mockTodayComplete);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Done for today')).toBeInTheDocument();
      });
    });

    it('does not show Check In or Check Out button when done', async () => {
      setupMocks(mockTodayComplete);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Done for today')).toBeInTheDocument();
      });
      expect(screen.queryByRole('button', { name: /check in/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /check out/i })).not.toBeInTheDocument();
    });
  });

  // ── 5. Late Warning ───────────────────────────────────────────────────────

  describe('Late Warning', () => {
    it('shows late warning alert with correct minutes when lateMinutes > 0', async () => {
      setupMocks(mockTodayLate);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/you were 90 minutes late today/i)).toBeInTheDocument();
      });
    });

    it('does not show late warning when lateMinutes is 0', async () => {
      setupMocks(mockTodayCheckedIn);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('My Attendance')).toBeInTheDocument();
      });
      expect(screen.queryByText(/minutes late today/i)).not.toBeInTheDocument();
    });
  });

  // ── 6. Monthly Report ─────────────────────────────────────────────────────

  describe('Monthly Report', () => {
    it('renders monthly stats grid with correct values when summary exists', async () => {
      setupMocks(mockTodayNoCheckIn, mockMonthlyReport);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Present')).toBeInTheDocument();
      });
      expect(screen.getByText('18')).toBeInTheDocument(); // presentDays
      // absentDays and lateDays are both 1, so multiple elements match
      expect(screen.getAllByText('1')).toHaveLength(2);
      expect(screen.getByText('144')).toBeInTheDocument(); // totalHoursWorked
      expect(screen.getByText('Working Days')).toBeInTheDocument();
      expect(screen.getByText('Absent')).toBeInTheDocument();
      expect(screen.getByText('Late')).toBeInTheDocument();
      expect(screen.getByText('Total Hours')).toBeInTheDocument();
    });

    it('does not render stats grid when no monthly report exists', async () => {
      setupMocks(mockTodayNoCheckIn, {});
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('My Attendance')).toBeInTheDocument();
      });
      expect(screen.queryByText('Working Days')).not.toBeInTheDocument();
      expect(screen.queryByText('Present')).not.toBeInTheDocument();
    });
  });

  // ── 7. Month/Year Filters ─────────────────────────────────────────────────

  describe('Month/Year Filters', () => {
    it('calls the monthly report API with the correct year and month on load', async () => {
      setupMocks(mockTodayNoCheckIn);
      renderComponent();

      await waitFor(() => {
        expect(mockHttp.get).toHaveBeenCalledWith('/attendance/my/report', {
          params: {
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
          },
        });
      });
    });

    it('refetches monthly report when month select changes', async () => {
      setupMocks(mockTodayNoCheckIn);
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('My Attendance')).toBeInTheDocument();
      });

      // Open month select and pick a different month
      const monthSelect = screen.getByLabelText('Month');
      await user.click(monthSelect);

      const option = await screen.findByRole('option', { name: 'January' });
      await user.click(option);

      await waitFor(() => {
        expect(mockHttp.get).toHaveBeenCalledWith('/attendance/my/report', {
          params: expect.objectContaining({ month: 1 }),
        });
      });
    });
  });

  // ── 8. Error Handling ─────────────────────────────────────────────────────

  describe('Error Handling', () => {
    it('does not crash when today status API fails', async () => {
      mockHttp.get.mockImplementation((url) => {
        if (url === '/attendance/today') {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ data: { data: mockMonthlyReport } });
      });
      mockHttp.post.mockResolvedValue({ data: { success: true } });

      renderComponent();

      // Should still render the page (with not-checked-in state)
      await waitFor(() => {
        expect(screen.getByText('My Attendance')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /check in/i })).toBeInTheDocument();
    });

    it('shows snackbar error when monthly report API fails', async () => {
      mockHttp.get.mockImplementation((url) => {
        if (url === '/attendance/today') {
          return Promise.reject(new Error('No record'));
        }
        if (url === '/attendance/my/report') {
          return Promise.reject(new Error('Server error'));
        }
        return Promise.resolve({ data: {} });
      });
      mockHttp.post.mockResolvedValue({ data: { success: true } });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to load monthly report/i)).toBeInTheDocument();
      });
    });

    it('shows error snackbar when check-in API fails', async () => {
      setupMocks(mockTodayNoCheckIn);
      mockHttp.post.mockRejectedValueOnce({
        response: { data: { message: 'Already checked in' } },
      });

      renderComponent();
      const user = userEvent.setup();

      const checkInBtn = await screen.findByRole('button', { name: /check in/i });
      await user.click(checkInBtn);

      await waitFor(() => {
        expect(screen.getByText('Already checked in')).toBeInTheDocument();
      });
    });

    it('shows generic error when check-out fails without message', async () => {
      setupMocks(mockTodayCheckedIn);
      mockHttp.post.mockRejectedValueOnce(new Error('Network'));

      renderComponent();
      const user = userEvent.setup();

      const checkOutBtn = await screen.findByRole('button', { name: /check out/i });
      await user.click(checkOutBtn);

      await waitFor(() => {
        expect(screen.getByText('Check-out failed')).toBeInTheDocument();
      });
    });
  });

  // ── 9. Loading / Status Display ───────────────────────────────────────────

  describe('Loading & Status Display', () => {
    it('shows NOT CHECKED IN chip when there is no today record', async () => {
      setupMocks(mockTodayNoCheckIn);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('NOT CHECKED IN')).toBeInTheDocument();
      });
    });

    it('shows PRESENT chip when checked in on time', async () => {
      setupMocks(mockTodayCheckedIn);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('PRESENT')).toBeInTheDocument();
      });
    });

    it('shows LATE chip when checked in late', async () => {
      setupMocks(mockTodayLate);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('LATE')).toBeInTheDocument();
      });
    });
  });
});
