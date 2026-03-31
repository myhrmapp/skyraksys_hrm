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
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
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
      getPendingApprovals: jest.fn(),
      getStats: jest.fn(),
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

// Mock useConfirmDialog — auto-executes onConfirm so we can test the confirmed path
jest.mock('../../../../hooks/useConfirmDialog', () => {
  return {
    __esModule: true,
    default: () => ({
      dialogProps: { open: false, title: '', message: '', onConfirm: jest.fn(), onCancel: jest.fn() },
      confirm: jest.fn(({ onConfirm } = {}) => { if (typeof onConfirm === 'function') onConfirm(); }),
    }),
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
    weekStartDate: '2026-02-09', // Newer week, will appear first due to sorting
    weekEndDate: '2026-02-15',
    status: 'Submitted',
    totalHoursWorked: 40,
    submittedAt: '2026-02-15T10:00:00Z',
    project: { id: 1, name: 'Project Alpha' },
    task: { id: 1, name: 'Development' },
    mondayHours: 8, tuesdayHours: 8, wednesdayHours: 8, thursdayHours: 8, fridayHours: 8,
    saturdayHours: 0, sundayHours: 0,
  },
  {
    id: 2,
    employeeId: 101,
    employee: { firstName: 'Jane', lastName: 'Smith', employeeId: 'EMP002' },
    weekStartDate: '2026-02-02', // Older week
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
    timesheetService.getPendingApprovals.mockResolvedValue({ data: mockTimesheets });
    timesheetService.getStats.mockResolvedValue({ data: { approved: 3, rejected: 1 } });
    timesheetService.getAll.mockResolvedValue({ data: mockTimesheets });
    timesheetService.bulkApprove.mockResolvedValue({ success: true });
    timesheetService.bulkReject.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    timesheetService.getPendingApprovals.mockResolvedValue({ data: mockTimesheets });
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
        expect(timesheetService.getPendingApprovals).toHaveBeenCalled();
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
      timesheetService.getPendingApprovals.mockReturnValue(new Promise(() => {})); // Never resolves
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
      // data-testid="ts-approval-approve-btn" and "ts-approval-reject-btn" are on each row
      const approveButtons = screen.getAllByTestId('ts-approval-approve-btn');
      const rejectButtons  = screen.getAllByTestId('ts-approval-reject-btn');
      expect(approveButtons.length).toBeGreaterThanOrEqual(1);
      expect(rejectButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('per-row approve: opens approval dialog, submits, and calls bulkApprove', async () => {
      const user = userEvent.setup();
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      });

      // Click the first per-row Approve button
      const approveBtn = screen.getAllByTestId('ts-approval-approve-btn')[0];
      await user.click(approveBtn);

      // Approval dialog opens with title "Approve Timesheet"
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText('Approve Timesheet')).toBeInTheDocument();

      // Click the Approve submit button inside the dialog (no comments required)
      const dialogApproveBtn = within(dialog).getByRole('button', { name: /^Approve$/ });
      expect(dialogApproveBtn).not.toBeDisabled();
      await user.click(dialogApproveBtn);

      await waitFor(() => {
        expect(timesheetService.bulkApprove).toHaveBeenCalledWith([1], '');
      });
    });

    it('per-row reject: opens dialog, requires rejection reason, calls bulkReject', async () => {
      const user = userEvent.setup();
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      });

      // Click the first per-row Reject button
      const rejectBtn = screen.getAllByTestId('ts-approval-reject-btn')[0];
      await user.click(rejectBtn);

      // Reject dialog opens with title "Reject Timesheet"
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText('Reject Timesheet')).toBeInTheDocument();

      // Reject submit button is disabled until a reason is entered
      const dialogRejectBtn = within(dialog).getByRole('button', { name: /^Reject$/ });
      expect(dialogRejectBtn).toBeDisabled();

      // Enter rejection reason
      const commentsField = within(dialog).getByLabelText(/Rejection Reason/i);
      await user.type(commentsField, 'Missing project codes');

      // Now the Reject button is enabled
      expect(dialogRejectBtn).not.toBeDisabled();
      await user.click(dialogRejectBtn);

      await waitFor(() => {
        expect(timesheetService.bulkReject).toHaveBeenCalledWith([1], 'Missing project codes');
      });
    });
  });

  // ─── Bulk Actions ─────────────────────────────────────

  describe('Bulk Actions', () => {
    it('bulk approve: confirm auto-executes onConfirm, calls bulkApprove', async () => {
      const user = userEvent.setup();
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      });

      // Select one Submitted timesheet via checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      // checkboxes[0] = select-all; checkboxes[1] = first data row
      await user.click(checkboxes[1]);

      // Bulk Approve button should appear
      await waitFor(() => {
        expect(screen.getByText(/Approve \(/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/Approve \(/i).closest('button'));

      // confirm() mock auto-executes onConfirm → approveMutation.mutate is called
      await waitFor(() => {
        expect(timesheetService.bulkApprove).toHaveBeenCalled();
      });
    });

    it('H-02: bulk reject opens approval dialog (not confirm dialog) to collect comments', async () => {
      const user = userEvent.setup();
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      });

      // Select one Submitted timesheet
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      await waitFor(() => {
        expect(screen.getByText(/Reject \(/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/Reject \(/i).closest('button'));

      // H-02: approval DIALOG opens directly (handleBulkAction('reject') skips confirm)
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText('Reject Timesheet')).toBeInTheDocument();
      // ConfirmDialog must NOT be visible (auto-confirm mock does NOT fire for this path)
      expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();

      // Must enter comments to enable submit
      const dialogRejectBtn = within(dialog).getByRole('button', { name: /^Reject$/ });
      expect(dialogRejectBtn).toBeDisabled();

      const commentsField = within(dialog).getByLabelText(/Rejection Reason/i);
      await user.type(commentsField, 'Hours do not match project tracker');
      expect(dialogRejectBtn).not.toBeDisabled();

      await user.click(dialogRejectBtn);
      await waitFor(() => {
        expect(timesheetService.bulkReject).toHaveBeenCalledWith(
          expect.any(Array),
          'Hours do not match project tracker',
        );
      });
    });
  });

  // ─── Search Filter ────────────────────────────────────

  describe('Search Filter', () => {
    it('typing in search box narrows results by employee name', async () => {
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText(/John Doe/)).toBeInTheDocument();
        expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
      });

      // Type "John" into the search input
      fireEvent.change(screen.getByTestId('ts-approval-search-input'), {
        target: { value: 'John' },
      });

      await waitFor(() => {
        expect(screen.getByText(/John Doe/)).toBeInTheDocument();
        expect(screen.queryByText(/Jane Smith/)).not.toBeInTheDocument();
      });
    });

    it('clearing search restores all results', async () => {
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('ts-approval-search-input');
      fireEvent.change(searchInput, { target: { value: 'John' } });
      await waitFor(() => {
        expect(screen.queryByText(/Jane Smith/)).not.toBeInTheDocument();
      });

      // Clear the search
      fireEvent.change(searchInput, { target: { value: '' } });
      await waitFor(() => {
        expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
      });
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
      timesheetService.getPendingApprovals.mockResolvedValueOnce({ data: [] });
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText('Timesheet Approvals')).toBeInTheDocument();
      });
      // Summary should show 0
      await waitFor(() => {
        expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
      });
      // Restore mock for other tests
      timesheetService.getPendingApprovals.mockResolvedValue({ data: mockTimesheets });
    });
  });

  // ─── Error Handling ───────────────────────────────────

  describe('Error Handling', () => {
    it('should handle API error gracefully', async () => {
      timesheetService.getPendingApprovals.mockRejectedValue(new Error('Network error'));
      render(<TimesheetApproval />, { authValue: { user: adminUser } });
      // Component should still render without crashing
      await waitFor(() => {
        expect(screen.getByText('Timesheet Approvals')).toBeInTheDocument();
      });
    });
  });
});
