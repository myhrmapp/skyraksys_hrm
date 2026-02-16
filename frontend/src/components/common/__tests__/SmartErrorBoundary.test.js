import React from 'react';
import { render, screen, fireEvent  } from '@testing-library/react';
import '@testing-library/jest-dom';
import PropTypes from 'prop-types';
import SmartErrorBoundary, { withErrorBoundary, useErrorHandler } from '../SmartErrorBoundary';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Create a test theme
const theme = createTheme();

// Test component that throws an error
const ThrowError = ({ shouldThrow = false, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>Normal content</div>;
};

ThrowError.propTypes = {
  shouldThrow: PropTypes.bool,
  errorMessage: PropTypes.string
};

// Wrapper component to provide theme
const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('SmartErrorBoundary Component', () => {
  // Suppress console errors during tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  // Test 1: Renders children when no error occurs
  test('should render children when no error occurs', () => {
    renderWithTheme(
      <SmartErrorBoundary>
        <ThrowError shouldThrow={false} />
      </SmartErrorBoundary>
    );
    
    expect(screen.getByText('Normal content')).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  // Test 2: Catches error and displays error UI
  test('should catch error and display error UI', () => {
    renderWithTheme(
      <SmartErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Custom error message" />
      </SmartErrorBoundary>
    );
    
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /report issue/i })).toBeInTheDocument();
  });

  // Test 3: Shows error details when details toggle is clicked
  test('should show error details when toggle is clicked', () => {
    renderWithTheme(
      <SmartErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Test error" />
      </SmartErrorBoundary>
    );
    
    // Initially error details should not be visible
    expect(screen.queryByText('Error Message:')).not.toBeInTheDocument();
    
    // Click show details button
    const toggleButton = screen.getByRole('button', { name: /show error details/i });
    fireEvent.click(toggleButton);
    
    // Error details should now be visible
    expect(screen.getByText('Error Message:')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  // Test 4: Calls onRetry when Try Again button is clicked
  test('should reset error state when retry button is clicked', async () => {
    const onRetry = jest.fn();
    
    renderWithTheme(
      <SmartErrorBoundary onRetry={onRetry}>
        <ThrowError shouldThrow={throwError} />
      </SmartErrorBoundary>
    );
    
    // Error UI should be displayed
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    
    // Click retry button
    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);
    
    // Wait for recovery process
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // onRetry should have been called
    expect(onRetry).toHaveBeenCalledWith(1);
  });

  // Test 5: Uses custom fallback UI when provided
  test('should render custom fallback when provided', () => {
    const customFallback = (error, retry) => (
      <div data-testid="custom-fallback">
        <p>Custom Error: {error.message}</p>
        <button onClick={retry}>Custom Retry</button>
      </div>
    );
    
    renderWithTheme(
      <SmartErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} errorMessage="Test error" />
      </SmartErrorBoundary>
    );
    
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom Error: Test error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /custom retry/i })).toBeInTheDocument();
  });

  // Test 6: withErrorBoundary HOC wraps component correctly
  test('should wrap component with withErrorBoundary HOC', () => {
    const TestComponent = ({ message }) => <div>{message}</div>;
    TestComponent.propTypes = { message: PropTypes.string };
    const WrappedComponent = withErrorBoundary(TestComponent);
    
    renderWithTheme(<WrappedComponent message="Test message" />);
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });
});

describe('useErrorHandler Hook', () => {
  beforeEach(() => {
    console.error = jest.fn(); // Suppress error logs
  });

  afterEach(() => {
    console.error = originalError;
  });

  test('should throw error when throwError is called', () => {
    const TestComponentWithHook = () => {
      const { throwError } = useErrorHandler();
      
      return (
        <button onClick={() => throwError('Test hook error')}>
          Throw Error
        </button>
      );
    };
    
    expect(() => {
      renderWithTheme(
        <SmartErrorBoundary>
          <TestComponentWithHook />
        </SmartErrorBoundary>
      );
      
      const button = screen.getByRole('button', { name: /throw error/i });
      fireEvent.click(button);
    }).not.toThrow(); // Error is caught by boundary, so no throw
  });
});
