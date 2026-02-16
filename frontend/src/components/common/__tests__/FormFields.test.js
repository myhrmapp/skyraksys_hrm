import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import {
  StandardTextField,
  StandardSelectField,
  StandardDateField,
  StandardAutocompleteField,
  StandardFileField,
  StandardRatingField,
  StandardSliderField
} from '../FormFields';
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

describe('StandardTextField Component', () => {
  // Test 1: Renders text field with label and value
  test('should render text field with label and value', () => {
    renderWithTheme(
      <StandardTextField 
        name="testField" 
        label="Test Label" 
        value="Test Value"
        onChange={jest.fn()}
      />
    );
    
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Value')).toBeInTheDocument();
  });

  // Test 2: Calls onChange when value changes
  test('should call onChange when value changes', async () => {
    const onChange = jest.fn();
    renderWithTheme(
      <StandardTextField 
        name="testField" 
        label="Test Label" 
        value=""
        onChange={onChange}
      />
    );
    
    const input = screen.getByLabelText('Test Label');
    await userEvent.type(input, 'New Value');
    
    expect(onChange).toHaveBeenCalled();
  });

  // Test 3: Shows error message when error prop is provided
  test('should show error message when error prop is provided', () => {
    renderWithTheme(
      <StandardTextField 
        name="testField" 
        label="Test Label" 
        value=""
        error="This field is required"
        onChange={jest.fn()}
      />
    );
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  // Test 4: Shows password toggle for password fields
  test('should show password toggle for password fields', () => {
    renderWithTheme(
      <StandardTextField 
        name="password" 
        label="Password" 
        type="password"
        value="secret"
        showPasswordToggle={true}
        onChange={jest.fn()}
      />
    );
    
    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toBeInTheDocument();
    
    // Click toggle to show password
    fireEvent.click(toggleButton);
    const input = screen.getByLabelText('Password');
    expect(input.type).toBe('text');
  });

  // Test 5: Respects maxLength prop
  test('should respect maxLength prop', async () => {
    const onChange = jest.fn();
    renderWithTheme(
      <StandardTextField 
        name="testField" 
        label="Test Label" 
        value=""
        maxLength={5}
        onChange={onChange}
      />
    );
    
    const input = screen.getByLabelText('Test Label');
    await userEvent.type(input, '123456789');
    
    // Should only accept first 5 characters
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(lastCall[0].length).toBeLessThanOrEqual(5);
  });

  // Test 6: Shows clear button when clearable and has value
  test('should show clear button when clearable and has value', () => {
    const onChange = jest.fn();
    renderWithTheme(
      <StandardTextField 
        name="testField" 
        label="Test Label" 
        value="Test Value"
        clearable={true}
        onChange={onChange}
      />
    );
    
    const clearButtons = screen.getAllByRole('button');
    expect(clearButtons.length).toBeGreaterThan(0);
    
    fireEvent.click(clearButtons[0]);
    expect(onChange).toHaveBeenCalledWith('');
  });
});

describe('StandardSelectField Component', () => {
  const selectOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  // Test 7: Renders select field with options
  test('should render select field with options', () => {
    renderWithTheme(
      <StandardSelectField 
        name="testSelect" 
        label="Test Select" 
        value=""
        options={selectOptions}
        onChange={jest.fn()}
      />
    );
    
    expect(screen.getByLabelText('Test Select')).toBeInTheDocument();
  });

  // Test 8: Calls onChange when selection changes
  test('should call onChange when selection changes', async () => {
    const onChange = jest.fn();
    renderWithTheme(
      <StandardSelectField 
        name="testSelect" 
        label="Test Select" 
        value=""
        options={selectOptions}
        onChange={onChange}
      />
    );
    
    const select = screen.getByLabelText('Test Select');
    fireEvent.mouseDown(select);
    
    await waitFor(() => {
      const option = screen.getByText('Option 1');
      fireEvent.click(option);
    });
    
    expect(onChange).toHaveBeenCalled();
  });

  // Test 9: Supports multiple selection
  test('should support multiple selection', () => {
    renderWithTheme(
      <StandardSelectField 
        name="testSelect" 
        label="Test Multi Select" 
        value={['option1']}
        options={selectOptions}
        multiple={true}
        onChange={jest.fn()}
      />
    );
    
    expect(screen.getByLabelText('Test Multi Select')).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });
});

describe('StandardDateField Component', () => {
  // Test 10: Renders date field
  test('should render date field', () => {
    renderWithTheme(
      <StandardDateField 
        name="testDate" 
        label="Test Date" 
        value="2026-02-15"
        onChange={jest.fn()}
        type="date"
      />
    );
    
    expect(screen.getByLabelText('Test Date')).toBeInTheDocument();
    const input = screen.getByLabelText('Test Date');
    expect(input.value).toBe('2026-02-15');
  });

  // Test 11: Calls onChange when date changes
  test('should call onChange when date changes', async () => {
    const onChange = jest.fn();
    renderWithTheme(
      <StandardDateField 
        name="testDate" 
        label="Test Date" 
        value=""
        onChange={onChange}
        type="date"
      />
    );
    
    const input = screen.getByLabelText('Test Date');
    fireEvent.change(input, { target: { value: '2026-03-20' } });
    
    expect(onChange).toHaveBeenCalledWith('2026-03-20');
  });
});

describe('StandardAutocompleteField Component', () => {
  const autocompleteOptions = [
    { id: 1, label: 'Option 1' },
    { id: 2, label: 'Option 2' },
    { id: 3, label: 'Option 3' },
  ];

  // Test 12: Renders autocomplete field
  test('should render autocomplete field', () => {
    renderWithTheme(
      <StandardAutocompleteField 
        name="testAutocomplete" 
        label="Test Autocomplete" 
        value={null}
        options={autocompleteOptions}
        onChange={jest.fn()}
      />
    );
    
    expect(screen.getByLabelText('Test Autocomplete')).toBeInTheDocument();
  });
});

describe('StandardRatingField Component', () => {
  test('should render rating field', () => {
    renderWithTheme(
      <StandardRatingField 
        name="testRating" 
        label="Test Rating" 
        value={3}
        onChange={jest.fn()}
      />
    );
    
    expect(screen.getByText('Test Rating')).toBeInTheDocument();
  });
});

describe('StandardSliderField Component', () => {
  test('should render slider field', () => {
    renderWithTheme(
      <StandardSliderField 
        name="testSlider" 
        label="Test Slider" 
        value={50}
        onChange={jest.fn()}
        min={0}
        max={100}
      />
    );
    
    expect(screen.getByText('Test Slider')).toBeInTheDocument();
  });
});

describe('StandardFileField Component', () => {
  test('should render file upload field', () => {
    renderWithTheme(
      <StandardFileField 
        name="testFile" 
        label="Test File Upload" 
        onChange={jest.fn()}
      />
    );
    
    expect(screen.getByText('Test File Upload')).toBeInTheDocument();
  });
});
