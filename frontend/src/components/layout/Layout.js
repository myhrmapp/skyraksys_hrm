import React, { useState, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  Chip,
  Button,
  Badge,
  Collapse,
  alpha
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
  ExpandLess,
  ChevronRight,
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
  Assessment,
  Campaign as CampaignIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import BroadcastPopup from '../features/notifications/BroadcastPopup';
import { buildPhotoUrl } from '../../utils/photoUrl';

const drawerWidth = 260;

const Layout = () => {
  const { user, logout, isAdmin, isHR, isManager } = useAuth();
  const { notifications } = useNotifications();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  
  // State management
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

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
          id: 'self-service',
          label: 'My Workspace',
          icon: <PersonIcon />,
          sectionHeader: 'Self Service',
          items: [
            { label: 'My Dashboard', path: '/dashboard?view=self', icon: <DashboardIcon /> },
            { label: 'My Profile', path: '/my-profile', icon: <PersonIcon /> },
            { label: 'My Timesheet', path: '/timesheets', icon: <TimesheetIcon /> },
            { label: 'My Leave', path: '/leave', icon: <LeaveIcon /> },
            { label: 'My Attendance', path: '/attendance', icon: <CalendarToday /> },
            { label: 'My Payslips', path: '/employee-payslips', icon: <Receipt /> },
            { label: 'My Goals', path: '/goals', icon: <Assessment /> }
          ]
        },
        {
          id: 'core-hr',
          label: 'Core HR',
          icon: <PeopleIcon />,
          sectionHeader: 'Administration',
          items: [
            { label: 'Admin Overview', path: '/dashboard', icon: <DashboardIcon /> },
            { label: 'Employee Directory', path: '/employees', icon: <PeopleIcon /> },
            { label: 'Employee Records', path: '/employee-records', icon: <Folder /> },
            { label: 'Performance & Reviews', path: '/employee-reviews', icon: <Assessment /> },
            { label: 'Goals & OKRs', path: '/goals', icon: <Assessment /> },
            { label: 'Organization', path: '/organization', icon: <BusinessIcon /> },
            { label: 'Company Broadcasts', path: '/admin/broadcasts', icon: <CampaignIcon /> }
          ]
        },
        {
          id: 'time-ops',
          label: 'Time & Attendance',
          icon: <TimesheetIcon />,
          items: [
            { label: 'Timesheet Approvals', path: '/timesheets?view=approvals', icon: <TimesheetIcon /> },
            { label: 'Leave Management', path: '/leave?view=management', icon: <CheckCircleOutline /> },
            { label: 'Attendance Management', path: '/attendance?view=management', icon: <CalendarToday /> },
            { label: 'Leave Balances', path: '/admin/leave-balances', icon: <AccountBalanceWallet /> },
            { label: 'Leave Accrual', path: '/admin/leave-accrual', icon: <AccountBalanceWallet /> },
            { label: 'Leave Types', path: '/admin/leave-types', icon: <CheckCircleOutline /> }
          ]
        },
        {
          id: 'finance-ops',
          label: 'Finance & Operations',
          icon: <PayrollIcon />,
          items: [
            { label: 'Payroll Management', path: '/payroll-management', icon: <PayrollIcon /> },
            { label: 'Template Hub', path: '/admin/payslip-templates', icon: <FileCopy /> },
            { label: 'Client Management', path: '/clients', icon: <BusinessIcon /> },
            { label: 'Client Invoices', path: '/billing-invoices', icon: <Receipt /> },
            { label: 'Projects & Tasks', path: '/project-task-config', icon: <ProjectIcon /> }
          ]
        },
        {
          id: 'analytics-system',
          label: 'Analytics & System',
          icon: <SettingsIcon />,
          items: [
            { label: 'Reports & Analytics', path: '/reports', icon: <ReportsIcon /> },
            { label: 'User Management', path: '/user-management', icon: <ManagerIcon /> },
            { label: 'System Settings', path: '/admin/settings-hub', icon: <SettingsIcon /> },
            { label: 'Security Vault', path: '/admin/vault', icon: <SettingsIcon /> },
            { label: 'Restore Records', path: '/admin/restore', icon: <SettingsIcon /> },
            { label: 'User Guide', path: '/user-guide', icon: <Help /> }
          ]
        }
      ];
    }

    if (isManager) {
      return [
        {
          id: 'self-service',
          label: 'My Workspace',
          icon: <PersonIcon />,
          sectionHeader: 'Self Service',
          items: [
            { label: 'My Dashboard', path: '/dashboard?view=self', icon: <DashboardIcon /> },
            { label: 'My Profile', path: '/my-profile', icon: <PersonIcon /> },
            { label: 'My Timesheet', path: '/timesheets', icon: <TimesheetIcon /> },
            { label: 'My Leave', path: '/leave', icon: <LeaveIcon /> },
            { label: 'My Attendance', path: '/attendance', icon: <CalendarToday /> },
            { label: 'My Tasks', path: '/my-tasks', icon: <ProjectIcon /> },
            { label: 'My Payslips', path: '/employee-payslips', icon: <Receipt /> },
            { label: 'My Goals', path: '/goals', icon: <Assessment /> }
          ]
        },
        {
          id: 'team-mgmt',
          label: 'Team Management',
          icon: <PeopleIcon />,
          sectionHeader: 'Manager Work',
          items: [
            { label: 'Overview', path: '/dashboard', icon: <DashboardIcon /> },
            { label: 'Team Performance', path: '/performance-dashboard', icon: <Assessment /> },
            { label: 'Team Members', path: '/employees', icon: <PeopleIcon /> },
            { label: 'Employee Reviews', path: '/employee-reviews', icon: <Assessment /> }
          ]
        },
        {
          id: 'approvals',
          label: 'Approvals & Work',
          icon: <CheckCircleOutline />,
          items: [
            { label: 'Leave Requests', path: '/leave?view=management', icon: <LeaveIcon /> },
            { label: 'Timesheet Approvals', path: '/timesheets?view=approvals', icon: <TimesheetIcon /> },
            { label: 'Projects', path: '/project-task-config', icon: <ProjectIcon /> }
          ]
        },
        {
          id: 'help',
          label: 'Help',
          icon: <Help />,
          items: [
            { label: 'User Guide', path: '/user-guide', icon: <Help /> }
          ]
        }
      ];
    }

    // Employee menu
    return [
      {
        id: 'self-service',
        label: 'My Workspace',
        icon: <PersonIcon />,
        items: [
          { label: 'Overview', path: '/dashboard', icon: <DashboardIcon /> },
          { label: 'My Profile', path: '/my-profile', icon: <PersonIcon /> },
          { label: 'My Timesheet', path: '/timesheets', icon: <TimesheetIcon /> },
          { label: 'My Leave', path: '/leave', icon: <LeaveIcon /> },
          { label: 'My Attendance', path: '/attendance', icon: <CalendarToday /> },
          { label: 'My Tasks', path: '/my-tasks', icon: <ProjectIcon /> },
          { label: 'My Goals', path: '/goals', icon: <Assessment /> },
          { label: 'My Payslips', path: '/employee-payslips', icon: <PayrollIcon /> }
        ]
      },
      {
        id: 'help',
        label: 'Help',
        icon: <Help />,
        items: [
          { label: 'User Guide', path: '/user-guide', icon: <Help /> }
        ]
      }
    ];
  }, [isAdmin, isHR, isManager]);

  // Auto-expand group based on active route
  React.useEffect(() => {
    const activeGroup = menuStructure.find(g => 
      g.items.some(item => location.pathname.startsWith(item.path.split('?')[0]))
    );
    if (activeGroup && !expandedGroups[activeGroup.id]) {
      setExpandedGroups(prev => ({ ...prev, [activeGroup.id]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, menuStructure]);

    const modernDrawerContent = (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #0A2540 0%, #0D3361 55%, #0A2540 100%)' }}>
        {/* Brand Header */}
        <Box sx={{ px: 2, py: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {/* White pill background so the logo renders cleanly on dark sidebar */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'white', borderRadius: 2, px: 2, py: 1.5 }}>
            <img
              src="/logo-full.png"
              alt="SKYRAKSYS Technologies"
              style={{ maxWidth: '160px', width: '100%', height: 'auto' }}
            />
          </Box>
          <Box sx={{ height: '2px', background: 'linear-gradient(90deg, transparent, #FF8C00, #FF3399, #9B30FF, transparent)', borderRadius: 2, mt: 1.5 }} />
        </Box>

        {/* Premium Navigation */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px' } }}>
          <List sx={{ py: 1 }}>
            {menuStructure.map((group) => (
              <React.Fragment key={group.id}>
                {/* Section Header */}
                {group.sectionHeader && (
                  <Box sx={{ mt: group.id !== 'dashboard' && group.id !== 'self-service' ? 1 : 0 }}>
                    {group.id !== 'dashboard' && group.id !== 'self-service' && (
                      <Divider sx={{ mb: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />
                    )}
                    <Typography
                      variant="overline"
                      sx={{
                        px: 2,
                        py: 0.5,
                        display: 'block',
                        color: '#33B8E8',
                        fontWeight: 700,
                        letterSpacing: 1.5,
                        fontSize: '0.65rem'
                      }}
                    >
                      {group.sectionHeader}
                    </Typography>
                  </Box>
                )}
                
                {/* Accordion Header */}
                <ListItemButton
                  onClick={() => toggleGroup(group.id)}
                  sx={{
                    px: 2,
                    py: 1,
                    mx: 1,
                    mb: 0.5,
                    borderRadius: 2,
                    color: expandedGroups[group.id] ? '#0099D4' : 'rgba(255,255,255,0.75)',
                    bgcolor: expandedGroups[group.id] ? 'rgba(0,153,212,0.12)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.07)'
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                    {group.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={group.label} 
                    primaryTypographyProps={{ fontWeight: expandedGroups[group.id] ? 600 : 500, fontSize: '0.875rem' }} 
                  />
                  {expandedGroups[group.id] ? <ExpandLess sx={{ fontSize: 18 }} /> : <ChevronRight sx={{ fontSize: 18 }} />}
                </ListItemButton>
                
                {/* Group Items */}
                <Collapse in={expandedGroups[group.id]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {group.items.map((item) => (
                      <ListItemButton
                        key={item.path}
                        component={NavLink}
                        to={item.path}
                        data-testid={`nav-${item.path.replaceAll('/', '-').replace(/^-/, '')}`}
                        sx={{
                          py: 0.75,
                          pl: 6,
                          pr: 2,
                          mx: 1,
                          mb: 0.5,
                          borderRadius: 2,
                          color: 'rgba(255,255,255,0.55)',
                          '&.active': {
                            backgroundColor: 'rgba(0,153,212,0.15)',
                            color: '#33B8E8',
                            boxShadow: 'inset 3px 0 0 #0099D4',
                            '& .MuiListItemIcon-root': { color: '#0099D4' },
                            '& .MuiListItemText-primary': { fontWeight: 700 }
                          },
                          '&:hover': {
                            backgroundColor: 'rgba(255,255,255,0.07)',
                            color: 'rgba(255,255,255,0.9)'
                          }
                        }}
                      >
                        <ListItemText 
                          primary={item.label}
                          primaryTypographyProps={{
                            fontSize: '0.85rem',
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
                  </List>
                </Collapse>
                
                {/* Subtle divider between groups */}
                <Box sx={{ height: 4 }} />
              </React.Fragment>
            ))}
          </List>
        </Box>

        {/* Footer */}
        <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>
            SKYRAKSYS HRM v2.0
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
          bgcolor: alpha(theme.palette.background.paper, 0.75),
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
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
            <img
              src="/logo-full.png"
              alt="SKYRAKSYS Technologies"
              style={{ height: '30px', width: 'auto', marginRight: '8px' }}
            />
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
              onClick={() => navigate('/notifications')}
            >
              <Badge badgeContent={unreadCount} color="error" overlap="circular">
                <Notifications />
              </Badge>
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
                  src={(user?.photoUrl || user?.employee?.photoUrl) ? buildPhotoUrl(user?.photoUrl || user?.employee?.photoUrl) : undefined}
                  sx={{ 
                    width: 32, 
                    height: 32,
                    bgcolor: 'primary.main',
                    border: '2px solid rgba(255,255,255,0.8)'
                  }}
                >
                  {user?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
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
              background: 'transparent',
              borderRight: 'none'
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
              background: 'transparent',
              borderRight: 'none',
              boxShadow: '4px 0 24px rgba(0,0,0,0.25)'
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
          <Avatar 
            src={(user?.photoUrl || user?.employee?.photoUrl) ? buildPhotoUrl(user?.photoUrl || user?.employee?.photoUrl) : undefined}
            sx={{ width: 32, height: 32, mr: 2, bgcolor: 'primary.main' }}
          >
            {user?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
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
            navigate('/notifications');
          }}
          data-testid="layout-menu-notifications"
        >
          <ListItemIcon>
            <Notifications fontSize="small" />
          </ListItemIcon>
          Notifications
        </MenuItem>
        
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
          p: { xs: 2, sm: 3, md: 4 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: 7, md: 8 },
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Outlet />
      </Box>
      <BroadcastPopup />
    </Box>
  );
};

export default Layout;
