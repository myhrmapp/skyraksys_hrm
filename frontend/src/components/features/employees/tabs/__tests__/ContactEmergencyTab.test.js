/**
 * ContactEmergencyTab.test.js
 *
 * Comprehensive tests for ContactEmergencyTab component.
 * Tests 3 fields: emergencyContactName, emergencyContactPhone (digit mask, 15 limit),
 * emergencyContactRelation (8-option select including None).
 */
import React from 'react';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders as render } from '../../../../../test-utils/testUtils';
import ContactEmergencyTab from '../ContactEmergencyTab';

const createFormData = (overrides = {}) => ({
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
  ...overrides,
});

const createProps = (overrides = {}) => ({
  formData: createFormData(overrides.formData),
  errors: overrides.errors || {},
  touchedFields: overrides.touchedFields || {},
  onChange: overrides.onChange || jest.fn(),
  onBlur: overrides.onBlur || jest.fn(),
});

const renderTab = (overrides = {}) => {
  const props = createProps(overrides);
  return { ...render(<ContactEmergencyTab {...props} />), props };
};

describe('ContactEmergencyTab', () => {
  // ─── Section Heading ──────────────────────────────────

  describe('Section Heading', () => {
    it('should render Emergency Contact Information heading', () => {
      renderTab();
      expect(screen.getByText('Emergency Contact Information')).toBeInTheDocument();
    });
  });

  // ─── Emergency Contact Name ───────────────────────────

  describe('Emergency Contact Name Field', () => {
    it('should render Emergency Contact Name field', () => {
      renderTab();
      expect(screen.getByLabelText(/emergency contact name/i)).toBeInTheDocument();
    });

    it('should show Optional helper text', () => {
      renderTab();
      expect(screen.getByText('Optional')).toBeInTheDocument();
    });

    it('should display value from formData', () => {
      renderTab({ formData: { emergencyContactName: 'Jane Doe' } });
      expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
    });

    it('should call onChange when typed', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/emergency contact name/i), { target: { value: 'Jane Doe' } });
      expect(onChange).toHaveBeenCalledWith('emergencyContactName', 'Jane Doe');
    });

    it('should call onBlur when field loses focus', () => {
      const onBlur = jest.fn();
      renderTab({ onBlur });
      fireEvent.blur(screen.getByLabelText(/emergency contact name/i));
      expect(onBlur).toHaveBeenCalledWith('emergencyContactName');
    });
  });

  // ─── Emergency Contact Phone ──────────────────────────

  describe('Emergency Contact Phone Field', () => {
    it('should render Emergency Contact Phone field', () => {
      renderTab();
      expect(screen.getByLabelText(/emergency contact phone/i)).toBeInTheDocument();
    });

    it('should show format helper text', () => {
      renderTab();
      expect(screen.getByText(/Format: 1234567890 \(10-15 digits\)/i)).toBeInTheDocument();
    });

    it('should show placeholder', () => {
      renderTab();
      expect(screen.getByPlaceholderText('1234567890')).toBeInTheDocument();
    });

    it('should apply digit-only mask', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/emergency contact phone/i), { target: { value: '123abc456' } });
      expect(onChange).toHaveBeenCalledWith('emergencyContactPhone', '123456');
    });

    it('should limit to 15 characters', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/emergency contact phone/i), { target: { value: '1234567890123456' } });
      // 16 digits → sliced to 15
      expect(onChange).toHaveBeenCalledWith('emergencyContactPhone', '123456789012345');
    });

    it('should strip all non-digit characters', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/emergency contact phone/i), { target: { value: '+91-9876-543210' } });
      // Strips +, -, spaces → '919876543210' (12 digits, under 15 limit)
      expect(onChange).toHaveBeenCalledWith('emergencyContactPhone', '919876543210');
    });

    it('should show error when touched and error exists', () => {
      renderTab({
        errors: { emergencyContactPhone: 'Emergency contact phone must be 10-15 digits only' },
        touchedFields: { emergencyContactPhone: true },
      });
      expect(screen.getByText('Emergency contact phone must be 10-15 digits only')).toBeInTheDocument();
    });

    it('should NOT show error when NOT touched', () => {
      renderTab({
        errors: { emergencyContactPhone: 'Emergency contact phone must be 10-15 digits only' },
        touchedFields: {},
      });
      expect(screen.queryByText('Emergency contact phone must be 10-15 digits only')).not.toBeInTheDocument();
    });
  });

  // ─── Emergency Contact Relationship ───────────────────

  describe('Relationship Select', () => {
    it('should render Relationship select', () => {
      renderTab();
      expect(document.getElementById('emergencyContactRelation')).toBeInTheDocument();
    });

    it('should have None + 7 relationship options (8 total)', async () => {
      renderTab({ formData: { emergencyContactRelation: '' } });
      fireEvent.mouseDown(document.getElementById('emergencyContactRelation'));
      const listbox = await screen.findByRole('listbox');
      const options = within(listbox).getAllByRole('option');
      expect(options).toHaveLength(8);
    });

    it('should include None option', async () => {
      renderTab({ formData: { emergencyContactRelation: '' } });
      fireEvent.mouseDown(document.getElementById('emergencyContactRelation'));
      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).getByText(/none/i)).toBeInTheDocument();
    });

    it('should include all relationship types', async () => {
      renderTab({ formData: { emergencyContactRelation: '' } });
      fireEvent.mouseDown(document.getElementById('emergencyContactRelation'));
      const listbox = await screen.findByRole('listbox');
      const expectedOptions = ['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Guardian', 'Other'];
      expectedOptions.forEach(option => {
        expect(within(listbox).getByText(option)).toBeInTheDocument();
      });
    });

    it('should call onChange when option selected', async () => {
      const onChange = jest.fn();
      renderTab({ onChange, formData: { emergencyContactRelation: '' } });
      fireEvent.mouseDown(document.getElementById('emergencyContactRelation'));
      const listbox = await screen.findByRole('listbox');
      fireEvent.click(within(listbox).getByText('Spouse'));
      expect(onChange).toHaveBeenCalledWith('emergencyContactRelation', 'Spouse');
    });

    it('should show error when touched and error exists', () => {
      renderTab({
        errors: { emergencyContactRelation: 'Please select a valid emergency contact relation' },
        touchedFields: { emergencyContactRelation: true },
      });
      expect(screen.getByText('Please select a valid emergency contact relation')).toBeInTheDocument();
    });
  });

  // ─── Happy Path ───────────────────────────────────────

  describe('Happy Path - All fields populated', () => {
    it('should render all filled values correctly', () => {
      renderTab({
        formData: {
          emergencyContactName: 'Priya Sharma',
          emergencyContactPhone: '9876543210',
          emergencyContactRelation: 'Spouse',
        },
      });

      expect(screen.getByDisplayValue('Priya Sharma')).toBeInTheDocument();
      expect(screen.getByDisplayValue('9876543210')).toBeInTheDocument();
      expect(screen.getByText('Spouse')).toBeInTheDocument();
    });
  });
});
