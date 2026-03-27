import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { withBoundary } from './routeHelpers';

const TimesheetHub = lazy(() => import('../components/features/timesheet/TimesheetHub'));
const ModernWeeklyTimesheet = lazy(() => import('../components/features/timesheet/ModernWeeklyTimesheet'));

const timesheetRoutes = [
  <Route key="timesheets" path="timesheets" element={withBoundary(<TimesheetHub />, 'Loading Timesheets...')} />,
  <Route key="timesheets-week" path="timesheets/week/:weekStart" element={withBoundary(<ModernWeeklyTimesheet />, 'Loading Weekly Timesheet...')} />,
  // Consolidated sub-routes
  <Route key="timesheets-approvals" path="timesheets/approvals" element={<Navigate to="/timesheets" replace />} />,
  <Route key="timesheets-history" path="timesheets/history" element={<Navigate to="/timesheets" replace />} />,
  // Legacy redirect routes
  <Route key="timesheet-management-legacy" path="timesheet-management" element={<Navigate to="/timesheets" replace />} />,
  <Route key="add-timesheet-legacy" path="add-timesheet" element={<Navigate to="/timesheets" replace />} />,
  <Route key="weekly-timesheet-legacy" path="weekly-timesheet" element={<Navigate to="/timesheets" replace />} />,
  <Route key="timesheet-history-legacy" path="timesheet-history" element={<Navigate to="/timesheets/history" replace />} />,
  <Route key="timesheet-manager-legacy" path="timesheet-manager" element={<Navigate to="/timesheets" replace />} />,
];

export default timesheetRoutes;
