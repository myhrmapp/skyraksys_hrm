import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { withBoundary } from './routeHelpers';

const AttendanceHub = lazy(() => import('../components/features/attendance/AttendanceHub'));

const attendanceRoutes = [
  <Route key="attendance-hub" path="attendance" element={withBoundary(<AttendanceHub />, 'Loading Attendance...')} />,
];

export default attendanceRoutes;
