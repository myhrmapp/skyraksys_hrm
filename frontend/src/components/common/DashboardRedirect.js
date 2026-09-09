import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getDefaultDashboard } from '../../utils/roleConfig';
import { CircularProgress, Box } from '@mui/material';

/**
 * Component that redirects users to their role-specific dashboard
 */
const DashboardRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const dashboardPath = getDefaultDashboard(user?.role);
  return <Navigate to={dashboardPath} replace />;
};

export default DashboardRedirect;
