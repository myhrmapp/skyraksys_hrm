import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import EmployeeRecords from '../EmployeeRecords';
import { useEmployeeRecords } from '../hooks/useEmployeeRecords';
import { useAuth } from '../../../../contexts/AuthContext';
import { employeeService } from '../../../../services/employee.service';

// Mock custom hook
jest.mock('../hooks/useEmployeeRecords');

// Mock services
jest.mock('../../../../services/employee.service');

// Mock AuthContext
jest.mock('../../../../contexts/AuthContext');

const theme = createTheme();

const renderWithProviders = (component) => {
  useAuth.mockReturnValue({
    user: { id: 1, employee: { id: 1 }, isAdmin: false, isManager: false },
  });

  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>{component}</ThemeProvider>
    </BrowserRouter>
  );
};

describe('EmployeeRecords Component', () => {
  const mockLeaveHistory = [
    {
      id: 1,
      employee: { firstName: 'John', lastName: 'Doe', employeeId: 'EMP001' },
      type: { name: 'Annual Leave' },
      leaveType: { name: 'Annual Leave' },
      startDate: '2026-03-01',
      endDate: '2026-03-05',
      days: 5,
      status: 'approved',
      appliedDate: '2026-02-15',
      approverComments: 'Approved',
    },
    {
      id: 2,
      employee: { firstName: 'John', lastName: 'Doe', employeeId: 'EMP001' },
      type: { name: 'Sick Leave' },
      leaveType: { name: 'Sick Leave' },
      startDate: '2026-01-10',
      endDate: '2026-01-12',
      days: 3,
      status: 'pending',
      appliedDate: '2026-01-08',
      createdAt: '2026-01-08',
    },
  ];

  const mockTimesheetHistory = [
    {
      id: 1,
      employee: { firstName: 'John', lastName: 'Doe' },
      weekStartDate: '2026-02-10',
      weekEndDate: '2026-02-16',
      totalHours: 40,
      status: 'approved',
    },
  ];

  const mockEmployees = [
    { id: 1, firstName: 'John', lastName: 'Doe', employeeId: 'EMP001' },
    { id: 2, firstName: 'Jane', lastName: 'Smith', employeeId: 'EMP002' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    useEmployeeRecords.mockReturnValue({
      leaveHistory: mockLeaveHistory,
      timesheetHistory: mockTimesheetHistory,
      attendanceHistory: [],
      loading: false,
      error: null,
    });

    employeeService.getAll.mockResolvedValue({
      data: mockEmployees,
    });
  });

  // Test 1: Renders component with tabs
  test('should render component with tabs', async () => {
    renderWithProviders(<EmployeeRecords />);

    await waitFor(() => {
      expect(screen.getByText(/employee records/i)).toBeInTheDocument();
    });

    // Check for tabs
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThan(0);
  });

  // Test 2: Displays leave history
  test('should display leave history', async () => {
    renderWithProviders(<EmployeeRecords />);

    await waitFor(() => {
      expect(screen.getByText(/leave request history/i)).toBeInTheDocument();
    });

    // Check for leave data
    await waitFor(() => {
      expect(screen.getByText(/annual leave/i)).toBeInTheDocument();
      expect(screen.getByText(/5 days/i)).toBeInTheDocument();
    });
  });

  // Test 3: Shows loading state
  test('should show loading state while fetching data', () => {
    useEmployeeRecords.mockReturnValue({
      leaveHistory: [],
      timesheetHistory: [],
      attendanceHistory: [],
      loading: true,
      error: null,
    });

    renderWithProviders(<EmployeeRecords />);

    // Should show skeleton loaders
    const skeletons = screen.getAllByRole('progressbar');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // Test 4: Switches between tabs
  test('should switch between tabs', async () => {
    renderWithProviders(<EmployeeRecords />);

    await waitFor(() => {
      expect(screen.getByText(/employee records/i)).toBeInTheDocument();
    });

    const tabs = screen.getAllByRole('tab');
    
    // Switch to timesheet tab if available
    const timesheetTab = tabs.find(tab => /timesheet/i.test(tab.textContent));
    if (timesheetTab) {
      fireEvent.click(timesheetTab);

      await waitFor(() => {
        expect(screen.getByText(/timesheet history/i)).toBeInTheDocument();
      });
    }
  });

  // Test 5: Handles pagination
  test('should handle pagination', async () => {
    // Create many leave records to trigger pagination
    const manyLeaves = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      employee: { firstName: 'John', lastName: 'Doe', employeeId: 'EMP001' },
      type: { name: 'Annual Leave' },
      leaveType: { name: 'Annual Leave' },
      startDate: '2026-03-01',
      endDate: '2026-03-05',
      days: 5,
      status: 'approved',
      appliedDate: '2026-02-15',
      createdAt: '2026-02-15',
    }));

    useEmployeeRecords.mockReturnValue({
      leaveHistory: manyLeaves,
      timesheetHistory: [],
      attendanceHistory: [],
      loading: false,
      error: null,
    });

    renderWithProviders(<EmployeeRecords />);

    await waitFor(() => {
      const pagination = screen.getByRole('navigation', { name: /pagination/i });
      expect(pagination).toBeInTheDocument();
    });
  });

  // Test 6: Displays status chips correctly
  test('should display status chips correctly', async () => {
    renderWithProviders(<EmployeeRecords />);

    await waitFor(() => {
      expect(screen.getByText(/leave request history/i)).toBeInTheDocument();
    });

    // Check for status chips
    await waitFor(() => {
      const statusChips = screen.getAllByText(/approved|pending/i);
      expect(statusChips.length).toBeGreaterThan(0);
    });
  });
});
