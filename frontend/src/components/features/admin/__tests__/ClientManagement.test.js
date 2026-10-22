import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render } from '../../../../test-utils/testUtils';
import ClientManagement from '../ClientManagement';
import clientService from '../../../../services/client.service';

// Mock clientService
jest.mock('../../../../services/client.service', () => ({
  getAll: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}));

// Mock LoadingContext
jest.mock('../../../../contexts/LoadingContext', () => ({
  useLoading: () => ({ isLoading: false, setLoading: jest.fn() })
}));

const mockClients = [
  {
    id: 1,
    companyName: 'Acme Corporation',
    contactPerson: 'Alice Johnson',
    email: 'alice@acme.com',
    phone: '9876543210',
    gstin: '29ABCDE1234F1Z5',
    address: '123 Tech Park, Bangalore',
    notes: 'Key enterprise client',
    isActive: true
  },
  {
    id: 2,
    companyName: 'Globex Inc',
    contactPerson: 'Bob Smith',
    email: 'bob@globex.com',
    phone: '9123456780',
    gstin: '33FGHIJ5678K1Z2',
    address: '456 Business Bay, Mumbai',
    notes: 'Consulting partner',
    isActive: false
  }
];

describe('ClientManagement Component', () => {
  let user;

  beforeEach(() => {
    jest.clearAllMocks();
    user = userEvent.setup();
    clientService.getAll.mockResolvedValue({
      data: {
        success: true,
        data: mockClients
      }
    });
  });

  test('renders client list and table with correct test-ids', async () => {
    render(<ClientManagement />);

    expect(await screen.findByTestId('client-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('client-table')).toBeInTheDocument();
    expect(screen.getByTestId('client-search-input')).toBeInTheDocument();
    expect(screen.getByTestId('client-add-btn')).toBeInTheDocument();

    // Verify rows rendered
    expect(screen.getByTestId('client-row-2')).toBeInTheDocument();
    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
    expect(screen.getByText('Globex Inc')).toBeInTheDocument();

    // Verify status chips
    expect(screen.getByTestId('client-status-chip-1')).toHaveTextContent('Active');
    expect(screen.getByTestId('client-status-chip-2')).toHaveTextContent('Inactive');
  });

  test('filters clients by search input', async () => {
    render(<ClientManagement />);

    expect(await screen.findByTestId('client-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('client-row-2')).toBeInTheDocument();

    const searchInput = screen.getByTestId('client-search-input');
    await user.type(searchInput, 'Globex');

    // Row 2 matches, Row 1 does not
    expect(screen.getByTestId('client-row-2')).toBeInTheDocument();
    expect(screen.queryByTestId('client-row-1')).not.toBeInTheDocument();
  });

  test('shows empty state row when search yields no results', async () => {
    render(<ClientManagement />);

    expect(await screen.findByTestId('client-row-1')).toBeInTheDocument();

    const searchInput = screen.getByTestId('client-search-input');
    await user.type(searchInput, 'NonExistentCompany');

    expect(screen.getByTestId('client-empty-row')).toBeInTheDocument();
    expect(screen.getByText('No clients found.')).toBeInTheDocument();
  });

  test('validates required company name before creating a client', async () => {
    render(<ClientManagement />);
    await screen.findByTestId('client-table');

    // Click Add Client button
    await user.click(screen.getByTestId('client-add-btn'));
    expect(screen.getByTestId('client-dialog')).toBeInTheDocument();

    // Attempt save without filling company name
    await user.click(screen.getByTestId('client-save-btn'));

    expect(clientService.create).not.toHaveBeenCalled();
  });

  test('TC-049: creates client with empty optional email sanitized to null', async () => {
    clientService.create.mockResolvedValueOnce({
      data: { success: true, data: { id: 3, companyName: 'Initech Corp' } }
    });

    render(<ClientManagement />);
    await screen.findByTestId('client-table');

    await user.click(screen.getByTestId('client-add-btn'));
    expect(screen.getByTestId('client-dialog')).toBeInTheDocument();

    // Fill company name and leave email empty
    await user.type(screen.getByTestId('client-company-name-input'), 'Initech Corp');
    await user.type(screen.getByTestId('client-contact-person-input'), 'Peter Gibbons');

    // Save client
    await user.click(screen.getByTestId('client-save-btn'));

    await waitFor(() => {
      expect(clientService.create).toHaveBeenCalledTimes(1);
    });

    // Verify TC-049 assertion: empty email string is converted to null payload
    const calledPayload = clientService.create.mock.calls[0][0];
    expect(calledPayload.companyName).toBe('Initech Corp');
    expect(calledPayload.contactPerson).toBe('Peter Gibbons');
    expect(calledPayload.email).toBeNull();
  });

  test('opens edit dialog and updates client data', async () => {
    clientService.update.mockResolvedValueOnce({
      data: { success: true, data: { ...mockClients[0], companyName: 'Acme International' } }
    });

    render(<ClientManagement />);
    expect(await screen.findByTestId('client-edit-btn-1')).toBeInTheDocument();

    await user.click(screen.getByTestId('client-edit-btn-1'));
    expect(screen.getByTestId('client-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('client-company-name-input')).toHaveValue('Acme Corporation');

    // Clear and retype company name
    await user.clear(screen.getByTestId('client-company-name-input'));
    await user.type(screen.getByTestId('client-company-name-input'), 'Acme International');

    await user.click(screen.getByTestId('client-save-btn'));

    await waitFor(() => {
      expect(clientService.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          companyName: 'Acme International'
        })
      );
    });
  });

  test('deletes client after window.confirm', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    clientService.delete.mockResolvedValueOnce({
      data: { success: true }
    });

    render(<ClientManagement />);
    expect(await screen.findByTestId('client-delete-btn-1')).toBeInTheDocument();

    await user.click(screen.getByTestId('client-delete-btn-1'));

    await waitFor(() => {
      expect(clientService.delete).toHaveBeenCalledWith(1);
    });

    window.confirm.mockRestore();
  });
});
