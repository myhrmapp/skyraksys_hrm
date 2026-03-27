import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { withBoundary } from './routeHelpers';

const PayrollManagement = lazy(() => import('../components/features/payroll/ModernPayrollManagement'));
const EmployeePayslips = lazy(() => import('../components/features/payroll/EmployeePayslips'));

const payrollRoutes = [
  <Route key="payroll-management" path="payroll-management" element={withBoundary(<PayrollManagement />, 'Loading Payroll Management...')} />,
  <Route key="employee-payslips" path="employee-payslips" element={withBoundary(<EmployeePayslips />, 'Loading Employee Payslips...')} />,
];

export default payrollRoutes;
