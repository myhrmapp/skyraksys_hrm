import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import RestoreManagement from '../RestoreManagement';
import restoreService from '../../../../services/restore.service';
import { useAuth } from '../../../../contexts/AuthContext';

// Mock services
jest.mock('../../../../services/restore.service');

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

const renderWithProviders = (
  component,
  { queryClient = createTestQueryClient(), user = { isAdmin: true } } = {}
) => {
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

describe('RestoreManagement Component', () => {
  const mockDeletedReviews = [
    {
      id: 1,
      employeeName: 'John Doe',
      reviewPeriod: '2026-Q1',
      reviewType: 'Performance Review',
      reviewerName: 'Manager Smith',
      deletedAt: '2026-02-01T10:00:00Z',
    },
    {
      id: 2,
      employeeName: 'Jane Smith',
      reviewPeriod: '2026-Q1',
      reviewType: 'Annual Review',
      reviewerName: 'Manager Jones',
      deletedAt: '2026-02-05T12:00:00Z',
    },
  ];

  const mockDeletedBalances = [
    {
      id: 1,
      employeeName: 'Alice Johnson',
      leaveTypeName: 'Annual Leave',
      balance: 15,
      deletedAt: '2026-01-20T09:00:00Z',
    },
  ];

  const mockDeletedUsers = [
    {
      id: 1,
      fullName: 'Bob Williams',
      username: 'bwilliams',
      email: 'bob@example.com',
      deletedAt: '2026-01-15T08:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    restoreService.getDeletedReviews.mockResolvedValue({
      data: { success: true, data: mockDeletedReviews },
    });

    restoreService.getDeletedBalances.mockResolvedValue({
      data: { success: true, data: mockDeletedBalances },
    });

    restoreService.getDeletedUsers.mockResolvedValue({
      data: { success: true, data: mockDeletedUsers },
    });

    restoreService.restoreReview.mockResolvedValue({
      data: { success: true },
    });

    restoreService.restoreBalance.mockResolvedValue({
      data: { success: true },
    });

    restoreService.restoreUser.mockResolvedValue({
      data: { success: true },
    });
  });

  // Test 1: Renders component with three tabs
  test('should render component with three tabs and badges', async () => {
    renderWithProviders(<RestoreManagement />);

    expect(screen.getByText(/restore management/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /deleted reviews/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /deleted balances/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /deleted users/i })).toBeInTheDocument();
    });
  });

  // Test 2: Admin-only access control
  test('should redirect non-admin users', () => {
    renderWithProviders(<RestoreManagement />, {
      user: { isAdmin: false },
    });

    // Component should redirect using Navigate
    expect(screen.queryByText(/restore management/i)).not.toBeInTheDocument();
  });

  // Test 3: Loads and displays deleted reviews
  test('should load and display deleted reviews', async () => {
    renderWithProviders(<RestoreManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('2026-Q1')).toBeInTheDocument();
    });

    expect(restoreService.getDeletedReviews).toHaveBeenCalled();
  });

  // Test 4: Switches to Deleted Balances tab
  test('should switch to Deleted Balances tab and display balances', async () => {
    renderWithProviders(<RestoreManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const balancesTab = screen.getByRole('tab', { name: /deleted balances/i });
    fireEvent.click(balancesTab);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Annual Leave')).toBeInTheDocument();
    });
  });

  // Test 5: Switches to Deleted Users tab
  test('should switch to Deleted Users tab and display users', async () => {
    renderWithProviders(<RestoreManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const usersTab = screen.getByRole('tab', { name: /deleted users/i });
    fireEvent.click(usersTab);

    await waitFor(() => {
      expect(screen.getByText('Bob Williams')).toBeInTheDocument();
      expect(screen.getByText('bwilliams')).toBeInTheDocument();
    });
  });

  // Test 6: Opens confirmation dialog before restore
  test('should open confirmation dialog when restore button clicked', async () => {
    renderWithProviders(<RestoreManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    fireEvent.click(restoreButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/confirm restore/i)).toBeInTheDocument();
    });
  });

  // Test 7: Executes restore action after confirmation
  test('should execute restore action after confirmation', async () => {
    renderWithProviders(<RestoreManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    fireEvent.click(restoreButtons[0]);

    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(restoreService.restoreReview).toHaveBeenCalledWith(1);
    });
  });

  // Test 8: Shows loading state while fetching data
  test('should show loading state while fetching deleted records', () => {
    restoreService.getDeletedReviews.mockReturnValue(new Promise(() => {}));
    restoreService.getDeletedBalances.mockReturnValue(new Promise(() => {}));
    restoreService.getDeletedUsers.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<RestoreManagement />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
