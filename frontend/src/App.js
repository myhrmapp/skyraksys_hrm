import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, CircularProgress, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import modernTheme from './theme/modernTheme';
import { SnackbarProvider } from 'notistack';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { LoadingProvider } from './contexts/LoadingContext';

// Error Boundary (enhanced)
import SmartErrorBoundary from './components/common/SmartErrorBoundary';

// Core Components (loaded immediately)
import Login from './components/common/Login';
import ForgotPassword from './components/common/ForgotPassword';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardRedirect from './components/common/DashboardRedirect';

// Dashboard Components
const AdminDashboard = lazy(() => import('./components/features/dashboard/AdminDashboard'));
const EmployeeDashboard = lazy(() => import('./components/features/dashboard/EmployeeDashboard'));
const ManagerDashboard = lazy(() => import('./components/manager/ManagerDashboard'));
const PerformanceDashboard = lazy(() => import('./components/features/dashboard/PerformanceDashboard'));

// Employee Management Components
const EmployeeList = lazy(() => import('./components/features/employees/EmployeeList'));
const EmployeeForm = lazy(() => import('./components/features/employees/EmployeeForm'));
const EmployeeProfile = lazy(() => import('./components/features/employees/EmployeeProfileModern'));
const EmployeeRecords = lazy(() => import('./components/features/employees/EmployeeRecords'));
const MyProfile = lazy(() => import('./components/features/employees/MyProfile'));
const UserAccountManagementPage = lazy(() => import('./components/features/employees/UserAccountManagementPage'));

// Debug Components
const SimpleValidationDiagnostic = React.lazy(() => import('./components/debug/SimpleValidationDiagnostic'));

// Leave Management Components
const LeaveManagement = lazy(() => import('./components/features/leave/LeaveManagement'));
const EmployeeLeaveRequests = lazy(() => import('./components/features/leave/EmployeeLeaveRequests'));
const LeaveBalance = lazy(() => import('./components/features/leave/LeaveBalanceModern'));
const AddLeaveRequest = lazy(() => import('./components/features/leave/LeaveRequest'));
const LeaveTypeManagement = lazy(() => import('./components/features/leave/LeaveTypeManagement'));

// Timesheet Components (Consolidated)
const ModernWeeklyTimesheet = lazy(() => import('./components/features/timesheet/ModernWeeklyTimesheet'));
const TimesheetApproval = lazy(() => import('./components/features/timesheet/TimesheetApproval'));
const TimesheetHistory = lazy(() => import('./components/features/timesheet/TimesheetHistory'));
const TimesheetHub = lazy(() => import('./components/features/timesheet/TimesheetHub'));

// Payroll Components
const PayrollManagement = lazy(() => import('./components/features/payroll/ModernPayrollManagement'));
const EmployeePayslips = lazy(() => import('./components/features/payroll/EmployeePayslips'));

// Admin Components
const UserManagement = lazy(() => import('./components/features/admin/UserManagementEnhanced'));
const EmailConfiguration = lazy(() => import('./components/features/admin/EmailConfiguration'));
const PositionManagement = lazy(() => import('./components/features/admin/PositionManagement'));
const DepartmentManagement = lazy(() => import('./components/features/admin/DepartmentManagement'));
const SystemSettings = lazy(() => import('./components/features/admin/SystemSettings'));
const ProjectTaskConfiguration = lazy(() => import('./components/features/admin/ProjectTaskConfiguration'));
const ReportsModule = lazy(() => import('./components/features/admin/ReportsModule'));
const EnhancedPayslipTemplateConfiguration = lazy(() => import('./components/admin/EnhancedPayslipTemplateConfiguration'));
const HolidayCalendarPage = lazy(() => import('./components/admin/HolidayCalendarPage'));
const MyAttendance = lazy(() => import('./components/features/attendance/MyAttendance'));
const AttendanceManagement = lazy(() => import('./components/features/attendance/AttendanceManagement'));
const MyTasks = lazy(() => import('./components/features/tasks/MyTasks'));
// Enhanced Admin Debug Panel with Environment Selector, Database Tools, and Log Viewer
const AdminDebugPanel = lazy(() => import('./components/features/admin/AdminDebugPanel'));
// System Configuration Page (Admin Only - Password Re-auth Required)
const SystemConfigPage = lazy(() => import('./components/admin/SystemConfigPage'));

// Hub Pages (Tabbed page merges)
const OrganizationSettings = lazy(() => import('./components/features/admin/OrganizationSettings'));
const SystemSettingsHub = lazy(() => import('./components/features/admin/SystemSettingsHub'));

// Projects Pages
// ProjectList and ProjectDetails removed — ProjectTaskConfiguration is the canonical admin page
// ProjectForm is still imported by ProjectTaskConfiguration directly

// Employee Reviews
const EmployeeReviewManagement = lazy(() => import('./components/features/reviews/EmployeeReviewManagement'));

// Leave Accrual
const LeaveAccrualManagement = lazy(() => import('./components/features/leave/LeaveAccrualManagement'));

// Restore/Recovery
const RestoreManagement = lazy(() => import('./components/features/admin/RestoreManagement'));

// Material-UI Theme
// Modern theme imported from theme/modernTheme.js
// Comprehensive design system with purple gradients, Inter font, and modern components

// Enhanced Loading Component
const EnhancedLoadingFallback = ({ text = "Loading..." }) => (
  <Box 
    display="flex" 
    flexDirection="column"
    justifyContent="center" 
    alignItems="center" 
    minHeight="300px"
    gap={2}
  >
    <CircularProgress size={40} />
    <Typography variant="body2" color="textSecondary">
      {text}
    </Typography>
  </Box>
);

EnhancedLoadingFallback.propTypes = {
  text: PropTypes.string,
};

function App() {
  return (
    <SmartErrorBoundary level="application">
      <ThemeProvider theme={modernTheme}>
        <CssBaseline />
        <LoadingProvider>
            <SnackbarProvider 
              maxSnack={3}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <AuthProvider>
                <SmartErrorBoundary level="routing">
                  <Routes>
                    {/* Admin Debug Panel - Only available in development */}
                    {process.env.NODE_ENV !== 'production' && (
                    <Route path="/admin/debug" element={
                      <Suspense fallback={<EnhancedLoadingFallback text="Loading Debug Panel..." />}>
                        <AdminDebugPanel />
                      </Suspense>
                    } />
                    )}
                    
                    {/* System Config Page - redirect to settings hub */}
                    <Route path="/system-config" element={<Navigate to="/admin/settings-hub" replace />} />
                    
                    <Route path="/login" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/" element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }>
                      <Route index element={<DashboardRedirect />} />
                      <Route path="dashboard" element={<DashboardRedirect />} />
                      
                      {/* Role-Specific Dashboard Routes with Error Boundaries */}
                      <Route path="admin-dashboard" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Admin Dashboard..." />}>
                            <AdminDashboard />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      
                      <Route path="employee-dashboard" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Employee Dashboard..." />}>
                            <EmployeeDashboard />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      
                      <Route path="manager-dashboard" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Manager Dashboard..." />}>
                            <ManagerDashboard />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      
                      <Route path="performance-dashboard" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Performance Dashboard..." />}>
                            <PerformanceDashboard />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      
                      {/* Legacy route - redirect to full name */}
                      <Route path="performance" element={<Navigate to="/performance-dashboard" replace />} />
                      
                      {/* Employee Management Routes with Error Boundaries */}
                      <Route path="employees" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Employees..." />}>
                            <EmployeeList />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      <Route path="employees/add" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Add Employee..." />}>
                            <EmployeeForm />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      <Route path="employees/:id" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Employee Profile..." />}>
                            <EmployeeProfile />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      <Route path="employees/:id/edit" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Edit Employee..." />}>
                            <EmployeeForm />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      <Route path="employees/:id/user-account" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading User Account Management..." />}>
                            <UserAccountManagementPage />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      <Route path="my-profile" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading My Profile..." />}>
                            <MyProfile />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      <Route path="employee-records" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Employee Records..." />}>
                            <EmployeeRecords />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      {/* Legacy route - redirect to RESTful pattern */}
                      <Route path="add-employee" element={<Navigate to="/employees/add" replace />} />

                      {/* Employee Reviews */}
                      <Route path="employee-reviews" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Employee Reviews..." />}>
                            <EmployeeReviewManagement />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      
                      {/* Leave Management Routes with Error Boundaries */}
                      <Route path="leave-management" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Leave Management..." />}>
                            <LeaveManagement />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      <Route path="leave-requests" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Leave Requests..." />}>
                            <EmployeeLeaveRequests />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      <Route path="add-leave-request" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Leave Request Form..." />}>
                            <AddLeaveRequest />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      <Route path="admin/leave-balances" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Leave Balance Admin..." />}>
                            <LeaveBalance />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      <Route path="admin/leave-accrual" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Leave Accrual..." />}>
                            <LeaveAccrualManagement />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      <Route path="admin/leave-types" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Leave Types..." />}>
                            <LeaveTypeManagement />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      
                      {/* Timesheet Management Routes (Hub + deep links) */}
                      <Route path="timesheets" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Timesheets..." />}>
                            <TimesheetHub />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      <Route path="timesheets/week/:weekStart" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Weekly Timesheet..." />}>
                            <ModernWeeklyTimesheet />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      <Route path="timesheets/approvals" element={<Navigate to="/timesheets" replace />} />
                      <Route path="timesheets/history" element={<Navigate to="/timesheets" replace />} />
                      
                      {/* Legacy timesheet routes - redirect to consolidated component */}
                      <Route path="timesheet-management" element={<Navigate to="/timesheets" replace />} />
                      <Route path="add-timesheet" element={<Navigate to="/timesheets" replace />} />
                      <Route path="weekly-timesheet" element={<Navigate to="/timesheets" replace />} />
                      <Route path="timesheet-history" element={<Navigate to="/timesheets/history" replace />} />
                      <Route path="timesheet-manager" element={<Navigate to="/timesheets" replace />} />

                      {/* Attendance Routes */}
                      <Route path="my-attendance" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Attendance..." />}>
                            <MyAttendance />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      <Route path="attendance-management" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Attendance Management..." />}>
                            <AttendanceManagement />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />

                      {/* Payroll Management Routes with Error Boundaries */}
                      <Route path="payroll-management" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Payroll Management..." />}>
                            <PayrollManagement />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      <Route path="employee-payslips" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Employee Payslips..." />}>
                            <EmployeePayslips />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      
                      {/* Admin Routes with Error Boundaries */}
                      <Route path="user-management" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading User Management..." />}>
                            <UserManagement />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      
                      {/* Organization Hub (Departments + Positions + Holidays) */}
                      <Route path="organization" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Organization Settings..." />}>
                            <OrganizationSettings />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      <Route path="department-management" element={<Navigate to="/organization" replace />} />
                      <Route path="position-management" element={<Navigate to="/organization" replace />} />
                      <Route path="admin/holidays" element={<Navigate to="/organization" replace />} />
                      <Route path="email-configuration" element={<Navigate to="/admin/settings-hub" replace />} />
                      
                      {/* System Settings Hub (Email + Preferences + Advanced) */}
                      <Route path="admin/settings-hub" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading System Settings..." />}>
                            <SystemSettingsHub />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      <Route path="settings" element={<Navigate to="/admin/settings-hub" replace />} />
                      <Route path="admin/restore" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Restore Management..." />}>
                            <RestoreManagement />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      <Route path="project-task-config" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Project Configuration..." />}>
                            <ProjectTaskConfiguration />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      <Route path="my-tasks" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading My Tasks..." />}>
                            <MyTasks />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      <Route path="reports" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Reports..." />}>
                            <ReportsModule />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      
                      {/* New Admin Routes with Error Boundaries */}
                      <Route path="admin/payslip-templates" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Enhanced Payslip Template Configuration..." />}>
                            <EnhancedPayslipTemplateConfiguration />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />

                      
                      {/* Debug Routes — development only */}
                      {process.env.NODE_ENV !== 'production' && (
                      <Route path="debug/validation" element={
                        <SmartErrorBoundary level="page">
                          <Suspense fallback={<EnhancedLoadingFallback text="Loading Validation Diagnostic..." />}>
                            <SimpleValidationDiagnostic />
                          </Suspense>
                        </SmartErrorBoundary>
                      } />
                      )}

                      {/* Projects Routes removed — FE-43: ProjectTaskConfiguration at /project-task-config is the canonical admin page */}
                    </Route>

                    {/* 404 catch-all */}
                    <Route path="*" element={
                      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh" gap={2}>
                        <Typography variant="h3" color="textSecondary">404</Typography>
                        <Typography variant="body1" color="textSecondary">Page not found</Typography>
                        <Typography variant="body2" color="textSecondary">
                          The page you're looking for doesn't exist or has been moved.
                        </Typography>
                      </Box>
                    } />
                  </Routes>
                </SmartErrorBoundary>
              </AuthProvider>
            </SnackbarProvider>
        </LoadingProvider>
      </ThemeProvider>
    </SmartErrorBoundary>
  );
}

export default App;
