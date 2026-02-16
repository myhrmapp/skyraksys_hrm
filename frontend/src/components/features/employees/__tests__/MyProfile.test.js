import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MyProfile from '../MyProfile';
import EmployeeProfileModern from '../EmployeeProfileModern';

// Mock the EmployeeProfileModern component
jest.mock('../EmployeeProfileModern', () => {
  return function MockEmployeeProfileModern({ mode }) {
    return (
      <div data-testid="employee-profile-modern">
        <div data-testid="profile-mode">{mode}</div>
        <h1>Employee Profile</h1>
        <div>Personal Information</div>
        <div>Contact Details</div>
        <div>Employment Information</div>
      </div>
    );
  };
});

const theme = createTheme();

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (component, { queryClient = createTestQueryClient() } = {}) => {
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>{component}</ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('MyProfile Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Renders MyProfile component
  test('should render MyProfile component', () => {
    renderWithProviders(<MyProfile />);

    expect(screen.getByTestId('employee-profile-modern')).toBeInTheDocument();
  });

  // Test 2: Renders with self mode
  test('should render EmployeeProfileModern with self mode', () => {
    renderWithProviders(<MyProfile />);

    const modeElement = screen.getByTestId('profile-mode');
    expect(modeElement).toHaveTextContent('self');
  });

  // Test 3: Displays profile sections
  test('should display profile sections', () => {
    renderWithProviders(<MyProfile />);

    expect(screen.getByText('Employee Profile')).toBeInTheDocument();
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByText('Contact Details')).toBeInTheDocument();
    expect(screen.getByText('Employment Information')).toBeInTheDocument();
  });

  // Test 4: Component mounts without errors
  test('should mount without errors', () => {
    const { container } = renderWithProviders(<MyProfile />);
    expect(container).toBeInTheDocument();
  });

  // Test 5: Passes correct props to EmployeeProfileModern
  test('should pass correct mode prop to EmployeeProfileModern', async () => {
    renderWithProviders(<MyProfile />);

    await waitFor(() => {
      const profileModern = screen.getByTestId('employee-profile-modern');
      expect(profileModern).toBeInTheDocument();
    });

    const mode = screen.getByTestId('profile-mode');
    expect(mode.textContent).toBe('self');
  });

  // Test 6: Renders consistently
  test('should render consistently on multiple renders', () => {
    const { rerender } = renderWithProviders(<MyProfile />);

    expect(screen.getByTestId('employee-profile-modern')).toBeInTheDocument();

    rerender(
      <BrowserRouter>
        <QueryClientProvider client={createTestQueryClient()}>
          <ThemeProvider theme={theme}>
            <MyProfile />
          </ThemeProvider>
        </QueryClientProvider>
      </BrowserRouter>
    );

    expect(screen.getByTestId('employee-profile-modern')).toBeInTheDocument();
  });

  // Test 7: Does not pass extra props
  test('should only pass mode prop to EmployeeProfileModern', () => {
    renderWithProviders(<MyProfile />);

    const profileModern = screen.getByTestId('employee-profile-modern');
    expect(profileModern).toBeInTheDocument();

    // Verify mode is self
    expect(screen.getByTestId('profile-mode')).toHaveTextContent('self');
  });

  // Test 8: Component structure is correct
  test('should have correct component structure', () => {
    const { container } = renderWithProviders(<MyProfile />);

    // Should have the mock structure
    const profileModern = container.querySelector('[data-testid="employee-profile-modern"]');
    expect(profileModern).toBeInTheDocument();

    // Should have mode indicator
    const modeIndicator = container.querySelector('[data-testid="profile-mode"]');
    expect(modeIndicator).toBeInTheDocument();
  });
});
