import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip, Button, Avatar, Card, CardContent, CircularProgress, useTheme } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon, Lightbulb as LightbulbIcon } from '@mui/icons-material';

const EmployeeFormHeader = ({
  isEditMode,
  lastSaved,
  autoSaving,
  currentUser,
  onBack,
  employeeName,
}) => {
  const theme = useTheme();
  // Tick every 30s so the "saved N mins ago" label stays current.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!lastSaved) return;
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, [lastSaved]);

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            size="small"
            sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 500 }}
          >
            {isEditMode ? 'Back to Profile' : 'Back to Employees'}
          </Button>
        </Box>

        <Box>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ fontWeight: 700, color: 'text.primary', mb: 0.25 }}
          >
            {isEditMode
              ? (employeeName ? `Edit — ${employeeName}` : 'Edit Employee')
              : 'Add New Employee'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isEditMode ? 'Update employee details across all sections' : 'Fill in all sections to create a complete employee profile'}
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          {/* Auto-save Status Indicator */}
          {lastSaved && (
            <Chip
              size="small"
              icon={autoSaving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon fontSize="small" />}
              label={
                autoSaving 
                  ? 'Saving...' 
                  : `Saved ${(() => {
                      const minutes = Math.floor((new Date() - lastSaved) / 60000);
                      if (minutes < 1) return 'just now';
                      if (minutes === 1) return '1 min ago';
                      if (minutes < 60) return `${minutes} mins ago`;
                      const hours = Math.floor(minutes / 60);
                      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
                    })()}`
              }
              sx={{
                bgcolor: autoSaving ? 'rgba(99, 102, 241, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                color: autoSaving ? 'primary.main' : '#10b981',
                border: `1px solid ${autoSaving ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                fontWeight: 600,
                fontSize: '0.75rem'
              }}
            />
          )}
          
          {currentUser && (
            <Chip 
              avatar={
                <Avatar 
                  sx={{ 
                    bgcolor: 'primary.main',
                    width: 28,
                    height: 28
                  }}
                >
                  {currentUser.firstName?.[0] || 'U'}
                </Avatar>
              }
              label={`${currentUser.firstName || ''} ${currentUser.lastName || ''}`}
              sx={{ 
                fontWeight: 600,
                bgcolor: 'rgba(99, 102, 241, 0.08)',
                color: theme.palette.primary.main,
                border: '1px solid rgba(99, 102, 241, 0.2)',
                '& .MuiChip-label': {
                  px: 1.5
                }
              }}
            />
          )}

        </Box>
      </Box>

      {/* Info Card */}
      <Card 
        elevation={0} 
        sx={{ 
          bgcolor: 'primary.50',
          border: '1px solid',
          borderColor: 'primary.100',
          borderRadius: 2
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Box 
            sx={{ 
              color: theme.palette.text.secondary,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap'
            }}
          >
            <LightbulbIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography component="span" variant="body2">
              <strong>Quick Tips:</strong>
            </Typography>
            <Typography component="span" variant="body2">
              Press
            </Typography>
            <Chip label="Ctrl+S" size="small" sx={{ height: 20, fontSize: '0.7rem', mx: 0.5 }} />
            <Typography component="span" variant="body2">
              to save •
            </Typography>
            <Chip label="Esc" size="small" sx={{ height: 20, fontSize: '0.7rem', mx: 0.5 }} />
            <Typography component="span" variant="body2">
              to cancel • Form auto-saves as you type
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EmployeeFormHeader;
