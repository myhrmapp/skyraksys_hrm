import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, Typography } from '@mui/material';
import modernTheme from './theme/modernTheme';
import { SnackbarProvider } from 'notistack';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { LoadingProvider } from './contexts/LoadingContext';

// Error Boundary (enhanced)
import SmartErrorBoundary from './components/common/SmartErrorBoundary';

// Core Components (loaded immediately)
import Login from './components/common/Login';
import ForgotPassword from './components/common/ForgotPassword';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';

// Route groups
import dashboardRoutes from './routes/dashboardRoutes';
import employeeRoutes from './routes/employeeRoutes';
import leaveRoutes from './routes/leaveRoutes';
import timesheetRoutes from './routes/timesheetRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import payrollRoutes from './routes/payrollRoutes';
import adminRoutes from './routes/adminRoutes';

// Admin Debug Panel — only loaded in development
const AdminDebugPanel = process.env.NODE_ENV !== 'production'
  ? lazy(() => import('./components/features/admin/AdminDebugPanel'))
  : () => null;

function App() {
  return (
    <SmartErrorBoundary level="application">
      <ThemeProvider theme={modernTheme}>
        <CssBaseline />
        <LoadingProvider>
            <SnackbarProvider 
              maxSnack={3}
              preventDuplicate
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <AuthProvider>
                <SmartErrorBoundary level="routing">
                  <Routes>
                    {/* Admin Debug Panel — outside Layout, dev only */}
                    {process.env.NODE_ENV !== 'production' && (
                    <Route path="/admin/debug" element={
                      <Suspense fallback={<Box p={4}><Typography>Loading Debug Panel...</Typography></Box>}>
                        <AdminDebugPanel />
                      </Suspense>
                    } />
                    )}

                    {/* Legacy system-config redirect */}
                    <Route path="/system-config" element={<Navigate to="/admin/settings-hub" replace />} />

                    <Route path="/login" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />

                    <Route path="/" element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }>
                      {dashboardRoutes}
                      {employeeRoutes}
                      {leaveRoutes}
                      {timesheetRoutes}
                      {attendanceRoutes}
                      {payrollRoutes}
                      {adminRoutes}
                    </Route>

                    {/* 404 catch-all */}
                    <Route path="*" element={
                      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh" gap={2}>
                        <Typography variant="h3" color="textSecondary">404</Typography>
                        <Typography variant="body1" color="textSecondary">Page not found</Typography>
                        <Typography variant="body2" color="textSecondary">
                          The page you're looking for doesn't exist or has been moved.
                        </Typography>
                      </Box>
                    } />
                  </Routes>
                </SmartErrorBoundary>
              </AuthProvider>
            </SnackbarProvider>
        </LoadingProvider>
      </ThemeProvider>
    </SmartErrorBoundary>
  );
}

export default App;