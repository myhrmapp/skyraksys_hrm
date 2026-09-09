import React, { createContext, useContext, useCallback, useState } from 'react';
import {
  Backdrop,
  CircularProgress,
  Box,
  Typography,
  LinearProgress,
  Skeleton,
  Card,
  CardContent,
  Grid,
  Button
} from '@mui/material';

// Loading context
const LoadingContext = createContext();

/**
 * Loading Provider Component
 * Provides centralized loading state management
 */
export const LoadingProvider = ({ children }) => {
  const [loadingStates, setLoadingStates] = useState({});
  const [globalLoading, setGlobalLoading] = useState(false);

  /**
   * Set loading state for a specific key
   * @param {string} key - Loading key
   * @param {boolean} isLoading - Loading state
   * @param {Object} options - Additional options
   */
  const setLoading = useCallback((key, isLoading, options = {}) => {
    setLoadingStates(prev => {
      if (isLoading) {
        return {
          ...prev,
          [key]: {
            isLoading: true,
            message: options.message || 'Loading...',
            progress: options.progress,
            timestamp: Date.now(),
            ...options
          }
        };
      } else {
        const { [key]: removed, ...rest } = prev;
        return rest;
      }
    });
  }, []);

  /**
   * Set global loading state
   * @param {boolean} isLoading - Loading state
   * @param {string} message - Loading message
   */
  const setGlobalLoadingState = useCallback((isLoading, message = 'Loading...') => {
    setGlobalLoading(isLoading);
    if (isLoading) {
      setLoading('global', true, { message, backdrop: true });
    } else {
      setLoading('global', false);
    }
  }, [setLoading]);

  /**
   * Check if a specific key is loading
   * @param {string} key - Loading key
   * @returns {boolean} Loading state
   */
  const isLoading = useCallback((key) => {
    return Boolean(loadingStates[key]?.isLoading);
  }, [loadingStates]);

  /**
   * Get loading state for a specific key
   * @param {string} key - Loading key
   * @returns {Object} Loading state object
   */
  const getLoadingState = useCallback((key) => {
    return loadingStates[key] || { isLoading: false };
  }, [loadingStates]);

  /**
   * Check if any loading state is active
   * @returns {boolean} Any loading state
   */
  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(state => state.isLoading);
  }, [loadingStates]);

  /**
   * Clear all loading states
   */
  const clearAllLoading = useCallback(() => {
    setLoadingStates({});
    setGlobalLoading(false);
  }, []);

  /**
   * Update progress for a loading state
   * @param {string} key - Loading key
   * @param {number} progress - Progress value (0-100)
   * @param {string} message - Optional message update
   */
  const updateProgress = useCallback((key, progress, message) => {
    setLoadingStates(prev => {
      if (prev[key]) {
        return {
          ...prev,
          [key]: {
            ...prev[key],
            progress,
            ...(message && { message })
          }
        };
      }
      return prev;
    });
  }, []);

  const contextValue = {
    loadingStates,
    globalLoading,
    setLoading,
    setGlobalLoadingState,
    isLoading,
    getLoadingState,
    isAnyLoading,
    clearAllLoading,
    updateProgress
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      <GlobalLoadingBackdrop />
    </LoadingContext.Provider>
  );
};

/**
 * Global Loading Backdrop Component
 * Renders global loading overlay
 */
const GlobalLoadingBackdrop = () => {
  const { getLoadingState } = useLoading();
  const globalState = getLoadingState('global');

  if (!globalState.isLoading) return null;

  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        flexDirection: 'column',
        gap: 2
      }}
      open={true}
    >
      <CircularProgress color="inherit" size={60} />
      <Typography variant="h6" component="div">
        {globalState.message}
      </Typography>
      {globalState.progress !== undefined && (
        <Box sx={{ width: 300 }}>
          <LinearProgress
            variant="determinate"
            value={globalState.progress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(255,255,255,0.3)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#fff'
              }
            }}
          />
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
            {Math.round(globalState.progress)}%
          </Typography>
        </Box>
      )}
    </Backdrop>
  );
};

/**
 * Hook to use loading state
 * @returns {Object} Loading methods
 */
export const useLoading = () => {
  const context = useContext(LoadingContext);

  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }

  return context;
};

/**
 * Hook for component-specific loading
 * @param {string} key - Unique loading key
 * @returns {Object} Loading state and methods
 */
export const useComponentLoading = (key) => {
  const { setLoading, isLoading, getLoadingState, updateProgress } = useLoading();

  const startLoading = useCallback((message, options = {}) => {
    setLoading(key, true, { message, ...options });
  }, [key, setLoading]);

  const stopLoading = useCallback(() => {
    setLoading(key, false);
  }, [key, setLoading]);

  const setProgress = useCallback((progress, message) => {
    updateProgress(key, progress, message);
  }, [key, updateProgress]);

  return {
    isLoading: isLoading(key),
    loadingState: getLoadingState(key),
    startLoading,
    stopLoading,
    setProgress
  };
};

/**
 * Loading Wrapper Component
 * Wraps content with loading overlay
 */
export const LoadingWrapper = ({
  children,
  loading,
  message = 'Loading...',
  size = 40,
  backdrop = false,
  skeleton = false,
  skeletonVariant = 'default'
}) => {
  if (skeleton && loading) {
    return <LoadingSkeleton variant={skeletonVariant} />;
  }

  return (
    <Box sx={{ position: 'relative', minHeight: loading ? 200 : 'auto' }}>
      {children}
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: backdrop ? 'rgba(255,255,255,0.8)' : 'transparent',
            zIndex: 1,
            gap: 2
          }}
        >
          <CircularProgress size={size} />
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

/**
 * Loading Button Component
 * Button with loading state
 */
export const LoadingButton = ({
  loading,
  children,
  loadingText = 'Loading...',
  disabled,
  onClick,
  ...props
}) => {
  const handleClick = async (event) => {
    if (loading || disabled) return;

    if (onClick) {
      await onClick(event);
    }
  };

  return (
    <Button
      {...props}
      disabled={disabled || loading}
      onClick={handleClick}
      startIcon={loading ? <CircularProgress size={16} /> : props.startIcon}
    >
      {loading ? loadingText : children}
    </Button>
  );
};

/**
 * Loading Skeleton Component
 * Renders skeleton placeholders for different content types
 */
export const LoadingSkeleton = ({ variant = 'default', count = 1 }) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'table':
        return (
          <Box>
            {[...Array(count || 5)].map((_, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, mb: 1 }}>
                <Skeleton variant="rectangular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" />
                </Box>
                <Skeleton variant="rectangular" width={80} height={32} />
              </Box>
            ))}
          </Box>
        );

      case 'card':
        return (
          <Grid container spacing={2}>
            {[...Array(count || 6)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <Skeleton variant="rectangular" height={200} />
                  <CardContent>
                    <Skeleton variant="text" width="80%" />
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        );

      case 'form':
        return (
          <Box>
            {[...Array(count || 4)].map((_, index) => (
              <Box key={index} sx={{ mb: 3 }}>
                <Skeleton variant="text" width="20%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" height={56} />
              </Box>
            ))}
            <Skeleton variant="rectangular" height={40} width={120} />
          </Box>
        );

      case 'list':
        return (
          <Box>
            {[...Array(count || 8)].map((_, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="50%" />
                </Box>
              </Box>
            ))}
          </Box>
        );

      case 'dashboard':
        return (
          <Grid container spacing={3}>
            {/* Stats Cards */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" height={40} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" height={40} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" height={40} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" height={40} />
                </CardContent>
              </Card>
            </Grid>

            {/* Chart Placeholders */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="30%" height={30} />
                  <Skeleton variant="rectangular" height={300} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="40%" height={30} />
                  <Skeleton variant="rectangular" height={300} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      default:
        return (
          <Box>
            {[...Array(count)].map((_, index) => (
              <Skeleton key={index} variant="text" sx={{ mb: 1 }} />
            ))}
          </Box>
        );
    }
  };

  return renderSkeleton();
};

/**
 * Higher-order component to add loading functionality
 * @param {React.Component} Component - Component to wrap
 * @param {Object} options - Loading options
 * @returns {React.Component} Wrapped component
 */
export const withLoading = (Component, options = {}) => {
  const WrappedComponent = (props) => {
    const { loading, ...restProps } = props;

    return (
      <LoadingWrapper loading={loading} {...options}>
        <Component {...restProps} />
      </LoadingWrapper>
    );
  };

  WrappedComponent.displayName = `withLoading(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

export default LoadingProvider;
