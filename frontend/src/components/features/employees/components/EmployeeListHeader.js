import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import { 
  Add as AddIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

const EmployeeListHeader = ({ canEdit, onAddEmployee, onExport }) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      mb: 4,
      flexWrap: 'wrap',
      gap: 2
    }}>
      <Box>
        <Typography 
          variant="h4" 
          component="h1"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            mb: 0.5,
            letterSpacing: '-0.5px'
          }}
        >
          Employee Directory
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
          Manage your workforce, track status, and organize teams.
        </Typography>
      </Box>
      
      <Stack direction="row" spacing={2}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={onExport}
          data-testid="employee-list-export-btn"
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            borderColor: 'divider',
            color: 'text.secondary',
            '&:hover': {
              borderColor: 'primary.main',
              color: 'primary.main',
              bgcolor: 'primary.50'
            }
          }}
        >
          Export
        </Button>
        
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddEmployee}
            data-testid="employee-list-add-btn"
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
            }}
          >
            Add Employee
          </Button>
        )}
      </Stack>
    </Box>
  );
};

export default EmployeeListHeader;
