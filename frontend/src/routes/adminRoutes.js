import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { withBoundary } from './routeHelpers';

const UserManagement = lazy(() => import('../components/features/admin/UserManagementEnhanced'));
const OrganizationSettings = lazy(() => import('../components/features/admin/OrganizationSettings'));
const SystemSettingsHub = lazy(() => import('../components/features/admin/SystemSettingsHub'));
const RestoreManagement = lazy(() => import('../components/features/admin/RestoreManagement'));
const ProjectTaskConfiguration = lazy(() => import('../components/features/admin/ProjectTaskConfiguration'));
const MyTasks = lazy(() => import('../components/features/tasks/MyTasks'));
const ReportsModule = lazy(() => import('../components/features/admin/ReportsModule'));
const EnhancedPayslipTemplateConfiguration = lazy(() => import('../components/admin/EnhancedPayslipTemplateConfiguration'));
const UserGuide = lazy(() => import('../components/features/help/UserGuide'));
const SystemShowcase = lazy(() => import('../components/features/showcase/SystemShowcase'));

// Debug components — only loaded in development
const SimpleValidationDiagnostic = process.env.NODE_ENV !== 'production'
  ? lazy(() => import('../components/debug/SimpleValidationDiagnostic'))
  : () => null;

const adminRoutes = [
  <Route key="user-management" path="user-management" element={withBoundary(<UserManagement />, 'Loading User Management...')} />,
  <Route key="organization" path="organization" element={withBoundary(<OrganizationSettings />, 'Loading Organization Settings...')} />,
  // Organization sub-route redirects
  <Route key="department-management-legacy" path="department-management" element={<Navigate to="/organization" replace />} />,
  <Route key="position-management-legacy" path="position-management" element={<Navigate to="/organization" replace />} />,
  <Route key="admin-holidays-legacy" path="admin/holidays" element={<Navigate to="/organization" replace />} />,
  <Route key="email-config-legacy" path="email-configuration" element={<Navigate to="/admin/settings-hub" replace />} />,
  // System settings
  <Route key="admin-settings-hub" path="admin/settings-hub" element={withBoundary(<SystemSettingsHub />, 'Loading System Settings...')} />,
  <Route key="settings-legacy" path="settings" element={<Navigate to="/admin/settings-hub" replace />} />,
  <Route key="admin-restore" path="admin/restore" element={withBoundary(<RestoreManagement />, 'Loading Restore Management...')} />,
  // Project & tasks
  <Route key="project-task-config" path="project-task-config" element={withBoundary(<ProjectTaskConfiguration />, 'Loading Project Configuration...')} />,
  <Route key="my-tasks" path="my-tasks" element={withBoundary(<MyTasks />, 'Loading My Tasks...')} />,
  // Reports & templates
  <Route key="reports" path="reports" element={withBoundary(<ReportsModule />, 'Loading Reports...')} />,
  <Route key="admin-payslip-templates" path="admin/payslip-templates" element={withBoundary(<EnhancedPayslipTemplateConfiguration />, 'Loading Enhanced Payslip Template Configuration...')} />,
  // User guide & showcase
  <Route key="user-guide" path="user-guide" element={withBoundary(<UserGuide />, 'Loading User Guide...')} />,
  <Route key="system-showcase" path="system-showcase" element={withBoundary(<SystemShowcase />, 'Loading System Showcase...')} />,
  // Debug — development only
  ...(process.env.NODE_ENV !== 'production' ? [
    <Route key="debug-validation" path="debug/validation" element={withBoundary(<SimpleValidationDiagnostic />, 'Loading Validation Diagnostic...')} />,
  ] : []),
];

export default adminRoutes;
