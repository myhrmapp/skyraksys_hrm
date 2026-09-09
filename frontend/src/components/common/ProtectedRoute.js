import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CircularProgress, Box, Paper, Typography, Button } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { hasRouteAccess, getDefaultDashboard } from '../../utils/roleConfig';

const UnauthorizedPage = ({ userRole }) => {
  const defaultDashboard = getDefaultDashboard(userRole);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: 3
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 6,
          textAlign: 'center',
          maxWidth: 500,
          borderRadius: 3
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: 'error.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3
          }}
        >
          <LockIcon sx={{ fontSize: 40, color: 'error.dark' }} />
        </Box>
        <Typography variant="h4" gutterBottom fontWeight="bold" color="text.primary">
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </Typography>
        <Button
          variant="contained"
          href={defaultDashboard}
          sx={{ mt: 2 }}
        >
          Go to Dashboard
        </Button>
      </Paper>
    </Box>
  );
};

const ProtectedRoute = ({ children, requiredRoles = null }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

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

  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if requiredRoles specified
  if (requiredRoles) {
    const userRole = user?.role;
    const hasAccess = Array.isArray(requiredRoles)
      ? requiredRoles.includes(userRole)
      : requiredRoles === userRole;

    if (!hasAccess) {
      return <UnauthorizedPage userRole={userRole} />;
    }
  }

  // Check route-level access based on current path
  const userRole = user?.role;
  if (userRole && !hasRouteAccess(userRole, location.pathname)) {
    return <UnauthorizedPage userRole={userRole} />;
  }

  return children;
};

export default ProtectedRoute;
