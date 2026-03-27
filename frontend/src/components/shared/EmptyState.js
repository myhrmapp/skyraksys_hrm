import React from 'react';
import { Box, Typography, Button } from '@mui/material';

/**
 * Shared empty-state display for zero-data scenarios.
 *
 * Props:
 *   icon         – React element, e.g. <PeopleIcon sx={{ fontSize: 48 }} />
 *   title        – Primary message (string)
 *   description  – Secondary message (string, optional)
 *   action       – { label: string, onClick: fn } (optional)
 */
const EmptyState = ({ icon, title, description, action }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      py: 8,
      px: 3,
      textAlign: 'center',
      color: 'text.secondary',
    }}
  >
    {icon && (
      <Box sx={{ mb: 2, opacity: 0.4 }}>
        {icon}
      </Box>
    )}
    <Typography variant="h6" fontWeight={600} color="text.primary" gutterBottom>
      {title}
    </Typography>
    {description && (
      <Typography variant="body2" color="text.secondary" sx={{ mb: action ? 3 : 0, maxWidth: 400 }}>
        {description}
      </Typography>
    )}
    {action && (
      <Button variant="contained" onClick={action.onClick} sx={{ textTransform: 'none', fontWeight: 600 }}>
        {action.label}
      </Button>
    )}
  </Box>
);

export default EmptyState;
