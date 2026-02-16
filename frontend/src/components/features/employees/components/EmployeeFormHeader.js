import React from 'react';
import { Box, Typography, Chip, Button, Avatar, Card, CardContent, CircularProgress, useTheme } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon, Lightbulb as LightbulbIcon } from '@mui/icons-material';

const EmployeeFormHeader = ({
  isEditMode,
  lastSaved,
  autoSaving,
  currentUser,
  onBack,
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography 
            variant="h3" 
            component="h1" 
            sx={{ 
              fontWeight: 700,
              color: 'primary.main',
              mb: 0.5,
              fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' }
            }}
          >
            {isEditMode ? 'Edit Employee' : 'Add New Employee'}
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ 
              fontWeight: 500,
              fontSize: { xs: '0.875rem', md: '1rem' }
            }}
          >
            {isEditMode ? 'Update employee details and information' : 'Create a comprehensive employee profile with all necessary details'}
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
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            variant="outlined"
            sx={{ 
              borderRadius: 2,
              px: 3,
              py: 1,
              textTransform: 'none',
              fontWeight: 600,
              borderColor: theme.palette.divider,
              color: theme.palette.text.secondary,
              '&:hover': {
                borderColor: theme.palette.primary.main,
                bgcolor: 'rgba(99, 102, 241, 0.04)',
                color: theme.palette.primary.main
              },
              transition: 'all 0.2s ease'
            }}
          >
            Back
          </Button>
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
