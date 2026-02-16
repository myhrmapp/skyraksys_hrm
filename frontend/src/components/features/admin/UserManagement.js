import React, { useState, useRef, useEffect } from 'react';
import { useLoading } from '../../../contexts/LoadingContext';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Divider,
  InputAdornment,
  IconButton,
  Fade,
  alpha,
  useTheme
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  PersonAdd as PersonAddIcon,
  Business as BusinessIcon,
  Lightbulb as LightbulbIcon
} from '@mui/icons-material';
import { authService } from '../../../services/auth.service';

const UserManagement = ({ embedded } = {}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const navTimerRef = useRef(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'employee'
  });
  
  // Loading state managed by LoadingContext
  const { isLoading: isLoadingFn, setLoading } = useLoading();
  const isLoading = isLoadingFn('user-management');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const roles = [
    { value: 'employee', label: 'Employee', description: 'Basic user access' },
    { value: 'manager', label: 'Manager', description: 'Team management and approval permissions' },
    { value: 'hr', label: 'HR Manager', description: 'Human resources management' },
    { value: 'admin', label: 'Administrator', description: 'Full system access' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user types
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError('All fields are required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    // Backend requires complexity: uppercase, lowercase, digit, special char
    const complexityRegex = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
    if (!complexityRegex.test(formData.password)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const result = await authService.register({
        email: formData.email,
        password: formData.password,
        role: formData.role
      });

      if (result.success) {
        setSuccess('User created successfully!');
        // Navigate after brief delay to show success message
        navTimerRef.current = setTimeout(() => navigate('/employees'), 2000);
      } else {
        setError(result.message || 'Failed to create user');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('User creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      role: 'employee'
    });
    setError('');
    setSuccess('');
  };

  const Wrapper = embedded ? React.Fragment : Container;
  const wrapperProps = embedded ? {} : { maxWidth: 'md', sx: { py: 4 } };

  return (
    <Wrapper {...wrapperProps}>
      <Fade in timeout={600}>
        <Box>
          {/* Header */}
          {!embedded && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: 3
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PersonAddIcon sx={{ fontSize: 40, mr: 2 }} />
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  Add New User
                </Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                  Create a new user account for the HRM system
                </Typography>
              </Box>
            </Box>
            
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/employees')}
              sx={{
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.5)'
                }
              }}
            >
              Back to Employees
            </Button>
          </Paper>
          )}

          {/* Main Form */}
          <Card elevation={3} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                  {success}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  {/* Email Field */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                      }}
                    />
                  </Grid>

                  {/* Role Selection */}
                  <Grid item xs={12}>
                    <FormControl fullWidth required>
                      <InputLabel>User Role</InputLabel>
                      <Select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        label="User Role"
                        startAdornment={
                          <InputAdornment position="start">
                            <BusinessIcon color="action" />
                          </InputAdornment>
                        }
                        sx={{
                          borderRadius: 2,
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                        }}
                      >
                        {roles.map((role) => (
                          <MenuItem key={role.value} value={role.value}>
                            <Box>
                              <Typography variant="body1" fontWeight="medium">
                                {role.label}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {role.description}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Password Setup
                      </Typography>
                    </Divider>
                  </Grid>

                  {/* Password Field */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
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
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                      }}
                    />
                  </Grid>

                  {/* Confirm Password Field */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Confirm Password"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleChange}
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
                            >
                              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                      }}
                    />
                  </Grid>

                  {/* Password Requirements */}
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LightbulbIcon fontSize="small" /> <strong>Password Requirements:</strong> Minimum 8 characters, including uppercase, lowercase, number, and special character (@$!%*?&)
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Action Buttons */}
                <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={handleReset}
                    disabled={isLoading}
                    sx={{
                      px: 3,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 'medium'
                    }}
                  >
                    Reset Form
                  </Button>

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isLoading}
                    startIcon={isLoading ? null : <SaveIcon />}
                    sx={{
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 'bold',
                      background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                      boxShadow: '0 4px 20px rgba(33, 150, 243, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
                        boxShadow: '0 6px 25px rgba(33, 150, 243, 0.4)',
                        transform: 'translateY(-1px)',
                      },
                      '&:disabled': {
                        background: 'rgba(0, 0, 0, 0.12)',
                        boxShadow: 'none',
                        transform: 'none',
                      },
                    }}
                  >
                    {isLoading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Create User'
                    )}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Fade>
    </Wrapper>
  );
};

export default UserManagement;
