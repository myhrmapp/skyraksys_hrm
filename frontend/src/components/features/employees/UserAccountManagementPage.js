import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Card,
  CardContent,
  Grid,
  Divider,
  Chip,
  Avatar,
  Stack,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  VpnKey as VpnKeyIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AdminPanelSettings as AdminIcon,
  Security as SecurityIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotifications } from '../../../contexts/NotificationContext';
import { employeeService } from '../../../services/employee.service';
import { authService } from '../../../services/auth.service';
import UserAccountManager from './UserAccountManager';

const UserAccountManagementPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { showNotification } = useNotifications();

  // Generate a secure random password of given length
  const generateSecurePassword = (length = 14) => {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '@#$!%&';
    const all = upper + lower + digits + special;
    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);
    let password = [
      upper[randomValues[0] % upper.length],
      lower[randomValues[1] % lower.length],
      digits[randomValues[2] % digits.length],
      special[randomValues[3] % special.length]
    ];
    for (let i = 4; i < length; i++) {
      password.push(all[randomValues[i] % all.length]);
    }
    // Shuffle using Fisher-Yates with crypto random
    const shuffleValues = new Uint32Array(password.length);
    crypto.getRandomValues(shuffleValues);
    for (let i = password.length - 1; i > 0; i--) {
      const j = shuffleValues[i] % (i + 1);
      [password[i], password[j]] = [password[j], password[i]];
    }
    return password.join('');
  };
  
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, title: '', message: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // Check if user has permission to manage user accounts
  const canManageAccounts = user?.role === 'admin' || user?.role === 'hr';

  useEffect(() => {
    if (!canManageAccounts) {
      showNotification('You do not have permission to manage user accounts', 'error');
      navigate('/employees');
      return;
    }
    loadEmployee();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadEmployee = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await employeeService.getById(id);
      
      // Handle different response structures
      let employeeData;
      if (response.data?.data) {
        // Nested: { data: { data: employee } }
        employeeData = response.data.data;
      } else if (response.data) {
        // Single nest: { data: employee }
        employeeData = response.data;
      } else {
        // Direct: employee
        employeeData = response;
      }
      
      setEmployee(employeeData);
      
    } catch (err) {
      setError(err.message || 'Failed to load employee');
      showNotification('Failed to load employee', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Quick Action Handlers
  const handleQuickPasswordReset = () => {
    setConfirmDialog({
      open: true,
      action: 'resetPassword',
      title: 'Reset Password',
      message: 'Are you sure you want to reset this user\'s password? A secure temporary password will be generated. The user will be required to change it on next login.'
    });
  };

  const handleLockAccount = () => {
    const isLocked = employee.user?.isLocked;
    setConfirmDialog({
      open: true,
      action: 'lockAccount',
      title: isLocked ? 'Unlock Account' : 'Lock Account',
      message: isLocked 
        ? 'Are you sure you want to unlock this account? The user will be able to log in again.'
        : 'Are you sure you want to lock this account? The user will be immediately logged out and cannot access the system.'
    });
  };

  const handleSendWelcomeEmail = () => {
    setConfirmDialog({
      open: true,
      action: 'sendWelcome',
      title: 'Send Welcome Email',
      message: 'Send a welcome email with login credentials to this user?'
    });
  };

  const handleForceLogout = () => {
    setConfirmDialog({
      open: true,
      action: 'forceLogout',
      title: 'Force Logout',
      message: 'Are you sure you want to log out this user from all devices? All active sessions will be terminated immediately.'
    });
  };

  const handleConfirmAction = async () => {
    const { action } = confirmDialog;
    setActionLoading(true);
    
    try {
      const userId = employee.user?.id;
      if (!userId) {
        throw new Error('User ID not found');
      }

      switch (action) {
        case 'resetPassword':
          // Generate a temporary password and force password change
          const tempPassword = generateSecurePassword(14);
          await authService.resetUserPassword(userId, tempPassword);
          showNotification('Password reset successfully. User must change password on next login.', 'success');
          await loadEmployee();
          break;
          
        case 'lockAccount':
          // Toggle account lock status
          const newLockStatus = !employee.user?.isLocked;
          await authService.lockUserAccount(userId, newLockStatus);
          showNotification(`Account ${newLockStatus ? 'locked' : 'unlocked'} successfully`, 'success');
          await loadEmployee();
          break;
          
        case 'sendWelcome':
          // Send welcome email with credentials
          const welcomePassword = generateSecurePassword(14);
          await authService.resetUserPassword(userId, welcomePassword);
          const emailResult = await authService.sendWelcomeEmail(userId, true, welcomePassword);
          if (emailResult.success) {
            showNotification('Welcome email sent successfully', 'success');
          } else {
            showNotification(emailResult.message || 'Failed to send welcome email', 'warning');
          }
          break;
          
        case 'forceLogout':
          // Note: Session management requires backend implementation
          showNotification('Force logout feature requires backend session management', 'info');
          break;
          
        case 'terminateSession':
          // Note: Session management requires backend implementation
          showNotification('Session termination requires backend session management', 'info');
          break;
          
        default:
          break;
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      showNotification(`Failed to ${action}: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(false);
      setConfirmDialog({ open: false, action: null, title: '', message: '' });
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleUpdate = async (updatedData) => {
    try {
      if (hasUserAccount) {
        const userId = employee.user?.id || employee.userId;
        
        if (!userId) {
          throw new Error('User ID not found. Cannot update user account.');
        }
        
        await authService.updateUserAccount(userId, updatedData);
        showNotification('User account updated successfully', 'success');
      } else {
        await authService.createUserAccount(employee.id, updatedData);
        showNotification('User account created successfully', 'success');
      }
      
      // Reload employee data to get latest user account status
      await loadEmployee();
    } catch (error) {
      showNotification(
        error.response?.data?.message || 'Failed to save user account', 
        'error'
      );
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { label: 'Admin', color: 'error', icon: <AdminIcon fontSize="small" /> },
      hr: { label: 'HR', color: 'warning', icon: <SecurityIcon fontSize="small" /> },
      manager: { label: 'Manager', color: 'info', icon: <BadgeIcon fontSize="small" /> },
      employee: { label: 'Employee', color: 'default', icon: <PersonIcon fontSize="small" /> }
    };
    
    const config = roleConfig[role] || roleConfig.employee;
    
    return (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="small"
      />
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !employee) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Employee not found'}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/employees')}
        >
          Back to Employees
        </Button>
      </Box>
    );
  }

  const hasUserAccount = !!employee.user;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: 4 }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, sm: 3, md: 4 } }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link
            underline="hover"
            color="inherit"
            onClick={() => navigate('/employees')}
            sx={{ 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center',
              color: theme.palette.text.secondary,
              '&:hover': { color: theme.palette.primary.main },
              transition: 'color 0.2s ease'
            }}
          >
            <PersonIcon sx={{ mr: 0.5 }} fontSize="small" />
            Employees
          </Link>
          <Link
            underline="hover"
            color="inherit"
            onClick={() => navigate(`/employees/${id}`)}
            sx={{ 
              cursor: 'pointer',
              color: theme.palette.text.secondary,
              '&:hover': { color: theme.palette.primary.main },
              transition: 'color 0.2s ease'
            }}
          >
            {employee.firstName} {employee.lastName}
          </Link>
          <Typography 
            color="text.primary" 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              color: theme.palette.text.primary,
              fontWeight: 500
            }}
          >
            <VpnKeyIcon sx={{ mr: 0.5 }} fontSize="small" />
            User Account
          </Typography>
        </Breadcrumbs>

        {/* Modern Header Card */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            mb: 4,
            background: 'linear-gradient(to bottom, #ffffff, #f8fafc)',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar 
                  sx={{ 
                    width: 56, 
                    height: 56, 
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main
                  }}
                >
                  <VpnKeyIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Box>
                  <Typography 
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      mb: 0.5,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      fontSize: { xs: '1.5rem', md: '2rem' }
                    }}
                  >
                    User Account Management
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage login credentials and system access for {employee.firstName} {employee.lastName}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/employees')}
                sx={{
                  borderColor: theme.palette.divider,
                  color: theme.palette.text.secondary,
                  '&:hover': {
                    borderColor: alpha(theme.palette.text.secondary, 0.5),
                    bgcolor: alpha(theme.palette.text.secondary, 0.05)
                  }
                }}
              >
                Back to List
              </Button>
            </Box>
          </Box>
        </Card>

        <Grid container spacing={3}>
          {/* Employee Information Card */}
          <Grid item xs={12} md={5}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                height: '100%'
              }}
            >
              <CardContent>
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    fontWeight: 600,
                    color: theme.palette.text.primary
                  }}
                >
                  <PersonIcon sx={{ color: theme.palette.primary.main }} />
                  Employee Information
                </Typography>
                <Divider sx={{ my: 2 }} />
                
                <Stack spacing={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar 
                      sx={{ 
                        width: 60, 
                        height: 60,
                        border: `3px solid ${theme.palette.divider}`,
                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`
                      }}
                    >
                      {employee.firstName?.[0]}{employee.lastName?.[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                        {employee.firstName} {employee.lastName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ID: {employee.employeeId}
                      </Typography>
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
                      Email
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <EmailIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
                      <Typography variant="body1">{employee.email}</Typography>
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
                      Department
                    </Typography>
                    <Typography variant="body1">
                      {employee.department?.name || employee.departmentName || employee.Department?.name || 'N/A'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
                      Position
                    </Typography>
                    <Typography variant="body1">
                      {employee.position?.title || employee.position?.name || employee.positionName || employee.Position?.name || 'N/A'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
                      Status
                    </Typography>
                    <Chip
                      label={(employee.status || 'Active').toUpperCase()}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        bgcolor: employee.status?.toLowerCase() === 'active' 
                          ? alpha(theme.palette.success.main, 0.1)
                          : alpha(theme.palette.text.secondary, 0.1),
                        color: employee.status?.toLowerCase() === 'active' ? theme.palette.success.main : theme.palette.text.secondary,
                        border: '1px solid',
                        borderColor: employee.status?.toLowerCase() === 'active' 
                          ? 'rgba(16, 185, 129, 0.3)' 
                          : 'rgba(148, 163, 184, 0.3)'
                      }}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* User Account Status Card */}
          <Grid item xs={12} md={7}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                height: '100%'
              }}
            >
              <CardContent>
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    fontWeight: 600,
                    color: theme.palette.text.primary
                  }}
                >
                  <VpnKeyIcon sx={{ color: theme.palette.primary.main }} />
                  User Account Status
                </Typography>
                <Divider sx={{ my: 2 }} />

                {hasUserAccount ? (
                  <Stack spacing={3}>
                    <Alert 
                      severity="success" 
                      icon={<CheckCircleIcon />}
                      sx={{
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
                      }}
                    >
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                        Active User Account
                      </Typography>
                      <Typography variant="body2">
                        This employee has an active user account and can log into the system.
                      </Typography>
                    </Alert>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box 
                        sx={{ 
                          p: 2, 
                          bgcolor: alpha(theme.palette.primary.main, 0.05),
                          borderRadius: 2,
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
                          Login Email
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {employee.user.email || employee.email}
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Box 
                        sx={{ 
                          p: 2, 
                          bgcolor: 'rgba(99, 102, 241, 0.05)',
                          borderRadius: 2,
                          border: '1px solid rgba(99, 102, 241, 0.1)'
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
                          User Role
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          {getRoleBadge(employee.user.role)}
                        </Box>
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Box 
                        sx={{ 
                          p: 2, 
                          bgcolor: 'rgba(99, 102, 241, 0.05)',
                          borderRadius: 2,
                          border: '1px solid rgba(99, 102, 241, 0.1)'
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
                          Account Status
                        </Typography>
                        <Chip
                          label={employee.user.isActive ? 'Active' : 'Inactive'}
                          size="small"
                          sx={{
                            mt: 0.5,
                            fontWeight: 600,
                            bgcolor: employee.user.isActive 
                              ? alpha(theme.palette.success.main, 0.1)
                              : alpha(theme.palette.text.secondary, 0.1),
                            color: employee.user.isActive ? theme.palette.success.main : theme.palette.text.secondary,
                            border: '1px solid',
                            borderColor: employee.user.isActive 
                              ? alpha(theme.palette.success.main, 0.3)
                              : alpha(theme.palette.text.secondary, 0.3)
                          }}
                        />
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Box 
                        sx={{ 
                          p: 2, 
                          bgcolor: alpha(theme.palette.primary.main, 0.05),
                          borderRadius: 2,
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
                          Password Status
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {employee.user.forcePasswordChange ? (
                            <Chip 
                              label="Must Change" 
                              size="small"
                              sx={{
                                fontWeight: 600,
                                bgcolor: alpha(theme.palette.warning.main, 0.1),
                                color: theme.palette.warning.main,
                                border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`
                              }}
                            />
                          ) : (
                            <Chip 
                              label="Set" 
                              size="small"
                              sx={{
                                fontWeight: 600,
                                bgcolor: alpha(theme.palette.success.main, 0.1),
                                color: theme.palette.success.main,
                                border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`
                              }}
                            />
                          )}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Box sx={{ pt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: '#1e293b' }}>
                      Role Permissions
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {employee.user.role === 'admin' && '✓ Full system access and administrative privileges'}
                      {employee.user.role === 'hr' && '✓ Can manage all employees and HR processes'}
                      {employee.user.role === 'manager' && '✓ Can manage team members and approve requests'}
                      {employee.user.role === 'employee' && '✓ Basic access to personal information and requests'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<VpnKeyIcon />}
                      onClick={handleOpenDialog}
                      fullWidth
                      sx={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: 'white',
                        fontWeight: 600,
                        '&:hover': {
                          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)'
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Manage User Account
                    </Button>
                  </Box>
                </Stack>
              ) : (
                <Stack spacing={3}>
                  <Alert 
                    severity="warning" 
                    icon={<CancelIcon />}
                    sx={{
                      borderRadius: 2,
                      border: '1px solid rgba(245, 158, 11, 0.2)'
                    }}
                  >
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      No User Account
                    </Typography>
                    <Typography variant="body2">
                      This employee does not have a user account and cannot log into the system.
                    </Typography>
                  </Alert>

                  <Box 
                    sx={{ 
                      p: 4, 
                      textAlign: 'center', 
                      bgcolor: 'rgba(99, 102, 241, 0.02)',
                      borderRadius: 3,
                      border: '2px dashed',
                      borderColor: 'rgba(99, 102, 241, 0.2)'
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 80,
                        height: 80,
                        mx: 'auto',
                        mb: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main
                      }}
                    >
                      <VpnKeyIcon sx={{ fontSize: 40 }} />
                    </Avatar>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                      Create User Account
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Enable system access for this employee by creating a user account.
                      You can set their role, login credentials, and access permissions.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<VpnKeyIcon />}
                      onClick={handleOpenDialog}
                      size="large"
                      sx={{
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        color: 'white',
                        fontWeight: 600,
                        px: 4,
                        '&:hover': {
                          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.9)} 0%, ${alpha(theme.palette.secondary.main, 0.9)} 100%)`,
                          transform: 'translateY(-2px)',
                          boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}`
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Create User Account
                    </Button>
                  </Box>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Security & Access Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon />
                Security & Access Information
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {hasUserAccount ? '1' : '0'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Account
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color={hasUserAccount ? 'success.main' : 'text.secondary'}>
                      {hasUserAccount ? '✓' : '✗'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Can Login
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {employee.user?.role?.toUpperCase() || 'NONE'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      User Role
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color={employee.user?.isActive ? 'success.main' : 'text.secondary'}>
                      {employee.user?.isActive ? 'ON' : 'OFF'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Access Status
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Note:</strong> User account changes take effect immediately. 
                    If you disable an account, the user will be logged out and cannot access the system until re-enabled.
                  </Typography>
                </Alert>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions Panel */}
        {hasUserAccount && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  ⚡ Quick Actions
                </Typography>
                <Divider sx={{ my: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Tooltip title="Reset password and require change on next login">
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={handleQuickPasswordReset}
                        disabled={actionLoading}
                        data-testid="user-acct-reset-password-btn"
                      >
                        Reset Password
                      </Button>
                    </Tooltip>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Tooltip title={employee.user?.isLocked ? "Unlock this account" : "Lock this account"}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color={employee.user?.isLocked ? "success" : "warning"}
                        startIcon={employee.user?.isLocked ? <LockOpenIcon /> : <LockIcon />}
                        onClick={handleLockAccount}
                        disabled={actionLoading}
                        data-testid="user-acct-lock-btn"
                      >
                        {employee.user?.isLocked ? 'Unlock' : 'Lock'} Account
                      </Button>
                    </Tooltip>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Tooltip title="Send welcome email with credentials">
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<SendIcon />}
                        onClick={handleSendWelcomeEmail}
                        disabled={actionLoading}
                        data-testid="user-acct-welcome-email-btn"
                      >
                        Send Welcome Email
                      </Button>
                    </Tooltip>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Tooltip title="Logout user from all devices">
                      <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        startIcon={<LogoutIcon />}
                        onClick={handleForceLogout}
                        disabled={actionLoading}
                        data-testid="user-acct-force-logout-btn"
                      >
                        Force Logout
                      </Button>
                    </Tooltip>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* User Account Manager Dialog */}
      <UserAccountManager
        open={openDialog}
        onClose={handleCloseDialog}
        employee={employee}
        onUpdate={handleUpdate}
        mode={hasUserAccount ? 'edit' : 'create'}
      />

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, action: null, title: '', message: '' })}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmDialog.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDialog({ open: false, action: null, title: '', message: '' })}
            disabled={actionLoading}
            sx={{
              color: theme.palette.text.secondary,
              '&:hover': {
                bgcolor: alpha(theme.palette.text.secondary, 0.05)
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmAction} 
            variant="contained"
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={20} /> : null}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              color: 'white',
              fontWeight: 600,
              '&:hover': {
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.9)} 0%, ${alpha(theme.palette.secondary.main, 0.9)} 100%)`
              },
              '&:disabled': {
                bgcolor: theme.palette.action.disabledBackground,
                color: theme.palette.action.disabled
              }
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </Box>
  );
};

export default UserAccountManagementPage;
