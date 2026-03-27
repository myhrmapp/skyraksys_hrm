import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { withBoundary } from './routeHelpers';

const EmployeeList = lazy(() => import('../components/features/employees/EmployeeList'));
const EmployeeForm = lazy(() => import('../components/features/employees/EmployeeForm'));
const EmployeeProfile = lazy(() => import('../components/features/employees/EmployeeProfileModern'));
const EmployeeRecords = lazy(() => import('../components/features/employees/EmployeeRecords'));
const MyProfile = lazy(() => import('../components/features/employees/MyProfile'));
const UserAccountManagementPage = lazy(() => import('../components/features/employees/UserAccountManagementPage'));
const EmployeeReviewManagement = lazy(() => import('../components/features/reviews/EmployeeReviewManagement'));

const employeeRoutes = [
  <Route key="employees" path="employees" element={withBoundary(<EmployeeList />, 'Loading Employees...')} />,
  <Route key="employees-add" path="employees/add" element={withBoundary(<EmployeeForm />, 'Loading Add Employee...')} />,
  <Route key="employees-id" path="employees/:id" element={withBoundary(<EmployeeProfile />, 'Loading Employee Profile...')} />,
  <Route key="employees-id-edit" path="employees/:id/edit" element={withBoundary(<EmployeeForm />, 'Loading Edit Employee...')} />,
  <Route key="employees-id-user-account" path="employees/:id/user-account" element={withBoundary(<UserAccountManagementPage />, 'Loading User Account Management...')} />,
  <Route key="my-profile" path="my-profile" element={withBoundary(<MyProfile />, 'Loading My Profile...')} />,
  <Route key="my-profile-edit" path="my-profile/edit/:id" element={withBoundary(<EmployeeForm mode="self" />, 'Loading Profile Edit...')} />,
  <Route key="employee-records" path="employee-records" element={withBoundary(<EmployeeRecords />, 'Loading Employee Records...')} />,
  <Route key="add-employee-legacy" path="add-employee" element={<Navigate to="/employees/add" replace />} />,
  <Route key="employee-reviews" path="employee-reviews" element={withBoundary(<EmployeeReviewManagement />, 'Loading Employee Reviews...')} />,
];

export default employeeRoutes;
