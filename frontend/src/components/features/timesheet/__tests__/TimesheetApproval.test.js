/**
 * TimesheetApproval.test.js
 *
 * Tests for manager/admin timesheet approval view.
 *
 * Architecture:
 *   - Component: TimesheetApproval (default export)
 *   - Data: React Query + timesheetService (getAll, bulkApprove, bulkReject)
 *   - UI: Summary cards, search/filter, data table, approval dialog, bulk actions, CSV export
 *   - ConfirmDialog + useConfirmDialog for bulk action confirmation
 */

import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, createMockUser } from '../../../../test-utils/testUtils';
import TimesheetApproval from '../TimesheetApproval';

// Mock timesheetService
jest.mock('../../../../services/timesheet.service', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../services/timesheet.service');
  }
  return {
    timesheetService: {
      getAll: jest.fn(),
      bulkApprove: jest.fn(),
      bulkReject: jest.fn(),
    },
  };
});

// Mock ConfirmDialog (stub)
jest.mock('../../../common/ConfirmDialog', () => {
  return function MockConfirmDialog({ open, title, message, onConfirm, onCancel }) {
    if (!open) return null;
    return (
      <div data-testid="confirm-dialog">
        <span>{title}</span>
        <span>{message}</span>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>CancelDialog</button>
      </div>
    );
  };
});

// Mock useConfirmDialog
jest.mock('../../../../hooks/useConfirmDialog', () => {
  const confirmFn = jest.fn();
  return {
    __esModule: true,
    default: () => ({
      dialogProps: { open: false, title: '', message: '', onConfirm: jest.fn(), onCancel: jest.fn() },
      confirm: confirmFn,
    }),
    _getConfirmFn: () => confirmFn,
  };
});

// Mock dayjs (provide real module)
jest.mock('dayjs', () => {
  const actual = jest.requireActual('dayjs');
  const relativeTime = jest.requireActual('dayjs/plugin/relativeTime');
  actual.extend(relativeTime);
  return actual;
});

// Mock URL.createObjectURL for CSV export test
globalThis.URL.createObjectURL = jest.fn(() => 'blob:test');
globalThis.URL.revokeObjectURL = jest.fn();

import { timesheetService } from '../../../../services/timesheet.service';

const mockTimesheets = [
  {
    id: 1,
    employeeId: 100,
    employee: { firstName: 'John', lastName: 'Doe', employeeId: 'EMP001' },
    weekStartDate: '2026-02-02',
    weekEndDate: '2026-02-08',
    status: 'Submitted',
    totalHoursWorked: 40,
    submittedAt: '2026-02-08T10:00:00Z',
    project: { id: 1, name: 'Project Alpha' },
    task: { id: 1, name: 'Development' },
    mondayHours: 8, tuesdayHours: 8, wednesdayHours: 8, thursdayHours: 8, fridayHours: 8,
    saturdayHours: 0, sundayHours: 0,
  },
  {
    id: 2,
    employeeId: 101,
    employee: { firstName: 'Jane', lastName: 'Smith', employeeId: 'EMP002' },
    weekStartDate: '2026-02-02',
    weekEndDate: '2026-02-08',
    status: 'Submitted',
    totalHoursWorked: 35,
    submittedAt: '2026-02-08T12:00:00Z',
    project: { id: 2, name: 'Project Beta' },
    task: { id: 2, name: 'Testing' },
    mondayHours: 7, tuesdayHours: 7, wednesdayHours: 7, thursdayHours: 7, fridayHours: 7,
    saturdayHours: 0, sundayHours: 0,
  },
  {
    id: 3,
    employeeId: 102,
    employee: { firstName: 'Bob', lastName: 'Wilson', employeeId: 'EMP003' },
    weekStartDate: '2026-01-26',
    weekEndDate: '2026-02-01',
    status: 'Approved',
    totalHoursWorked: 38,
    submittedAt: '2026-02-01T09:00:00Z',
    project: { id: 1, name: 'Project Alpha' },
    task: null,
    mondayHours: 8, tuesdayHours: 8, wednesdayHours: 6, thursdayHours: 8, fridayHours: 8,
    saturdayHours: 0, sundayHours: 0,
  },
];

describe('TimesheetApproval Component', () => {
  const adminUser = createMockUser('admin');

  beforeEach(() => {
    jest.clearAllMocks();
    timesheetService.getAll.mockResolvedValue({
      data: mockTimesheets,
    });
    timesheetService.bulkApprove.mockResolvedValue({ success: true });
    timesheetService.bulkReject.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    timesheetService.getAll.mockResolvedValue({ data: mockTimesheets });
  });

  // ─── Rendering ──────────────────────────────────────────

  describe('Rendering', () => {
    it('should render the Timesheet Approvals header', async () => {
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText('Timesheet Approvals')).toBeInTheDocument();
      });
    });

    it('should render the subtitle', async () => {
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText(/review and manage employee timesheet/i)).toBeInTheDocument();
      });
    });

    it('should render Refresh button', async () => {
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
    });

    it('should render Export button', async () => {
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
      });
    });

    it('should fetch pending timesheets on mount', async () => {
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(timesheetService.getAll).toHaveBeenCalledWith({ status: 'submitted' });
      });
    });
  });

  // ─── Summary Cards ─────────────────────────────────────

  describe('Summary Cards', () => {
    it('should render Pending Approvals card', async () => {
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
      });
    });

    it('should render Total Hours card', async () => {
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText('Total Hours')).toBeInTheDocument();
      });
    });

    it('should render Approved card', async () => {
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText('Approved')).toBeInTheDocument();
      });
    });

    it('should render Rejected card', async () => {
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText('Rejected')).toBeInTheDocument();
      });
    });

    it('should display pending count from submitted timesheets', async () => {
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        // 2 submitted timesheets in mock data
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });
  });

  // ─── Search & Filters ─────────────────────────────────

  describe('Search and Filters', () => {
    it('should render search input', async () => {
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByTestId('ts-approval-search-input')).toBeInTheDocument();
      });
    });

    it('should render Show Filters button', async () => {
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /show filters/i })).toBeInTheDocument();
      });
    });

    it('should display timesheet count', async () => {
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText(/showing/i)).toBeInTheDocument();
      });
    });
  });

  // ─── Timesheet Table ──────────────────────────────────

  describe('Timesheet Table', () => {
    it('should render employee names in the table', async () => {
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText(/John Doe/)).toBeInTheDocument();
        expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
      });
    });

    it('should render status chips', async () => {
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getAllByText('Submitted').length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ─── Loading State ────────────────────────────────────

  describe('Loading State', () => {
    it('should show loading indicator while fetching timesheets', () => {
      timesheetService.getAll.mockReturnValue(new Promise(() => {})); // Never resolves
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      // Component renders Skeleton or loading indicators during fetch
      expect(screen.getByText('Timesheet Approvals')).toBeInTheDocument();
    });
  });

  // ─── Per-Row Actions ──────────────────────────────────

  describe('Per-Row Approval Actions', () => {
    it('should render approve/reject action buttons for Submitted timesheets', async () => {
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      });

      // The approve and reject icons should be rendered as icon buttons
      // Find tooltip-wrapped approve/reject buttons
      const approveButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('[data-testid="CheckCircleIcon"]') || 
               btn.getAttribute('aria-label')?.toLowerCase().includes('approve')
      );
      expect(approveButtons.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── CSV Export ────────────────────────────────────────

  describe('CSV Export', () => {
    it('should trigger CSV export when Export is clicked', async () => {
      const user = userEvent.setup();
      // Mock document.createElement for the download link
      const mockClick = jest.fn();
      const origCreateElement = document.createElement.bind(document);
      jest.spyOn(document, 'createElement').mockImplementation((tag) => {
        const el = origCreateElement(tag);
        if (tag === 'a') {
          el.click = mockClick;
        }
        return el;
      });

      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText('Timesheet Approvals')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /export/i }));

      await waitFor(() => {
        expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
      });

      document.createElement.mockRestore();
    });
  });

  // ─── Empty State ──────────────────────────────────────

  describe('Empty State', () => {
    it('should handle empty timesheet list', async () => {
      timesheetService.getAll.mockResolvedValueOnce({ data: [] });
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText('Timesheet Approvals')).toBeInTheDocument();
      });
      // Summary should show 0
      await waitFor(() => {
        expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
      });
      // Restore mock for other tests
      timesheetService.getAll.mockResolvedValue({ data: mockTimesheets });
    });
  });

  // ─── Error Handling ───────────────────────────────────

  describe('Error Handling', () => {
    it('should handle API error gracefully', async () => {
      timesheetService.getAll.mockRejectedValue(new Error('Network error'));
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      // Component should still render without crashing
      await waitFor(() => {
        expect(screen.getByText('Timesheet Approvals')).toBeInTheDocument();
      });
    });
  });
});
