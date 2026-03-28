import React, { Component } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  Stack,
  Divider,
  Collapse,
  Chip,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Refresh,
  Home,
  BugReport,
  ExpandMore,
  ExpandLess,
  Warning,
  Error as ErrorIcon,
  Info,
  ContentCopy,
} from '@mui/icons-material';

/**
 * Smart Error Boundary with enhanced recovery options and user-friendly error handling
 */
class SmartErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      showDetails: false,
      showTechnicalDetails: false,
      isRecovering: false
    };

    // Bind methods
    this.handleRetry = this.handleRetry.bind(this);
    this.handleGoHome = this.handleGoHome.bind(this);
    this.handleReportBug = this.handleReportBug.bind(this);
    this.copyErrorDetails = this.copyErrorDetails.bind(this);
    this.toggleDetails = this.toggleDetails.bind(this);
    this.toggleTechnicalDetails = this.toggleTechnicalDetails.bind(this);
  }

  static getDerivedStateFromError(error) {
    // Update state to trigger error UI
    return { 
      hasError: true,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    // Capture error details
    this.setState({
      error,
      errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.group('🚨 Error Boundary Caught Error');
      // eslint-disable-next-line no-console
      console.error('Error:', error);
      // eslint-disable-next-line no-console
      console.error('Error Info:', errorInfo);
      // eslint-disable-next-line no-console
      console.groupEnd();
    }

    // Log error to monitoring service
    this.logErrorToService(error, errorInfo);

    // Track error for analytics
    this.trackError(error, errorInfo);
  }

  /**
   * Log error to external monitoring service (e.g., Sentry, LogRocket)
   */
  logErrorToService(error, errorInfo) {
    try {
      // Example: Log to Sentry
      if (window.Sentry) {
        window.Sentry.withScope((scope) => {
          scope.setTag('errorBoundary', true);
          scope.setLevel('error');
          scope.setContext('errorInfo', errorInfo);
          scope.setContext('componentStack', errorInfo.componentStack);
          window.Sentry.captureException(error);
        });
      }

      // Example: Log to custom error service
      if (this.props.onError) {
        this.props.onError(error, errorInfo, this.state.errorId);
      }

      // Example: Log to analytics
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: error.toString(),
          fatal: false,
          error_id: this.state.errorId
        });
      }
    } catch (loggingError) {
      console.error('Failed to log error to service:', loggingError);
    }
  }

  /**
   * Track error for internal analytics
   */
  trackError(error, errorInfo) {
    const errorData = {
      errorId: this.state.errorId,
      message: error.message,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    // Store error locally for potential later sending
    try {
      const existingErrors = JSON.parse(localStorage.getItem('errorLog') || '[]');
      existingErrors.push(errorData);
      
      // Keep only last 10 errors to prevent storage bloat
      const recentErrors = existingErrors.slice(-10);
      localStorage.setItem('errorLog', JSON.stringify(recentErrors));
    } catch (storageError) {
      console.warn('Failed to store error log:', storageError);
    }
  }

  /**
   * Attempt to recover from the error
   */
  async handleRetry() {
    this.setState({ isRecovering: true });

    try {
      // Execute recovery strategies if provided
      if (this.props.recoveryStrategies) {
        for (const strategy of this.props.recoveryStrategies) {
          try {
            if (await strategy.canRecover(this.state.error)) {
              await strategy.recover(this.state.error, this.state.errorId);
              break;
            }
          } catch (recoveryError) {
            console.warn('Recovery strategy failed:', recoveryError);
          }
        }
      }

      // Small delay to show recovery process
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reset error state
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
        isRecovering: false,
        showDetails: false,
        showTechnicalDetails: false
      }));

      // Call success callback if provided
      if (this.props.onRetry) {
        this.props.onRetry(this.state.retryCount + 1);
      }

    } catch (error) {
      console.error('Recovery failed:', error);
      this.setState({ isRecovering: false });
    }
  }

  /**
   * Navigate to home page
   */
  handleGoHome() {
    if (this.props.onGoHome) {
      this.props.onGoHome();
    } else {
      window.location.href = '/dashboard';
    }
  }

  /**
   * Report bug via email or external service
   */
  handleReportBug() {
    const errorReport = this.generateErrorReport();
    
    if (this.props.onReportBug) {
      this.props.onReportBug(errorReport);
    } else {
      // Default email reporting
      const subject = encodeURIComponent(`Bug Report - Error ${this.state.errorId}`);
      const body = encodeURIComponent(
        `I encountered an error while using the application.\n\n` +
        `Please describe what you were doing when this error occurred:\n\n\n` +
        `Error Details:\n${JSON.stringify(errorReport, null, 2)}`
      );
      
      window.location.href = `mailto:support@skyraksys.com?subject=${subject}&body=${body}`;
    }
  }

  /**
   * Copy error details to clipboard
   */
  async copyErrorDetails() {
    try {
      const errorReport = this.generateErrorReport();
      const errorText = JSON.stringify(errorReport, null, 2);
      
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(errorText);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = errorText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      // Show feedback (could use notification service)
      // Clipboard copy succeeded silently
    } catch (error) {
      console.error('Failed to copy error details:', error);
    }
  }

  /**
   * Generate comprehensive error report
   */
  generateErrorReport() {
    return {
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      error: {
        message: this.state.error?.message,
        stack: this.state.error?.stack,
        name: this.state.error?.name
      },
      componentStack: this.state.errorInfo?.componentStack,
      retryCount: this.state.retryCount,
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        localStorage: this.getSafeLocalStorage(),
        sessionStorage: this.getSafeSessionStorage()
      },
      user: {
        id: localStorage.getItem('userId'),
        role: localStorage.getItem('userRole'),
        sessionId: sessionStorage.getItem('sessionId')
      }
    };
  }

  /**
   * Safely extract non-sensitive localStorage data
   */
  getSafeLocalStorage() {
    const safe = {};
    const sensitiveKeys = ['accessToken', 'refreshToken', 'password', 'token', 'secret', 'email', 'userId', 'userRole', 'sessionId'];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
          safe[key] = localStorage.getItem(key);
        }
      }
    } catch (error) {
      safe.error = 'Unable to access localStorage';
    }
    
    return safe;
  }

  /**
   * Safely extract non-sensitive sessionStorage data
   */
  getSafeSessionStorage() {
    const safe = {};
    const sensitiveKeys = ['accessToken', 'refreshToken', 'password', 'token', 'secret', 'email', 'userId', 'userRole', 'sessionId'];
    
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && !sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
          safe[key] = sessionStorage.getItem(key);
        }
      }
    } catch (error) {
      safe.error = 'Unable to access sessionStorage';
    }
    
    return safe;
  }

  /**
   * Toggle error details visibility
   */
  toggleDetails() {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  }

  /**
   * Toggle technical details visibility
   */
  toggleTechnicalDetails() {
    this.setState(prevState => ({
      showTechnicalDetails: !prevState.showTechnicalDetails
    }));
  }

  /**
   * Get error severity level
   */
  getErrorSeverity() {
    const error = this.state.error;
    
    if (!error) return 'medium';
    
    // High severity indicators
    if (error.message?.includes('ChunkLoadError') || 
        error.message?.includes('Loading chunk') ||
        error.name === 'ChunkLoadError') {
      return 'low'; // Usually just needs a refresh
    }
    
    if (error.stack?.includes('Authentication') ||
        error.message?.includes('auth')) {
      return 'medium';
    }
    
    if (error.name === 'TypeError' || 
        error.name === 'ReferenceError') {
      return 'high';
    }
    
    return 'medium';
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage() {
    const error = this.state.error;
    const { level = 'page' } = this.props;
    
    if (!error) return 'An unexpected error occurred.';
    
    // Specific error type handling
    if (error.message?.includes('ChunkLoadError') || 
        error.message?.includes('Loading chunk')) {
      return 'There was an issue loading part of the application. A page refresh should fix this.';
    }
    
    if (error.message?.includes('Network Error')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    
    if (error.message?.includes('Permission denied')) {
      return 'You don\'t have permission to access this resource.';
    }
    
    // Generic messages based on component level
    if (level === 'page') {
      return 'We\'re sorry, but something unexpected happened while loading this page.';
    } else if (level === 'component') {
      return 'This component encountered an error and couldn\'t be displayed.';
    } else {
      return 'An unexpected error occurred in this section.';
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { fallback, level = 'page', showRetry = true, showHome = true, showReport = true } = this.props;
    const { retryCount, isRecovering, showDetails } = this.state;
    const severity = this.getErrorSeverity();

    // Use custom fallback if provided
    if (fallback) {
      return fallback(this.state.error, this.handleRetry, this.state);
    }

    const getSeverityColor = () => {
      switch (severity) {
        case 'low': return 'info';
        case 'medium': return 'warning';
        case 'high': return 'error';
        default: return 'warning';
      }
    };

    const getSeverityIcon = () => {
      switch (severity) {
        case 'low': return <Info />;
        case 'medium': return <Warning />;
        case 'high': return <ErrorIcon />;
        default: return <Warning />;
      }
    };

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: level === 'page' ? '50vh' : '200px',
          p: 3
        }}
      >
        <Card sx={{ maxWidth: 700, width: '100%' }}>
          <CardContent>
            <Stack spacing={3}>
              {/* Header */}
              <Box textAlign="center">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  {getSeverityIcon()}
                  <Typography variant="h5" color={getSeverityColor()} sx={{ ml: 1 }}>
                    Something went wrong
                  </Typography>
                </Box>
                
                <Typography variant="body1" color="text.secondary" paragraph>
                  {this.getUserFriendlyMessage()}
                </Typography>

                <Chip 
                  label={`Error ID: ${this.state.errorId}`}
                  size="small"
                  variant="outlined"
                  color={getSeverityColor()}
                />
              </Box>

              {/* Retry information */}
              {retryCount > 0 && (
                <Alert severity="info">
                  This is retry attempt #{retryCount}. If the problem persists, please report it.
                </Alert>
              )}

              {/* Recovery in progress */}
              {isRecovering && (
                <Alert severity="info">
                  Attempting to recover from the error...
                </Alert>
              )}

              <Divider />

              {/* Action buttons */}
              <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
                {showRetry && (
                  <Button
                    variant="contained"
                    startIcon={<Refresh />}
                    onClick={this.handleRetry}
                    disabled={isRecovering}
                  >
                    {isRecovering ? 'Recovering...' : 'Try Again'}
                  </Button>
                )}
                
                {showHome && level === 'page' && (
                  <Button
                    variant="outlined"
                    startIcon={<Home />}
                    onClick={this.handleGoHome}
                    disabled={isRecovering}
                  >
                    Go Home
                  </Button>
                )}
                
                {showReport && (
                  <Button
                    variant="outlined"
                    startIcon={<BugReport />}
                    onClick={this.handleReportBug}
                    disabled={isRecovering}
                  >
                    Report Issue
                  </Button>
                )}
              </Stack>

              {/* Error details toggle */}
              <Box textAlign="center">
                <Button
                  variant="text"
                  size="small"
                  onClick={this.toggleDetails}
                  endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
                >
                  {showDetails ? 'Hide' : 'Show'} Error Details
                </Button>
              </Box>

              {/* Error details */}
              <Collapse in={showDetails}>
                <Stack spacing={2}>
                  <Alert severity={getSeverityColor()}>
                    <Typography variant="subtitle2" gutterBottom>
                      Error Message:
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {this.state.error?.message || 'Unknown error'}
                    </Typography>
                  </Alert>

                  {/* Technical details accordion */}
                  {process.env.NODE_ENV === 'development' && (
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography variant="subtitle2">
                          Technical Details (Development)
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Stack spacing={2}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" gutterBottom>
                              Stack Trace:
                            </Typography>
                            <pre style={{ 
                              fontSize: '0.75rem',
                              backgroundColor: '#f5f5f5',
                              padding: '8px',
                              borderRadius: '4px',
                              overflow: 'auto',
                              maxHeight: '200px',
                              whiteSpace: 'pre-wrap'
                            }}>
                              {this.state.error?.stack || 'No stack trace available'}
                            </pre>
                          </Box>
                          
                          {this.state.errorInfo?.componentStack && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" gutterBottom>
                                Component Stack:
                              </Typography>
                              <pre style={{ 
                                fontSize: '0.75rem',
                                backgroundColor: '#f5f5f5',
                                padding: '8px',
                                borderRadius: '4px',
                                overflow: 'auto',
                                maxHeight: '150px',
                                whiteSpace: 'pre-wrap'
                              }}>
                                {this.state.errorInfo.componentStack}
                              </pre>
                            </Box>
                          )}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  )}

                  {/* Copy error details button */}
                  <Box textAlign="center">
                    <Button
                      variant="text"
                      size="small"
                      startIcon={<ContentCopy />}
                      onClick={this.copyErrorDetails}
                    >
                      Copy Error Details
                    </Button>
                  </Box>
                </Stack>
              </Collapse>

              {/* Additional help */}
              <Box textAlign="center">
                <Typography variant="body2" color="text.secondary">
                  Need help? Contact our{' '}
                  <Link 
                    href="mailto:support@skyraksys.com" 
                    underline="hover"
                    onClick={() => this.handleReportBug()}
                  >
                    support team
                  </Link>
                  {' '}or check our{' '}
                  <Link 
                    href="/help" 
                    underline="hover"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open('/help', '_blank');
                    }}
                  >
                    help documentation
                  </Link>
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }
}

/**
 * Functional wrapper for easier usage with hooks
 */
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  return function WithErrorBoundaryComponent(props) {
    return (
      <SmartErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </SmartErrorBoundary>
    );
  };
};

/**
 * Hook to manually trigger error boundary (for testing)
 */
export const useErrorHandler = () => {
  const throwError = (error) => {
    throw error instanceof Error ? error : new Error(error);
  };

  return { throwError };
};

export default SmartErrorBoundary;