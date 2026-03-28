import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  RadioGroup,
  Radio,
  TextField,
  Switch,
  Box,
  Typography,
  Alert,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Person as PersonIcon,
  VpnKey as KeyIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { useNotifications } from '../../../contexts/NotificationContext';
import { authService } from '../../../services/auth.service';

// Generate a secure random password
const generateSecureDefaultPassword = () => {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '@#$!%&';
  const all = upper + lower + digits + special;
  // Ensure at least one of each type
  let password = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)]
  ];
  for (let i = 4; i < 12; i++) {
    password.push(all[Math.floor(Math.random() * all.length)]);
  }
  // Shuffle
  return password.sort(() => Math.random() - 0.5).join('');
};

const UserAccountManager = ({ 
  open, 
  onClose, 
  employee, 
  onUpdate, 
  mode = 'create' // 'create' or 'edit'
}) => {
  const { showNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [userData, setUserData] = useState({
    enableLogin: false,
    role: 'employee',
    email: '',
    password: '',
    confirmPassword: '',
    forcePasswordChange: true
  });

  useEffect(() => {
    if (employee) {
      const employeeEmail = employee.email || '';
      
      setUserData({
        enableLogin: !!employee.user,
        role: employee.user?.role || 'employee',
        email: employeeEmail,
        password: '',
        confirmPassword: '',
        forcePasswordChange: employee.user ? false : true
      });
    }
  }, [employee, mode]);

  const handleRoleChange = (event) => {
    setUserData(prev => ({
      ...prev,
      role: event.target.value
    }));
  };

  const handleEnableLoginChange = (event) => {
    const isEnabled = event.target.checked;
    const employeeEmail = employee?.email || '';
    
    setUserData(prev => {
      const generatedPassword = isEnabled && !employee?.user ? generateSecureDefaultPassword() : null;
      const newState = {
        ...prev,
        enableLogin: isEnabled,
        // Always ensure email is set from employee when enabling login
        email: isEnabled ? (prev.email || employeeEmail) : prev.email,
        // Generate a secure default password when enabling login for the first time
        password: generatedPassword || prev.password,
        confirmPassword: generatedPassword || prev.confirmPassword
      };
      
      return newState;
    });
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setUserData(prev => ({ ...prev, password, confirmPassword: password }));
    showNotification('New password generated', 'success');
  };

  const handleResetPassword = async () => {
    if (!employee?.user) return;
    
    try {
      setLoading(true);
      const newPassword = generateSecureDefaultPassword();
      
      await authService.resetUserPassword(employee.user.id, newPassword);
      setUserData(prev => ({ 
        ...prev, 
        password: newPassword, 
        confirmPassword: newPassword,
        forcePasswordChange: true 
      }));
      
      showNotification('Password reset successfully', 'success');
    } catch (error) {
      showNotification('Failed to reset password: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (userData.enableLogin) {
      // Validate email
      if (!userData.email || userData.email.trim() === '') {
        showNotification('Email is required for user login', 'error');
        return;
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
      }
      // Validate passwords
      if (userData.password !== userData.confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
      }
      if (userData.password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
      }
    }

    try {
      setLoading(true);
      
      const updateData = {
        role: userData.role,
        enableLogin: userData.enableLogin,
        email: userData.email
      };

      if (userData.enableLogin && userData.password) {
        updateData.password = userData.password;
        updateData.forcePasswordChange = userData.forcePasswordChange;
      }

      if (mode === 'create') {
        onUpdate(updateData);
      } else {
        const userId = employee.user?.id || employee.id;
        // Update account details (email and role)
        await authService.updateUserAccount(userId, { email: updateData.email, role: updateData.role });
        // If password is provided, update it via the dedicated password reset endpoint
        if (updateData.password) {
          await authService.resetUserPassword(userId, updateData.password);
        }
        showNotification('User account updated successfully', 'success');
        onUpdate(updateData);
      }
      
      onClose();
    } catch (error) {
      showNotification('Failed to update user account: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <PersonIcon />
          <Typography variant="h6">
            {mode === 'create' ? 'Setup User Account' : 'Manage User Account'}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Employee Information Card */}
          <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
            <CardContent>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                👤 Employee Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">ID</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {employee?.employeeId || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Name</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {employee?.firstName} {employee?.lastName}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {employee?.email || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Department</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {employee?.department?.name || employee?.departmentName || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Position</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {employee?.position?.name || employee?.positionName || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Chip 
                    label={employee?.status || 'N/A'} 
                    size="small"
                    color={employee?.status === 'Active' ? 'success' : 'default'}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Hire Date</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {employee?.hireDate ? new Date(employee.hireDate).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Info Alert for Create Mode */}
          {mode === 'create' && !employee?.user && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Quick Setup Guide
              </Typography>
              <Typography variant="body2">
                1. Toggle "Enable User Login" to ON<br />
                2. Employee email ({employee?.email}) will be used automatically<br />
                3. Default password "password123" will be set<br />
                4. User will change password on first login
              </Typography>
            </Alert>
          )}

          {/* Enable Login Toggle */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={userData.enableLogin}
                    onChange={handleEnableLoginChange}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle1">Enable User Login</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Allow this employee to log into the system
                    </Typography>
                  </Box>
                }
              />
            </CardContent>
          </Card>

          {userData.enableLogin && (
            <>
              {/* Role Selection */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">
                      <Typography variant="subtitle1">User Role</Typography>
                    </FormLabel>
                    <RadioGroup
                      value={userData.role}
                      onChange={handleRoleChange}
                      row
                    >
                      <FormControlLabel 
                        value="employee" 
                        control={<Radio />} 
                        label="Employee" 
                      />
                      <FormControlLabel 
                        value="manager" 
                        control={<Radio />} 
                        label="Manager" 
                      />
                      <FormControlLabel 
                        value="hr" 
                        control={<Radio />} 
                        label="HR" 
                      />
                      <FormControlLabel 
                        value="admin" 
                        control={<Radio />} 
                        label="Admin" 
                      />
                    </RadioGroup>
                  </FormControl>
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {userData.role === 'employee' && 'Basic access to personal information and requests'}
                      {userData.role === 'manager' && 'Can manage team members and approve requests'}
                      {userData.role === 'hr' && 'Can manage all employees and HR processes'}
                      {userData.role === 'admin' && 'Full system access and administrative privileges'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              {/* Email */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <TextField
                    fullWidth
                    label="Login Email"
                    type="email"
                    value={userData.email}
                    onChange={(e) => setUserData(prev => ({ ...prev, email: e.target.value }))}
                    helperText={userData.email ? "This email will be used for login" : "Employee email will be used automatically"}
                    required
                    placeholder={employee?.email || "Enter email address"}
                  />
                  {userData.email && (
                    <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                      ✓ Email automatically populated from employee record
                    </Typography>
                  )}
                </CardContent>
              </Card>

              {/* Password Section */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="subtitle1">Password Management</Typography>
                    <Box>
                      <Tooltip title="Generate Random Password">
                        <IconButton onClick={generateRandomPassword} size="small" aria-label="Generate random password">
                          <RefreshIcon />
                        </IconButton>
                      </Tooltip>
                      {employee?.user && (
                        <Tooltip title="Reset to Default Password">
                          <IconButton onClick={handleResetPassword} size="small" disabled={loading} aria-label="Reset to default password">
                            <KeyIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        value={userData.password}
                        onChange={(e) => setUserData(prev => ({ ...prev, password: e.target.value }))}
                        InputProps={{
                          endAdornment: (
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          )
                        }}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Confirm Password"
                        type={showPassword ? 'text' : 'password'}
                        value={userData.confirmPassword}
                        onChange={(e) => setUserData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        error={userData.password !== userData.confirmPassword && userData.confirmPassword !== ''}
                        helperText={
                          userData.password !== userData.confirmPassword && userData.confirmPassword !== ''
                            ? 'Passwords do not match'
                            : ''
                        }
                        required
                      />
                    </Grid>
                  </Grid>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={userData.forcePasswordChange}
                        onChange={(e) => setUserData(prev => ({ ...prev, forcePasswordChange: e.target.checked }))}
                      />
                    }
                    label="Force password change on first login"
                    sx={{ mt: 2 }}
                  />
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Quick Setup Options:</Typography>
                <Typography variant="body2">
                  • Default password: "password123" (user must change on first login)
                  • Generate random password for immediate use
                  • Reset existing user password to default
                </Typography>
              </Alert>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <KeyIcon />}
        >
          {mode === 'create' ? 'Setup Account' : 'Update Account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserAccountManager;
