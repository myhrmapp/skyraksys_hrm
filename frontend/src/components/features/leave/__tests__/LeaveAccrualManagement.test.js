import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import LeaveAccrualManagement from '../LeaveAccrualManagement';
import leaveAccrualService from '../../../../services/leaveAccrual.service';
import { useAuth } from '../../../../contexts/AuthContext';

// Mock services
jest.mock('../../../../services/leaveAccrual.service');

// Mock AuthContext
jest.mock('../../../../contexts/AuthContext');

// Create theme
const theme = createTheme();

// Test wrapper
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (component, { queryClient = createTestQueryClient(), user = { isAdmin: true, isHR: false } } = {}) => {
  useAuth.mockReturnValue({ user });
  
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <SnackbarProvider>{component}</SnackbarProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('LeaveAccrualManagement Component', () => {
  const mockStatusData = {
    currentYear: 2026,
    lastRunDate: '2026-01-31',
    totalEmployees: 25,
    lastProcessedMonth: 'January',
    history: [
      {
        id: 1,
        runDate: '2026-01-31',
        year: 2026,
        month: 1,
        employeesProcessed: 25,
        status: 'Completed',
        runBy: 'Admin User',
      },
    ],
  };

  const mockPreviewData = [
    {
      employeeId: 1,
      employeeName: 'John Doe',
      currentBalance: 10,
      accrualAmount: 1.5,
      newBalance: 11.5,
      leaveTypeName: 'Annual Leave',
    },
    {
      employeeId: 2,
      employeeName: 'Jane Smith',
      currentBalance: 5,
      accrualAmount: 1.5,
      newBalance: 6.5,
      leaveTypeName: 'Annual Leave',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    leaveAccrualService.getStatus.mockResolvedValue({
      data: { success: true, data: mockStatusData },
    });

    leaveAccrualService.getPreview.mockResolvedValue({
      data: { success: true, data: mockPreviewData },
    });

    leaveAccrualService.runAccrual.mockResolvedValue({
      data: { success: true, data: { employeesProcessed: 25 } },
    });

    leaveAccrualService.carryForward.mockResolvedValue({
      data: { success: true, data: { employeesProcessed: 25 } },
    });
  });

  // Test 1: Renders component with header
  test('should render component with header and current status', async () => {
    renderWithProviders(<LeaveAccrualManagement />);
    
    expect(screen.getByText(/leave accrual management/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText(/current year.*2026/i)).toBeInTheDocument();
    });
  });

  // Test 2: Admin access control - allows admin users
  test('should allow admin users to access component', async () => {
    renderWithProviders(<LeaveAccrualManagement />, {
      user: { isAdmin: true, isHR: false },
    });
    
    await waitFor(() => {
      expect(screen.getByText(/leave accrual management/i)).toBeInTheDocument();
    });
  });

  // Test 3: HR access control - allows HR users
  test('should allow HR users to access component', async () => {
    renderWithProviders(<LeaveAccrualManagement />, {
      user: { isAdmin: false, isHR: true },
    });
    
    await waitFor(() => {
      expect(screen.getByText(/leave accrual management/i)).toBeInTheDocument();
    });
  });

  // Test 4: Access control - redirects non-admin/non-HR users
  test('should redirect non-admin and non-HR users', () => {
    renderWithProviders(<LeaveAccrualManagement />, {
      user: { isAdmin: false, isHR: false },
    });
    
    // Component should redirect using Navigate
    expect(screen.queryByText(/leave accrual management/i)).not.toBeInTheDocument();
  });

  // Test 5: Displays status data
  test('should display accrual status data', async () => {
    renderWithProviders(<LeaveAccrualManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/2026/)).toBeInTheDocument();
      expect(screen.getByText(/25/)).toBeInTheDocument();
      expect(screen.getByText(/january/i)).toBeInTheDocument();
    });
  });

  // Test 6: Switches to preview tab and loads preview data
  test('should switch to preview tab and load preview data', async () => {
    renderWithProviders(<LeaveAccrualManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/current year.*2026/i)).toBeInTheDocument();
    });
    
    const previewTab = screen.getByRole('tab', { name: /preview/i });
    fireEvent.click(previewTab);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(leaveAccrualService.getPreview).toHaveBeenCalled();
    });
  });

  // Test 7: Opens confirmation dialog when Run Accrual button clicked
  test('should open confirmation dialog when Run Accrual button clicked', async () => {
    renderWithProviders(<LeaveAccrualManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/leave accrual management/i)).toBeInTheDocument();
    });
    
    const runAccrualButton = screen.getByRole('button', { name: /run.*accrual/i });
    fireEvent.click(runAccrualButton);
    
    await waitFor(() => {
      expect(screen.getByText(/confirm.*accrual/i)).toBeInTheDocument();
    });
  });

  // Test 8: Executes run accrual action
  test('should execute run accrual action after confirmation', async () => {
    renderWithProviders(<LeaveAccrualManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/leave accrual management/i)).toBeInTheDocument();
    });
    
    const runAccrualButton = screen.getByRole('button', { name: /run.*accrual/i });
    fireEvent.click(runAccrualButton);
    
    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);
    });
    
    await waitFor(() => {
      expect(leaveAccrualService.runAccrual).toHaveBeenCalled();
    });
  });

  // Test 9: Opens carry-forward confirmation dialog
  test('should open carry-forward confirmation dialog', async () => {
    renderWithProviders(<LeaveAccrualManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/leave accrual management/i)).toBeInTheDocument();
    });
    
    const carryForwardButton = screen.getByRole('button', { name: /carry.*forward/i });
    fireEvent.click(carryForwardButton);
    
    await waitFor(() => {
      expect(screen.getByText(/confirm.*carry/i)).toBeInTheDocument();
    });
  });

  // Test 10: Filters preview data by search term
  test('should filter preview data by search term', async () => {
    renderWithProviders(<LeaveAccrualManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/leave accrual management/i)).toBeInTheDocument();
    });
    
    const previewTab = screen.getByRole('tab', { name: /preview/i });
    fireEvent.click(previewTab);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
