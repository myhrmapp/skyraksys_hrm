import React, { Suspense } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import SmartErrorBoundary from '../components/common/SmartErrorBoundary';

export const EnhancedLoadingFallback = ({ text = 'Loading...' }) => (
  <Box
    display="flex"
    flexDirection="column"
    justifyContent="center"
    alignItems="center"
    minHeight="300px"
    gap={2}
  >
    <CircularProgress size={40} />
    <Typography variant="body2" color="textSecondary">
      {text}
    </Typography>
  </Box>
);

EnhancedLoadingFallback.propTypes = { text: PropTypes.string };

/** Wraps an element in SmartErrorBoundary + Suspense for route-level lazy loading. */
export const withBoundary = (element, text = 'Loading...') => (
  <SmartErrorBoundary level="page">
    <Suspense fallback={<EnhancedLoadingFallback text={text} />}>
      {element}
    </Suspense>
  </SmartErrorBoundary>
);
