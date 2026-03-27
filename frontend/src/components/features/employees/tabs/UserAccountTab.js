import React from 'react';
import {
  Grid,
  Typography,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  FormControlLabel,
  Switch,
  Alert,
  Box,
  Checkbox
} from '@mui/material';

const UserAccountTab = ({ formData, errors, touchedFields = {}, onChange, onBlur }) => {
  const userAccount = formData.userAccount || {
    enableLogin: false,
    role: 'employee',
    password: '',
    confirmPassword: '',
    forcePasswordChange: true
  };

  const handleSwitchChange = (e) => {
    onChange('userAccount.enableLogin', e.target.checked);
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          User Account Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Configure system access and permissions for this employee
        </Typography>
        <Divider sx={{ mb: 3 }} />
      </Grid>
      
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={userAccount.enableLogin}
              onChange={handleSwitchChange}
              name="enableLogin"
              color="primary"
              data-testid="user-enable-login-switch"
              inputProps={{ 'data-testid': 'user-enable-login-input' }}
            />
          }
          label={
            <Box>
              <Typography variant="subtitle1">Enable User Login</Typography>
              <Typography variant="caption" color="text.secondary">
                Allow this employee to log in to the system using their email address
              </Typography>
            </Box>
          }
        />
      </Grid>

      {userAccount.enableLogin && (
        <>
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 2 }}>
              The employee will use their email address (<strong>{formData.email || 'not provided'}</strong>) to log in.
            </Alert>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors['userAccount.role']} required>
              <InputLabel id="role-label">System Role (Required)</InputLabel>
              <Select
                labelId="role-label"
                id="role"
                name="role"
                value={userAccount.role}
                label="System Role (Required)"
                onChange={(e) => onChange('userAccount.role', e.target.value)}
                onBlur={() => onBlur && onBlur('userAccount.role')}
                inputProps={{ 'data-testid': 'user-role-select' }}
              >
                <MenuItem value="employee">Employee (Standard Access)</MenuItem>
                <MenuItem value="manager">Manager (Team Access)</MenuItem>
                <MenuItem value="hr">HR (Human Resources)</MenuItem>
                <MenuItem value="admin">System Admin (Full System Access)</MenuItem>
              </Select>
              {errors['userAccount.role'] && (
                <FormHelperText>{errors['userAccount.role']}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={userAccount.forcePasswordChange}
                  onChange={(e) => onChange('userAccount.forcePasswordChange', e.target.checked)}
                  name="forcePasswordChange"
                  color="primary"
                />
              }
              label="Require password change on first login"
              sx={{ mt: 1 }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="password"
              name="password"
              label="Password"
              type="password"
              value={userAccount.password}
              onChange={(e) => onChange('userAccount.password', e.target.value)}
              onBlur={() => onBlur && onBlur('userAccount.password')}
              error={!!errors['userAccount.password']}
              helperText={errors['userAccount.password'] || 'Minimum 8 characters (uppercase, lowercase, number, special character)'}
              required={!formData.id} // Required for new users if login enabled
              inputProps={{ 'data-testid': 'user-password-input' }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              value={userAccount.confirmPassword}
              onChange={(e) => onChange('userAccount.confirmPassword', e.target.value)}
              onBlur={() => onBlur && onBlur('userAccount.confirmPassword')}
              error={!!errors['userAccount.confirmPassword']}
              helperText={errors['userAccount.confirmPassword']}
              required={!formData.id}
              inputProps={{ 'data-testid': 'user-confirm-password-input' }}
            />
          </Grid>
        </>
      )}
    </Grid>
  );
};

export default UserAccountTab;
