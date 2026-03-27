import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { withBoundary } from './routeHelpers';

const MyAttendance = lazy(() => import('../components/features/attendance/MyAttendance'));
const AttendanceManagement = lazy(() => import('../components/features/attendance/AttendanceManagement'));

const attendanceRoutes = [
  <Route key="my-attendance" path="my-attendance" element={withBoundary(<MyAttendance />, 'Loading Attendance...')} />,
  <Route key="attendance-management" path="attendance-management" element={withBoundary(<AttendanceManagement />, 'Loading Attendance Management...')} />,
];

export default attendanceRoutes;
