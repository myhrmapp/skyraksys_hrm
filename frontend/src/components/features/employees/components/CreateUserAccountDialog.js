import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Stack,
  alpha,
  useTheme
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Lightbulb as LightbulbIcon
} from '@mui/icons-material';
import Alert from '@mui/material/Alert';

const CreateUserAccountDialog = ({
  open,
  onClose,
  onSubmit,
  employee,
  data,
  onChange,
  loading
}) => {
  const theme = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleValidatedSubmit = () => {
    setValidationError('');
    if (!data.password || data.password.length < 8) {
      setValidationError('Password must be at least 8 characters.');
      return;
    }
    const complexityRegex = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
    if (!complexityRegex.test(data.password)) {
      setValidationError('Password must contain uppercase, lowercase, number, and special character (@$!%*?&).');
      return;
    }
    if (data.password !== data.confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }
    onSubmit();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAddIcon sx={{ color: 'success.main' }} />
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Create User Account
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Enable login access for {employee?.firstName} {employee?.lastName}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ mt: 3 }}>
        <Stack spacing={3}>
          {/* Email Field */}
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={data.email}
            onChange={(e) => onChange('email', e.target.value)}
            required
            data-testid="create-user-email"
            InputLabelProps={{ shrink: true }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon color="action" />
                </InputAdornment>
              ),
            }}
            helperText="This email will be used for login"
          />

          {/* Role Selection */}
          <FormControl fullWidth required>
            <InputLabel>User Role</InputLabel>
            <Select
              value={data.role}
              onChange={(e) => onChange('role', e.target.value)}
              label="User Role"
              inputProps={{ 'data-testid': 'create-user-role' }}
              startAdornment={
                <InputAdornment position="start">
                  <BusinessIcon color="action" />
                </InputAdornment>
              }
            >
              <MenuItem value="employee">
                <Box>
                  <Typography variant="body2" fontWeight="medium">Employee</Typography>
                  <Typography variant="caption" color="text.secondary">Basic user access</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="manager">
                <Box>
                  <Typography variant="body2" fontWeight="medium">Manager</Typography>
                  <Typography variant="caption" color="text.secondary">Team management permissions</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="hr">
                <Box>
                  <Typography variant="body2" fontWeight="medium">HR Manager</Typography>
                  <Typography variant="caption" color="text.secondary">HR management access</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="admin">
                <Box>
                  <Typography variant="body2" fontWeight="medium">Administrator</Typography>
                  <Typography variant="caption" color="text.secondary">Full system access</Typography>
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          <Divider>
            <Typography variant="caption" color="text.secondary">
              Password Setup
            </Typography>
          </Divider>

          {/* Password Field */}
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={data.password}
            onChange={(e) => onChange('password', e.target.value)}
            required
            data-testid="create-user-password"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            helperText="Min 8 chars, uppercase, lowercase, number, special char (@$!%*?&)"
            error={!!validationError && validationError.toLowerCase().includes('password') && !validationError.toLowerCase().includes('match')}
          />

          {/* Confirm Password Field */}
          <TextField
            fullWidth
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={data.confirmPassword}
            onChange={(e) => onChange('confirmPassword', e.target.value)}
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    size="small"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {validationError && (
            <Alert severity="error">{validationError}</Alert>
          )}

          <Box 
            sx={{ 
              p: 2, 
              bgcolor: alpha(theme.palette.info.main, 0.1), 
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LightbulbIcon fontSize="small" /> <strong>Note:</strong> The user will be able to login immediately with these credentials. 
              Make sure to securely share the password with the employee.
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={loading}
          data-testid="create-user-cancel-btn"
          sx={{ textTransform: 'none', fontWeight: 500 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleValidatedSubmit}
          variant="outlined"
          color="success"
          disabled={loading}
          startIcon={loading ? null : <PersonAddIcon />}
          data-testid="create-user-submit-btn"
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {loading ? 'Creating Account...' : 'Create User Account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateUserAccountDialog;
