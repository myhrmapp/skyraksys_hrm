import React, { useState, useCallback, forwardRef } from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Checkbox,
  FormControlLabel,
  RadioGroup,
  Radio,
  Switch,
  Autocomplete,
  InputAdornment,
  IconButton,
  Chip,
  Box,
  FormLabel,
  FormGroup,
  Typography,
  Slider,
  Rating,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Stack,
  CircularProgress
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Clear,
  Search,
  CalendarToday,
  Upload,
  Delete
} from '@mui/icons-material';
// Temporarily comment out date picker imports until compatibility is resolved
// import { DatePicker } from '@mui/x-date-pickers/DatePicker';
// import { TimePicker } from '@mui/x-date-pickers/TimePicker';
// import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

/**
 * Enhanced TextField with advanced features
 */
export const StandardTextField = forwardRef(({
  name,
  label,
  required = false,
  type = 'text',
  multiline = false,
  rows = 1,
  placeholder,
  helperText,
  error,
  value,
  onChange,
  onBlur,
  disabled = false,
  clearable = false,
  showPasswordToggle = false,
  formatValue,
  maxLength,
  prefix,
  suffix,
  startAdornment,
  endAdornment,
  variant = 'outlined',
  size = 'medium',
  fullWidth = true,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = useCallback((event) => {
    let newValue = event.target.value;

    // Apply formatting if provided
    if (formatValue) {
      newValue = formatValue(newValue);
    }

    // Apply max length
    if (maxLength && newValue.length > maxLength) {
      newValue = newValue.slice(0, maxLength);
    }

    if (onChange) {
      if (typeof onChange === 'function') {
        onChange(newValue);
      } else {
        onChange(event);
      }
    }
  }, [formatValue, maxLength, onChange]);

  const handleClear = useCallback(() => {
    if (onChange) {
      onChange('');
    }
  }, [onChange]);

  const handleFocus = useCallback((event) => {
    setIsFocused(true);
    props.onFocus?.(event);
  }, [props]);

  const handleBlurLocal = useCallback((event) => {
    setIsFocused(false);
    onBlur?.(event);
  }, [onBlur]);

  const inputType = type === 'password' && showPassword ? 'text' : type;

  // Build adornments
  const buildStartAdornment = () => {
    const elements = [];

    if (prefix) {
      elements.push(
        <Typography key="prefix" variant="body2" color="text.secondary" sx={{ mr: 1 }}>
          {prefix}
        </Typography>
      );
    }

    if (startAdornment) {
      elements.push(startAdornment);
    }

    return elements.length > 0 ? (
      <InputAdornment position="start">
        {elements}
      </InputAdornment>
    ) : null;
  };

  const buildEndAdornment = () => {
    const elements = [];

    if (suffix) {
      elements.push(
        <Typography key="suffix" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
          {suffix}
        </Typography>
      );
    }

    if (clearable && value && !disabled) {
      elements.push(
        <IconButton key="clear" onClick={handleClear} edge="end" size="small">
          <Clear fontSize="small" />
        </IconButton>
      );
    }

    if (type === 'password' && showPasswordToggle) {
      elements.push(
        <IconButton
          key="password-toggle"
          onClick={() => setShowPassword(!showPassword)}
          edge="end"
          size="small"
        >
          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
        </IconButton>
      );
    }

    if (endAdornment) {
      elements.push(endAdornment);
    }

    return elements.length > 0 ? (
      <InputAdornment position="end">
        {elements}
      </InputAdornment>
    ) : null;
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <TextField
        ref={ref}
        name={name}
        label={label}
        type={inputType}
        multiline={multiline}
        rows={multiline ? rows : undefined}
        placeholder={placeholder}
        helperText={error || helperText}
        error={!!error}
        value={value || ''}
        onChange={handleChange}
        onBlur={handleBlurLocal}
        onFocus={handleFocus}
        disabled={disabled}
        required={required}
        fullWidth={fullWidth}
        variant={variant}
        size={size}
        InputProps={{
          startAdornment: buildStartAdornment(),
          endAdornment: buildEndAdornment(),
          ...props.InputProps
        }}
        {...props}
      />

      {/* Character count for text areas */}
      {multiline && maxLength && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            position: 'absolute',
            bottom: 4,
            right: 8,
            fontSize: '0.7rem'
          }}
        >
          {(value || '').length}/{maxLength}
        </Typography>
      )}
    </Box>
  );
});

/**
 * Enhanced Select Field with search and multi-select capabilities
 */
export const StandardSelectField = forwardRef(({
  name,
  label,
  required = false,
  options = [],
  value,
  onChange,
  onBlur,
  error,
  helperText,
  disabled = false,
  multiple = false,
  placeholder = 'Select an option',
  searchable = false,
  loading = false,
  clearable = false,
  variant = 'outlined',
  size = 'medium',
  fullWidth = true,
  renderOption,
  groupBy,
  ...props
}, ref) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = React.useMemo(() => {
    if (!searchable || !searchTerm) return options;

    return options.filter(option => {
      const label = option.label || option.name || option.toString();
      return label.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [options, searchTerm, searchable]);

  const handleChange = useCallback((event) => {
    const newValue = event.target.value;
    onChange?.(newValue);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange?.(multiple ? [] : '');
  }, [onChange, multiple]);

  const renderValue = useCallback((selected) => {
    if (!selected || (Array.isArray(selected) && selected.length === 0)) {
      return <em style={{ color: 'rgba(0, 0, 0, 0.6)' }}>{placeholder}</em>;
    }

    if (multiple) {
      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {selected.map((value) => {
            const option = options.find(opt => (opt.value || opt) === value);
            const label = option?.label || option?.name || value;
            return (
              <Chip key={value} label={label} size="small" />
            );
          })}
        </Box>
      );
    }

    const option = options.find(opt => (opt.value || opt) === selected);
    return option?.label || option?.name || selected;
  }, [multiple, options, placeholder]);

  return (
    <FormControl
      fullWidth={fullWidth}
      error={!!error}
      disabled={disabled}
      variant={variant}
      size={size}
    >
      <InputLabel required={required}>{label}</InputLabel>
      <Select
        ref={ref}
        name={name}
        value={value || (multiple ? [] : '')}
        onChange={handleChange}
        onBlur={onBlur}
        label={label}
        multiple={multiple}
        renderValue={renderValue}
        endAdornment={
          clearable && value && (
            <InputAdornment position="end">
              <IconButton onClick={handleClear} size="small" edge="end">
                <Clear fontSize="small" />
              </IconButton>
            </InputAdornment>
          )
        }
        {...props}
      >
        {searchable && (
          <MenuItem disabled>
            <TextField
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                )
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </MenuItem>
        )}

        {!multiple && (
          <MenuItem value="">
            <em>{placeholder}</em>
          </MenuItem>
        )}

        {filteredOptions.map((option, index) => {
          const optionValue = option.value !== undefined ? option.value : option;
          const optionLabel = option.label || option.name || option.toString();

          return (
            <MenuItem key={`${optionValue}-${index}`} value={optionValue}>
              {renderOption ? renderOption(option, index) : optionLabel}
            </MenuItem>
          );
        })}

        {loading && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              Loading...
            </Typography>
          </MenuItem>
        )}
      </Select>
      {(error || helperText) && (
        <FormHelperText>{error || helperText}</FormHelperText>
      )}
    </FormControl>
  );
});

/**
 * Enhanced Date/Time picker fields - Simplified version
 */
export const StandardDateField = forwardRef(({
  name,
  label,
  required = false,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  disabled = false,
  minDate,
  maxDate,
  type = 'date', // 'date', 'time', 'datetime-local'
  format,
  clearable = true,
  variant = 'outlined',
  size = 'medium',
  fullWidth = true,
  ...props
}, ref) => {
  const handleChange = useCallback((event) => {
    if (onChange) {
      onChange(event.target.value);
    }
  }, [onChange]);

  const handleClear = useCallback(() => {
    if (onChange) {
      onChange('');
    }
  }, [onChange]);

  // Format min/max dates for HTML input
  const formatDateForInput = (date) => {
    if (!date) return undefined;
    if (typeof date === 'string') return date;
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return undefined;
  };

  return (
    <Box sx={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
      <TextField
        ref={ref}
        name={name}
        label={label}
        type={type}
        value={value || ''}
        onChange={handleChange}
        onBlur={onBlur}
        error={Boolean(error)}
        helperText={error || helperText}
        disabled={disabled}
        required={required}
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        inputProps={{
          min: formatDateForInput(minDate),
          max: formatDateForInput(maxDate),
          ...props.inputProps
        }}
        InputProps={{
          endAdornment: clearable && value && !disabled && (
            <InputAdornment position="end">
              <IconButton
                onClick={handleClear}
                size="small"
                edge="end"
              >
                <Clear />
              </IconButton>
            </InputAdornment>
          ),
          ...props.InputProps
        }}
        {...props}
      />
    </Box>
  );
});

/**
 * Enhanced Autocomplete field with async search
 */
export const StandardAutocompleteField = forwardRef(({
  name,
  label,
  required = false,
  options = [],
  value,
  onChange,
  onBlur,
  error,
  helperText,
  disabled = false,
  multiple = false,
  loading = false,
  onSearch,
  placeholder = 'Search and select...',
  clearable = true,
  variant = 'outlined',
  size = 'medium',
  fullWidth = true,
  renderOption,
  getOptionLabel,
  isOptionEqualToValue,
  freeSolo = false,
  ...props
}, ref) => {
  const [inputValue, setInputValue] = useState('');

  // Debounced search
  React.useEffect(() => {
    if (onSearch && inputValue) {
      const timer = setTimeout(() => {
        onSearch(inputValue);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [inputValue, onSearch]);

  const handleChange = useCallback((event, newValue) => {
    onChange?.(newValue);
  }, [onChange]);

  const defaultGetOptionLabel = useCallback((option) => {
    if (typeof option === 'string') return option;
    return option.label || option.name || option.toString();
  }, []);

  const defaultIsOptionEqualToValue = useCallback((option, value) => {
    if (typeof option === 'string' && typeof value === 'string') {
      return option === value;
    }
    return option?.value === value?.value || option?.id === value?.id;
  }, []);

  return (
    <Autocomplete
      ref={ref}
      options={options}
      value={value || (multiple ? [] : null)}
      onChange={handleChange}
      onBlur={onBlur}
      disabled={disabled}
      multiple={multiple}
      loading={loading}
      freeSolo={freeSolo}
      inputValue={inputValue}
      onInputChange={(event, newInputValue) => setInputValue(newInputValue)}
      getOptionLabel={getOptionLabel || defaultGetOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue || defaultIsOptionEqualToValue}
      renderInput={(params) => (
        <TextField
          {...params}
          name={name}
          label={label}
          required={required}
          error={!!error}
          helperText={error || helperText}
          placeholder={placeholder}
          variant={variant}
          size={size}
          fullWidth={fullWidth}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading && <CircularProgress color="inherit" size={20} />}
                {params.InputProps.endAdornment}
              </>
            )
          }}
        />
      )}
      renderOption={renderOption}
      renderTags={multiple ? (value, getTagProps) =>
        value.map((option, index) => (
          <Chip
            variant="outlined"
            label={defaultGetOptionLabel(option)}
            {...getTagProps({ index })}
            key={index}
          />
        ))
      : undefined}
      {...props}
    />
  );
});

/**
 * File upload field
 */
export const StandardFileField = forwardRef(({
  name,
  label,
  required = false,
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  multiple = false,
  accept,
  maxSize = 5 * 1024 * 1024, // 5MB default
  variant = 'outlined',
  fullWidth = true,
  ...props
}, ref) => {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = React.useRef();

  const handleFileSelect = useCallback((files) => {
    const fileList = Array.from(files);

    // Validate file size
    const validFiles = fileList.filter(file => {
      if (file.size > maxSize) {
        console.warn(`File ${file.name} exceeds maximum size of ${maxSize} bytes`);
        return false;
      }
      return true;
    });

    if (onChange) {
      onChange(multiple ? validFiles : validFiles[0] || null);
    }
  }, [onChange, multiple, maxSize]);

  const handleInputChange = useCallback((event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setDragOver(false);

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleRemoveFile = useCallback((index) => {
    if (multiple && Array.isArray(value)) {
      const newFiles = value.filter((_, i) => i !== index);
      onChange?.(newFiles);
    } else {
      onChange?.(null);
    }
  }, [multiple, value, onChange]);

  const renderFileList = () => {
    if (!value) return null;

    const files = multiple ? value : [value];

    return (
      <Stack spacing={1} sx={{ mt: 2 }}>
        {files.map((file, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1
            }}
          >
            <Typography variant="body2" noWrap sx={{ flex: 1 }}>
              {file.name || file}
            </Typography>
            <IconButton
              size="small"
              onClick={() => handleRemoveFile(index)}
              disabled={disabled}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Stack>
    );
  };

  return (
    <FormControl fullWidth={fullWidth} error={!!error} disabled={disabled}>
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleInputChange}
        style={{ display: 'none' }}
        {...props}
      />

      <Box
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        sx={{
          border: 2,
          borderColor: dragOver ? 'primary.main' : (error ? 'error.main' : 'divider'),
          borderStyle: 'dashed',
          borderRadius: 1,
          p: 3,
          textAlign: 'center',
          cursor: disabled ? 'default' : 'pointer',
          backgroundColor: dragOver ? 'action.hover' : 'transparent',
          transition: 'all 0.2s ease'
        }}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <Upload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="h6" gutterBottom>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Click to browse or drag and drop files here
        </Typography>
        {accept && (
          <Typography variant="caption" color="text.secondary">
            Accepted formats: {accept}
          </Typography>
        )}
      </Box>

      {renderFileList()}

      {(error || helperText) && (
        <FormHelperText>{error || helperText}</FormHelperText>
      )}
    </FormControl>
  );
});

/**
 * Rating field
 */
export const StandardRatingField = forwardRef(({
  name,
  label,
  required = false,
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  max = 5,
  precision = 1,
  size = 'medium',
  ...props
}, ref) => {
  return (
    <FormControl error={!!error} disabled={disabled}>
      <FormLabel component="legend" required={required}>
        {label}
      </FormLabel>
      <Rating
        ref={ref}
        name={name}
        value={value || 0}
        onChange={(event, newValue) => onChange?.(newValue)}
        disabled={disabled}
        max={max}
        precision={precision}
        size={size}
        {...props}
      />
      {(error || helperText) && (
        <FormHelperText>{error || helperText}</FormHelperText>
      )}
    </FormControl>
  );
});

/**
 * Slider field
 */
export const StandardSliderField = forwardRef(({
  name,
  label,
  required = false,
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  min = 0,
  max = 100,
  step = 1,
  marks = false,
  valueLabelDisplay = 'auto',
  ...props
}, ref) => {
  return (
    <FormControl fullWidth error={!!error} disabled={disabled}>
      <FormLabel component="legend" required={required} sx={{ mb: 2 }}>
        {label}
      </FormLabel>
      <Slider
        ref={ref}
        name={name}
        value={value || min}
        onChange={(event, newValue) => onChange?.(newValue)}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        marks={marks}
        valueLabelDisplay={valueLabelDisplay}
        sx={{ mx: 1 }}
        {...props}
      />
      {(error || helperText) && (
        <FormHelperText>{error || helperText}</FormHelperText>
      )}
    </FormControl>
  );
});

// Set display names for better debugging
StandardTextField.displayName = 'StandardTextField';
StandardSelectField.displayName = 'StandardSelectField';
StandardDateField.displayName = 'StandardDateField';
StandardAutocompleteField.displayName = 'StandardAutocompleteField';
StandardFileField.displayName = 'StandardFileField';
StandardRatingField.displayName = 'StandardRatingField';
StandardSliderField.displayName = 'StandardSliderField';

export {
  StandardTextField as TextField,
  StandardSelectField as SelectField,
  StandardDateField as DateField,
  StandardAutocompleteField as AutocompleteField,
  StandardFileField as FileField,
  StandardRatingField as RatingField,
  StandardSliderField as SliderField
};
