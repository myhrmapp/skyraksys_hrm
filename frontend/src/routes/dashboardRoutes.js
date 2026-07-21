import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { withBoundary } from './routeHelpers';
import DashboardHub from '../components/features/dashboard/DashboardHub';

const PerformanceDashboard = lazy(() => import('../components/features/dashboard/PerformanceDashboard'));

const dashboardRoutes = [
  <Route key="index" index element={<DashboardHub />} />,
  <Route key="dashboard" path="dashboard" element={<DashboardHub />} />,
  <Route key="performance-dashboard" path="performance-dashboard" element={withBoundary(<PerformanceDashboard />, 'Loading Performance Dashboard...')} />,
  <Route key="performance-legacy" path="performance" element={<Navigate to="/performance-dashboard" replace />} />,
];

export default dashboardRoutes;
