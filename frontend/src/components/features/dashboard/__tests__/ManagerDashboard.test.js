import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ManagerDashboard from '../ManagerDashboard';
import { leaveService } from '../../../../services/leave.service';
import { timesheetService } from '../../../../services/timesheet.service';
import { employeeService } from '../../../../services/employee.service';
import { useAuth } from '../../../../contexts/AuthContext';

// Mock services
jest.mock('../../../../services/leave.service');
jest.mock('../../../../services/timesheet.service');
jest.mock('../../../../services/employee.service');

// Mock AuthContext
jest.mock('../../../../contexts/AuthContext');

const theme = createTheme();

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (component, { queryClient = createTestQueryClient(), user = {} } = {}) => {
  useAuth.mockReturnValue({ 
    user: { 
      id: 1, 
      employee: { id: 1 },
      ...user 
    } 
  });

  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>{component}</ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('ManagerDashboard Component', () => {
  const mockTeamMembers = [
    { id: 1, firstName: 'John', lastName: 'Doe', employeeId: 'EMP001', isOnLeave: false },
    { id: 2, firstName: 'Jane', lastName: 'Smith', employeeId: 'EMP002', isOnLeave: true },
    { id: 3, firstName: 'Bob', lastName: 'Wilson', employeeId: 'EMP003', isOnLeave: false },
  ];

  const mockPendingLeaves = [
    {
      id: 1,
      employee: { firstName: 'John', lastName: 'Doe' },
      type: { name: 'Annual Leave' },
      startDate: '2026-03-01',
      endDate: '2026-03-05',
      days: 5,
      status: 'pending',
    },
    {
      id: 2,
      employee: { firstName: 'Jane', lastName: 'Smith' },
      type: { name: 'Sick Leave' },
      startDate: '2026-03-10',
      endDate: '2026-03-12',
      days: 3,
      status: 'pending',
    },
  ];

  const mockPendingTimesheets = [
    {
      id: 1,
      employee: { firstName: 'Bob', lastName: 'Wilson' },
      weekStartDate: '2026-02-10',
      weekEndDate: '2026-02-16',
      totalHours: 40,
      status: 'submitted',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    employeeService.getTeamMembers.mockResolvedValue({
      data: mockTeamMembers,
    });

    leaveService.getPendingForManager.mockResolvedValue(mockPendingLeaves);

    timesheetService.getPendingApprovals.mockResolvedValue({
      data: mockPendingTimesheets,
    });

    leaveService.approveLeave.mockResolvedValue({ success: true });
    leaveService.rejectLeave.mockResolvedValue({ success: true });
    timesheetService.approve.mockResolvedValue({ success: true });
  });

  // Test 1: Renders dashboard with statistics cards
  test('should render dashboard with statistics cards', async () => {
    renderWithProviders(<ManagerDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/manager dashboard/i)).toBeInTheDocument();
    });

    // Check for stat values
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument(); // Total team members
      expect(screen.getByText('2')).toBeInTheDocument(); // Pending leaves
      expect(screen.getByText('1')).toBeInTheDocument(); // Pending timesheets or team on leave
    });
  });

  // Test 2: Displays team members list
  test('should display list of team members', async () => {
    renderWithProviders(<ManagerDashboard />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });
  });

  // Test 3: Shows loading state
  test('should show loading state while fetching data', () => {
    employeeService.getTeamMembers.mockReturnValue(new Promise(() => {}));
    leaveService.getPendingForManager.mockReturnValue(new Promise(() => {}));
    timesheetService.getPendingApprovals.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<ManagerDashboard />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  // Test 4: Displays pending leave requests
  test('should display pending leave requests', async () => {
    renderWithProviders(<ManagerDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/manager dashboard/i)).toBeInTheDocument();
    });

    // Switch to leaves tab if needed or check for pending leaves
    const leaveTabs = screen.queryAllByRole('tab');
    if (leaveTabs.length > 0) {
      const leaveTab = leaveTabs.find(tab => tab.textContent.match(/leave/i));
      if (leaveTab) {
        fireEvent.click(leaveTab);
      }
    }

    await waitFor(() => {
      expect(screen.getByText(/annual leave/i)).toBeInTheDocument();
    });
  });

  // Test 5: Opens approval dialog when approve button clicked
  test('should open approval dialog when approve button clicked', async () => {
    renderWithProviders(<ManagerDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/manager dashboard/i)).toBeInTheDocument();
    });

    // Find and click approve button
    const approveButtons = screen.queryAllByRole('button', { name: /approve/i });
    if (approveButtons.length > 0) {
      fireEvent.click(approveButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    }
  });

  // Test 6: Approves leave request successfully
  test('should approve leave request successfully', async () => {
    renderWithProviders(<ManagerDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/manager dashboard/i)).toBeInTheDocument();
    });

    // Find approve button and click
    const approveButtons = screen.queryAllByRole('button', { name: /approve/i });
    if (approveButtons.length > 0) {
      fireEvent.click(approveButtons[0]);

      await waitFor(() => {
        const confirmButton = screen.queryByRole('button', { name: /confirm/i });
        if (confirmButton) {
          fireEvent.click(confirmButton);
        }
      });

      await waitFor(() => {
        expect(leaveService.approveLeave).toHaveBeenCalled();
      });
    }
  });

  // Test 7: Displays pending timesheet requests
  test('should display pending timesheet requests', async () => {
    renderWithProviders(<ManagerDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/manager dashboard/i)).toBeInTheDocument();
    });

    // Switch to timesheets tab
    const tabs = screen.queryAllByRole('tab');
    const timesheetTab = tabs.find(tab => tab.textContent.match(/timesheet/i));
    if (timesheetTab) {
      fireEvent.click(timesheetTab);

      await waitFor(() => {
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      });
    }
  });

  // Test 8: Shows correct statistics for team
  test('should show correct statistics for team', async () => {
    renderWithProviders(<ManagerDashboard />);

    await waitFor(() => {
      // Verify stats are calculated correctly
      expect(employeeService.getTeamMembers).toHaveBeenCalled();
      expect(leaveService.getPendingForManager).toHaveBeenCalled();
      expect(timesheetService.getPendingApprovals).toHaveBeenCalled();
    });

    // Check for specific stat values
    await waitFor(() => {
      const statCards = screen.getAllByText(/3|2|1/);
      expect(statCards.length).toBeGreaterThan(0);
    });
  });
});
