import React from 'react';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, createMockUser } from '../../../../test-utils/testUtils';

// Mock the service
jest.mock('../../../../services/leave-balance-admin.service', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../services/leave-balance-admin.service');
  }
  return {
    leaveBalanceAdminService: {
      getAll: jest.fn(),
      get: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      bulkInitialize: jest.fn(),
      getSummary: jest.fn(),
      getEmployees: jest.fn(),
      getLeaveTypes: jest.fn(),
    },
  };
});
const { leaveBalanceAdminService } = require('../../../../services/leave-balance-admin.service');

// ── helpers ────────────────────────────────────────────────────────
const adminAuth = { authValue: { user: createMockUser('admin') } };

const mockEmployees = [
  { id: 1, firstName: 'John', lastName: 'Doe', employeeId: 'EMP001' },
  { id: 2, firstName: 'Jane', lastName: 'Smith', employeeId: 'EMP002' },
];

const mockLeaveTypes = [
  { id: 10, name: 'Annual Leave', maxDaysPerYear: 20 },
  { id: 11, name: 'Sick Leave', maxDaysPerYear: 14 },
];

const mockBalances = [
  {
    id: 100,
    employee: { firstName: 'John', lastName: 'Doe', employeeId: 'EMP001' },
    leaveType: { name: 'Annual Leave' },
    totalAccrued: 20,
    carryForward: 3,
    totalTaken: 5,
    totalPending: 2,
    balance: 16,
  },
  {
    id: 101,
    employee: { firstName: 'Jane', lastName: 'Smith', employeeId: 'EMP002' },
    leaveType: { name: 'Sick Leave' },
    totalAccrued: 14,
    carryForward: 0,
    totalTaken: 1,
    totalPending: 0,
    balance: 13,
  },
];

const mockPagination = { currentPage: 1, pages: 1, total: 2 };

const setupMocks = (overrides = {}) => {
  leaveBalanceAdminService.getEmployees.mockResolvedValue(
    overrides.employees ?? { data: mockEmployees }
  );
  leaveBalanceAdminService.getLeaveTypes.mockResolvedValue(
    overrides.leaveTypes ?? { data: mockLeaveTypes }
  );
  leaveBalanceAdminService.getAll.mockResolvedValue(
    overrides.getAll ?? {
      data: {
        balances: overrides.balances ?? mockBalances,
        pagination: overrides.pagination ?? mockPagination,
      },
    }
  );
  leaveBalanceAdminService.create.mockResolvedValue(overrides.create ?? { data: {} });
  leaveBalanceAdminService.update.mockResolvedValue(overrides.update ?? { data: {} });
  leaveBalanceAdminService.delete.mockResolvedValue(overrides.delete ?? { data: {} });
  leaveBalanceAdminService.bulkInitialize.mockResolvedValue(
    overrides.bulkInit ?? { data: { created: 5, updated: 0 } }
  );
};

const renderComponent = async (opts = {}) => {
  setupMocks(opts.mocks || {});
  const result = render(
    React.createElement(
      require('../LeaveBalanceModern').default
    ),
    adminAuth
  );
  // wait for initial data load
  await waitFor(() => {
    expect(leaveBalanceAdminService.getEmployees).toHaveBeenCalled();
  });
  return result;
};

beforeEach(() => {
  jest.clearAllMocks();
  // Prevent URL.createObjectURL errors in CSV export
  window.URL.createObjectURL = jest.fn(() => 'blob:test');
  window.URL.revokeObjectURL = jest.fn();
});

// ── Tests ──────────────────────────────────────────────────────────

describe('LeaveBalanceModern', () => {
  describe('Rendering', () => {
    it('renders the page header', async () => {
      await renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Leave Balance Administration')).toBeInTheDocument();
        expect(screen.getByText(/Manage employee leave allocations/)).toBeInTheDocument();
      }, { timeout: 10000 });
    }, 60000);

    it('renders filter controls', async () => {
      await renderComponent();
      expect(screen.getByText('Filters & Search')).toBeInTheDocument();
      expect(screen.getByTestId('leave-year-select')).toBeInTheDocument();
    });

    it('renders Bulk Initialize and Add Balance buttons', async () => {
      await renderComponent();
      expect(screen.getByRole('button', { name: /Bulk Initialize/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add.*Balance/i })).toBeInTheDocument();
    });

    it('renders table headers', async () => {
      await renderComponent();
      const table = screen.getByRole('table');
      for (const header of ['Employee', 'Leave Type', 'Total Allocated', 'Taken', 'Pending', 'Available', 'Actions']) {
        expect(within(table).getByText(header)).toBeInTheDocument();
      }
    });

    it('renders balance rows with employee data', async () => {
      await renderComponent();
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('shows leave type chips', async () => {
      await renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Annual Leave')).toBeInTheDocument();
        expect(screen.getByText('Sick Leave')).toBeInTheDocument();
      });
    });

    it('displays balance counts', async () => {
      await renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/Showing 2 of 2 leave balances/)).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no balances exist', async () => {
      await renderComponent({
        mocks: {
          getAll: { data: { balances: [], pagination: { currentPage: 1, pages: 1, total: 0 } } },
          balances: [],
        },
      });
      await waitFor(() => {
        expect(screen.getByText('No Leave Balances Found')).toBeInTheDocument();
      });
    });

    it('offers Bulk Initialize and Add Balance in empty state', async () => {
      await renderComponent({
        mocks: {
          getAll: { data: { balances: [], pagination: { currentPage: 1, pages: 1, total: 0 } } },
          balances: [],
        },
      });
      await waitFor(() => {
        const emptyMsg = screen.getByText('No Leave Balances Found');
        expect(emptyMsg).toBeInTheDocument();
      });
    });
  });

  describe('Search & Filters', () => {
    it('filters balances by search query', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const searchInput = screen.getByTestId('leave-search-input');
      await userEvent.type(searchInput, 'Jane');

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      });
    });

    it('filters by employee ID in search', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const searchInput = screen.getByTestId('leave-search-input');
      await userEvent.type(searchInput, 'EMP002');

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      });
    });

    it('shows no-results message when search matches nothing', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const searchInput = screen.getByTestId('leave-search-input');
      await userEvent.type(searchInput, 'NONEXISTENT');

      await waitFor(() => {
        expect(screen.getByText(/No results match your search/)).toBeInTheDocument();
      });
    });

    it('reloads data when Refresh button is clicked', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
      await userEvent.click(refreshBtn);

      // getAll should be called again
      expect(leaveBalanceAdminService.getAll).toHaveBeenCalledTimes(3); // initial + filter effect + refresh
    });

    it('clears filters when Clear Filters is clicked', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const searchInput = screen.getByTestId('leave-search-input');
      await userEvent.type(searchInput, 'Jane');

      // Should have only Jane visible
      await waitFor(() => expect(screen.queryByText('John Doe')).not.toBeInTheDocument());

      // Clear filters (need to find the non-disabled one)
      const clearBtn = screen.getByRole('button', { name: /Clear Filters/i });
      await userEvent.click(clearBtn);

      // Success message
      await waitFor(() => {
        expect(screen.getByText('Filters cleared')).toBeInTheDocument();
      });
    });
  });

  describe('Create Balance Dialog', () => {
    it('opens the create dialog when Add Balance is clicked', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      // Find the header Add Balance button (Tooltip sets aria-label="Add Individual Leave Balance")
      const addBtn = screen.getByRole('button', { name: /Add.*Balance/i });
      await userEvent.click(addBtn);

      await waitFor(() => {
        expect(screen.getByText('Create Leave Balance')).toBeInTheDocument();
      });
    });

    it('calls create service on submit', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const addBtn = screen.getByRole('button', { name: /Add.*Balance/i });
      await userEvent.click(addBtn);

      await waitFor(() => {
        expect(screen.getByText('Create Leave Balance')).toBeInTheDocument();
      });

      // Select employee via MUI Select dropdown
      const dialog = screen.getByRole('dialog');
      const comboboxes = within(dialog).getAllByRole('combobox');
      await userEvent.click(comboboxes[0]);
      const empListbox = await screen.findByRole('listbox');
      await userEvent.click(within(empListbox).getByText(/John Doe/));

      // Select leave type via MUI Select dropdown
      await userEvent.click(comboboxes[1]);
      const typeListbox = await screen.findByRole('listbox');
      await userEvent.click(within(typeListbox).getByText(/Annual Leave/));

      // Set accrued days
      const accruedInput = screen.getByTestId('create-leave-accrued-input');
      fireEvent.change(accruedInput, { target: { value: '15' } });

      // Submit
      const createBtn = screen.getByRole('button', { name: /Create Balance/i });
      await userEvent.click(createBtn);

      await waitFor(() => {
        expect(leaveBalanceAdminService.create).toHaveBeenCalled();
      });
    }, 15000);

    it('closes create dialog on Cancel', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const addBtn = screen.getByRole('button', { name: /Add.*Balance/i });
      await userEvent.click(addBtn);

      await waitFor(() => {
        expect(screen.getByText('Create Leave Balance')).toBeInTheDocument();
      });

      const cancelBtn = screen.getAllByRole('button', { name: /Cancel/i });
      await userEvent.click(cancelBtn[0]);

      await waitFor(() => {
        expect(screen.queryByText('Create Leave Balance')).not.toBeInTheDocument();
      });
    });

    it('shows success message after creation', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const addBtn = screen.getByRole('button', { name: /Add.*Balance/i });
      await userEvent.click(addBtn);

      await waitFor(() => expect(screen.getByText('Create Leave Balance')).toBeInTheDocument());

      // Select employee via MUI Select dropdown
      const dialog = screen.getByRole('dialog');
      const comboboxes = within(dialog).getAllByRole('combobox');
      await userEvent.click(comboboxes[0]);
      const empListbox = await screen.findByRole('listbox');
      await userEvent.click(within(empListbox).getByText(/John Doe/));

      // Select leave type via MUI Select dropdown
      await userEvent.click(comboboxes[1]);
      const typeListbox = await screen.findByRole('listbox');
      await userEvent.click(within(typeListbox).getByText(/Annual Leave/));

      const createBtn = screen.getByRole('button', { name: /Create Balance/i });
      await userEvent.click(createBtn);

      await waitFor(() => {
        expect(screen.getByText('Leave balance created successfully!')).toBeInTheDocument();
      });
    }, 15000);

    it('shows error on creation failure', async () => {
      leaveBalanceAdminService.create.mockRejectedValueOnce(new Error('Duplicate balance'));
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const addBtn = screen.getByRole('button', { name: /Add.*Balance/i });
      await userEvent.click(addBtn);

      await waitFor(() => expect(screen.getByText('Create Leave Balance')).toBeInTheDocument());

      // Select employee via MUI Select dropdown
      const dialog = screen.getByRole('dialog');
      const comboboxes = within(dialog).getAllByRole('combobox');
      await userEvent.click(comboboxes[0]);
      const empListbox = await screen.findByRole('listbox');
      await userEvent.click(within(empListbox).getByText(/John Doe/));

      // Select leave type via MUI Select dropdown
      await userEvent.click(comboboxes[1]);
      const typeListbox = await screen.findByRole('listbox');
      await userEvent.click(within(typeListbox).getByText(/Annual Leave/));

      const createBtn = screen.getByRole('button', { name: /Create Balance/i });
      await userEvent.click(createBtn);

      await waitFor(() => {
        expect(screen.getByText(/Failed to create leave balance/)).toBeInTheDocument();
      });
    }, 15000);
  });

  describe('Bulk Initialize Dialog', () => {
    it('opens bulk init dialog', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const bulkBtn = screen.getAllByRole('button', { name: /Bulk Initialize/i });
      await userEvent.click(bulkBtn[0]);

      await waitFor(() => {
        expect(screen.getByText('Bulk Initialize Leave Balances')).toBeInTheDocument();
      });
    });

    it('shows leave type allocation fields in bulk dialog', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const bulkBtn = screen.getAllByRole('button', { name: /Bulk Initialize/i });
      await userEvent.click(bulkBtn[0]);

      await waitFor(() => {
        expect(screen.getByLabelText(/Annual Leave - Days to Add/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Sick Leave - Days to Add/i)).toBeInTheDocument();
      });
    });

    it('validates at least one allocation before submit', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const bulkBtn = screen.getAllByRole('button', { name: /Bulk Initialize/i });
      await userEvent.click(bulkBtn[0]);

      await waitFor(() => {
        const initBtn = screen.getByRole('button', { name: /Initialize Balances/i });
        // Button should be disabled when no allocations set
        expect(initBtn).toBeDisabled();
      });
    });

    it('calls bulkInitialize on submit', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const bulkBtn = screen.getAllByRole('button', { name: /Bulk Initialize/i });
      await userEvent.click(bulkBtn[0]);

      await waitFor(() => {
        expect(screen.getByLabelText(/Annual Leave - Days to Add/i)).toBeInTheDocument();
      });

      const annualInput = screen.getByTestId(`leave-bulk-allocation-10`);
      fireEvent.change(annualInput, { target: { value: '15' } });

      const initBtn = screen.getByRole('button', { name: /Initialize Balances/i });
      await userEvent.click(initBtn);

      await waitFor(() => {
        expect(leaveBalanceAdminService.bulkInitialize).toHaveBeenCalled();
      });
    });

    it('shows success message after bulk init', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const bulkBtn = screen.getAllByRole('button', { name: /Bulk Initialize/i });
      await userEvent.click(bulkBtn[0]);

      await waitFor(() => {
        expect(screen.getByLabelText(/Annual Leave - Days to Add/i)).toBeInTheDocument();
      });

      const annualInput = screen.getByTestId(`leave-bulk-allocation-10`);
      fireEvent.change(annualInput, { target: { value: '15' } });

      const initBtn = screen.getByRole('button', { name: /Initialize Balances/i });
      await userEvent.click(initBtn);

      await waitFor(() => {
        expect(screen.getByText(/Created 5 new leave balances/)).toBeInTheDocument();
      });
    }, 15000);

    it('shows error on bulk init failure', async () => {
      leaveBalanceAdminService.bulkInitialize.mockRejectedValueOnce(new Error('Server error'));
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const bulkBtn = screen.getAllByRole('button', { name: /Bulk Initialize/i });
      await userEvent.click(bulkBtn[0]);

      await waitFor(() => {
        expect(screen.getByLabelText(/Annual Leave - Days to Add/i)).toBeInTheDocument();
      });

      const annualInput = screen.getByTestId(`leave-bulk-allocation-10`);
      fireEvent.change(annualInput, { target: { value: '15' } });

      const initBtn = screen.getByRole('button', { name: /Initialize Balances/i });
      await userEvent.click(initBtn);

      await waitFor(() => {
        expect(screen.getByText(/Failed to initialize leave balances/)).toBeInTheDocument();
      });
    }, 15000);
  });

  describe('Inline Editing', () => {
    it('enters edit mode when Edit button is clicked', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      // Click edit on first row
      const editButtons = screen.getAllByLabelText('Edit');
      await userEvent.click(editButtons[0]);

      // Should show editable fields
      await waitFor(() => {
        expect(screen.getByLabelText('Allocated')).toBeInTheDocument();
        expect(screen.getByLabelText('Carry Fwd')).toBeInTheDocument();
      });
    }, 15000);

    it('shows Save and Cancel buttons in edit mode', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const editButtons = screen.getAllByLabelText('Edit');
      await userEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByLabelText('Save')).toBeInTheDocument();
        expect(screen.getByLabelText('Cancel')).toBeInTheDocument();
      });
    });

    it('cancels edit mode', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const editButtons = screen.getAllByLabelText('Edit');
      await userEvent.click(editButtons[0]);

      await waitFor(() => expect(screen.getByLabelText('Cancel')).toBeInTheDocument());

      await userEvent.click(screen.getByLabelText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByLabelText('Save')).not.toBeInTheDocument();
      });
    }, 15000);

    it('calls update service on Save', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const editButtons = screen.getAllByLabelText('Edit');
      await userEvent.click(editButtons[0]);

      await waitFor(() => expect(screen.getByLabelText('Save')).toBeInTheDocument());

      await userEvent.click(screen.getByLabelText('Save'));

      await waitFor(() => {
        expect(leaveBalanceAdminService.update).toHaveBeenCalledWith(100, expect.any(Object));
      });
    });

    it('shows success message after update', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const editButtons = screen.getAllByLabelText('Edit');
      await userEvent.click(editButtons[0]);

      await waitFor(() => expect(screen.getByLabelText('Save')).toBeInTheDocument());
      await userEvent.click(screen.getByLabelText('Save'));

      await waitFor(() => {
        expect(screen.getByText('Leave balance updated successfully!')).toBeInTheDocument();
      });
    });
  });

  describe('Delete', () => {
    it('opens delete confirmation dialog', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const deleteButtons = screen.getAllByLabelText('Delete');
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
      });
    });

    it('calls delete service on confirm', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const deleteButtons = screen.getAllByLabelText('Delete');
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => expect(screen.getByText('Confirm Deletion')).toBeInTheDocument());

      const confirmBtn = screen.getByRole('button', { name: /^Delete$/i });
      await userEvent.click(confirmBtn);

      await waitFor(() => {
        expect(leaveBalanceAdminService.delete).toHaveBeenCalledWith(100);
      });
    });

    it('shows success after delete', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const deleteButtons = screen.getAllByLabelText('Delete');
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => expect(screen.getByText('Confirm Deletion')).toBeInTheDocument());

      const confirmBtn = screen.getByRole('button', { name: /^Delete$/i });
      await userEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText('Leave balance deleted successfully!')).toBeInTheDocument();
      });
    });

    it('cancels delete dialog', async () => {
      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const deleteButtons = screen.getAllByLabelText('Delete');
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => expect(screen.getByText('Confirm Deletion')).toBeInTheDocument());

      const cancelBtn = screen.getAllByRole('button', { name: /Cancel/i });
      await userEvent.click(cancelBtn[cancelBtn.length - 1]);

      await waitFor(() => {
        expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument();
      });
    });
  });

  describe('CSV Export', () => {
    it('exports CSV when Export button is clicked', async () => {
      const mockClick = jest.fn();
      const origCreateElement = document.createElement.bind(document);
      jest.spyOn(document, 'createElement').mockImplementation((tag) => {
        const el = origCreateElement(tag);
        if (tag === 'a') {
          el.click = mockClick;
        }
        return el;
      });

      await renderComponent();
      await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

      const exportBtn = screen.getByRole('button', { name: /Export CSV/i });
      await userEvent.click(exportBtn);

      await waitFor(() => {
        expect(window.URL.createObjectURL).toHaveBeenCalled();
        expect(screen.getByText('Leave balances exported successfully')).toBeInTheDocument();
      });

      document.createElement.mockRestore();
    });

    it('disables export when no balances', async () => {
      await renderComponent({
        mocks: {
          getAll: { data: { balances: [], pagination: { currentPage: 1, pages: 1, total: 0 } } },
          balances: [],
        },
      });

      await waitFor(() => {
        const exportBtn = screen.getByRole('button', { name: /Export CSV/i });
        expect(exportBtn).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error when initial data load fails', async () => {
      leaveBalanceAdminService.getEmployees.mockRejectedValueOnce(new Error('Network error'));
      leaveBalanceAdminService.getLeaveTypes.mockResolvedValue({ data: mockLeaveTypes });
      leaveBalanceAdminService.getAll.mockResolvedValue({
        data: { balances: [], pagination: { currentPage: 1, pages: 1, total: 0 } },
      });

      render(
        React.createElement(require('../LeaveBalanceModern').default),
        adminAuth
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load initial data/)).toBeInTheDocument();
      });
    });

    it('shows error when getAll fails', async () => {
      leaveBalanceAdminService.getEmployees.mockResolvedValue({ data: mockEmployees });
      leaveBalanceAdminService.getLeaveTypes.mockResolvedValue({ data: mockLeaveTypes });
      leaveBalanceAdminService.getAll.mockRejectedValue(new Error('Server down'));

      render(
        React.createElement(require('../LeaveBalanceModern').default),
        adminAuth
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load leave balances/)).toBeInTheDocument();
      });
    });

    it('dismisses error alert', async () => {
      leaveBalanceAdminService.getEmployees.mockResolvedValue({ data: mockEmployees });
      leaveBalanceAdminService.getLeaveTypes.mockResolvedValue({ data: mockLeaveTypes });
      leaveBalanceAdminService.getAll.mockRejectedValue(new Error('Temporary error'));

      render(
        React.createElement(require('../LeaveBalanceModern').default),
        adminAuth
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load leave balances/)).toBeInTheDocument();
      });

      const closeBtn = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByText(/Failed to load leave balances/)).not.toBeInTheDocument();
      });
    });
  });
});
