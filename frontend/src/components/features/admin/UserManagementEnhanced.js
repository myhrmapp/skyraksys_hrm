import React, { useState, useEffect } from 'react';
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
  useTheme,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Save as SaveIcon,
  PersonAdd as PersonAddIcon,
  Business as BusinessIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  VpnKey as VpnKeyIcon,
  ToggleOff as DeactivateIcon,
  ToggleOn as ActivateIcon,
  Refresh as RefreshIcon,
  People as PeopleIcon,
  MoreVert as MoreVertIcon,
  LockOpen as LockOpenIcon,
  Send as SendIcon,
  Lightbulb as LightbulbIcon
} from '@mui/icons-material';
import Menu from '@mui/material/Menu';
import Checkbox from '@mui/material/Checkbox';
import { authService } from '../../../services/auth.service';
import { useAuth } from '../../../contexts/AuthContext';
import ConfirmDialog from '../../common/ConfirmDialog';
import useConfirmDialog from '../../../hooks/useConfirmDialog';

const UserManagementEnhanced = () => {
  const theme = useTheme();
  const { user: currentUser } = useAuth();
  const { dialogProps, confirm } = useConfirmDialog();
  
  // Tab state
  const [activeTab, setActiveTab] = useState(0);
  
  // Create user form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'employee'
  });
  
  // Users list state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [userToReset, setUserToReset] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  
  // Quick actions menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Bulk selection state
  const [selectedUsers, setSelectedUsers] = useState([]);

  const roles = [
    { value: 'employee', label: 'Employee', description: 'Basic user access', color: 'default' },
    { value: 'manager', label: 'Manager', description: 'Team management', color: 'info' },
    { value: 'hr', label: 'HR Manager', description: 'HR management', color: 'warning' },
    { value: 'admin', label: 'Administrator', description: 'Full access', color: 'error' }
  ];

  useEffect(() => {
    if (activeTab === 1) {
      loadUsers();
    }
  }, [activeTab, page, rowsPerPage, searchQuery, filterRole, filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...(searchQuery && { search: searchQuery }),
        ...(filterRole && { role: filterRole }),
        ...(filterStatus && { status: filterStatus })
      };
      
      const response = await authService.getAllUsers(params);
      
      if (response.success) {
        setUsers(response.data.users || []);
        setTotalUsers(response.data.pagination?.total || 0);
      } else {
        setError(response.message || 'Failed to load users');
      }
    } catch (err) {
      setError('Failed to load users');
      console.error('Load users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

    // Enforce complexity: uppercase, lowercase, digit, special character
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(formData.password)) {
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
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role
      });

      if (result.success) {
        setSuccess('User created successfully!');
        handleReset();
        // Switch to users list tab
        const timer = setTimeout(() => {
          setActiveTab(1);
          loadUsers();
        }, 1500);
        // Cleanup timer on component lifecycle
        return () => clearTimeout(timer);
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
      firstName: '',
      lastName: '',
      role: 'employee'
    });
    setError('');
    setSuccess('');
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    // Prevent self-deactivation
    if (userId === currentUser?.id && currentStatus === true) {
      setError('You cannot deactivate your own account');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await authService.toggleUserStatus(userId, !currentStatus);
      
      if (result.success) {
        setSuccess(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
        loadUsers();
      } else {
        setError(result.message || 'Failed to update user status');
      }
    } catch (err) {
      console.error('Toggle status error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update user status');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleRoleChange = async (userId, newRole) => {
    setLoading(true);
    setError('');
    
    try {
      const result = await authService.updateUserRole(userId, newRole);
      
      if (result.success) {
        setSuccess('User role updated successfully!');
        loadUsers();
      } else {
        setError(result.message || 'Failed to update user role');
      }
    } catch (err) {
      setError('Failed to update user role');
      console.error('Role change error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await authService.deleteUser(userToDelete.id);
      
      if (result.success) {
        setSuccess('User terminated successfully (account deactivated)');
        setDeleteDialogOpen(false);
        setUserToDelete(null);
        loadUsers();
      } else {
        setError(result.message || 'Failed to terminate user');
      }
    } catch (err) {
      setError('Failed to terminate user');
      console.error('Terminate user error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordClick = (user) => {
    setUserToReset(user);
    setNewPassword('');
    setResetPasswordDialogOpen(true);
  };

  const handleResetPasswordConfirm = async () => {
    if (!userToReset || !newPassword) {
      setError('Password is required');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(newPassword)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await authService.resetUserPassword(userToReset.id, newPassword);
      
      if (result.success) {
        setSuccess('Password reset successfully!');
        setResetPasswordDialogOpen(false);
        setUserToReset(null);
        setNewPassword('');
      } else {
        setError(result.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role) => {
    const roleObj = roles.find(r => r.value === role);
    return roleObj?.color || 'default';
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterRole('');
    setFilterStatus('');
    setPage(0);
  };
  
  // Quick Actions Menu Handlers
  const handleQuickActionsClick = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleQuickActionsClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const handleQuickAction = (action) => {
    handleQuickActionsClose();
    
    switch(action) {
      case 'reset-password':
        handleResetPasswordClick(selectedUser);
        break;
      case 'toggle-status':
        handleToggleStatus(selectedUser.id, selectedUser.isActive);
        break;
      case 'lock-account':
        handleLockAccount(selectedUser);
        break;
      case 'send-email':
        handleSendEmail(selectedUser);
        break;
      case 'delete':
        handleDeleteClick(selectedUser);
        break;
      case 'view-details':
        // Navigate to user details
        break;
      default:
        break;
    }
  };
  
  // Bulk Actions Handlers
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const selectableUsers = users.filter(u => u.id !== currentUser?.id);
      setSelectedUsers(selectableUsers.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleBulkActivate = async () => {
    if (selectedUsers.length === 0) return;
    
    setLoading(true);
    try {
      for (const userId of selectedUsers) {
        const user = users.find(u => u.id === userId);
        if (user && !user.isActive) {
          await authService.toggleUserStatus(userId, true);
        }
      }
      setSuccess(`${selectedUsers.length} user(s) activated successfully`);
      setSelectedUsers([]);
      loadUsers();
    } catch (err) {
      setError('Failed to activate users');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedUsers.length === 0) return;
    
    setLoading(true);
    try {
      for (const userId of selectedUsers) {
        const user = users.find(u => u.id === userId);
        if (user && user.isActive) {
          await authService.toggleUserStatus(userId, false);
        }
      }
      setSuccess(`${selectedUsers.length} user(s) deactivated successfully`);
      setSelectedUsers([]);
      loadUsers();
    } catch (err) {
      setError('Failed to deactivate users');
    } finally {
      setLoading(false);
    }
  };
  
  // Quick Filter Handlers
  const applyQuickFilter = (type) => {
    switch(type) {
      case 'active-admins':
        setFilterRole('admin');
        setFilterStatus('active');
        break;
      case 'inactive-users':
        setFilterStatus('inactive');
        setFilterRole('');
        break;
      case 'managers':
        setFilterRole('manager');
        setFilterStatus('');
        break;
      case 'never-logged-in':
        // This would need backend support
        setFilterStatus('active');
        break;
      default:
        clearFilters();
    }
    setPage(0);
  };
  
  // Lock/Unlock Account Handler
  const handleLockAccount = (user) => {
    const isCurrentlyLocked = user.isLocked || false;
    const action = isCurrentlyLocked ? 'unlock' : 'lock';
    
    confirm({
      title: `${isCurrentlyLocked ? 'Unlock' : 'Lock'} Account`,
      message: `Are you sure you want to ${action} ${user.email}'s account?`,
      variant: 'warning',
      confirmText: isCurrentlyLocked ? 'Unlock' : 'Lock',
      onConfirm: async () => {
        setLoading(true);
        try {
          const reason = isCurrentlyLocked ? '' : 'Security';
          const result = await authService.lockUserAccount(user.id, !isCurrentlyLocked, reason);
          
          if (result.success) {
            setSuccess(`User account ${action}ed successfully`);
            loadUsers();
          } else {
            setError(result.message || `Failed to ${action} account`);
          }
        } catch (err) {
          setError(`Failed to ${action} account`);
        } finally {
          setLoading(false);
        }
      }
    });
  };
  
  // Send Welcome Email Handler
  const handleSendEmail = (user) => {
    confirm({
      title: 'Send Welcome Email',
      message: `Send welcome email to ${user.email}?`,
      variant: 'info',
      confirmText: 'Send',
      onConfirm: async () => {
        setLoading(true);
        try {
          const result = await authService.sendWelcomeEmail(user.id, false);
          
          if (result.success) {
            setSuccess('Welcome email sent successfully');
          } else {
            setError(result.message || 'Failed to send email');
          }
        } catch (err) {
          setError('Failed to send email. Email service may not be configured.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} data-testid="user-management-page">
      <Fade in timeout={600}>
        <Box>
          {/* Header */}
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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PeopleIcon sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    User Management
                  </Typography>
                  <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                    Create and manage user accounts for the HRM system
                  </Typography>
                </Box>
              </Box>
              
              <Button
                startIcon={<RefreshIcon />}
                onClick={() => activeTab === 1 && loadUsers()}
                sx={{
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.5)'
                  }
                }}
              >
                Refresh
              </Button>
            </Box>
          </Paper>

          {/* Alerts */}
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          {/* Tabs */}
          <Card elevation={3} sx={{ borderRadius: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                <Tab 
                  icon={<PersonAddIcon />} 
                  label="Create User" 
                  iconPosition="start"
                  sx={{ textTransform: 'none', fontWeight: 'medium', fontSize: '1rem' }}
                  data-testid="usermgmt-tab-create"
                />
                <Tab 
                  icon={<PeopleIcon />} 
                  label={`Manage Users (${totalUsers})`}
                  iconPosition="start"
                  sx={{ textTransform: 'none', fontWeight: 'medium', fontSize: '1rem' }}
                  data-testid="usermgmt-tab-manage"
                />
              </Tabs>
            </Box>

            {/* Tab Panels */}
            <CardContent sx={{ p: 4 }}>
              {/* Create User Form */}
              {activeTab === 0 && (
                <Box component="form" onSubmit={handleSubmit}>
                  <Grid container spacing={3}>
                    {/* Email Field */}
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Email Address"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        data-testid="usermgmt-email-input"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <EmailIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    {/* First Name */}
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="First Name"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        data-testid="usermgmt-firstname-input"
                      />
                    </Grid>

                    {/* Last Name */}
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Last Name"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        data-testid="usermgmt-lastname-input"
                      />
                    </Grid>

                    {/* Role Selection */}
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth required>
                        <InputLabel>User Role</InputLabel>
                        <Select
                          name="role"
                          value={formData.role}
                          onChange={handleChange}
                          label="User Role"
                          data-testid="usermgmt-role-select"
                          startAdornment={
                            <InputAdornment position="start">
                              <BusinessIcon color="action" />
                            </InputAdornment>
                          }
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
                        data-testid="usermgmt-password-input"
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
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                              >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
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
                        data-testid="usermgmt-confirm-password-input"
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
                                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                              >
                                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    {/* Password Requirements */}
                    <Grid item xs={12}>
                      <Box sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LightbulbIcon fontSize="small" /> <strong>Password Requirements:</strong> Minimum 8 characters, must include uppercase, lowercase, number, and special character (@$!%*?&amp;)
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Action Buttons */}
                  <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      onClick={handleReset}
                      disabled={loading}
                      sx={{ px: 3, py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 'medium' }}
                    >
                      Reset Form
                    </Button>

                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      startIcon={loading ? null : <SaveIcon />}
                      data-testid="usermgmt-submit-btn"
                      sx={{
                        px: 4,
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 'bold'
                      }}
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : 'Create User'}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Manage Users Table */}
              {activeTab === 1 && (
                <Box>
                  {/* Quick Filters Row */}
                  <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                      Quick Filters:
                    </Typography>
                    <Chip
                      label="All Users"
                      onClick={() => applyQuickFilter('all')}
                      color={!filterRole && !filterStatus ? 'primary' : 'default'}
                      size="small"
                      sx={{ fontWeight: 'medium' }}
                    />
                    <Chip
                      label="Active Admins"
                      onClick={() => applyQuickFilter('active-admins')}
                      color={filterRole === 'admin' && filterStatus === 'active' ? 'primary' : 'default'}
                      size="small"
                    />
                    <Chip
                      label="Managers"
                      onClick={() => applyQuickFilter('managers')}
                      color={filterRole === 'manager' ? 'primary' : 'default'}
                      size="small"
                    />
                    <Chip
                      label="Inactive Users"
                      onClick={() => applyQuickFilter('inactive-users')}
                      color={filterStatus === 'inactive' ? 'primary' : 'default'}
                      size="small"
                    />
                  </Box>

                  {/* Filters */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        data-testid="usermgmt-search-input"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth>
                        <InputLabel>Role Filter</InputLabel>
                        <Select
                          value={filterRole}
                          label="Role Filter"
                          onChange={(e) => setFilterRole(e.target.value)}
                          data-testid="usermgmt-role-filter"
                        >
                          <MenuItem value="">All Roles</MenuItem>
                          {roles.map(role => (
                            <MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth>
                        <InputLabel>Status Filter</InputLabel>
                        <Select
                          value={filterStatus}
                          label="Status Filter"
                          onChange={(e) => setFilterStatus(e.target.value)}
                          data-testid="usermgmt-status-filter"
                        >
                          <MenuItem value="">All Status</MenuItem>
                          <MenuItem value="active">Active</MenuItem>
                          <MenuItem value="inactive">Inactive</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={clearFilters}
                        disabled={!searchQuery && !filterRole && !filterStatus}
                        sx={{ height: '56px' }}
                      >
                        Clear Filters
                      </Button>
                    </Grid>
                  </Grid>

                  {/* Bulk Actions Toolbar */}
                  {selectedUsers.length > 0 && (
                    <Paper 
                      sx={{ 
                        mb: 2, 
                        p: 2, 
                        bgcolor: 'primary.50',
                        border: '1px solid',
                        borderColor: 'primary.200',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <Typography variant="body1" fontWeight="medium" color="primary.main">
                        {selectedUsers.length} user(s) selected
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          color="success"
                          onClick={handleBulkActivate}
                          startIcon={<ActivateIcon />}
                        >
                          Activate
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          color="warning"
                          onClick={handleBulkDeactivate}
                          startIcon={<DeactivateIcon />}
                        >
                          Deactivate
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setSelectedUsers([])}
                        >
                          Cancel
                        </Button>
                      </Box>
                    </Paper>
                  )}

                  {/* Users Table */}
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              indeterminate={selectedUsers.length > 0 && selectedUsers.length < users.filter(u => u.id !== currentUser?.id).length}
                              checked={selectedUsers.length > 0 && selectedUsers.length === users.filter(u => u.id !== currentUser?.id).length}
                              onChange={handleSelectAll}
                            />
                          </TableCell>
                          <TableCell><strong>Name</strong></TableCell>
                          <TableCell><strong>Email</strong></TableCell>
                          <TableCell align="center"><strong>Role</strong></TableCell>
                          <TableCell align="center"><strong>Status</strong></TableCell>
                          <TableCell><strong>Last Login</strong></TableCell>
                          <TableCell align="center"><strong>Quick Actions</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {loading && users.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                              <CircularProgress />
                            </TableCell>
                          </TableRow>
                        ) : users.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                              <Typography color="textSecondary">No users found</Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          users.map((user) => (
                            <TableRow key={user.id} hover selected={selectedUsers.includes(user.id)}>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedUsers.includes(user.id)}
                                  onChange={() => handleSelectUser(user.id)}
                                  disabled={user.id === currentUser?.id}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={500}>
                                  {user.firstName} {user.lastName}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{user.email}</Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip 
                                  label={user.role?.toUpperCase() || 'UNKNOWN'} 
                                  color={getRoleColor(user.role)}
                                  size="small"
                                  sx={{ fontWeight: 'bold' }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', alignItems: 'center' }}>
                                  {user.isLocked && (
                                    <Chip
                                      icon={<LockIcon fontSize="small" />}
                                      label="Locked"
                                      color="error"
                                      size="small"
                                      sx={{ fontWeight: 'bold', mr: 0.5 }}
                                    />
                                  )}
                                  <Chip
                                    label={user.isActive ? 'Active' : 'Inactive'}
                                    color={user.isActive ? 'success' : 'default'}
                                    size="small"
                                  />
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">
                                  {user.lastLoginAt 
                                    ? new Date(user.lastLoginAt).toLocaleString() 
                                    : 'Never'}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="Quick Actions">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleQuickActionsClick(e, user)}
                                    disabled={user.id === currentUser?.id}
                                    sx={{ 
                                      bgcolor: 'action.hover',
                                      '&:hover': { bgcolor: 'primary.light' }
                                    }}
                                  >
                                    <MoreVertIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Quick Actions Menu */}
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleQuickActionsClose}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  >
                    <MenuItem onClick={() => handleQuickAction('reset-password')}>
                      <VpnKeyIcon fontSize="small" sx={{ mr: 1, color: 'warning.main' }} />
                      Reset Password
                    </MenuItem>
                    <MenuItem onClick={() => handleQuickAction('lock-account')}>
                      {selectedUser?.isLocked ? (
                        <>
                          <LockOpenIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
                          Unlock Account
                        </>
                      ) : (
                        <>
                          <LockIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
                          Lock Account
                        </>
                      )}
                    </MenuItem>
                    <MenuItem onClick={() => handleQuickAction('toggle-status')}>
                      {selectedUser?.isActive ? (
                        <>
                          <DeactivateIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
                          Deactivate User
                        </>
                      ) : (
                        <>
                          <ActivateIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
                          Activate User
                        </>
                      )}
                    </MenuItem>
                    <MenuItem onClick={() => handleQuickAction('send-email')}>
                      <SendIcon fontSize="small" sx={{ mr: 1, color: 'info.main' }} />
                      Send Welcome Email
                    </MenuItem>
                    <MenuItem onClick={() => handleQuickAction('view-details')}>
                      <EditIcon fontSize="small" sx={{ mr: 1, color: 'info.main' }} />
                      View Details
                    </MenuItem>
                    {currentUser?.role === 'admin' && (
                      <MenuItem onClick={() => handleQuickAction('delete')} sx={{ color: 'error.main' }}>
                        <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                        Terminate User
                      </MenuItem>
                    )}
                  </Menu>

                  {/* Pagination */}
                  <TablePagination
                    component="div"
                    count={totalUsers}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setRowsPerPage(parseInt(e.target.value, 10));
                      setPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                  />
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Terminate User Confirmation Dialog */}
          <Dialog
            open={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle sx={{ bgcolor: 'warning.main', color: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <DeleteIcon sx={{ mr: 1 }} />
                Terminate User Account
              </Box>
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Note:</strong> This will deactivate the user account, not permanently delete it.
              </Alert>
              <DialogContentText>
                Are you sure you want to terminate the user account for <strong>{userToDelete?.email}</strong>?
                The account will be deactivated and the user will no longer be able to log in.
                You can reactivate this account later if needed.
              </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant="contained"
                color="warning"
                onClick={handleDeleteConfirm}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <DeleteIcon />}
              >
                {loading ? 'Terminating...' : 'Terminate User'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Reset Password Dialog */}
          <Dialog
            open={resetPasswordDialogOpen}
            onClose={() => setResetPasswordDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <VpnKeyIcon sx={{ mr: 1 }} />
                Reset Password
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Enter a new password for <strong>{userToReset?.email}</strong>
                </Typography>
                <TextField
                  fullWidth
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  helperText="Minimum 8 characters"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setResetPasswordDialogOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleResetPasswordConfirm}
                disabled={loading || !newPassword}
                startIcon={loading ? <CircularProgress size={20} /> : <VpnKeyIcon />}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Fade>
      <ConfirmDialog {...dialogProps} />
    </Container>
  );
};

export default UserManagementEnhanced;
