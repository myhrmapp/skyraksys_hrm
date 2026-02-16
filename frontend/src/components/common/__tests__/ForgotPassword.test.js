import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import ForgotPassword from '../ForgotPassword';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import http from '../../../http-common';

// Mock http-common
jest.mock('../../../http-common', () => ({
  post: jest.fn(),
}));

// Create a test theme
const theme = createTheme();

// Wrapper component to provide theme and router
const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('ForgotPassword Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Renders forgot password form correctly
  test('should render forgot password form with all elements', () => {
    renderWithProviders(<ForgotPassword />);
    
    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
  });

  // Test 2: Shows validation error for empty email
  test('should show validation error when email is empty', async () => {
    renderWithProviders(<ForgotPassword />);
    
    const submitButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter your email address')).toBeInTheDocument();
    });
    
    expect(http.post).not.toHaveBeenCalled();
  });

  // Test 3: Submits form with valid email
  test('should submit form with valid email', async () => {
    http.post.mockResolvedValueOnce({ data: { message: 'Email sent' } });
    
    renderWithProviders(<ForgotPassword />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(http.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'test@example.com'
      });
    });
  });

  // Test 4: Shows success message after successful submission
  test('should show success message after successful submission', async () => {
    http.post.mockResolvedValueOnce({ data: { message: 'Email sent' } });
    
    renderWithProviders(<ForgotPassword />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/if an account with that email exists/i)).toBeInTheDocument();
    });
    
    expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
  });

  // Test 5: Shows loading state during submission
  test('should show loading state during submission', async () => {
    http.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    renderWithProviders(<ForgotPassword />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
    
    // Should show loading indicator
    await waitFor(() => {
      const loadingButton = screen.getByRole('button');
      expect(loadingButton).toBeDisabled();
    });
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  // Test 6: Handles API failures gracefully (shows success for security)
  test('should show success message even on API failure for security', async () => {
    http.post.mockRejectedValueOnce(new Error('Network error'));
    
    renderWithProviders(<ForgotPassword />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(emailInput, { target: { value: 'nonexistent@example.com' } });
    fireEvent.click(submitButton);
    
    // Should still show success message (security best practice - don't reveal if email exists)
    await waitFor(() => {
      expect(screen.getByText(/if an account with that email exists/i)).toBeInTheDocument();
    });
  });
});
