import React from 'react';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, createMockUser } from '../../../../test-utils/testUtils';

// ─── Mock DataGrid (v6 installed but component uses v7 valueGetter API) ─────
jest.mock('@mui/x-data-grid', () => {
  const React = require('react');
  function MockDataGrid({ rows = [], columns = [], loading, slots, slotProps, ...rest }) {
    return (
      <div role="grid" data-testid="mock-datagrid">
        {slots?.toolbar && React.createElement(slots.toolbar, slotProps?.toolbar || {})}
        {rows.length === 0 && !loading && <div>No rows</div>}
        {rows.map((row, ri) => (
          <div key={row.id ?? ri} role="row" data-rowid={row.id}>
            {columns.map((col) => {
              let value = row[col.field];
              try {
                if (col.valueGetter) value = col.valueGetter(value, row);
              } catch { /* ignore v6/v7 compat */ }
              if (col.renderCell) {
                try {
                  const cell = col.renderCell({ value, row, field: col.field });
                  return <div key={col.field} role="gridcell">{cell}</div>;
                } catch {
                  return <div key={col.field} role="gridcell" />;
                }
              }
              return (
                <div key={col.field} role="gridcell">
                  {value != null ? String(value) : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }
  return {
    __esModule: true,
    DataGrid: MockDataGrid,
    GridToolbarContainer: ({ children }) => <div>{children}</div>,
    GridToolbarFilterButton: () => <button>Filter</button>,
    GridToolbarExport: () => <button>Export</button>,
  };
});

import AttendanceManagement from '../AttendanceManagement';

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

jest.mock('../../../../services', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../services');
  }
  return {
    employeeService: {
      getAll: jest.fn(),
    },
  };
});
const { employeeService } = require('../../../../services');

// ─── Test Data ───────────────────────────────────────────────────────────────

const mockAttendanceRecords = [
  {
    id: 1, employeeId: 'EMP001',
    employee: { firstName: 'John', lastName: 'Doe', employeeId: 'EMP001' },
    date: '2026-02-13', status: 'present', checkIn: '2026-02-13T09:00', checkOut: '2026-02-13T17:30', notes: '',
  },
  {
    id: 2, employeeId: 'EMP002',
    employee: { firstName: 'Jane', lastName: 'Smith', employeeId: 'EMP002' },
    date: '2026-02-13', status: 'absent', checkIn: null, checkOut: null, notes: 'Sick',
  },
  {
    id: 3, employeeId: 'EMP003',
    employee: { firstName: 'Bob', lastName: 'Wilson', employeeId: 'EMP003' },
    date: '2026-02-13', status: 'late', checkIn: '2026-02-13T10:30', checkOut: '2026-02-13T18:00', notes: '',
  },
];

const mockSummary = {
  present: 15,
  absent: 3,
  late: 2,
  'half-day': 1,
  'on-leave': 4,
};

const mockEmployeeList = [
  { id: 1, employeeId: 'EMP001', firstName: 'John', lastName: 'Doe' },
  { id: 2, employeeId: 'EMP002', firstName: 'Jane', lastName: 'Smith' },
  { id: 3, employeeId: 'EMP003', firstName: 'Bob', lastName: 'Wilson' },
  { id: 4, employeeId: 'EMP004', firstName: 'Alice', lastName: 'Brown' },
];

const adminUser = createMockUser('admin');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setupDefaultMocks() {
  mockHttp.get.mockImplementation((url) => {
    if (url.includes('/attendance/daily')) {
      return Promise.resolve({
        data: { data: mockAttendanceRecords, totalCount: mockAttendanceRecords.length },
      });
    }
    if (url.includes('/attendance/summary')) {
      return Promise.resolve({ data: { data: mockSummary } });
    }
    return Promise.resolve({ data: {} });
  });

  mockHttp.post.mockResolvedValue({ data: { success: true } });

  employeeService.getAll.mockResolvedValue({
    data: mockEmployeeList,
  });
}

function renderComponent() {
  return render(<AttendanceManagement />, {
    authValue: { user: adminUser },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AttendanceManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  // ── 1. Rendering ────────────────────────────────────────────────────────

  it('renders the page title', async () => {
    renderComponent();
    expect(
      screen.getByRole('heading', { name: /attendance/i })
    ).toBeInTheDocument();
  });

  it('renders the DataGrid', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });

  it('renders the Mark Attendance button', async () => {
    renderComponent();
    expect(
      screen.getByRole('button', { name: /mark attendance/i })
    ).toBeInTheDocument();
  });

  it('renders a date picker for filtering', async () => {
    renderComponent();
    const dateInput = screen.getByLabelText(/date/i);
    expect(dateInput).toBeInTheDocument();
  });

  // ── 2. Data loading on mount ────────────────────────────────────────────

  it('calls daily attendance API on mount', async () => {
    renderComponent();
    await waitFor(() => {
      expect(mockHttp.get).toHaveBeenCalledWith(
        '/attendance/daily',
        expect.objectContaining({
          params: expect.objectContaining({ date: expect.any(String) }),
        })
      );
    });
  });

  it('calls summary API on mount', async () => {
    renderComponent();
    await waitFor(() => {
      expect(mockHttp.get).toHaveBeenCalledWith(
        '/attendance/summary',
        expect.objectContaining({
          params: expect.objectContaining({
            startDate: expect.any(String),
            endDate: expect.any(String),
          }),
        })
      );
    });
  });

  it('calls employee API on mount', async () => {
    renderComponent();
    await waitFor(() => {
      expect(employeeService.getAll).toHaveBeenCalled();
    });
  });

  // ── 3. Records display ──────────────────────────────────────────────────

  it('displays attendance records in the DataGrid', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
    expect(screen.getByText(/Bob Wilson/)).toBeInTheDocument();
  });

  it('shows statuses for each attendance record', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/PRESENT/)).toBeInTheDocument();
    });
    expect(screen.getByText(/ABSENT/)).toBeInTheDocument();
    expect(screen.getByText(/LATE/)).toBeInTheDocument();
  });

  // ── 4. Summary chips ───────────────────────────────────────────────────

  it('displays summary chips with status counts', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/present: 15/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/absent: 3/i)).toBeInTheDocument();
  });

  // ── 5. Mark Attendance dialog ───────────────────────────────────────────

  it('opens the Mark Attendance dialog when button is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole('button', { name: /mark attendance/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText(/employee/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/status/i)).toBeInTheDocument();
  });

  it('shows Save and Cancel buttons in the dialog', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole('button', { name: /mark attendance/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('closes the dialog when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole('button', { name: /mark attendance/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /cancel/i })
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('calls POST /attendance/mark when dialog Save is clicked with valid data', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Wait for employees to load
    await waitFor(() => {
      expect(employeeService.getAll).toHaveBeenCalled();
    });

    await user.click(screen.getByRole('button', { name: /mark attendance/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');

    // Fill employee autocomplete
    const employeeInput = within(dialog).getByLabelText(/employee/i);
    await user.click(employeeInput);
    await user.type(employeeInput, 'John');

    // Wait for autocomplete options to appear and click the option
    const option = await waitFor(() => {
      return screen.getByRole('option', { name: /John Doe/ });
    });
    await user.click(option);

    // Save (status defaults to 'present')
    await user.click(within(dialog).getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockHttp.post).toHaveBeenCalledWith(
        '/attendance/mark',
        expect.objectContaining({
          status: 'present',
        })
      );
    });
  });

  // ── 6. Edit attendance ──────────────────────────────────────────────────

  it('opens edit dialog when edit icon is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });

    // The mock DataGrid renders edit buttons via renderCell for 'actions' column
    const editButtons = screen.getAllByTestId('EditIcon');
    await user.click(editButtons[0].closest('button'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  // ── 7. Date change triggers refetch ─────────────────────────────────────

  it('refetches attendance data when date is changed', async () => {
    renderComponent();

    await waitFor(() => {
      expect(mockHttp.get).toHaveBeenCalled();
    });

    const initialCallCount = mockHttp.get.mock.calls.length;

    const dateInput = screen.getByLabelText(/date/i);
    fireEvent.change(dateInput, { target: { value: '2026-02-12' } });

    await waitFor(() => {
      expect(mockHttp.get.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  // ── 8. Error handling ───────────────────────────────────────────────────

  it('handles API failure gracefully without crashing', async () => {
    mockHttp.get.mockRejectedValue(new Error('Network error'));
    employeeService.getAll.mockRejectedValue(new Error('Network error'));

    expect(() => renderComponent()).not.toThrow();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /attendance/i })
      ).toBeInTheDocument();
    });
  });

  // ── 9. Empty state ──────────────────────────────────────────────────────

  it('shows empty state when no records are returned', async () => {
    mockHttp.get.mockImplementation((url) => {
      if (url.includes('/attendance/daily')) {
        return Promise.resolve({ data: { data: [], totalCount: 0 } });
      }
      if (url.includes('/attendance/summary')) {
        return Promise.resolve({
          data: {
            data: { present: 0, absent: 0, late: 0, 'half-day': 0, 'on-leave': 0 },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    expect(screen.getByText(/no rows/i)).toBeInTheDocument();
  });

  // ── 10. Additional coverage ─────────────────────────────────────────────

  it('passes pagination parameters to the daily attendance API', async () => {
    renderComponent();

    await waitFor(() => {
      expect(mockHttp.get).toHaveBeenCalledWith(
        '/attendance/daily',
        expect.objectContaining({
          params: expect.objectContaining({
            page: expect.any(Number),
            limit: expect.any(Number),
          }),
        })
      );
    });
  });

  it('passes date range to the summary API', async () => {
    renderComponent();

    await waitFor(() => {
      expect(mockHttp.get).toHaveBeenCalledWith(
        '/attendance/summary',
        expect.objectContaining({
          params: expect.objectContaining({
            startDate: expect.any(String),
            endDate: expect.any(String),
          }),
        })
      );
    });
  });
});
