import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import EmployeeReviewManagement from '../EmployeeReviewManagement';
import { AuthContext } from '../../../../contexts/AuthContext';
import { NotificationContext } from '../../../../contexts/NotificationContext';
import * as queries from '../../../../hooks/queries';

// Mock hooks
jest.mock('../../../../hooks/queries');

// Create test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Mock notification context
const mockNotification = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showInfo: jest.fn(),
};

// Wrapper component
const renderWithProviders = (component, authContext) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthContext.Provider value={authContext}>
          <NotificationContext.Provider value={mockNotification}>
            {component}
          </NotificationContext.Provider>
        </AuthContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('EmployeeReviewManagement Component', () => {
  const mockAdminAuth = {
    user: { id: 1, role: 'admin', firstName: 'Admin', lastName: 'User' },
    isAdmin: true,
    isHR: false,
    isManager: false,
    isEmployee: false,
  };

  const mockEmployeeAuth = {
    user: { id: 2, role: 'employee', firstName: 'John', lastName: 'Doe', employee: { id: 2 } },
    isAdmin: false,
    isHR: false,
    isManager: false,
    isEmployee: true,
  };

  const mockReviews = [
    {
      id: 1,
      employee: { id: 1, firstName: 'John', lastName: 'Doe', employeeId: 'EMP001' },
      reviewPeriod: '2026 Q1',
      reviewType: 'quarterly',
      status: 'completed',
      overallRating: 4.5,
      technicalSkills: 4,
      communication: 5,
      reviewDate: '2026-02-15',
    },
    {
      id: 2,
      employee: { id: 2, firstName: 'Jane', lastName: 'Smith', employeeId: 'EMP002' },
      reviewPeriod: '2026 Q1',
      reviewType: 'annual',
      status: 'pending_approval',
      overallRating: 3.5,
      technicalSkills: 4,
      communication: 3,
      reviewDate: '2026-02-10',
    },
  ];

  const mockEmployees = [
    { id: 1, firstName: 'John', lastName: 'Doe', employeeId: 'EMP001' },
    { id: 2, firstName: 'Jane', lastName: 'Smith', employeeId: 'EMP002' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    queries.useEmployeeReviews.mockReturnValue({
      data: { reviews: mockReviews, totalCount: 2 },
      isLoading: false,
      isError: false,
    });

    queries.useReviewDashboard.mockReturnValue({
      data: {},
    });

    queries.useEmployees.mockReturnValue({
      data: mockEmployees,
    });

    queries.useCreateEmployeeReview.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
    });

    queries.useUpdateEmployeeReview.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
    });

    queries.useUpdateReviewStatus.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
    });

    queries.useDeleteEmployeeReview.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
    });
  });

  // Test 1: Renders component with header
  test('should render component with header and title', () => {
    renderWithProviders(<EmployeeReviewManagement />, mockAdminAuth);
    
    expect(screen.getByText(/Employee Review Management/i)).toBeInTheDocument();
  });

  // Test 2: Displays review list for admin
  test('should display list of reviews for admin', async () => {
    renderWithProviders(<EmployeeReviewManagement />, mockAdminAuth);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  // Test 3: Shows loading state
  test('should show loading state while fetching data', () => {
    queries.useEmployeeReviews.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
    });

    renderWithProviders(<EmployeeReviewManagement />, mockAdminAuth);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  // Test 4: Shows error state
  test('should show error message when data fetch fails', () => {
    queries.useEmployeeReviews.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: { message: 'Failed to fetch reviews' },
    });

    renderWithProviders(<EmployeeReviewManagement />, mockAdminAuth);
    
    expect(screen.getByText(/failed to fetch reviews/i)).toBeInTheDocument();
  });

  // Test 5: Shows "Create Review" button for admin/HR/manager
  test('should show create button for admin users', () => {
    renderWithProviders(<EmployeeReviewManagement />, mockAdminAuth);
    
    expect(screen.getByRole('button', { name: /create review/i })).toBeInTheDocument();
  });

  // Test 6: Hides "Create Review" button for employees
  test('should hide create button for regular employees', () => {
    renderWithProviders(<EmployeeReviewManagement />, mockEmployeeAuth);
    
    expect(screen.queryByRole('button', { name: /create review/i })).not.toBeInTheDocument();
  });

  // Test 7: Opens create dialog when button clicked
  test('should open create dialog when create button is clicked', async () => {
    renderWithProviders(<EmployeeReviewManagement />, mockAdminAuth);
    
    const createButton = screen.getByRole('button', { name: /create review/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/new review/i)).toBeInTheDocument();
    });
  });

  // Test 8: Displays review status chips with correct colors
  test('should display status chips with appropriate colors', async () => {
    renderWithProviders(<EmployeeReviewManagement />, mockAdminAuth);
    
    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Pending Approval')).toBeInTheDocument();
    });
  });

  // Test 9: Filters reviews by status
  test('should filter reviews by status', async () => {
    renderWithProviders(<EmployeeReviewManagement />, mockAdminAuth);
    
    // Initially both reviews should be visible
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    
    // Apply status filter
    const statusFilter = screen.getByLabelText(/status/i);
    fireEvent.change(statusFilter, { target: { value: 'completed' } });
    
    await waitFor(() => {
      expect(queries.useEmployeeReviews).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' })
      );
    });
  });

  // Test 10: Searches reviews by employee name
  test('should search reviews by employee name', async () => {
    renderWithProviders(<EmployeeReviewManagement />, mockAdminAuth);
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  // Test 11: Handles pagination
  test('should handle pagination controls', async () => {
    const manyReviews = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      employee: { id: i + 1, firstName: `Employee${i}`, lastName: 'Test', employeeId: `EMP${i}` },
      reviewPeriod: '2026 Q1',
      reviewType: 'quarterly',
      status: 'completed',
      overallRating: 4,
    }));

    queries.useEmployeeReviews.mockReturnValue({
      data: { reviews: manyReviews, totalCount: 25 },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<EmployeeReviewManagement />, mockAdminAuth);
    
    // Check pagination exists
    const pagination = screen.getByRole('navigation', { name: /pagination/i });
    expect(pagination).toBeInTheDocument();
  });

  // Test 12: Opens edit dialog when edit button clicked
  test('should open edit dialog when edit button is clicked', async () => {
    renderWithProviders(<EmployeeReviewManagement />, mockAdminAuth);
    
    await waitFor(() => {
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);
    });
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  // Test 13: Displays rating stars for reviews
  test('should display rating stars for each review', async () => {
    renderWithProviders(<EmployeeReviewManagement />, mockAdminAuth);
    
    await waitFor(() => {
      // Ratings should be visible (4.5 and 3.5)
      expect(screen.getByText(/4\.5/)).toBeInTheDocument();
      expect(screen.getByText(/3\.5/)).toBeInTheDocument();
    });
  });

  // Test 14: Shows delete confirmation dialog
  test('should show delete confirmation when delete button clicked', async () => {
    renderWithProviders(<EmployeeReviewManagement />, mockAdminAuth);
    
    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
  });
});
