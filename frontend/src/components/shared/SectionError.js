import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

const SectionError = ({ message = 'Something went wrong.', onRetry }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      py: 8,
      gap: 2,
      color: 'text.secondary',
    }}
  >
    <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.main' }} />
    <Typography variant="h6" color="error">
      {message}
    </Typography>
    {onRetry && (
      <Button
        variant="outlined"
        color="error"
        startIcon={<RefreshIcon />}
        onClick={onRetry}
      >
        Try again
      </Button>
    )}
  </Box>
);

export default SectionError;
