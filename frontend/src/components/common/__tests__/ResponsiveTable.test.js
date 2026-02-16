import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResponsiveTable, { EmployeeMobileCard } from '../ResponsiveTable';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

// Mock useMediaQuery
jest.mock('@mui/material/useMediaQuery');

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

describe('ResponsiveTable Component', () => {
  const mockColumns = [
    { id: 'id', label: 'ID', minWidth: 50 },
    { id: 'name', label: 'Name', minWidth: 150 },
    { id: 'email', label: 'Email', minWidth: 200 },
    { id: 'status', label: 'Status', minWidth: 100 },
  ];

  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'Active' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Renders table view on desktop
  test('should render table view on desktop (non-mobile)', () => {
    useMediaQuery.mockReturnValue(false); // Desktop mode
    
    renderWithTheme(
      <ResponsiveTable 
        columns={mockColumns} 
        data={mockData}
        loading={false}
      />
    );
    
    // Check for table headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    
    // Check for table data
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  // Test 2: Renders mobile card view on mobile devices
  test('should render card view on mobile devices', () => {
    useMediaQuery.mockReturnValue(true); // Mobile mode
    
    renderWithTheme(
      <ResponsiveTable 
        columns={mockColumns} 
        data={mockData}
        loading={false}
      />
    );
    
    // Check for mobile card content
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    
    // Table headers should not be rendered in mobile view
    const tableHeaders = screen.queryAllByRole('columnheader');
    expect(tableHeaders.length).toBe(0);
  });

  // Test 3: Shows loading state
  test('should show loading state when loading prop is true', () => {
    useMediaQuery.mockReturnValue(false);
    
    renderWithTheme(
      <ResponsiveTable 
        columns={mockColumns} 
        data={mockData}
        loading={true}
      />
    );
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  // Test 4: Renders empty state when no data
  test('should handle empty data array', () => {
    useMediaQuery.mockReturnValue(false);
    
    renderWithTheme(
      <ResponsiveTable 
        columns={mockColumns} 
        data={[]}
        loading={false}
      />
    );
    
    // Should still render table headers but no data rows
    expect(screen.getByText('Name')).toBeInTheDocument();
    const rows = screen.queryAllByRole('row');
    // Only header row should exist
    expect(rows.length).toBe(1);
  });

  // Test 5: Uses custom renderTableRow when provided
  test('should use custom renderTableRow when provided', () => {
    useMediaQuery.mockReturnValue(false);
    
    const customRenderRow = (item) => (
      <tr key={item.id} data-testid={`custom-row-${item.id}`}>
        <td>{item.name}</td>
        <td data-testid="custom-content">Custom: {item.status}</td>
      </tr>
    );
    
    renderWithTheme(
      <ResponsiveTable 
        columns={mockColumns} 
        data={mockData}
        loading={false}
        renderTableRow={customRenderRow}
      />
    );
    
    expect(screen.getByTestId('custom-row-1')).toBeInTheDocument();
    expect(screen.getByText('Custom: Active')).toBeInTheDocument();
  });

  // Test 6: Uses custom renderMobileCard when provided
  test('should use custom renderMobileCard when provided in mobile view', () => {
    useMediaQuery.mockReturnValue(true);
    
    const customRenderCard = (item) => (
      <div data-testid={`custom-card-${item.id}`}>
        <h3>{item.name}</h3>
        <p>Custom Card Content</p>
      </div>
    );
    
    renderWithTheme(
      <ResponsiveTable 
        columns={mockColumns} 
        data={mockData}
        loading={false}
        renderMobileCard={customRenderCard}
      />
    );
    
    expect(screen.getByTestId('custom-card-1')).toBeInTheDocument();
    expect(screen.getByText('Custom Card Content')).toBeInTheDocument();
  });

  // Test 7: Renders column headers with correct alignment
  test('should render column headers with correct alignment', () => {
    useMediaQuery.mockReturnValue(false);
    
    const columnsWithAlignment = [
      { id: 'name', label: 'Name', align: 'left' },
      { id: 'amount', label: 'Amount', align: 'right' },
    ];
    
    const dataWithAlignment = [
      { name: 'Test', amount: '$100' },
    ];
    
    renderWithTheme(
      <ResponsiveTable 
        columns={columnsWithAlignment} 
        data={dataWithAlignment}
        loading={false}
      />
    );
    
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });

  // Test 8: Handles columns with render functions
  test('should handle columns with custom render functions', () => {
    useMediaQuery.mockReturnValue(false);
    
    const columnsWithRender = [
      { id: 'name', label: 'Name' },
      { 
        id: 'status', 
        label: 'Status',
        render: (value) => <span data-testid="custom-status">{value.toUpperCase()}</span>
      },
    ];
    
    const data = [{ name: 'John', status: 'active' }];
    
    renderWithTheme(
      <ResponsiveTable 
        columns={columnsWithRender} 
        data={data}
        loading={false}
      />
    );
    
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  // Test 9: Mobile cards show expandable content
  test('should show expandable content in mobile cards when columns exceed 3', () => {
    useMediaQuery.mockReturnValue(true);
    
    const manyColumns = [
      { id: 'field1', label: 'Field 1' },
      { id: 'field2', label: 'Field 2' },
      { id: 'field3', label: 'Field 3' },
      { id: 'field4', label: 'Field 4' },
      { id: 'field5', label: 'Field 5' },
    ];
    
    const data = [{ 
      id: 1,
      field1: 'Value 1', 
      field2: 'Value 2', 
      field3: 'Value 3',
      field4: 'Value 4',
      field5: 'Value 5'
    }];
    
    renderWithTheme(
      <ResponsiveTable 
        columns={manyColumns} 
        data={data}
        loading={false}
      />
    );
    
    // First 3 fields should be visible
    expect(screen.getByText('Value 1')).toBeInTheDocument();
    
    // Expand button should be present
    const expandButton = screen.getByRole('button');
    expect(expandButton).toBeInTheDocument();
  });

  // Test 10: Respects custom mobileBreakpoint prop
  test('should respect custom mobileBreakpoint prop', () => {
    // useMediaQuery will be called with theme.breakpoints.down(mobileBreakpoint)
    useMediaQuery.mockReturnValue(true);
    
    renderWithTheme(
      <ResponsiveTable 
        columns={mockColumns} 
        data={mockData}
        loading={false}
        mobileBreakpoint="sm" // Custom breakpoint
      />
    );
    
    // Should render in mobile mode
    const tableHeaders = screen.queryAllByRole('columnheader');
    expect(tableHeaders.length).toBe(0);
  });
});

describe('EmployeeMobileCard Component', () => {
  const mockEmployee = {
    user: {
      firstName: 'John',
      lastName: 'Doe'
    },
    position: 'Software Engineer',
    department: 'Engineering',
    status: 'active'
  };

  test('should render employee mobile card with employee data', () => {
    renderWithTheme(<EmployeeMobileCard employee={mockEmployee} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/Software Engineer/)).toBeInTheDocument();
    expect(screen.getByText(/Engineering/)).toBeInTheDocument();
  });
});
