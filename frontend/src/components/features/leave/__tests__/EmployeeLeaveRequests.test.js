import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, createMockUser } from '../../../../test-utils/testUtils';
import EmployeeLeaveRequests from '../EmployeeLeaveRequests';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../../../../services/leave.service', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../services/leave.service');
  }
  return {
    leaveService: {
      getAll: jest.fn(),
      getBalance: jest.fn(),
    },
  };
});
const { leaveService } = require('../../../../services/leave.service');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// ─── Test Data ───────────────────────────────────────────────────────────────

// Component processes status keys in lowercase for color/icon mapping
const mockLeaveRequests = [
  {
    id: 1,
    leaveType: 'Annual Leave',
    startDate: '2026-02-01',
    endDate: '2026-02-05',
    days: 5,
    status: 'approved',
    reason: 'Family vacation',
    createdAt: '2026-01-15',
    approverComments: null,
  },
  {
    id: 2,
    leaveType: 'Sick Leave',
    startDate: '2026-02-10',
    endDate: '2026-02-10',
    days: 1,
    status: 'pending',
    reason: 'Not feeling well',
    createdAt: '2026-02-09',
    approverComments: null,
  },
  {
    id: 3,
    leaveType: 'Personal Leave',
    startDate: '2026-03-01',
    endDate: '2026-03-02',
    days: 2,
    status: 'rejected',
    reason: 'Personal work',
    createdAt: '2026-02-20',
    approverComments: 'Short notice',
  },
];

// The component transforms an array of balance items with leaveType.name
// into { annual: {...}, sick: {...}, personal: {...} } internally.
const mockLeaveBalanceApi = [
  { leaveType: { name: 'Annual Leave' }, totalEntitled: 20, used: 5, remaining: 15 },
  { leaveType: { name: 'Sick Leave' }, totalEntitled: 7, used: 1, remaining: 6 },
  { leaveType: { name: 'Personal Leave' }, totalEntitled: 5, used: 2, remaining: 3 },
];

const authOptions = { authValue: { user: createMockUser('employee') } };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const setupSuccess = () => {
  leaveService.getAll.mockResolvedValue({ data: mockLeaveRequests });
  leaveService.getBalance.mockResolvedValue({ data: mockLeaveBalanceApi });
};

const setupEmpty = () => {
  leaveService.getAll.mockResolvedValue({ data: [] });
  leaveService.getBalance.mockResolvedValue({ data: mockLeaveBalanceApi });
};

const renderComponent = (opts = {}) => render(<EmployeeLeaveRequests />, { ...authOptions, ...opts });

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('EmployeeLeaveRequests', () => {
  // ── 1. Rendering & Header ──────────────────────────────────────────────

  it('renders the page title and subtitle', async () => {
    setupSuccess();
    renderComponent();

    expect(screen.getByText('My Leave Requests')).toBeInTheDocument();
    expect(screen.getByText('Track your leave applications and balance')).toBeInTheDocument();
    await waitFor(() => expect(leaveService.getAll).toHaveBeenCalled());
  });

  it('renders the "New Request" button', async () => {
    setupSuccess();
    renderComponent();

    const btn = screen.getByRole('button', { name: /new request/i });
    expect(btn).toBeInTheDocument();
    await waitFor(() => expect(leaveService.getAll).toHaveBeenCalled());
  });

  // ── 2. Data Fetching ──────────────────────────────────────────────────

  it('calls leaveService.getAll on mount', async () => {
    setupSuccess();
    renderComponent();

    await waitFor(() => {
      expect(leaveService.getAll).toHaveBeenCalledTimes(1);
    });
  });

  it('calls leaveService.getBalance with employeeId on mount', async () => {
    setupSuccess();
    renderComponent();

    await waitFor(() => {
      expect(leaveService.getBalance).toHaveBeenCalledTimes(1);
      expect(leaveService.getBalance).toHaveBeenCalledWith('EMP001');
    });
  });

  it('calls leaveService.getBalance with null when user has no employeeId', async () => {
    setupSuccess();
    const noEmpIdUser = { ...createMockUser('employee'), employeeId: undefined };
    render(<EmployeeLeaveRequests />, { authValue: { user: noEmpIdUser } });

    await waitFor(() => {
      expect(leaveService.getBalance).toHaveBeenCalledWith(null);
    });
  });

  // ── 3. Leave Balance Cards ─────────────────────────────────────────────

  it('displays annual leave balance correctly', async () => {
    setupSuccess();
    renderComponent();

    // Wait for all async data to load (leave requests confirm full load)
    await waitFor(() => {
      expect(screen.getByText('Family vacation')).toBeInTheDocument();
    });
    // Balance should now be loaded since both loads are sequential
    expect(screen.getByText('15')).toBeInTheDocument();
    // 'Annual Leave' appears in both balance card and table chip, so use getAllByText
    expect(screen.getAllByText('Annual Leave').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/5 used of 20 days/i)).toBeInTheDocument();
  });

  it('displays sick leave balance correctly', async () => {
    setupSuccess();
    renderComponent();

    // Wait for all async data to load
    await waitFor(() => {
      expect(screen.getByText('Family vacation')).toBeInTheDocument();
    });
    // 'Sick Leave' may appear as both card heading and table chip
    expect(screen.getAllByText('Sick Leave').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText(/1 used of 7 days/i)).toBeInTheDocument();
  });

  it('displays personal leave balance correctly', async () => {
    setupSuccess();
    renderComponent();

    // Wait for all async data to load
    await waitFor(() => {
      expect(screen.getByText('Family vacation')).toBeInTheDocument();
    });
    // 'Personal Leave' may appear as both card heading and table chip
    expect(screen.getAllByText('Personal Leave').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/2 used of 5 days/i)).toBeInTheDocument();
  });

  it('shows zero balances when balance API fails', async () => {
    leaveService.getAll.mockRejectedValue(new Error('Network error'));
    leaveService.getBalance.mockRejectedValue(new Error('Network error'));
    renderComponent();

    await waitFor(() => {
      // Fallback balances are all 0
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ── 4. Leave Requests Table ────────────────────────────────────────────

  it('renders the leave requests table with correct data', async () => {
    setupSuccess();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('employee-leave-requests-table')).toBeInTheDocument();
    });

    // Table headers
    expect(screen.getByText('Leave Type')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Days')).toBeInTheDocument();
    expect(screen.getByText('Applied Date')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();
  });

  it('displays leave type chips for each request', async () => {
    setupSuccess();
    renderComponent();

    await waitFor(() => {
      // The getLeaveTypeLabel maps string types to display labels
      // The table Chip labels; note "Annual Leave" also appears in balance card headings
      const annualChips = screen.getAllByText('Annual Leave');
      expect(annualChips.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('displays the number of days for each request', async () => {
    setupSuccess();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('5 days')).toBeInTheDocument();
      expect(screen.getByText('1 days')).toBeInTheDocument();
      expect(screen.getByText('2 days')).toBeInTheDocument();
    });
  });

  it('displays the reason text in the duration cell', async () => {
    setupSuccess();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Family vacation')).toBeInTheDocument();
      expect(screen.getByText('Not feeling well')).toBeInTheDocument();
      expect(screen.getByText('Personal work')).toBeInTheDocument();
    });
  });

  it('displays status chips in uppercase', async () => {
    setupSuccess();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('APPROVED')).toBeInTheDocument();
      expect(screen.getByText('PENDING')).toBeInTheDocument();
      expect(screen.getByText('REJECTED')).toBeInTheDocument();
    });
  });

  it('shows approver comments or dash when no comments', async () => {
    setupSuccess();
    renderComponent();

    await waitFor(() => {
      // Request 3 has approverComments = 'Short notice'
      expect(screen.getByText('Short notice')).toBeInTheDocument();
      // Requests 1 & 2 have null approverComments → renders '-'
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── 5. Empty State ─────────────────────────────────────────────────────

  it('shows empty state alert when there are no leave requests', async () => {
    setupEmpty();
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/you haven't submitted any leave requests yet/i)
      ).toBeInTheDocument();
    });
  });

  it('does not show the table when there are no leave requests', async () => {
    setupEmpty();
    renderComponent();

    await waitFor(() => {
      expect(screen.queryByTestId('employee-leave-requests-table')).not.toBeInTheDocument();
    });
  });

  // ── 6. Navigation ─────────────────────────────────────────────────────

  it('navigates to /add-leave-request when "New Request" is clicked', async () => {
    setupSuccess();
    const user = userEvent.setup();
    renderComponent();

    const btn = screen.getByRole('button', { name: /new request/i });
    await user.click(btn);

    expect(mockNavigate).toHaveBeenCalledWith('/add-leave-request');
  });

  // ── 7. API Response Variations ─────────────────────────────────────────

  it('handles nested data response (response.data.data)', async () => {
    leaveService.getAll.mockResolvedValue({ data: { data: mockLeaveRequests } });
    leaveService.getBalance.mockResolvedValue({ data: { data: mockLeaveBalanceApi } });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('APPROVED')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });

  it('handles null response data gracefully', async () => {
    leaveService.getAll.mockResolvedValue({ data: null });
    leaveService.getBalance.mockResolvedValue({ data: null });
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/you haven't submitted any leave requests yet/i)
      ).toBeInTheDocument();
    });
  });

  // ── 8. Error Handling ──────────────────────────────────────────────────

  it('handles getAll API error and shows empty state', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    leaveService.getAll.mockRejectedValue(new Error('Server error'));
    leaveService.getBalance.mockRejectedValue(new Error('Server error'));
    renderComponent();

    await waitFor(() => {
      // On error the component sets leaveRequests to [] → empty alert
      expect(
        screen.getByText(/you haven't submitted any leave requests yet/i)
      ).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('handles balance API error independently of leave requests', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    leaveService.getAll.mockResolvedValue({ data: mockLeaveRequests });
    leaveService.getBalance.mockRejectedValue(new Error('Balance error'));
    renderComponent();

    await waitFor(() => {
      // Leave requests should still render even though balance failed
      expect(screen.getByText('APPROVED')).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  // ── 9. Leave Balance Section Heading ───────────────────────────────────

  it('displays the "Leave Balance Overview" heading', async () => {
    setupSuccess();
    renderComponent();

    expect(screen.getByText('Leave Balance Overview')).toBeInTheDocument();
    await waitFor(() => expect(leaveService.getAll).toHaveBeenCalled());
  });

  it('displays the "Recent Leave Requests" heading', async () => {
    setupSuccess();
    renderComponent();

    expect(screen.getByText('Recent Leave Requests')).toBeInTheDocument();
    await waitFor(() => expect(leaveService.getAll).toHaveBeenCalled());
  });

  // ── 10. Request with totalDays field ───────────────────────────────────

  it('uses totalDays when available instead of days', async () => {
    const requestWithTotalDays = [
      { ...mockLeaveRequests[0], totalDays: 7, days: 5 },
    ];
    leaveService.getAll.mockResolvedValue({ data: requestWithTotalDays });
    leaveService.getBalance.mockResolvedValue({ data: mockLeaveBalanceApi });
    renderComponent();

    await waitFor(() => {
      // totalDays takes precedence: renders "7 days" not "5 days"
      expect(screen.getByText('7 days')).toBeInTheDocument();
      expect(screen.queryByText('5 days')).not.toBeInTheDocument();
    });
  });

  // ── 11. Leave type as object ───────────────────────────────────────────

  it('handles leaveType as an object with name property', async () => {
    const requestWithObjectType = [
      { ...mockLeaveRequests[0], leaveType: { name: 'Annual Leave' } },
    ];
    leaveService.getAll.mockResolvedValue({ data: requestWithObjectType });
    leaveService.getBalance.mockResolvedValue({ data: mockLeaveBalanceApi });
    renderComponent();

    await waitFor(() => {
      const chips = screen.getAllByText('Annual Leave');
      expect(chips.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── 12. Cancelled status ──────────────────────────────────────────────

  it('renders cancelled status correctly', async () => {
    const cancelledRequest = [
      { ...mockLeaveRequests[0], status: 'cancelled' },
    ];
    leaveService.getAll.mockResolvedValue({ data: cancelledRequest });
    leaveService.getBalance.mockResolvedValue({ data: mockLeaveBalanceApi });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('CANCELLED')).toBeInTheDocument();
    });
  });
});
