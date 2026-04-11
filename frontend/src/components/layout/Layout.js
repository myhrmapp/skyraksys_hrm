import React, { useState, useMemo } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  Stack,
  Chip,
  Button
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  EventNote as LeaveIcon,
  Schedule as TimesheetIcon,
  AccountBalance as PayrollIcon,
  Assignment as ProjectIcon,
  Settings as SettingsIcon,
  Assessment as ReportsIcon,
  SupervisorAccount as ManagerIcon,
  ExpandMore,
  Menu as MenuIcon,
  Folder,
  Person as PersonIcon,
  AccountBalanceWallet,
  CalendarToday,
  CheckCircleOutline,
  Receipt,
  FileCopy,
  Business as BusinessIcon,
  Notifications,
  Help,
  Logout as LogoutIcon,
  Assessment
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const drawerWidth = 280;

const Layout = () => {
  const { user, logout, isAdmin, isHR, isManager } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  
  // State management
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  // Handler functions
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
  };

  // Menu structure based on role (memoized to avoid recreation on every render)
  const menuStructure = useMemo(() => {
    if (isAdmin || isHR) {
      return [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <DashboardIcon />,
          sectionHeader: 'Administration',
          items: [
            { label: 'Overview', path: '/admin-dashboard', icon: <DashboardIcon /> },
            { label: 'Performance', path: '/performance-dashboard', icon: <Assessment /> }
          ]
        },
        {
          id: 'people',
          label: 'People',
          icon: <PeopleIcon />,
          items: [
            { label: 'All Employees', path: '/employees', icon: <PeopleIcon /> },
            { label: 'Employee Records', path: '/employee-records', icon: <Folder /> },
            { label: 'Employee Reviews', path: '/employee-reviews', icon: <Assessment /> },
            { label: 'Organization', path: '/organization', icon: <BusinessIcon /> }
          ]
        },
        {
          id: 'leave',
          label: 'Leave Management',
          icon: <LeaveIcon />,
          items: [
            { label: 'Leave Requests', path: '/leave-management', icon: <CheckCircleOutline /> },
            { label: 'Leave Balances', path: '/admin/leave-balances', icon: <AccountBalanceWallet /> },
            { label: 'Leave Accrual', path: '/admin/leave-accrual', icon: <AccountBalanceWallet /> },
            { label: 'Leave Types', path: '/admin/leave-types', icon: <CheckCircleOutline /> }
          ]
        },
        {
          id: 'time',
          label: 'Time & Attendance',
          icon: <TimesheetIcon />,
          items: [
            { label: 'Timesheet Approvals', path: '/timesheets?view=approvals', icon: <TimesheetIcon /> },
            { label: 'Attendance', path: '/attendance-management', icon: <CalendarToday /> },
            { label: 'Projects', path: '/project-task-config', icon: <ProjectIcon /> }
          ]
        },
        {
          id: 'payroll',
          label: 'Payroll & Reports',
          icon: <PayrollIcon />,
          items: [
            { label: 'Payroll Management', path: '/payroll-management', icon: <PayrollIcon /> },
            { label: 'Payslip Templates', path: '/admin/payslip-templates', icon: <FileCopy /> },
            { label: 'Reports', path: '/reports', icon: <ReportsIcon /> }
          ]
        },
        {
          id: 'settings',
          label: 'System',
          icon: <SettingsIcon />,
          items: [
            { label: 'User Management', path: '/user-management', icon: <ManagerIcon /> },
            { label: 'System Settings', path: '/admin/settings-hub', icon: <SettingsIcon /> },
            { label: 'Restore Records', path: '/admin/restore', icon: <SettingsIcon /> }
          ]
        },
        {
          id: 'mystuff',
          label: 'My Work',
          icon: <PersonIcon />,
          sectionHeader: 'Self Service',
          items: [
            { label: 'My Timesheet', path: '/timesheets', icon: <TimesheetIcon /> },
            { label: 'My Leave', path: '/leave-requests', icon: <LeaveIcon /> },
            { label: 'My Payslips', path: '/employee-payslips', icon: <Receipt /> },
            { label: 'My Attendance', path: '/my-attendance', icon: <CalendarToday /> },
            { label: 'My Profile', path: '/my-profile', icon: <PersonIcon /> }
          ]
        },
        {
          id: 'help',
          label: 'Help',
          icon: <Help />,
          items: [
            { label: 'User Guide', path: '/user-guide', icon: <Help /> },
            { label: 'System Showcase', path: '/system-showcase', icon: <DashboardIcon /> }
          ]
        }
      ];
    }

    if (isManager) {
      return [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <DashboardIcon />,
          sectionHeader: 'Team Management',
          items: [
            { label: 'Overview', path: '/manager-dashboard', icon: <DashboardIcon /> },
            { label: 'Team Performance', path: '/performance-dashboard', icon: <Assessment /> }
          ]
        },
        {
          id: 'people',
          label: 'My Team',
          icon: <PeopleIcon />,
          items: [
            { label: 'Team Members', path: '/employees', icon: <PeopleIcon /> },
            { label: 'Employee Reviews', path: '/employee-reviews', icon: <Assessment /> }
          ]
        },
        {
          id: 'work',
          label: 'Approvals',
          icon: <CheckCircleOutline />,
          items: [
            { label: 'Leave Requests', path: '/leave-management', icon: <LeaveIcon /> },
            { label: 'Timesheet Approvals', path: '/timesheets?view=approvals', icon: <TimesheetIcon /> },
            { label: 'Projects', path: '/project-task-config', icon: <ProjectIcon /> }
          ]
        },
        {
          id: 'mystuff',
          label: 'My Work',
          icon: <PersonIcon />,
          sectionHeader: 'Self Service',
          items: [
            { label: 'My Timesheet', path: '/timesheets', icon: <TimesheetIcon /> },
            { label: 'My Leave', path: '/leave-requests', icon: <LeaveIcon /> },
            { label: 'My Payslips', path: '/employee-payslips', icon: <Receipt /> },
            { label: 'My Attendance', path: '/my-attendance', icon: <CalendarToday /> },
            { label: 'My Tasks', path: '/my-tasks', icon: <ProjectIcon /> },
            { label: 'My Profile', path: '/my-profile', icon: <PersonIcon /> }
          ]
        },
        {
          id: 'help',
          label: 'Help',
          icon: <Help />,
          items: [
            { label: 'User Guide', path: '/user-guide', icon: <Help /> },
            { label: 'System Showcase', path: '/system-showcase', icon: <DashboardIcon /> }
          ]
        }
      ];
    }

    // Employee menu
    return [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <DashboardIcon />,
        items: [
          { label: 'Overview', path: '/employee-dashboard', icon: <DashboardIcon /> }
        ]
      },
      {
        id: 'mystuff',
        label: 'My Workspace',
        icon: <PersonIcon />,
        items: [
          { label: 'My Timesheet', path: '/timesheets', icon: <TimesheetIcon /> },
          { label: 'My Leave', path: '/leave-requests', icon: <LeaveIcon /> },
          { label: 'My Payslips', path: '/employee-payslips', icon: <PayrollIcon /> },
          { label: 'My Attendance', path: '/my-attendance', icon: <CalendarToday /> },
          { label: 'My Reviews', path: '/employee-reviews', icon: <Assessment /> },
          { label: 'My Tasks', path: '/my-tasks', icon: <ProjectIcon /> },
          { label: 'My Profile', path: '/my-profile', icon: <PersonIcon /> }
        ]
      },
      {
        id: 'help',
        label: 'Help',
        icon: <Help />,
        items: [
          { label: 'User Guide', path: '/user-guide', icon: <Help /> },
          { label: 'System Showcase', path: '/system-showcase', icon: <DashboardIcon /> }
        ]
      }
    ];
  }, [isAdmin, isHR, isManager]);

    const modernDrawerContent = (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Minimal Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <BusinessIcon sx={{ color: 'primary.main', fontSize: 24 }} />
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 500,
                color: 'text.primary'
              }}
            >
              SKYRAKSYS HRM
            </Typography>
          </Stack>
        </Box>

        {/* Minimal Navigation */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <List sx={{ py: 1 }}>
            {menuStructure.map((group) => (
              <React.Fragment key={group.id}>
                {/* Section Header (Administration / Self Service / etc.) */}
                {group.sectionHeader && (
                  <Box sx={{ mt: group.id !== 'dashboard' ? 1 : 0 }}>
                    {group.id !== 'dashboard' && (
                      <Divider sx={{ mb: 1.5 }} />
                    )}
                    <Typography
                      variant="overline"
                      sx={{
                        px: 2,
                        py: 0.5,
                        display: 'block',
                        color: 'primary.main',
                        fontWeight: 700,
                        letterSpacing: 1.5,
                        fontSize: '0.65rem'
                      }}
                    >
                      {group.sectionHeader}
                    </Typography>
                  </Box>
                )}
                
                {/* Group Label */}
                <Typography
                  variant="caption"
                  sx={{
                    px: 2,
                    py: 1,
                    display: 'block',
                    color: 'text.secondary',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: 1
                  }}
                >
                  {group.label}
                </Typography>
                
                {/* Group Items */}
                {group.items.map((item) => (
                  <ListItemButton
                    key={item.path}
                    component={NavLink}
                    to={item.path}
                    data-testid={`nav-${item.path.replace(/\//g, '-').replace(/^-/, '')}`}
                    sx={{
                      py: 1,
                      px: 2,
                      mx: 1,
                      mb: 0.5,
                      borderRadius: 1,
                      color: 'text.secondary',
                      '&.active': {
                        backgroundColor: 'action.selected',
                        borderLeft: '3px solid',
                        borderLeftColor: 'primary.main',
                        color: 'primary.main',
                        '& .MuiListItemIcon-root': {
                          color: 'primary.main'
                        }
                      },
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: 400
                      }}
                    />
                    {item.badge && (
                      <Chip
                        label={item.badge}
                        size="small"
                        color={item.badgeColor || 'default'}
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    )}
                  </ListItemButton>
                ))}
                
                {/* Subtle divider between groups */}
                <Box sx={{ height: 8 }} />
              </React.Fragment>
            ))}
          </List>
        </Box>

        {/* Minimal Footer */}
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            v2.0
          </Typography>
        </Box>
      </Box>
    );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Skip Navigation Link - visible only on focus for keyboard/screen-reader users */}
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          '&:focus': {
            position: 'fixed',
            top: 8,
            left: 8,
            width: 'auto',
            height: 'auto',
            padding: '8px 16px',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            zIndex: 9999,
            borderRadius: 1,
            textDecoration: 'none',
            fontWeight: 600,
          }
        }}
      >
        Skip to main content
      </Box>

      {/* Enhanced App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            data-testid="layout-drawer-toggle"
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          {/* Logo and Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Avatar 
              sx={{ 
                bgcolor: 'primary.main', 
                mr: 2,
                width: 32,
                height: 32,
                fontSize: '1rem'
              }}
            >
              S
            </Avatar>
            <Typography 
              variant="h6" 
              noWrap 
              component="div" 
              sx={{ 
                fontWeight: 'bold',
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              SKYRAKSYS HRM
            </Typography>
          </Box>

          {/* User Profile Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              label={user?.role?.toUpperCase() || 'USER'} 
              size="small"
              data-testid="layout-role-chip"
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.75rem'
              }} 
            />
            
            <IconButton
              size="large"
              edge="end"
              aria-label="notifications"
              color="inherit"
              data-testid="layout-notifications-button"
              sx={{ mr: 1 }}
            >
              <Notifications />
            </IconButton>

            <Button
              onClick={handleProfileMenuOpen}
              data-testid="layout-profile-menu-trigger"
              sx={{ 
                color: 'text.primary',
                textTransform: 'none',
                borderRadius: 2,
                px: 2,
                '&:hover': { bgcolor: 'action.hover' }
              }}
              startIcon={
                <Avatar 
                  sx={{ 
                    width: 32, 
                    height: 32,
                    bgcolor: 'primary.main'
                  }}
                >
                  {user?.firstName?.charAt(0) || 'U'}
                </Avatar>
              }
              endIcon={<ExpandMore />}
            >
              <Box sx={{ textAlign: 'left', ml: 1 }}>
                <Typography variant="body2" fontWeight="medium">
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Enhanced Sidebar Navigation */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              backgroundColor: 'background.paper',
              borderRight: '1px solid',
              borderRightColor: 'divider'
            }
          }}
        >
          {modernDrawerContent}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              backgroundColor: 'background.paper',
              borderRight: '1px solid',
              borderRightColor: 'divider'
            }
          }}
          open
        >
          {modernDrawerContent}
        </Drawer>
      </Box>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        onClick={handleProfileMenuClose}
        slotProps={{
          paper: {
            elevation: 3,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              minWidth: 200,
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem 
          onClick={() => {
            handleProfileMenuClose();
            navigate('/my-profile');
          }} 
          data-testid="layout-menu-view-profile"
          sx={{ py: 1.5 }}
        >
          <Avatar sx={{ width: 32, height: 32, mr: 2, bgcolor: 'primary.main' }}>
            {user?.firstName?.charAt(0) || 'U'}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              View Profile
            </Typography>
          </Box>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={() => {
            handleProfileMenuClose();
            navigate('/admin/settings-hub');
          }}
          data-testid="layout-menu-settings"
        >
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Account Settings
        </MenuItem>
        

        
        <MenuItem onClick={() => {
            handleProfileMenuClose();
            navigate('/user-guide');
          }}>
          <ListItemIcon>
            <Help fontSize="small" />
          </ListItemIcon>
          Help & User Guide
        </MenuItem>
        
        <Divider />
        
        <MenuItem 
          onClick={handleLogout}
          data-testid="layout-menu-logout"
          sx={{ 
            color: 'error.main',
            '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' }
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              Sign Out
            </Typography>
            <Typography variant="caption">
              Sign out of your account
            </Typography>
          </Box>
        </MenuItem>
      </Menu>

      <Box
        id="main-content"
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: 7, md: 8 },
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
