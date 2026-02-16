import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PhotoUpload from '../PhotoUpload';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AuthContext } from '../../../contexts/AuthContext';
import http from '../../../http-common';

// Mock http-common
jest.mock('../../../http-common', () => ({
  post: jest.fn(),
  put: jest.fn(),
}));

// Create a test theme
const theme = createTheme();

// Mock AuthContext
const mockAuthContext = {
  user: {
    id: 1,
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User'
  }
};

// Wrapper component to provide theme and auth context
const renderWithProviders = (component, authContext = mockAuthContext) => {
  return render(
    <AuthContext.Provider value={authContext}>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </AuthContext.Provider>
  );
};

describe('PhotoUpload Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock URL.createObjectURL for file previews
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
  });

  afterEach(() => {
    global.URL.createObjectURL.mockRestore();
  });

  // Test 1: Renders photo upload component with avatar
  test('should render photo upload component with avatar', () => {
    renderWithProviders(
      <PhotoUpload 
        employeeId={1}
        currentPhotoUrl=""
        onUploadSuccess={jest.fn()}
      />
    );
    
    // Avatar should be present
    const avatar = screen.getByRole('img', { hidden: true });
    expect(avatar).toBeInTheDocument();
    
    // Select Photo button should be visible for admin users
    expect(screen.getByRole('button', { name: /select photo/i })).toBeInTheDocument();
  });

  // Test 2: Allows file selection for authorized users (admin/hr)
  test('should allow file selection for admin users', async () => {
    renderWithProviders(
      <PhotoUpload 
        employeeId={1}
        currentPhotoUrl=""
        onUploadSuccess={jest.fn()}
      />
    );
    
    const selectButton = screen.getByRole('button', { name: /select photo/i });
    expect(selectButton).not.toBeDisabled();
    
    // Get the hidden file input
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    
    // Simulate file selection
    const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false
    });
    
    fireEvent.change(fileInput);
    
    // Upload button should appear after file selection
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
    });
  });

  // Test 3: Uploads photo when upload button is clicked
  test('should upload photo when upload button is clicked', async () => {
    const onUploadSuccess = jest.fn();
    http.post.mockResolvedValueOnce({
      data: {
        data: {
          photoUrl: '/uploads/photos/test.jpg'
        }
      }
    });
    
    renderWithProviders(
      <PhotoUpload 
        employeeId={1}
        currentPhotoUrl=""
        onUploadSuccess={onUploadSuccess}
      />
    );
    
    // Select a file
    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false
    });
    
    fireEvent.change(fileInput);
    
    // Wait for upload button and click it
    await waitFor(() => {
      const uploadButton = screen.getByRole('button', { name: /upload/i });
      fireEvent.click(uploadButton);
    });
    
    // Verify API was called
    await waitFor(() => {
      expect(http.post).toHaveBeenCalledWith(
        '/employees/1/photo',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      );
    });
    
    // Verify success callback
    expect(onUploadSuccess).toHaveBeenCalled();
  });

  // Test 4: Restricts upload for unauthorized users (regular employees)
  test('should restrict upload for non-admin/hr users', () => {
    const employeeAuthContext = {
      user: {
        id: 2,
        role: 'employee',
        firstName: 'Regular',
        lastName: 'User'
      }
    };
    
    renderWithProviders(
      <PhotoUpload 
        employeeId={1}
        currentPhotoUrl=""
        onUploadSuccess={jest.fn()}
      />,
      employeeAuthContext
    );
    
    // Should show permission message
    expect(screen.getByText(/only admins and hr users can upload photos/i)).toBeInTheDocument();
    
    // Select Photo button should not be present
    expect(screen.queryByRole('button', { name: /select photo/i })).not.toBeInTheDocument();
  });

  // Bonus Test 5: Shows error message for invalid file types
  test('should show error for invalid file types', async () => {
    renderWithProviders(
      <PhotoUpload 
        employeeId={1}
        currentPhotoUrl=""
        onUploadSuccess={jest.fn()}
      />
    );
    
    // Select an invalid file type
    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false
    });
    
    fireEvent.change(fileInput);
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/only jpeg, png, and webp images are allowed/i)).toBeInTheDocument();
    });
    
    // Upload button should not appear
    expect(screen.queryByRole('button', { name: /upload/i })).not.toBeInTheDocument();
  });

  // Bonus Test 6: Shows error for files exceeding size limit
  test('should show error for files exceeding size limit', async () => {
    renderWithProviders(
      <PhotoUpload 
        employeeId={1}
        currentPhotoUrl=""
        onUploadSuccess={jest.fn()}
      />
    );
    
    // Create a large file (> 5MB)
    const fileInput = document.querySelector('input[type="file"]');
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });
    Object.defineProperty(fileInput, 'files', {
      value: [largeFile],
      writable: false
    });
    
    fireEvent.change(fileInput);
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/file size must be less than 5mb/i)).toBeInTheDocument();
    });
  });
});
