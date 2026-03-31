/**
 * ModernWeeklyTimesheet.test.js
 *
 * Tests for the weekly timesheet spreadsheet component.
 *
 * Architecture:
 *   - Uses timesheetService (named export) for CRUD via useEffect (NOT React Query)
 *   - Uses ProjectDataService / TaskDataService (default exports) via React Query
 *   - Uses useNotification() for toast messages (mocked in setupTests.js)
 *   - Uses useAuth() for role/user info (mocked in setupTests.js)
 *   - Day columns: MON–SUN shortLabel in table header
 *   - data-testid attributes on most interactive elements
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekday from 'dayjs/plugin/weekday';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { renderWithProviders, createMockUser } from '../../../../test-utils/testUtils';
import ModernWeeklyTimesheet from '../ModernWeeklyTimesheet';

dayjs.extend(isoWeek);
dayjs.extend(weekday);
dayjs.extend(weekOfYear);

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

jest.mock('../../../../services/timesheet.service', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../services/timesheet.service');
  }
  return jest.createMockFromModule('../../../../services/timesheet.service');
});
jest.mock('../../../../services/ProjectService', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../services/ProjectService');
  }
  return jest.createMockFromModule('../../../../services/ProjectService');
});
jest.mock('../../../../services/TaskService', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../services/TaskService');
  }
  return jest.createMockFromModule('../../../../services/TaskService');
});
jest.mock('../../../../utils/logger', () => ({
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Import mocked modules AFTER jest.mock declarations
import { timesheetService } from '../../../../services/timesheet.service';
import ProjectDataService from '../../../../services/ProjectService';
import TaskDataService from '../../../../services/TaskService';

/* ------------------------------------------------------------------ */
/*  Test data                                                          */
/* ------------------------------------------------------------------ */

const mockProjects = [
  { id: '00000000-0000-4000-a000-000000000001', name: 'Project Alpha', code: 'PA', status: 'Active' },
  { id: '00000000-0000-4000-a000-000000000002', name: 'Project Beta',  code: 'PB', status: 'Active' },
];

const mockTasks = [
  { id: '00000000-0000-4000-a000-000000000010', name: 'Development', projectId: '00000000-0000-4000-a000-000000000001' },
  { id: '00000000-0000-4000-a000-000000000011', name: 'Testing',     projectId: '00000000-0000-4000-a000-000000000001' },
  { id: '00000000-0000-4000-a000-000000000012', name: 'Design',      projectId: '00000000-0000-4000-a000-000000000002' },
];

// Must match employee.id from createMockUser() which is 100
const MOCK_EMPLOYEE_ID = 100;
const currentWeekStart = dayjs().startOf('isoWeek').format('YYYY-MM-DD');
const currentWeekEnd = dayjs().endOf('isoWeek').format('YYYY-MM-DD');

// T-03: timesheet ID must be a valid UUID so isValidUUID() returns true in the submit flow
const MOCK_TS_UUID = '11111111-1111-4111-a111-111111111111';

const mockWeeklyTimesheet = {
  id: MOCK_TS_UUID,
  employeeId: MOCK_EMPLOYEE_ID,
  projectId: '00000000-0000-4000-a000-000000000001',
  taskId:    '00000000-0000-4000-a000-000000000010',
  weekStartDate: currentWeekStart,
  weekEndDate:   currentWeekEnd,
  mondayHours:    8,
  tuesdayHours:   7,
  wednesdayHours: 8,
  thursdayHours:  6,
  fridayHours:    8,
  saturdayHours:  0,
  sundayHours:    0,
  totalHours: 37,
  description: 'Sprint work',
  status: 'Draft',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const setupDefaultMocks = () => {
  // React Query calls for projects + tasks
  ProjectDataService.getAll.mockResolvedValue({ data: mockProjects });
  TaskDataService.getAll.mockResolvedValue({ data: mockTasks });

  // H-03: getByWeek now returns response.data (not the raw Axios response)
  timesheetService.getByWeek.mockResolvedValue({ data: [mockWeeklyTimesheet] });

  // Other service methods
  timesheetService.createBatch.mockResolvedValue({ success: true, data: [] });
  timesheetService.bulkUpdate.mockResolvedValue({ success: true });
  timesheetService.bulkSubmit.mockResolvedValue({ data: { success: true } });
  // T-02: timesheetService.getPending removed (method no longer exists)
  timesheetService.getAll.mockResolvedValue({ data: { data: [] } });
};

const renderTimesheet = (role = 'employee') => {
  const user = createMockUser(role);
  return renderWithProviders(<ModernWeeklyTimesheet />, {
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

// ────────────────── WEEK NAVIGATION ──────────────────
describe('Week Navigation', () => {
  test('displays week number', async () => {
    renderTimesheet();
    const weekNum = dayjs().isoWeek();
    expect(await screen.findByText(`Week ${weekNum}`)).toBeInTheDocument();
  });

  test('renders previous/next week and Today buttons', async () => {
    renderTimesheet();
    // Week number is rendered immediately from state — reliable wait condition
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    expect(screen.getByTestId('timesheet-prev-week')).toBeInTheDocument();
    expect(screen.getByTestId('timesheet-next-week')).toBeInTheDocument();
    expect(screen.getByTestId('timesheet-today-button')).toBeInTheDocument();
  });

  test('navigates to previous week', async () => {
    const user = userEvent.setup();
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    const prevBtn = screen.getByTestId('timesheet-prev-week');
    await user.click(prevBtn);

    const expectedWeek = dayjs().startOf('isoWeek').subtract(1, 'week').isoWeek();
    await waitFor(() => {
      expect(screen.getByText(`Week ${expectedWeek}`)).toBeInTheDocument();
    });
  });

  test('navigates to next week', async () => {
    const user = userEvent.setup();
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    const nextBtn = screen.getByTestId('timesheet-next-week');
    await user.click(nextBtn);

    const expectedWeek = dayjs().startOf('isoWeek').add(1, 'week').isoWeek();
    await waitFor(() => {
      expect(screen.getByText(`Week ${expectedWeek}`)).toBeInTheDocument();
    });
  });
});

// ────────────────── TIMESHEET TABLE ──────────────────
describe('Timesheet Table', () => {
  test('renders the entry table', async () => {
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(screen.getByTestId('timesheet-entry-table')).toBeInTheDocument();
    });
  });

  test('renders day shortLabels as column headers', async () => {
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(screen.getByText('MON')).toBeInTheDocument();
    });
    expect(screen.getByText('TUE')).toBeInTheDocument();
    expect(screen.getByText('WED')).toBeInTheDocument();
    expect(screen.getByText('THU')).toBeInTheDocument();
    expect(screen.getByText('FRI')).toBeInTheDocument();
    expect(screen.getByText('SAT')).toBeInTheDocument();
    expect(screen.getByText('SUN')).toBeInTheDocument();
  });

  test('renders Project and Task column headers', async () => {
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(screen.getByText('Project')).toBeInTheDocument();
    });
    expect(screen.getByText('Task')).toBeInTheDocument();
  });

  test('renders Daily Totals row', async () => {
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(screen.getByText('Daily Totals')).toBeInTheDocument();
    });
  });

  test('shows status chip (Draft by default)', async () => {
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });
  });
});

// ────────────────── DATA LOADING ──────────────────
describe('Data Loading', () => {
  test('calls timesheetService.getByWeek on mount', async () => {
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(timesheetService.getByWeek).toHaveBeenCalledWith(
        currentWeekStart,
        MOCK_EMPLOYEE_ID
      );
    });
  });

  test('loads projects via ProjectDataService', async () => {
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(ProjectDataService.getAll).toHaveBeenCalled();
    });
  });

  test('loads tasks via TaskDataService', async () => {
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(TaskDataService.getAll).toHaveBeenCalled();
    });
  });
});

// ────────────────── ADD / DELETE TASKS ──────────────────
describe('Add / Delete Tasks', () => {
  test('renders Add Task button', async () => {
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(screen.getByTestId('timesheet-add-task')).toBeInTheDocument();
    });
  });

  test('clicking Add Task adds a new row', async () => {
    const user = userEvent.setup();
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(screen.getByTestId('timesheet-add-task')).toBeInTheDocument();
    });

    // Count existing project selects (1 row for existing data)
    const addBtn = screen.getByTestId('timesheet-add-task');
    await user.click(addBtn);

    // After clicking, there should be a second project select
    await waitFor(() => {
      expect(screen.getByTestId('timesheet-project-select-1')).toBeInTheDocument();
    });
  });
});

// ────────────────── ACTION BUTTONS ──────────────────
describe('Action Buttons', () => {
  test('renders Save Draft button', async () => {
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(screen.getByTestId('timesheet-save-draft')).toBeInTheDocument();
    });
  });

  test('renders Submit for Approval button', async () => {
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(screen.getByTestId('timesheet-submit')).toBeInTheDocument();
    });
    expect(screen.getByText(/submit for approval/i)).toBeInTheDocument();
  });

  test('hides action buttons when timesheet is read-only (submitted)', async () => {
    const submittedTimesheet = {
      ...mockWeeklyTimesheet,
      status: 'Submitted',
    };
    // H-03: getByWeek mock returns response.data shape
    timesheetService.getByWeek.mockResolvedValue({ data: [submittedTimesheet] });

    renderTimesheet();
    // Wait for week number to render (component renders this from state immediately)
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    // 'submitted' status maps to label 'Pending Approval' in STATUS_CONFIG
    await waitFor(() => {
      expect(screen.getByText('Pending Approval')).toBeInTheDocument();
    });

    // Action buttons should not be present in read-only mode
    expect(screen.queryByTestId('timesheet-save-draft')).not.toBeInTheDocument();
    expect(screen.queryByTestId('timesheet-submit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('timesheet-add-task')).not.toBeInTheDocument();
  });
});

// ────────────────── ERROR HANDLING ──────────────────
describe('Error Handling', () => {
  test('handles timesheet fetch error gracefully', async () => {
    timesheetService.getByWeek.mockRejectedValue(new Error('Network Error'));

    renderTimesheet();

    // Component should render the week nav even on error
    expect(await screen.findByText(`Week ${dayjs().isoWeek()}`)).toBeInTheDocument();
  });

  test('shows empty state when no timesheets exist for the week', async () => {
    // H-03: empty response shape
    timesheetService.getByWeek.mockResolvedValue({ data: [] });

    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    // Should show an empty row with project select
    await waitFor(() => {
      expect(screen.getByTestId('timesheet-project-select-0')).toBeInTheDocument();
    });
  });
});

// ────────────────── SAVE DRAFT WORKFLOW ──────────────────
describe('Save Draft Workflow', () => {
  test('clicking Save Draft calls timesheetService.bulkUpdate for existing entries', async () => {
    const user = userEvent.setup();
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    // Wait for hour input to appear and modify it to enable Save Draft
    await waitFor(() => {
      expect(screen.getByTestId('timesheet-hours-0-monday')).toBeInTheDocument();
    });

    // Type an hour value to trigger hasUnsavedChanges
    const hourInput = screen.getByTestId('timesheet-hours-0-monday');
    await user.clear(hourInput);
    await user.type(hourInput, '8');

    // Now Save Draft should be enabled
    await waitFor(() => {
      expect(screen.getByTestId('timesheet-save-draft')).not.toBeDisabled();
    });

    await user.click(screen.getByTestId('timesheet-save-draft'));

    await waitFor(() => {
      // Either bulkUpdate (for existing) or createBatch (for new) should be called
      const updateCalled = timesheetService.bulkUpdate.mock.calls.length > 0;
      const createCalled = timesheetService.createBatch.mock.calls.length > 0;
      expect(updateCalled || createCalled).toBe(true);
    });
  });

  test('Save Draft button is disabled when no unsaved changes', async () => {
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(screen.getByTestId('timesheet-save-draft')).toBeInTheDocument();
    });

    // Without making changes, button should be disabled
    expect(screen.getByTestId('timesheet-save-draft')).toBeDisabled();
  });
});

// ────────────────── SUBMIT WORKFLOW ──────────────────
describe('Submit for Approval Workflow', () => {
  test('clicking Submit calls bulkSubmit with loaded timesheet UUIDs', async () => {
    // MOCK_TS_UUID is a valid UUID → isValidUUID returns true → submit path skips saveDraft
    // and calls bulkSubmit([MOCK_TS_UUID]) directly.
    timesheetService.getByWeek
      .mockResolvedValueOnce({ data: [mockWeeklyTimesheet] }) // initial load
      .mockResolvedValue({ data: [{ ...mockWeeklyTimesheet, status: 'Submitted' }] }); // post-submit reload

    const user = userEvent.setup();
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(screen.getByTestId('timesheet-submit')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('timesheet-submit'));

    await waitFor(() => {
      expect(timesheetService.bulkSubmit).toHaveBeenCalledWith([MOCK_TS_UUID]);
    }, { timeout: 10000 });
  });

  test('Save Draft calls createBatch for brand-new (temp-ID) entries', async () => {
    // Return a timesheet with a non-UUID id → isValidUUID returns false
    // → buildPayload omits the id → treated as new entry → createBatch path
    const newEntryTimesheet = { ...mockWeeklyTimesheet, id: 'not-a-valid-uuid' };
    timesheetService.getByWeek.mockResolvedValue({ data: [newEntryTimesheet] });
    timesheetService.createBatch.mockResolvedValue({ success: true, data: [
      { id: MOCK_TS_UUID, projectId: '00000000-0000-4000-a000-000000000001',
        taskId: '00000000-0000-4000-a000-000000000010' },
    ]});

    const user = userEvent.setup();
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(screen.getByTestId('timesheet-hours-0-monday')).toBeInTheDocument();
    });

    // Modify hours to mark unsaved (validation passes: project+task already loaded)
    const hourInput = screen.getByTestId('timesheet-hours-0-monday');
    await user.clear(hourInput);
    await user.type(hourInput, '6');

    await waitFor(() => {
      expect(screen.getByTestId('timesheet-save-draft')).not.toBeDisabled();
    });

    await user.click(screen.getByTestId('timesheet-save-draft'));

    await waitFor(() => {
      expect(timesheetService.createBatch).toHaveBeenCalled();
    });
  });
});

// ────────────────── DELETE TASK ──────────────────
describe('Delete Task', () => {
  test('clicking delete removes a task row when more than one exists', async () => {
    // Provide 2 task rows so delete is possible
    const twoTimesheets = [
      mockWeeklyTimesheet,
      {
        ...mockWeeklyTimesheet,
        id: '22222222-2222-4222-a222-222222222222',
        projectId: '00000000-0000-4000-a000-000000000002',
        taskId:    '00000000-0000-4000-a000-000000000012',
        description: 'Design work',
      },
    ];
    // H-03: response.data shape
    timesheetService.getByWeek.mockResolvedValue({ data: twoTimesheets });

    const user = userEvent.setup();
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    // Wait for both project selects to appear (2 rows)
    await waitFor(() => {
      expect(screen.getByTestId('timesheet-project-select-0')).toBeInTheDocument();
      expect(screen.getByTestId('timesheet-project-select-1')).toBeInTheDocument();
    });

    // Click delete on second row
    const deleteBtn = screen.getByTestId('timesheet-delete-task-1');
    await user.click(deleteBtn);

    // Second row should be removed
    await waitFor(() => {
      expect(screen.queryByTestId('timesheet-project-select-1')).not.toBeInTheDocument();
    });
  });

  test('delete is not shown when only one task exists', async () => {
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(screen.getByTestId('timesheet-project-select-0')).toBeInTheDocument();
    });

    // With only 1 task, delete button should not be rendered
    expect(screen.queryByTestId('timesheet-delete-task-0')).not.toBeInTheDocument();
  });
});

// ────────────────── READ-ONLY STATUS ──────────────────
describe('Read-Only Status', () => {
  test('approved timesheet shows Approved status and hides actions', async () => {
    const approvedTimesheet = {
      ...mockWeeklyTimesheet,
      status: 'Approved',
    };
    // H-03: response.data shape
    timesheetService.getByWeek.mockResolvedValue({ data: [approvedTimesheet] });

    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('timesheet-save-draft')).not.toBeInTheDocument();
    expect(screen.queryByTestId('timesheet-submit')).not.toBeInTheDocument();
  });
});

// ────────────────── REJECTED STATUS / M-01 ──────────────────
describe('Rejected Status (M-01)', () => {
  test('rejected timesheet shows Rejected status chip and keeps edit mode', async () => {
    const rejectedTimesheet = { ...mockWeeklyTimesheet, status: 'Rejected', approverComments: '' };
    timesheetService.getByWeek.mockResolvedValue({ data: [rejectedTimesheet] });

    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });

    // Rejected is NOT read-only — employee can edit and resubmit
    expect(screen.getByTestId('timesheet-save-draft')).toBeInTheDocument();
    expect(screen.getByTestId('timesheet-submit')).toBeInTheDocument();
  });

  test('rejected timesheet shows approverComments in an alert (M-01)', async () => {
    const rejectedTimesheet = {
      ...mockWeeklyTimesheet,
      status: 'Rejected',
      approverComments: 'Please add project codes for Tuesday',
    };
    timesheetService.getByWeek.mockResolvedValue({ data: [rejectedTimesheet] });

    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });

    // Manager comment should appear in the rejection alert
    expect(screen.getByText(/Manager comment:/i)).toBeInTheDocument();
    expect(screen.getByText(/Please add project codes for Tuesday/)).toBeInTheDocument();
  });

  test('no comments alert shown when approverComments is empty', async () => {
    const rejectedTimesheet = { ...mockWeeklyTimesheet, status: 'Rejected', approverComments: '' };
    timesheetService.getByWeek.mockResolvedValue({ data: [rejectedTimesheet] });

    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Manager comment:/i)).not.toBeInTheDocument();
  });
});

// ────────────────── VALIDATION (H-01) ──────────────────
describe('Validation', () => {
  test('Submit blocked when task has no project selected', async () => {
    // Empty week → task has temp ID, no projectId → validation fails
    timesheetService.getByWeek.mockResolvedValue({ data: [] });

    const user = userEvent.setup();
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    await waitFor(() => {
      expect(screen.getByTestId('timesheet-submit')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('timesheet-submit'));

    // bulkSubmit must NOT be called when validation fails
    await waitFor(() => {
      expect(timesheetService.bulkSubmit).not.toHaveBeenCalled();
    });
  });

  test('H-01: Submit blocked when cross-task daily total exceeds 24h', async () => {
    // Two tasks both logging 13h on Monday = 26h total (> 24h cross-task limit)
    const taskA = { ...mockWeeklyTimesheet, id: MOCK_TS_UUID,
      mondayHours: 13, tuesdayHours: 0, wednesdayHours: 0, thursdayHours: 0,
      fridayHours: 0, saturdayHours: 0, sundayHours: 0, totalHours: 13 };
    const taskB = { ...mockWeeklyTimesheet, id: '22222222-2222-4222-a222-222222222222',
      projectId: '00000000-0000-4000-a000-000000000002',
      taskId:    '00000000-0000-4000-a000-000000000012',
      mondayHours: 13, tuesdayHours: 0, wednesdayHours: 0, thursdayHours: 0,
      fridayHours: 0, saturdayHours: 0, sundayHours: 0, totalHours: 13 };
    timesheetService.getByWeek.mockResolvedValue({ data: [taskA, taskB] });

    const user = userEvent.setup();
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    // Wait for both rows
    await waitFor(() => {
      expect(screen.getByTestId('timesheet-project-select-1')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('timesheet-submit'));

    await waitFor(() => {
      expect(timesheetService.bulkSubmit).not.toHaveBeenCalled();
    });
  });
});

// ────────────────── WEEK NAVIGATION EXTRAS ──────────────────
describe('Week Navigation - Boundary', () => {
  test('Today button navigates back to current week after going to previous week', async () => {
    const user = userEvent.setup();
    renderTimesheet();
    await screen.findByText(`Week ${dayjs().isoWeek()}`);

    // Navigate to previous week
    await user.click(screen.getByTestId('timesheet-prev-week'));
    const prevWeek = dayjs().startOf('isoWeek').subtract(1, 'week').isoWeek();
    await waitFor(() => {
      expect(screen.getByText(`Week ${prevWeek}`)).toBeInTheDocument();
    });

    // Click today — should return to current week
    await user.click(screen.getByTestId('timesheet-today-button'));
    await waitFor(() => {
      expect(screen.getByText(`Week ${dayjs().isoWeek()}`)).toBeInTheDocument();
    });
  });
});
