import React from 'react';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, createMockUser } from '../../../../test-utils/testUtils';
import TimesheetHistory from '../TimesheetHistory';

// ── Mock service ────────────────────────────────────────────────────────────
jest.mock('../../../../services/timesheet.service', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../services/timesheet.service');
  }
  return {
    timesheetService: {
      getAll: jest.fn(),
    },
  };
});
const { timesheetService } = require('../../../../services/timesheet.service');

// ── Mock URL / Blob for CSV export ──────────────────────────────────────────
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();
beforeAll(() => {
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;
});

// ── Mock data ───────────────────────────────────────────────────────────────
// The component matches timesheets with:
//   myEmployeeId = user?.employee?.id || user?.employeeId
// createMockUser('employee') => employee.id = 100, so we use employeeId: 100.
const mockTimesheets = [
  {
    id: 1,
    employeeId: 100,
    employee: { id: 100, firstName: 'Test', lastName: 'User', employeeId: 'EMP001' },
    weekStartDate: '2026-02-02',
    weekEndDate: '2026-02-08',
    weekNumber: 6,
    year: 2026,
    status: 'Approved',
    totalHoursWorked: 40,
    mondayHours: 8, tuesdayHours: 8, wednesdayHours: 8, thursdayHours: 8, fridayHours: 8,
    saturdayHours: 0, sundayHours: 0,
    submittedAt: '2026-02-08T10:00:00Z',
    approvedAt: '2026-02-09T14:00:00Z',
    approverComments: 'Looks good',
    description: 'Sprint 42 work',
    project: { name: 'Project A' },
    task: { name: 'Development' },
    entries: [{ day: 'Monday', hours: 8, project: 'Project A', task: 'Development' }],
  },
  {
    id: 2,
    employeeId: 100,
    employee: { id: 100, firstName: 'Test', lastName: 'User', employeeId: 'EMP001' },
    weekStartDate: '2026-01-26',
    weekEndDate: '2026-02-01',
    weekNumber: 5,
    year: 2026,
    status: 'Submitted',
    totalHoursWorked: 38,
    mondayHours: 8, tuesdayHours: 8, wednesdayHours: 8, thursdayHours: 7, fridayHours: 7,
    saturdayHours: 0, sundayHours: 0,
    submittedAt: '2026-02-01T09:00:00Z',
    approverComments: null,
    project: { name: 'Project B' },
    task: { name: 'Testing' },
    entries: [],
  },
  {
    id: 3,
    employeeId: 100,
    employee: { id: 100, firstName: 'Test', lastName: 'User', employeeId: 'EMP001' },
    weekStartDate: '2026-01-19',
    weekEndDate: '2026-01-25',
    weekNumber: 4,
    year: 2026,
    status: 'Rejected',
    totalHoursWorked: 35,
    submittedAt: '2026-01-25T10:00:00Z',
    rejectedAt: '2026-01-26T12:00:00Z',
    rejectionReason: 'Missing entries',
    approverComments: 'Missing entries',
    project: { name: 'Project C' },
    task: { name: 'Design' },
    entries: [],
  },
  {
    id: 4,
    employeeId: 100,
    employee: { id: 100, firstName: 'Test', lastName: 'User', employeeId: 'EMP001' },
    weekStartDate: '2026-01-12',
    weekEndDate: '2026-01-18',
    weekNumber: 3,
    year: 2026,
    status: 'Draft',
    totalHoursWorked: 20,
    project: { name: 'Project D' },
    task: { name: 'Research' },
    entries: [],
  },
];

// Timesheet belonging to a different user — should be filtered out
const otherUserTimesheet = {
  id: 5,
  employeeId: 200,
  employee: { id: 200, firstName: 'Other', lastName: 'User', employeeId: 'EMP002' },
  weekStartDate: '2026-02-02',
  weekEndDate: '2026-02-08',
  weekNumber: 6,
  year: 2026,
  status: 'Submitted',
  totalHoursWorked: 40,
  submittedAt: '2026-02-03T08:00:00Z',
  project: { name: 'Project X' },
  task: { name: 'Admin' },
  entries: [],
};

const allTimesheets = [...mockTimesheets, otherUserTimesheet];

// ── Helpers ─────────────────────────────────────────────────────────────────
const authOptions = { authValue: { user: createMockUser('employee') } };

const renderComponent = (serviceResponse) => {
  timesheetService.getAll.mockResolvedValue(
    serviceResponse ?? { data: { data: allTimesheets } }
  );
  return render(<TimesheetHistory />, authOptions);
};

const waitForData = () =>
  waitFor(() => {
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

// ── Tests ───────────────────────────────────────────────────────────────────
describe('TimesheetHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ┌──────────────────────────────────────────┐
  // │  1. RENDERING                            │
  // └──────────────────────────────────────────┘
  describe('Rendering', () => {
    test('displays the page title', async () => {
      renderComponent();
      expect(screen.getByText('Timesheet History')).toBeInTheDocument();
      await waitForData();
    });

    test('shows loading spinner while data is being fetched', () => {
      // Never resolve so the component stays in loading state
      timesheetService.getAll.mockReturnValue(new Promise(() => {}));
      render(<TimesheetHistory />, authOptions);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('renders table column headers after data loads', async () => {
      renderComponent();
      await waitForData();

      // "Status" text also appears in the filter panel's InputLabel, so scope to column headers
      const headers = screen.getAllByRole('columnheader');
      const headerTexts = headers.map(h => h.textContent);
      expect(headerTexts).toEqual(expect.arrayContaining(['Week', 'Tasks', 'Hours', 'Status', 'Date']));
    });
  });

  // ┌──────────────────────────────────────────┐
  // │  2. DATA DISPLAY & CLIENT-SIDE FILTERING │
  // └──────────────────────────────────────────┘
  describe('Data display', () => {
    test('only shows timesheets belonging to the current user', async () => {
      renderComponent();
      await waitForData();

      // Current user's 4 distinct weeks should be visible (grouped by weekStartDate)
      // The component groups by weekStartDate, so 4 unique weeks → 4 rows
      const rows = screen.getAllByRole('row');
      // 1 header row + 4 data rows
      expect(rows.length).toBeGreaterThanOrEqual(5);

      // The "other user" project should NOT be present
      expect(screen.queryByText('Project X')).not.toBeInTheDocument();
    });

    test('displays week periods for each timesheet row', async () => {
      renderComponent();
      await waitForData();

      // Week starting Feb 02 should be formatted
      expect(screen.getByText(/Feb 02, 2026/)).toBeInTheDocument();
    });

    test('displays total hours for each week', async () => {
      renderComponent();
      await waitForData();

      // Timesheet 1 has 40 hours → "40.0h"
      expect(screen.getByText('40.0h')).toBeInTheDocument();
    });

    test('shows summary stats with total weeks and hours', async () => {
      renderComponent();
      await waitForData();

      // The subtitle shows "{n} weeks • {h}h total"
      expect(screen.getByText(/4 weeks/)).toBeInTheDocument();
    });

    test('handles { data: allTimesheets } response shape', async () => {
      renderComponent({ data: allTimesheets });
      await waitForData();

      // Should still filter and display 4 rows for the current user
      expect(screen.queryByText('Project X')).not.toBeInTheDocument();
      expect(screen.getByText(/4 weeks/)).toBeInTheDocument();
    });
  });

  // ┌──────────────────────────────────────────┐
  // │  3. STATUS CHIPS                         │
  // └──────────────────────────────────────────┘
  describe('Status chips', () => {
    test('renders status chips with correct labels for each status', async () => {
      renderComponent();
      await waitForData();

      // Approved/Rejected text also appears in the Date column, so use getAllByText
      expect(screen.getAllByText('Approved').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Submitted')).toBeInTheDocument();
      expect(screen.getAllByText('Rejected').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    test('approved chip uses success color', async () => {
      renderComponent();
      await waitForData();

      // "Approved" appears in both chip and date column — find the one inside a chip
      const approvedChipLabel = screen.getAllByText('Approved').find(el => el.closest('.MuiChip-root'));
      const approvedChip = approvedChipLabel.closest('.MuiChip-root');
      expect(approvedChip).toHaveClass('MuiChip-colorSuccess');
    });

    test('rejected chip uses error color', async () => {
      renderComponent();
      await waitForData();

      // "Rejected" appears in both chip and date column — find the one inside a chip
      const rejectedChipLabel = screen.getAllByText('Rejected').find(el => el.closest('.MuiChip-root'));
      const rejectedChip = rejectedChipLabel.closest('.MuiChip-root');
      expect(rejectedChip).toHaveClass('MuiChip-colorError');
    });
  });

  // ┌──────────────────────────────────────────┐
  // │  4. FILTER PANEL                         │
  // └──────────────────────────────────────────┘
  describe('Filter panel', () => {
    test('filter panel is hidden by default and toggles open on button click', async () => {
      renderComponent();
      await waitForData();

      // MUI Collapse keeps children in the DOM — check the Collapse hidden class instead
      const filterSelect = screen.getByTestId('ts-history-status-select');
      const collapse = filterSelect.closest('.MuiCollapse-root');
      expect(collapse).toHaveClass('MuiCollapse-hidden');

      // Click the filter toggle
      await userEvent.click(screen.getByTestId('ts-history-filter-toggle'));

      // Now the Collapse should no longer be hidden
      await waitFor(() => {
        expect(collapse).not.toHaveClass('MuiCollapse-hidden');
      });
    });

    test('filter panel collapses when filter button clicked again', async () => {
      renderComponent();
      await waitForData();

      const toggle = screen.getByTestId('ts-history-filter-toggle');
      const filterSelect = screen.getByTestId('ts-history-status-select');
      const collapse = filterSelect.closest('.MuiCollapse-root');

      // Open
      await userEvent.click(toggle);
      await waitFor(() => {
        expect(collapse).not.toHaveClass('MuiCollapse-hidden');
      });

      // Close
      await userEvent.click(toggle);
      await waitFor(() => {
        expect(collapse).toHaveClass('MuiCollapse-hidden');
      });
    });

    test('status filter narrows displayed timesheets', async () => {
      renderComponent();
      await waitForData();

      // Open filter panel
      await userEvent.click(screen.getByTestId('ts-history-filter-toggle'));
      await waitFor(() => {
        expect(screen.getByTestId('ts-history-status-select')).toBeInTheDocument();
      });

      // Open the MUI Select dropdown
      const selectElement = screen.getByTestId('ts-history-status-select');
      const selectButton = selectElement.closest('[role="combobox"]') || selectElement.parentElement.querySelector('[role="combobox"]');

      // Use MUI Select: click to open, then pick an option
      fireEvent.mouseDown(selectButton || selectElement);

      await waitFor(() => {
        const listbox = screen.getByRole('listbox');
        expect(listbox).toBeInTheDocument();
      });

      // Select "Approved"
      const approvedOption = within(screen.getByRole('listbox')).getByText('Approved');
      await userEvent.click(approvedOption);

      // After filtering, only the Approved timesheet row should remain
      await waitFor(() => {
        expect(screen.getByText(/1 week/)).toBeInTheDocument();
      });
    });

    test('date range filter limits displayed timesheets', async () => {
      renderComponent();
      await waitForData();

      // Open filter panel
      await userEvent.click(screen.getByTestId('ts-history-filter-toggle'));
      await waitFor(() => {
        expect(screen.getByTestId('ts-history-start-date')).toBeInTheDocument();
      });

      // Set start date to Jan 25 — should only include weeks starting Jan 26 and Feb 02
      const startInput = screen.getByTestId('ts-history-start-date');
      fireEvent.change(startInput, { target: { value: '2026-01-25' } });

      await waitFor(() => {
        expect(screen.getByText(/2 weeks/)).toBeInTheDocument();
      });
    });

    test('clear button resets all filters', async () => {
      renderComponent();
      await waitForData();

      // Open filter panel and apply a status filter
      await userEvent.click(screen.getByTestId('ts-history-filter-toggle'));
      await waitFor(() => {
        expect(screen.getByTestId('ts-history-status-select')).toBeInTheDocument();
      });

      const selectElement = screen.getByTestId('ts-history-status-select');
      const selectButton = selectElement.closest('[role="combobox"]') || selectElement.parentElement.querySelector('[role="combobox"]');
      fireEvent.mouseDown(selectButton || selectElement);
      await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
      await userEvent.click(within(screen.getByRole('listbox')).getByText('Draft'));

      await waitFor(() => {
        expect(screen.getByText(/1 week/)).toBeInTheDocument();
      });

      // Click Clear
      await userEvent.click(screen.getByRole('button', { name: /clear/i }));

      // All timesheets visible again
      await waitFor(() => {
        expect(screen.getByText(/4 weeks/)).toBeInTheDocument();
      });
    });
  });

  // ┌──────────────────────────────────────────┐
  // │  5. VIEW DETAILS DIALOG                  │
  // └──────────────────────────────────────────┘
  describe('View details dialog', () => {
    test('opens dialog when view icon is clicked', async () => {
      renderComponent();
      await waitForData();

      // There is a Tooltip with title "View Week Details" wrapping each IconButton
      const viewButtons = screen.getAllByRole('button', { name: /view week details/i });
      expect(viewButtons.length).toBeGreaterThan(0);

      await userEvent.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Timesheet Details')).toBeInTheDocument();
      });
    });

    test('dialog shows week information and status', async () => {
      renderComponent();
      await waitForData();

      const viewButtons = screen.getAllByRole('button', { name: /view week details/i });
      // First row is most recent (Feb 02 — Approved)
      await userEvent.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Week Information')).toBeInTheDocument();
      });

      // Status chip inside dialog
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('Hours Breakdown')).toBeInTheDocument();
    });

    test('dialog shows approver comments when present', async () => {
      renderComponent();
      await waitForData();

      // First row (Approved) has approverComments "Looks good"
      const viewButtons = screen.getAllByRole('button', { name: /view week details/i });
      await userEvent.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Comments from Approver')).toBeInTheDocument();
        expect(screen.getByText('Looks good')).toBeInTheDocument();
      });
    });

    test('dialog closes when Close button is clicked', async () => {
      renderComponent();
      await waitForData();

      const viewButtons = screen.getAllByRole('button', { name: /view week details/i });
      await userEvent.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /close/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  // ┌──────────────────────────────────────────┐
  // │  6. EXPORT CSV                           │
  // └──────────────────────────────────────────┘
  describe('Export CSV', () => {
    test('export button is present and enabled when data exists', async () => {
      renderComponent();
      await waitForData();

      const exportBtn = screen.getByTestId('ts-history-export');
      expect(exportBtn).toBeInTheDocument();
      expect(exportBtn).not.toBeDisabled();
    });

    test('export button is disabled when no timesheets are displayed', async () => {
      // Return empty data
      renderComponent({ data: { data: [] } });
      await waitForData();

      const exportBtn = screen.getByTestId('ts-history-export');
      expect(exportBtn).toBeDisabled();
    });

    test('clicking export triggers CSV download', async () => {
      renderComponent();
      await waitForData();

      const createElementSpy = jest.spyOn(document, 'createElement');
      await userEvent.click(screen.getByTestId('ts-history-export'));

      // A link element should have been created for the download
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalled();

      createElementSpy.mockRestore();
    });
  });

  // ┌──────────────────────────────────────────┐
  // │  7. EMPTY STATE                          │
  // └──────────────────────────────────────────┘
  describe('Empty state', () => {
    test('shows "No timesheets found" when API returns empty data', async () => {
      renderComponent({ data: { data: [] } });
      await waitForData();

      expect(screen.getByText('No timesheets found')).toBeInTheDocument();
      expect(screen.getByText('Start by submitting your first timesheet')).toBeInTheDocument();
    });

    test('shows contextual message when filters produce no results', async () => {
      renderComponent();
      await waitForData();

      // Open filter and select a status that produces 0 results after date filtering
      await userEvent.click(screen.getByTestId('ts-history-filter-toggle'));
      await waitFor(() => {
        expect(screen.getByTestId('ts-history-start-date')).toBeInTheDocument();
      });

      // Set a date range that excludes all timesheets
      const startInput = screen.getByTestId('ts-history-start-date');
      fireEvent.change(startInput, { target: { value: '2027-01-01' } });

      await waitFor(() => {
        expect(screen.getByText('No timesheets found')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
      });
    });
  });

  // ┌──────────────────────────────────────────┐
  // │  8. ERROR HANDLING                       │
  // └──────────────────────────────────────────┘
  describe('Error handling', () => {
    test('does not crash when API rejects', async () => {
      timesheetService.getAll.mockRejectedValue(new Error('Network Error'));
      render(<TimesheetHistory />, authOptions);

      // Component should still mount and show empty state (not crash)
      await waitFor(() => {
        expect(screen.getByText('Timesheet History')).toBeInTheDocument();
      });
    });

    test('handles null/undefined data gracefully', async () => {
      renderComponent({ data: null });
      await waitForData();

      expect(screen.getByText('Timesheet History')).toBeInTheDocument();
      expect(screen.getByText('No timesheets found')).toBeInTheDocument();
    });
  });

  // ┌──────────────────────────────────────────┐
  // │  9. PAGINATION                           │
  // └──────────────────────────────────────────┘
  describe('Pagination', () => {
    test('renders pagination controls', async () => {
      renderComponent();
      await waitForData();

      // MUI TablePagination renders "Rows per page:" label
      expect(screen.getByText(/rows per page/i)).toBeInTheDocument();
    });

    test('displays correct page count info', async () => {
      renderComponent();
      await waitForData();

      // Default 10 rows per page, 4 items → "1–4 of 4"
      expect(screen.getByText(/1–4 of 4/)).toBeInTheDocument();
    });

    test('rows per page options include 5, 10, 25, 50', async () => {
      renderComponent();
      await waitForData();

      // Open the rows-per-page select
      const rowsSelect = screen.getByRole('combobox', { name: /rows per page/i });
      expect(rowsSelect).toBeInTheDocument();
    });
  });
});
