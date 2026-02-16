/**
 * LeaveManagement.test.js
 *
 * Tests for the Leave Management admin/HR/manager dashboard.
 *
 * Architecture:
 *   - Component: ModernLeaveManagement (default export)
 *   - Data: React Query hooks from hooks/queries (useLeaveRequests, useLeaveBalances,
 *           useLeaveTypes, useApproveLeaveRequest, useRejectLeaveRequest)
 *   - Access: Admin/HR/Manager only — employees are redirected to /leave-requests
 *   - Notifications: useNotification() → showSuccess/showError (mocked in setupTests.js)
 *   - IMPORTANT: The component calls navigate('/leave-requests') synchronously during render
 *     for employee role, causing an infinite loop in tests. We mock useNavigate to prevent this.
 */

import React from 'react';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockUser } from '../../../../test-utils/testUtils';
import ModernLeaveManagement from '../LeaveManagement';

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

// Mock useNavigate to prevent infinite loop when employee role triggers navigate()
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock the React Query hooks (component imports these, not raw services)
jest.mock('../../../../hooks/queries', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../hooks/queries');
  }
  return {
    useLeaveRequests: jest.fn(),
    useLeaveBalances: jest.fn(),
    useLeaveTypes: jest.fn(),
    useApproveLeaveRequest: jest.fn(),
    useRejectLeaveRequest: jest.fn(),
  };
});

// Import the mocked hooks
import {
  useLeaveRequests,
  useLeaveBalances,
  useLeaveTypes,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
} from '../../../../hooks/queries';

/* ------------------------------------------------------------------ */
/*  Test data                                                          */
/* ------------------------------------------------------------------ */

const mockLeaveRequests = [
  {
    id: 1,
    leaveType: 'Annual',
    startDate: '2026-02-01',
    endDate: '2026-02-05',
    totalDays: 5,
    status: 'Pending',
    reason: 'Family vacation',
    employee: { firstName: 'John', lastName: 'Doe', employeeId: 'EMP001' },
    employeeName: 'John Doe',
    employeeId: 'EMP001',
  },
  {
    id: 2,
    leaveType: 'Sick',
    startDate: '2026-02-10',
    endDate: '2026-02-11',
    totalDays: 2,
    status: 'Approved',
    reason: 'Medical appointment',
    employee: { firstName: 'Jane', lastName: 'Smith', employeeId: 'EMP002' },
    employeeName: 'Jane Smith',
    employeeId: 'EMP002',
  },
  {
    id: 3,
    leaveType: 'Personal',
    startDate: '2026-03-01',
    endDate: '2026-03-03',
    totalDays: 3,
    status: 'Rejected',
    reason: 'Personal matters',
    employee: { firstName: 'Alice', lastName: 'Johnson', employeeId: 'EMP003' },
    employeeName: 'Alice Johnson',
    employeeId: 'EMP003',
  },
];

const mockLeaveTypes = [
  { id: 1, name: 'Annual' },
  { id: 2, name: 'Sick' },
  { id: 3, name: 'Personal' },
];

const mockLeaveBalances = [
  {
    id: 1,
    balance: 12,
    totalAccrued: 20,
    carryForward: 0,
    totalTaken: 5,
    totalPending: 3,
    leaveType: { name: 'Annual' },
    employee: { firstName: 'John', lastName: 'Doe', employeeId: 'EMP001', department: 'Engineering' },
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const mockMutate = jest.fn();

const setupDefaultMocks = () => {
  useLeaveRequests.mockReturnValue({
    data: { data: mockLeaveRequests },
    isLoading: false,
    refetch: jest.fn(),
  });

  useLeaveBalances.mockReturnValue({
    data: mockLeaveBalances,
    isLoading: false,
  });

  useLeaveTypes.mockReturnValue({
    data: { data: mockLeaveTypes },
  });

  useApproveLeaveRequest.mockReturnValue({
    mutate: mockMutate,
  });

  useRejectLeaveRequest.mockReturnValue({
    mutate: mockMutate,
  });
};

const renderLeave = (role = 'admin') => {
  const user = createMockUser(role);
  return renderWithProviders(<ModernLeaveManagement />, {
    authValue: { user },
  });
};

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  jest.clearAllMocks();
  setupDefaultMocks();
});

// ────────────────── ACCESS CONTROL ──────────────────
describe('Access Control', () => {
  test('redirects employee to /leave-requests', () => {
    renderLeave('employee');
    expect(mockNavigate).toHaveBeenCalledWith('/leave-requests');
  });

  test('renders for admin users', async () => {
    renderLeave('admin');
    expect(await screen.findByText('Leave Management')).toBeInTheDocument();
  });

  test('renders for HR users', async () => {
    renderLeave('hr');
    expect(await screen.findByText('Leave Management')).toBeInTheDocument();
  });

  test('renders for manager users', async () => {
    renderLeave('manager');
    expect(await screen.findByText('Leave Management')).toBeInTheDocument();
  });
});

// ────────────────── PAGE LAYOUT ──────────────────
describe('Page Layout', () => {
  test('renders title and subtitle', async () => {
    renderLeave();

    expect(await screen.findByText('Leave Management')).toBeInTheDocument();
    expect(
      screen.getByText(/manage employee leave requests and balances/i)
    ).toBeInTheDocument();
  });

  test('renders Leave Requests and Leave Balances tabs', async () => {
    renderLeave();
    await screen.findByText('Leave Management');

    expect(screen.getByText('Leave Requests')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /leave balances/i })).toBeInTheDocument();
  });

  test('renders New Request button', async () => {
    renderLeave();
    await screen.findByText('Leave Management');

    expect(screen.getByRole('button', { name: /new request/i })).toBeInTheDocument();
  });

  test('New Request button navigates to /add-leave-request', async () => {
    const user = userEvent.setup();
    renderLeave();
    await screen.findByText('Leave Management');

    await user.click(screen.getByRole('button', { name: /new request/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/add-leave-request');
  });
});

// ────────────────── LEAVE REQUESTS TABLE ──────────────────
describe('Leave Requests Table', () => {
  test('displays leave requests data', async () => {
    renderLeave();

    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
  });

  test('shows table column headers', async () => {
    renderLeave();
    await screen.findByText('John Doe');

    const table = screen.getByTestId('leave-mgmt-requests-table');
    expect(within(table).getByText('Employee')).toBeInTheDocument();
    expect(within(table).getByText('Leave Type')).toBeInTheDocument();
    expect(within(table).getByText('Days')).toBeInTheDocument();
    expect(within(table).getByText('Status')).toBeInTheDocument();
    expect(within(table).getByText('Reason')).toBeInTheDocument();
  });

  test('displays leave type chips', async () => {
    renderLeave();
    await screen.findByText('John Doe');

    expect(screen.getByText('Annual')).toBeInTheDocument();
    expect(screen.getByText('Sick')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  test('displays status chips', async () => {
    renderLeave();
    await screen.findByText('John Doe');

    // "Pending" appears both as inner tab label and status chip, so use getAllByText
    const pendingElements = screen.getAllByText('Pending');
    expect(pendingElements.length).toBeGreaterThanOrEqual(1);
    // Approved and Rejected both appear as chip AND as caption text in actions column
    const approvedChips = screen.getAllByText('Approved');
    expect(approvedChips.length).toBeGreaterThanOrEqual(1);
    const rejectedChips = screen.getAllByText('Rejected');
    expect(rejectedChips.length).toBeGreaterThanOrEqual(1);
  });

  test('displays total days for each request', async () => {
    renderLeave();
    await screen.findByText('John Doe');

    expect(screen.getByText('5 days')).toBeInTheDocument();
    expect(screen.getByText('2 days')).toBeInTheDocument();
    expect(screen.getByText('3 days')).toBeInTheDocument();
  });

  test('displays reason text', async () => {
    renderLeave();
    await screen.findByText('John Doe');

    expect(screen.getByText('Family vacation')).toBeInTheDocument();
  });
});

// ────────────────── FILTERS ──────────────────
describe('Filters', () => {
  test('renders search employee input', async () => {
    renderLeave();
    await screen.findByText('John Doe');

    expect(screen.getByLabelText(/search employee/i)).toBeInTheDocument();
  });

  test('renders Status filter', async () => {
    renderLeave();
    await screen.findByText('John Doe');

    // Status label appears both as filter InputLabel and table header
    const statusLabels = screen.getAllByText('Status');
    expect(statusLabels.length).toBeGreaterThanOrEqual(1);
  });

  test('renders Leave Type filter', async () => {
    renderLeave();
    await screen.findByText('John Doe');

    // "Leave Type" appears both as filter InputLabel and table header
    const typeLabels = screen.getAllByText('Leave Type');
    expect(typeLabels.length).toBeGreaterThanOrEqual(1);
  });

  test('displays request count', async () => {
    renderLeave();
    await screen.findByText('John Doe');

    expect(screen.getByText('3 requests')).toBeInTheDocument();
  });
});

// ────────────────── LEAVE BALANCES TAB ──────────────────
describe('Leave Balances Tab', () => {
  test('navigates to Leave Balances tab', async () => {
    const user = userEvent.setup();
    renderLeave();
    await screen.findByText('Leave Management');

    await user.click(screen.getByRole('tab', { name: /leave balances/i }));

    expect(await screen.findByText('Leave Balances Overview')).toBeInTheDocument();
  });

  test('displays balance cards', async () => {
    const user = userEvent.setup();
    renderLeave();
    await screen.findByText('Leave Management');

    await user.click(screen.getByRole('tab', { name: /leave balances/i }));
    await screen.findByText('Leave Balances Overview');

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('12 days left')).toBeInTheDocument();
  });

  test('shows info alert when no balances available', async () => {
    useLeaveBalances.mockReturnValue({
      data: [],
      isLoading: false,
    });

    const user = userEvent.setup();
    renderLeave();
    await screen.findByText('Leave Management');

    await user.click(screen.getByRole('tab', { name: /leave balances/i }));

    expect(
      await screen.findByText(/no leave balance data available/i)
    ).toBeInTheDocument();
  });
});

// ────────────────── APPROVE / REJECT ACTIONS ──────────────────
describe('Approve / Reject Actions', () => {
  test('shows approve and reject buttons for Pending requests', async () => {
    renderLeave();
    await screen.findByText('John Doe');

    // Pending request (id=1) should have approve/reject icon buttons
    // MUI Tooltip provides accessible name to the IconButton
    const approveButtons = screen.getAllByRole('button', { name: /approve/i });
    expect(approveButtons.length).toBeGreaterThanOrEqual(1);

    const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
    expect(rejectButtons.length).toBeGreaterThanOrEqual(1);
  });

  test('does not show approve/reject for non-Pending requests', async () => {
    // Only provide approved/rejected requests
    useLeaveRequests.mockReturnValue({
      data: {
        data: [
          { ...mockLeaveRequests[1] }, // Approved
          { ...mockLeaveRequests[2] }, // Rejected
        ],
      },
      isLoading: false,
      refetch: jest.fn(),
    });

    renderLeave();
    await screen.findByText('Jane Smith');

    // No approve/reject icon buttons should appear
    expect(screen.queryByRole('button', { name: /^approve$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^reject$/i })).not.toBeInTheDocument();
  });
});

// ────────────────── ERROR HANDLING ──────────────────
describe('Error Handling', () => {
  test('handles empty leave requests gracefully', async () => {
    useLeaveRequests.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      refetch: jest.fn(),
    });

    renderLeave();

    // Should still render the heading and table structure
    expect(await screen.findByText('Leave Management')).toBeInTheDocument();
    expect(screen.getByTestId('leave-mgmt-requests-table')).toBeInTheDocument();
  });
});

// ────────────────── DATA FETCHING ──────────────────
describe('Data Fetching', () => {
  test('calls useLeaveRequests hook', () => {
    renderLeave();
    expect(useLeaveRequests).toHaveBeenCalled();
  });

  test('calls useLeaveBalances hook', () => {
    renderLeave();
    expect(useLeaveBalances).toHaveBeenCalled();
  });

  test('calls useLeaveTypes hook', () => {
    renderLeave();
    expect(useLeaveTypes).toHaveBeenCalled();
  });
});

// ────────────────── APPROVE / REJECT CLICKS ──────────────────
describe('Approve / Reject Click Actions', () => {
  test('clicking Approve calls approveMutation.mutate', async () => {
    const approveMutate = jest.fn();
    useApproveLeaveRequest.mockReturnValue({ mutate: approveMutate });

    const user = userEvent.setup();
    renderLeave();
    await screen.findByText('John Doe');

    const approveButtons = screen.getAllByRole('button', { name: /approve/i });
    await user.click(approveButtons[0]);

    await waitFor(() => {
      expect(approveMutate).toHaveBeenCalledWith(
        { id: 1, comments: '' },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });
  });

  test('clicking Reject calls rejectMutation.mutate', async () => {
    const rejectMutate = jest.fn();
    useRejectLeaveRequest.mockReturnValue({ mutate: rejectMutate });

    const user = userEvent.setup();
    renderLeave();
    await screen.findByText('John Doe');

    const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
    await user.click(rejectButtons[0]);

    await waitFor(() => {
      expect(rejectMutate).toHaveBeenCalledWith(
        { id: 1, comments: '' },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });
  });
});

// ────────────────── SEARCH FILTER INTERACTION ──────────────────
describe('Search Filter Interaction', () => {
  test('typing in search updates the filtered request count', async () => {
    renderLeave();
    await screen.findByText('John Doe');

    // Initially shows all 3 requests
    expect(screen.getByText('3 requests')).toBeInTheDocument();

    const searchInput = screen.getByTestId('leave-mgmt-search-input');
    fireEvent.change(searchInput, { target: { value: 'Jane' } });

    // Filter count should update to 1 matching request
    await waitFor(() => {
      expect(screen.getByText('1 requests')).toBeInTheDocument();
    });
  });

  test('typing a non-matching search shows 0 filtered requests', async () => {
    renderLeave();
    await screen.findByText('John Doe');

    const searchInput = screen.getByTestId('leave-mgmt-search-input');
    fireEvent.change(searchInput, { target: { value: 'ZZZZZZ' } });

    await waitFor(() => {
      expect(screen.getByText('0 requests')).toBeInTheDocument();
    });
  });
});

// ────────────────── CANCELLATION AND HALF-DAY CHIPS ──────────────────
describe('Cancellation and Half-Day Chips', () => {
  test('shows Cancellation chip for cancellation requests', async () => {
    useLeaveRequests.mockReturnValue({
      data: {
        data: [
          {
            ...mockLeaveRequests[0],
            isCancellation: true,
          },
        ],
      },
      isLoading: false,
      refetch: jest.fn(),
    });

    renderLeave();
    await screen.findByText('John Doe');

    expect(screen.getByText('Cancellation')).toBeInTheDocument();
  });

  test('shows Half Day chip for half-day leave requests', async () => {
    useLeaveRequests.mockReturnValue({
      data: {
        data: [
          {
            ...mockLeaveRequests[0],
            isHalfDay: true,
          },
        ],
      },
      isLoading: false,
      refetch: jest.fn(),
    });

    renderLeave();
    await screen.findByText('John Doe');

    expect(screen.getByText('Half Day')).toBeInTheDocument();
  });
});

// ────────────────── LOADING STATE ──────────────────
describe('Loading State', () => {
  test('does not show leave data when still loading', () => {
    useLeaveRequests.mockReturnValue({
      data: null,
      isLoading: true,
      refetch: jest.fn(),
    });
    useLeaveBalances.mockReturnValue({
      data: null,
      isLoading: true,
    });

    renderLeave();

    // Should not show employee data while loading
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });
});
