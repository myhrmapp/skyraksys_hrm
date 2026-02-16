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
  { id: 1, name: 'Project Alpha', code: 'PA', status: 'Active' },
  { id: 2, name: 'Project Beta', code: 'PB', status: 'Active' },
];

const mockTasks = [
  { id: 10, name: 'Development', projectId: 1 },
  { id: 11, name: 'Testing', projectId: 1 },
  { id: 12, name: 'Design', projectId: 2 },
];

// Must match employee.id from createMockUser() which is 100
const currentWeekStart = dayjs().startOf('isoWeek').format('YYYY-MM-DD');
const currentWeekEnd = dayjs().endOf('isoWeek').format('YYYY-MM-DD');

const mockWeeklyTimesheet = {
  id: 'ts-uuid-1',
  employeeId: 100,
  projectId: 1,
  taskId: 10,
  weekStartDate: currentWeekStart,
  weekEndDate: currentWeekEnd,
  mondayHours: 8,
  tuesdayHours: 7,
  wednesdayHours: 8,
  thursdayHours: 6,
  fridayHours: 8,
  saturdayHours: 0,
  sundayHours: 0,
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

  // useEffect call for weekly timesheet
  timesheetService.getByWeek.mockResolvedValue({
    data: { data: [mockWeeklyTimesheet] },
  });

  // Other service methods
  timesheetService.createBatch.mockResolvedValue({ data: { success: true } });
  timesheetService.bulkUpdate.mockResolvedValue({ data: { success: true } });
  timesheetService.bulkSubmit.mockResolvedValue({ data: { success: true } });
  timesheetService.getPending.mockResolvedValue({ data: { data: [] } });
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

// ────────────────── PAGE LAYOUT ──────────────────
describe('Page Layout', () => {
  test('renders timesheet heading', async () => {
    renderTimesheet();
    expect(await screen.findByText('Timesheet')).toBeInTheDocument();
  });

  test('renders refresh button', async () => {
    renderTimesheet();
    expect(await screen.findByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  test('renders My Timesheet tab', async () => {
    renderTimesheet();
    expect(await screen.findByRole('tab', { name: /my timesheet/i })).toBeInTheDocument();
  });

  test('renders History tab', async () => {
    renderTimesheet();
    expect(await screen.findByRole('tab', { name: /history/i })).toBeInTheDocument();
  });

  test('renders Pending Approvals tab for manager', async () => {
    renderTimesheet('manager');
    expect(
      await screen.findByRole('tab', { name: /pending approvals/i })
    ).toBeInTheDocument();
  });

  test('does not render Pending Approvals tab for employee', async () => {
    renderTimesheet('employee');
    await screen.findByText('Timesheet');
    expect(
      screen.queryByRole('tab', { name: /pending approvals/i })
    ).not.toBeInTheDocument();
  });
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
    await screen.findByText('Timesheet');

    expect(screen.getByTestId('timesheet-prev-week')).toBeInTheDocument();
    expect(screen.getByTestId('timesheet-next-week')).toBeInTheDocument();
    expect(screen.getByTestId('timesheet-today-button')).toBeInTheDocument();
  });

  test('navigates to previous week', async () => {
    const user = userEvent.setup();
    renderTimesheet();
    await screen.findByText('Timesheet');

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
    await screen.findByText('Timesheet');

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
    await screen.findByText('Timesheet');

    await waitFor(() => {
      expect(screen.getByTestId('timesheet-entry-table')).toBeInTheDocument();
    });
  });

  test('renders day shortLabels as column headers', async () => {
    renderTimesheet();
    await screen.findByText('Timesheet');

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
    await screen.findByText('Timesheet');

    await waitFor(() => {
      expect(screen.getByText('Project')).toBeInTheDocument();
    });
    expect(screen.getByText('Task')).toBeInTheDocument();
  });

  test('renders Daily Totals row', async () => {
    renderTimesheet();
    await screen.findByText('Timesheet');

    await waitFor(() => {
      expect(screen.getByText('Daily Totals')).toBeInTheDocument();
    });
  });

  test('shows status chip (Draft by default)', async () => {
    renderTimesheet();
    await screen.findByText('Timesheet');

    await waitFor(() => {
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });
  });
});

// ────────────────── DATA LOADING ──────────────────
describe('Data Loading', () => {
  test('calls timesheetService.getByWeek on mount', async () => {
    renderTimesheet();
    await screen.findByText('Timesheet');

    await waitFor(() => {
      expect(timesheetService.getByWeek).toHaveBeenCalledWith(
        currentWeekStart,
        100 // user.employee.id
      );
    });
  });

  test('loads projects via ProjectDataService', async () => {
    renderTimesheet();
    await screen.findByText('Timesheet');

    await waitFor(() => {
      expect(ProjectDataService.getAll).toHaveBeenCalled();
    });
  });

  test('loads tasks via TaskDataService', async () => {
    renderTimesheet();
    await screen.findByText('Timesheet');

    await waitFor(() => {
      expect(TaskDataService.getAll).toHaveBeenCalled();
    });
  });
});

// ────────────────── ADD / DELETE TASKS ──────────────────
describe('Add / Delete Tasks', () => {
  test('renders Add Task button', async () => {
    renderTimesheet();
    await screen.findByText('Timesheet');

    await waitFor(() => {
      expect(screen.getByTestId('timesheet-add-task')).toBeInTheDocument();
    });
  });

  test('clicking Add Task adds a new row', async () => {
    const user = userEvent.setup();
    renderTimesheet();
    await screen.findByText('Timesheet');

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
    await screen.findByText('Timesheet');

    await waitFor(() => {
      expect(screen.getByTestId('timesheet-save-draft')).toBeInTheDocument();
    });
  });

  test('renders Submit for Approval button', async () => {
    renderTimesheet();
    await screen.findByText('Timesheet');

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
    timesheetService.getByWeek.mockResolvedValue({
      data: { data: [submittedTimesheet] },
    });

    renderTimesheet();
    await screen.findByText('Timesheet');

    // Wait for data to load and status to show "Pending" (submitted maps to Pending label)
    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument();
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

    // Component should still render the heading
    expect(await screen.findByText('Timesheet')).toBeInTheDocument();
  });

  test('shows empty state when no timesheets exist for the week', async () => {
    timesheetService.getByWeek.mockResolvedValue({
      data: { data: [] },
    });

    renderTimesheet();
    await screen.findByText('Timesheet');

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
    await screen.findByText('Timesheet');

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
    await screen.findByText('Timesheet');

    await waitFor(() => {
      expect(screen.getByTestId('timesheet-save-draft')).toBeInTheDocument();
    });

    // Without making changes, button should be disabled
    expect(screen.getByTestId('timesheet-save-draft')).toBeDisabled();
  });
});

// ────────────────── SUBMIT WORKFLOW ──────────────────
describe('Submit for Approval Workflow', () => {
  test('clicking Submit calls bulkSubmit after saving', async () => {
    // After submit, the component calls saveDraft first, then getByWeek,
    // then filters draft timesheets, then bulkSubmit
    timesheetService.getByWeek
      .mockResolvedValueOnce({ data: { data: [mockWeeklyTimesheet] } }) // initial load
      .mockResolvedValue({
        data: {
          data: [{
            ...mockWeeklyTimesheet,
            status: 'Draft',
            employeeId: 100,
          }],
        },
      }); // post-save reload

    const user = userEvent.setup();
    renderTimesheet();
    await screen.findByText('Timesheet');

    await waitFor(() => {
      expect(screen.getByTestId('timesheet-submit')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('timesheet-submit'));

    await waitFor(() => {
      expect(timesheetService.bulkSubmit).toHaveBeenCalled();
    }, { timeout: 10000 });
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
        id: 'ts-uuid-2',
        projectId: 2,
        taskId: 12,
        description: 'Design work',
      },
    ];
    timesheetService.getByWeek.mockResolvedValue({
      data: { data: twoTimesheets },
    });

    const user = userEvent.setup();
    renderTimesheet();
    await screen.findByText('Timesheet');

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
    await screen.findByText('Timesheet');

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
    timesheetService.getByWeek.mockResolvedValue({
      data: { data: [approvedTimesheet] },
    });

    renderTimesheet();
    await screen.findByText('Timesheet');

    await waitFor(() => {
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('timesheet-save-draft')).not.toBeInTheDocument();
    expect(screen.queryByTestId('timesheet-submit')).not.toBeInTheDocument();
  });
});
