import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { withBoundary } from './routeHelpers';
import DashboardRedirect from '../components/common/DashboardRedirect';

const AdminDashboard = lazy(() => import('../components/features/dashboard/AdminDashboard'));
const EmployeeDashboard = lazy(() => import('../components/features/dashboard/EmployeeDashboard'));
const ManagerDashboard = lazy(() => import('../components/manager/ManagerDashboard'));
const PerformanceDashboard = lazy(() => import('../components/features/dashboard/PerformanceDashboard'));

const dashboardRoutes = [
  <Route key="index" index element={<DashboardRedirect />} />,
  <Route key="dashboard" path="dashboard" element={<DashboardRedirect />} />,
  <Route key="admin-dashboard" path="admin-dashboard" element={withBoundary(<AdminDashboard />, 'Loading Admin Dashboard...')} />,
  <Route key="employee-dashboard" path="employee-dashboard" element={withBoundary(<EmployeeDashboard />, 'Loading Employee Dashboard...')} />,
  <Route key="manager-dashboard" path="manager-dashboard" element={withBoundary(<ManagerDashboard />, 'Loading Manager Dashboard...')} />,
  <Route key="performance-dashboard" path="performance-dashboard" element={withBoundary(<PerformanceDashboard />, 'Loading Performance Dashboard...')} />,
  <Route key="performance-legacy" path="performance" element={<Navigate to="/performance-dashboard" replace />} />,
];

export default dashboardRoutes;
