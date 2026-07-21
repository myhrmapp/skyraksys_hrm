import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Chip,
  Tooltip,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  AutoAwesome as AutoIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import PhotoUploadSimple from '../../../common/PhotoUploadSimple';
import { employeeService } from '../../../../services/employee.service';

const PersonalInformationTab = ({
  formData,
  errors,
  touchedFields = {},
  onChange,
  onBlur,
  selectedPhoto,
  photoPreview,
  onPhotoSelect,
  onPhotoRemove,
  isEditMode = false,
}) => {
  const [overrideId, setOverrideId] = useState(false);
  const [loadingNextId, setLoadingNextId] = useState(false);

  // On create mode: auto-fetch and pre-fill the next SK### ID
  useEffect(() => {
    if (!isEditMode && !formData.employeeId) {
      fetchNextId();
    }
  }, [isEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchNextId = async () => {
    try {
      setLoadingNextId(true);
      const res = await employeeService.getNextEmployeeId();
      const nextId = res?.data?.nextId || res?.nextId;
      if (nextId && !overrideId) {
        onChange('employeeId', nextId);
      }
    } catch (e) {
      console.warn('Could not fetch next employee ID:', e.message);
    } finally {
      setLoadingNextId(false);
    }
  };

  return (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    {/* Profile Photo Section */}
    <Card 
      elevation={0} 
      sx={{ 
        p: 3, 
        bgcolor: 'primary.50', 
        border: '1px solid', 
        borderColor: 'primary.100',
        borderRadius: 2
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
        <Avatar
          sx={{ 
            width: 80, 
            height: 80, 
            bgcolor: 'primary.main',
            fontSize: '2rem',
            fontWeight: 'bold'
          }}
          src={photoPreview}
        >
          {formData.firstName?.[0] || 'N'}{formData.lastName?.[0] || 'E'}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" gutterBottom color="primary.main" fontWeight={700}>
            Employee Photo
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload a professional photo that will be used across the system
          </Typography>
          <PhotoUploadSimple
            photo={selectedPhoto}
            photoPreview={photoPreview}
            onPhotoSelect={onPhotoSelect}
            onPhotoRemove={onPhotoRemove}
            label="Upload Photo"
            size={120}
            helperText="JPEG, PNG or WebP • Max 5MB"
          />
        </Box>
      </Box>
    </Card>

    {/* Essential Information */}
    <Box>
      <Typography variant="h6" gutterBottom color="primary.main" fontWeight={700} sx={{ mb: 3 }}>
        Essential Information
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            id="firstName"
            name="firstName"
            label="First Name (Required)"
            data-testid="field-firstName"
            value={formData.firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
            onBlur={() => onBlur && onBlur('firstName')}
            error={touchedFields.firstName && !!errors.firstName}
            helperText={touchedFields.firstName && errors.firstName ? errors.firstName : ''}
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            id="lastName"
            name="lastName"
            label="Last Name (Required)"
            data-testid="field-lastName"
            value={formData.lastName}
            onChange={(e) => onChange('lastName', e.target.value)}
            onBlur={() => onBlur && onBlur('lastName')}
            error={touchedFields.lastName && !!errors.lastName}
            helperText={touchedFields.lastName && errors.lastName ? errors.lastName : ''}
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          {/* Smart Employee ID field: auto-fills next SK### in create mode, allows override */}
          <TextField
            fullWidth
            id="employeeId"
            name="employeeId"
            label={isEditMode ? 'Employee ID' : 'Employee ID (Auto-generated)'}
            data-testid="field-employeeId"
            value={formData.employeeId}
            onChange={(e) => onChange('employeeId', e.target.value.toUpperCase())}
            onBlur={() => onBlur && onBlur('employeeId')}
            error={touchedFields.employeeId && !!errors.employeeId}
            helperText={
              touchedFields.employeeId && errors.employeeId
                ? errors.employeeId
                : isEditMode
                  ? 'Employee ID cannot be changed after creation'
                  : overrideId
                    ? 'Enter any custom ID (e.g. SK200, EXEC01)'
                    : 'Auto-generated — click ✏️ to override'
            }
            placeholder="SK170"
            required
            disabled={isEditMode || (!overrideId && !loadingNextId)}
            InputProps={{
              readOnly: isEditMode,
              endAdornment: (
                <InputAdornment position="end">
                  {loadingNextId ? (
                    <CircularProgress size={18} />
                  ) : isEditMode ? (
                    <Tooltip title="Employee ID is locked after creation">
                      <LockIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                    </Tooltip>
                  ) : overrideId ? (
                    <Tooltip title="Revert to auto-generated ID">
                      <IconButton size="small" onClick={() => { setOverrideId(false); fetchNextId(); }}>
                        <RefreshIcon fontSize="small" sx={{ color: 'primary.main' }} />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Override: type a custom Employee ID">
                      <IconButton size="small" onClick={() => setOverrideId(true)}>
                        <EditIcon fontSize="small" sx={{ color: 'warning.main' }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: isEditMode
                  ? 'action.hover'
                  : overrideId
                    ? 'warning.50'
                    : 'success.50',
              },
              '& .MuiInputLabel-root': { fontWeight: 600 },
            }}
          />
          {/* Status chip below field */}
          {!isEditMode && (
            <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              {overrideId ? (
                <Chip label="Custom ID" size="small" color="warning" variant="outlined" icon={<EditIcon />} />
              ) : (
                <Chip label="Auto-increment" size="small" color="success" variant="outlined" icon={<AutoIcon />} />
              )}
            </Box>
          )}
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            id="email"
            name="email"
            label="Email Address (Required)"
            type="email"
            data-testid="field-email"
            value={formData.email}
            onChange={(e) => onChange('email', e.target.value)}
            onBlur={() => onBlur && onBlur('email')}
            error={touchedFields.email && !!errors.email}
            helperText={touchedFields.email && errors.email ? errors.email : ''}
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
        </Grid>
      </Grid>
    </Box>

    {/* Personal Details */}
    <Box>
      <Typography variant="h6" gutterBottom color="primary.main" fontWeight={700} sx={{ mb: 3 }}>
        Personal Details
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            id="phone"
            name="phone"
            label="Phone Number"
            data-testid="field-phone"
            value={formData.phone}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 15);
              onChange('phone', value);
            }}
            onBlur={() => onBlur && onBlur('phone')}
            error={touchedFields.phone && !!errors.phone}
            helperText={touchedFields.phone && errors.phone ? errors.phone : 'Format: 1234567890 (10 digits)'}
            placeholder="1234567890"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            id="dateOfBirth"
            label="Date of Birth"
            type="date"
            data-testid="field-dateOfBirth"
            value={formData.dateOfBirth}
            onChange={(e) => onChange('dateOfBirth', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Gender</InputLabel>
            <Select
              id="gender"
              value={formData.gender}
              onChange={(e) => onChange('gender', e.target.value)}
              label="Gender"
              inputProps={{ 'data-testid': 'field-gender' }}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Marital Status</InputLabel>
            <Select
              id="maritalStatus"
              value={formData.maritalStatus}
              onChange={(e) => onChange('maritalStatus', e.target.value)}
              label="Marital Status"
              inputProps={{ 'data-testid': 'field-maritalStatus' }}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="Single">Single</MenuItem>
              <MenuItem value="Married">Married</MenuItem>
              <MenuItem value="Divorced">Divorced</MenuItem>
              <MenuItem value="Widowed">Widowed</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            id="nationality"
            label="Nationality"
            data-testid="field-nationality"
            value={formData.nationality}
            onChange={(e) => onChange('nationality', e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
        </Grid>
      </Grid>
    </Box>

    {/* Address Information */}
    <Box>
      <Typography variant="h6" gutterBottom color="primary.main" fontWeight={700} sx={{ mb: 3 }}>
        Address Information
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            id="address"
            label="Address"
            data-testid="field-address"
            value={formData.address}
            onChange={(e) => onChange('address', e.target.value)}
            multiline
            rows={3}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            id="city"
            label="City"
            data-testid="field-city"
            value={formData.city}
            onChange={(e) => onChange('city', e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            id="state"
            label="State"
            data-testid="field-state"
            value={formData.state}
            onChange={(e) => onChange('state', e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            id="pinCode"
            label="PIN Code"
            data-testid="field-pinCode"
            value={formData.pinCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              onChange('pinCode', value);
            }}
            error={!!errors.pinCode}
            helperText={errors.pinCode || 'Format: 123456 (6 digits)'}
            placeholder="123456"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
        </Grid>
      </Grid>
    </Box>
  </Box>
  );
};

export default PersonalInformationTab;
