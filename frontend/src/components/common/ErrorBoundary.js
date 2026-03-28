import React from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack
} from '@mui/material';
import {
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Home as HomeIcon,
  BugReport as BugIcon
} from '@mui/icons-material';

/**
 * Main Error Boundary Component
 * Catches and handles React errors with comprehensive error reporting
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    this.setState({
      error,
      errorInfo
    });

    // Log to console for development
    console.error('Error Boundary caught an error:', error, errorInfo);

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Log error to external service
   * @param {Error} error - The error object
   * @param {Object} errorInfo - Additional error information
   */
  logErrorToService = (error, errorInfo) => {
    try {
      // In a real application, you would send this to an error tracking service
      // like Sentry, LogRocket, or Bugsnag
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        errorId: this.state.errorId
      };

      // Example: Send to error tracking service
      // errorTrackingService.logError(errorData);
      
      console.error('Error logged to service:', errorData);
    } catch (loggingError) {
      console.error('Failed to log error to service:', loggingError);
    }
  };

  /**
   * Reset error boundary state
   */
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });

    // Call optional reset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  /**
   * Reload the entire page
   */
  handleReload = () => {
    window.location.reload();
  };

  /**
   * Navigate to home page
   */
  handleGoHome = () => {
    window.location.href = '/';
  };

  /**
   * Copy error details to clipboard
   */
  handleCopyError = async () => {
    try {
      const errorDetails = {
        message: this.state.error?.message,
        stack: this.state.error?.stack,
        componentStack: this.state.errorInfo?.componentStack,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString()
      };

      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
      alert('Error details copied to clipboard');
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  render() {
    if (this.state.hasError) {
      // Render custom error UI
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          onReset={this.handleReset}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
          onCopyError={this.handleCopyError}
          fallback={this.props.fallback}
          showDetails={process.env.NODE_ENV === 'production' ? (this.props.showDetails === true) : (this.props.showDetails !== false)}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Error Fallback Component
 * Renders the error UI when an error occurs
 */
const ErrorFallback = ({
  error,
  errorInfo,
  errorId,
  onReset,
  onReload,
  onGoHome,
  onCopyError,
  fallback,
  showDetails
}) => {
  // Use custom fallback if provided
  if (fallback) {
    return fallback({ error, errorInfo, onReset });
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Box sx={{ mb: 3 }}>
          <ErrorIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom color="error">
            Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            We're sorry, but an unexpected error occurred. Our team has been notified.
          </Typography>
        </Box>

        <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
          <AlertTitle>Error ID: {errorId}</AlertTitle>
          Please include this ID when reporting the issue.
        </Alert>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mb: 3 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={onReset}
          >
            Try Again
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={onReload}
          >
            Reload Page
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<HomeIcon />}
            onClick={onGoHome}
          >
            Go Home
          </Button>
        </Stack>

        {showDetails && (
          <Box sx={{ textAlign: 'left' }}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BugIcon color="action" />
                  <Typography variant="h6">Error Details</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  {error && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Error Message:
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                          {error.message}
                        </Typography>
                      </Paper>
                    </Box>
                  )}

                  {error?.stack && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Stack Trace:
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 200, overflow: 'auto' }}>
                        <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
                          {error.stack}
                        </Typography>
                      </Paper>
                    </Box>
                  )}

                  {errorInfo?.componentStack && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Component Stack:
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 200, overflow: 'auto' }}>
                        <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
                          {errorInfo.componentStack}
                        </Typography>
                      </Paper>
                    </Box>
                  )}

                  <Box>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={onCopyError}
                      startIcon={<BugIcon />}
                    >
                      Copy Error Details
                    </Button>
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

/**
 * Higher-order component to wrap components with error boundary
 * @param {React.Component} Component - Component to wrap
 * @param {Object} options - Error boundary options
 * @returns {React.Component} Wrapped component
 */
export const withErrorBoundary = (Component, options = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...options}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

/**
 * Hook to handle errors in functional components
 * @returns {Function} Error handler function
 */
export const useErrorHandler = () => {
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return React.useCallback((error) => {
    setError(error);
  }, []);
};

/**
 * Async Error Boundary Component
 * Catches errors from async operations
 */
export const AsyncErrorBoundary = ({ children, fallback, onError }) => {
  const handleError = useErrorHandler();

  const handleAsyncError = React.useCallback((error) => {
    if (onError) {
      onError(error);
    }
    handleError(error);
  }, [handleError, onError]);

  return (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <AsyncErrorProvider onError={handleAsyncError}>
        {children}
      </AsyncErrorProvider>
    </ErrorBoundary>
  );
};

/**
 * Context for handling async errors
 */
const AsyncErrorContext = React.createContext();

const AsyncErrorProvider = ({ children, onError }) => {
  const handleAsyncError = React.useCallback((error) => {
    onError(error);
  }, [onError]);

  return (
    <AsyncErrorContext.Provider value={{ handleAsyncError }}>
      {children}
    </AsyncErrorContext.Provider>
  );
};

/**
 * Hook to handle async errors
 * @returns {Function} Async error handler
 */
export const useAsyncError = () => {
  const context = React.useContext(AsyncErrorContext);
  
  if (!context) {
    throw new Error('useAsyncError must be used within an AsyncErrorProvider');
  }
  
  return context.handleAsyncError;
};

export default ErrorBoundary;
