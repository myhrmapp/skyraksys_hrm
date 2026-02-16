import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConfirmDialog from '../ConfirmDialog';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Create a test theme
const theme = createTheme();

// Wrapper component to provide theme
const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ConfirmDialog Component', () => {
  const defaultProps = {
    open: true,
    title: 'Test Title',
    message: 'Test Message',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Renders with default props
  test('should render with default props', () => {
    renderWithTheme(<ConfirmDialog {...defaultProps} />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });

  // Test 2: Renders different variants correctly
  test('should render danger variant with correct styling', () => {
    renderWithTheme(<ConfirmDialog {...defaultProps} variant="danger" />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  test('should render warning variant with correct button text', () => {
    renderWithTheme(<ConfirmDialog {...defaultProps} variant="warning" />);
    
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });

  test('should render info variant', () => {
    renderWithTheme(<ConfirmDialog {...defaultProps} variant="info" />);
    
    expect(screen.getByRole('button', { name: /ok/i })).toBeInTheDocument();
  });

  test('should render success variant', () => {
    renderWithTheme(<ConfirmDialog {...defaultProps} variant="success" />);
    
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });

  // Test 3: Calls onConfirm when confirm button clicked
  test('should call onConfirm when confirm button is clicked', () => {
    const onConfirm = jest.fn();
    renderWithTheme(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);
    
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  // Test 4: Calls onCancel when cancel button clicked
  test('should call onCancel when cancel button is clicked', () => {
    const onCancel = jest.fn();
    renderWithTheme(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // Test 5: Shows loading state correctly
  test('should show loading state when loading prop is true', () => {
    renderWithTheme(<ConfirmDialog {...defaultProps} loading={true} />);
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  // Test 6: Disables buttons when loading
  test('should disable buttons when loading', () => {
    renderWithTheme(<ConfirmDialog {...defaultProps} loading={true} />);
    
    const confirmButton = screen.getByRole('button', { name: /processing/i });
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    
    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  // Test 7: Renders custom children instead of message
  test('should render custom children when provided', () => {
    renderWithTheme(
      <ConfirmDialog {...defaultProps} message={undefined}>
        <div data-testid="custom-content">Custom Content</div>
      </ConfirmDialog>
    );
    
    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    expect(screen.getByText('Custom Content')).toBeInTheDocument();
  });

  // Test 8: Allows custom button text
  test('should use custom confirm and cancel text when provided', () => {
    renderWithTheme(
      <ConfirmDialog 
        {...defaultProps} 
        confirmText="Yes, Delete" 
        cancelText="No, Keep"
      />
    );
    
    expect(screen.getByRole('button', { name: 'Yes, Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No, Keep' })).toBeInTheDocument();
  });
});
