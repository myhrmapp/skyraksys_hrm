import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { withBoundary } from './routeHelpers';

const LeaveHub = lazy(() => import('../components/features/leave/LeaveHub'));
const LeaveBalance = lazy(() => import('../components/features/leave/LeaveBalanceModern'));
const AddLeaveRequest = lazy(() => import('../components/features/leave/LeaveRequest'));
const LeaveTypeManagement = lazy(() => import('../components/features/leave/LeaveTypeManagement'));
const LeaveAccrualManagement = lazy(() => import('../components/features/leave/LeaveAccrualManagement'));

const leaveRoutes = [
  <Route key="leave-hub" path="leave" element={withBoundary(<LeaveHub />, 'Loading Leave...')} />,
  <Route key="add-leave-request" path="add-leave-request" element={withBoundary(<AddLeaveRequest />, 'Loading Leave Request Form...')} />,
  <Route key="admin-leave-balances" path="admin/leave-balances" element={withBoundary(<LeaveBalance />, 'Loading Leave Balance Admin...')} />,
  <Route key="admin-leave-accrual" path="admin/leave-accrual" element={withBoundary(<LeaveAccrualManagement />, 'Loading Leave Accrual...')} />,
  <Route key="admin-leave-types" path="admin/leave-types" element={withBoundary(<LeaveTypeManagement />, 'Loading Leave Types...')} />,
];

export default leaveRoutes;
