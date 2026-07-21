import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { ROLES } from '../../../utils/roleConfig';
import AdminDashboard from './AdminDashboard';
import EmployeeDashboard from './EmployeeDashboard';
import ManagerDashboard from '../../manager/ManagerDashboard';
import { Box, CircularProgress } from '@mui/material';

const DashboardHub = () => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedView = searchParams.get('view');

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return null;
  }

  const role = user.role;

  if (role === ROLES.ADMIN || role === ROLES.HR) {
    if (requestedView === 'self') return <EmployeeDashboard />;
    return <AdminDashboard />;
  }

  if (role === ROLES.MANAGER) {
    if (requestedView === 'self') return <EmployeeDashboard />;
    return <ManagerDashboard />;
  }

  return <EmployeeDashboard />;
};

export default DashboardHub;
