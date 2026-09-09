import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Skeleton,
  Card,
  CardContent,
  Grid,
  LinearProgress
} from '@mui/material';

// Basic loading spinner
export const LoadingSpinner = ({
  size = 40,
  text = 'Loading...',
  color = 'primary',
  variant = 'indeterminate'
}) => (
  <Box
    display="flex"
    flexDirection="column"
    justifyContent="center"
    alignItems="center"
    minHeight="200px"
    gap={2}
  >
    <CircularProgress
      size={size}
      color={color}
      variant={variant}
    />
    {text && (
      <Typography variant="body2" color="textSecondary">
        {text}
      </Typography>
    )}
  </Box>
);

// Full page loading overlay
export const LoadingOverlay = ({ text = 'Loading...', open = true }) => {
  if (!open) return null;

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      bgcolor="rgba(255, 255, 255, 0.9)"
      zIndex={9999}
      gap={2}
    >
      <CircularProgress size={60} />
      <Typography variant="h6" color="textSecondary">
        {text}
      </Typography>
    </Box>
  );
};

// Skeleton loader for cards
export const CardSkeleton = ({ count = 1 }) => (
  <Grid container spacing={2}>
    {Array.from({ length: count }, (_, index) => (
      <Grid item xs={12} sm={6} md={4} key={index}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="40%" height={20} />
            <Skeleton variant="rectangular" width="100%" height={100} sx={{ mt: 2 }} />
            <Box display="flex" gap={1} mt={2}>
              <Skeleton variant="rectangular" width={80} height={32} />
              <Skeleton variant="rectangular" width={80} height={32} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

// Table skeleton loader
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <Box>
    {Array.from({ length: rows }, (_, rowIndex) => (
      <Box key={rowIndex} display="flex" gap={2} py={1}>
        {Array.from({ length: columns }, (_, colIndex) => (
          <Skeleton
            key={colIndex}
            variant="text"
            width={`${100 / columns}%`}
            height={40}
          />
        ))}
      </Box>
    ))}
  </Box>
);

// List skeleton loader
export const ListSkeleton = ({ items = 5 }) => (
  <Box>
    {Array.from({ length: items }, (_, index) => (
      <Box key={index} display="flex" alignItems="center" gap={2} py={2}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box flex={1}>
          <Skeleton variant="text" width="70%" height={20} />
          <Skeleton variant="text" width="50%" height={16} />
        </Box>
        <Skeleton variant="rectangular" width={80} height={32} />
      </Box>
    ))}
  </Box>
);

// Progress bar with text
export const ProgressLoader = ({
  progress = 0,
  text = 'Processing...',
  showPercentage = true
}) => (
  <Box width="100%" p={2}>
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
      <Typography variant="body2" color="textSecondary">
        {text}
      </Typography>
      {showPercentage && (
        <Typography variant="body2" color="textSecondary">
          {Math.round(progress)}%
        </Typography>
      )}
    </Box>
    <LinearProgress variant="determinate" value={progress} />
  </Box>
);

// Button loading state
export const LoadingButton = ({
  loading = false,
  children,
  loadingText = 'Loading...',
  component: Component = 'button',
  ...props
}) => (
  <Box position="relative" display="inline-block">
    <Component
      {...props}
      disabled={loading || props.disabled}
    >
      {loading ? loadingText : children}
    </Component>
    {loading && (
      <CircularProgress
        size={24}
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          marginTop: '-12px',
          marginLeft: '-12px'
        }}
      />
    )}
  </Box>
);

// Enhanced fallback component for Suspense
export const SuspenseFallback = ({
  text = 'Loading component...',
  variant = 'spinner' // "spinner", "skeleton", "progress"
}) => {
  switch (variant) {
    case 'skeleton':
      return <CardSkeleton count={3} />;
    case 'progress':
      return <ProgressLoader text={text} progress={75} />;
    default:
      return <LoadingSpinner text={text} />;
  }
};

// Data loading states
export const DataLoader = ({
  loading,
  error,
  data,
  children,
  loadingComponent,
  errorComponent,
  emptyComponent
}) => {
  if (loading) {
    return loadingComponent || <LoadingSpinner text="Loading data..." />;
  }

  if (error) {
    return errorComponent || (
      <Box textAlign="center" py={4}>
        <Typography color="error" variant="h6">
          Error loading data
        </Typography>
        <Typography color="textSecondary" variant="body2">
          {error.message || 'Something went wrong'}
        </Typography>
      </Box>
    );
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return emptyComponent || (
      <Box textAlign="center" py={4}>
        <Typography color="textSecondary" variant="h6">
          No data available
        </Typography>
      </Box>
    );
  }

  return children;
};

export default {
  LoadingSpinner,
  LoadingOverlay,
  CardSkeleton,
  TableSkeleton,
  ListSkeleton,
  ProgressLoader,
  LoadingButton,
  SuspenseFallback,
  DataLoader
};
