import React from 'react';
import { Tabs, Tab, Box, Chip, useTheme } from '@mui/material';
import {
  Person as PersonIcon,
  Work as WorkIcon,
  ContactMail as ContactIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material';

const EmployeeFormTabs = ({ activeTab, handleTabChange, getTabValidationStatus }) => {
  const theme = useTheme();

  return (
    <Tabs 
      value={activeTab} 
      onChange={handleTabChange}
      variant="scrollable"
      scrollButtons="auto"
      allowScrollButtonsMobile
      sx={{ 
        bgcolor: 'white',
        borderBottom: '2px solid #e2e8f0',
        '& .MuiTab-root': {
          minHeight: 64,
          py: 2,
          px: 3,
          fontWeight: 600,
          textTransform: 'none',
          fontSize: '0.95rem',
          color: theme.palette.text.secondary,
          transition: 'all 0.2s ease',
          borderBottom: '3px solid transparent',
          '&:hover': {
            bgcolor: 'rgba(99, 102, 241, 0.04)',
            color: theme.palette.primary.main,
            borderBottomColor: 'rgba(99, 102, 241, 0.2)'
          },
          '&.Mui-selected': {
            color: theme.palette.primary.main,
            borderBottomColor: theme.palette.primary.main,
            '& .MuiSvgIcon-root': {
              color: theme.palette.primary.main
            }
          }
        },
        '& .MuiTabs-indicator': {
          display: 'none'
        },
        '& .MuiTabs-scrollButtons': {
          color: theme.palette.primary.main,
          '&.Mui-disabled': {
            opacity: 0.3
          }
        }
      }}
    >
      <Tab 
        icon={<PersonIcon />} 
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>Personal Info</span>
            {getTabValidationStatus[0].hasErrors && (
              <Chip 
                label="✗" 
                size="small" 
                sx={{ 
                  height: 20, 
                  minWidth: 20,
                  fontSize: '0.7rem',
                  bgcolor: '#fee2e2',
                  color: '#dc2626',
                  '& .MuiChip-label': { px: 0.5 }
                }} 
              />
            )}
            {!getTabValidationStatus[0].hasErrors && getTabValidationStatus[0].isComplete && (
              <Chip 
                label="✓" 
                size="small" 
                sx={{ 
                  height: 20, 
                  minWidth: 20,
                  fontSize: '0.7rem',
                  bgcolor: '#d1fae5',
                  color: '#059669',
                  '& .MuiChip-label': { px: 0.5 }
                }} 
              />
            )}
            {!getTabValidationStatus[0].hasErrors && !getTabValidationStatus[0].isComplete && (
              <Chip 
                label="⚠" 
                size="small" 
                sx={{ 
                  height: 20, 
                  minWidth: 20,
                  fontSize: '0.7rem',
                  bgcolor: '#fef3c7',
                  color: '#d97706',
                  '& .MuiChip-label': { px: 0.5 }
                }} 
              />
            )}
          </Box>
        }
        id="employee-tab-0"
        data-testid="tab-personal"
        aria-controls="employee-tabpanel-0"
      />
      <Tab 
        icon={<WorkIcon />} 
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>Employment & Compensation</span>
            {getTabValidationStatus[1].hasErrors && (
              <Chip 
                label="✗" 
                size="small" 
                sx={{ 
                  height: 20, 
                  minWidth: 20,
                  fontSize: '0.7rem',
                  bgcolor: '#fee2e2',
                  color: '#dc2626',
                  '& .MuiChip-label': { px: 0.5 }
                }} 
              />
            )}
            {!getTabValidationStatus[1].hasErrors && getTabValidationStatus[1].isComplete && (
              <Chip 
                label="✓" 
                size="small" 
                sx={{ 
                  height: 20, 
                  minWidth: 20,
                  fontSize: '0.7rem',
                  bgcolor: '#d1fae5',
                  color: '#059669',
                  '& .MuiChip-label': { px: 0.5 }
                }} 
              />
            )}
            {!getTabValidationStatus[1].hasErrors && !getTabValidationStatus[1].isComplete && (
              <Chip 
                label="⚠" 
                size="small" 
                sx={{ 
                  height: 20, 
                  minWidth: 20,
                  fontSize: '0.7rem',
                  bgcolor: '#fef3c7',
                  color: '#d97706',
                  '& .MuiChip-label': { px: 0.5 }
                }} 
              />
            )}
          </Box>
        }
        id="employee-tab-1"
        data-testid="tab-employment"
        aria-controls="employee-tabpanel-1"
      />
      <Tab 
        icon={<ContactIcon />} 
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>Contact & Emergency</span>
            {getTabValidationStatus[2].hasErrors && (
              <Chip 
                label="✗" 
                size="small" 
                sx={{ 
                  height: 20, 
                  minWidth: 20,
                  fontSize: '0.7rem',
                  bgcolor: '#fee2e2',
                  color: '#dc2626',
                  '& .MuiChip-label': { px: 0.5 }
                }} 
              />
            )}
            {!getTabValidationStatus[2].hasErrors && (
              <Chip 
                label="✓" 
                size="small" 
                sx={{ 
                  height: 20, 
                  minWidth: 20,
                  fontSize: '0.7rem',
                  bgcolor: '#d1fae5',
                  color: '#059669',
                  '& .MuiChip-label': { px: 0.5 }
                }} 
              />
            )}
          </Box>
        }
        id="employee-tab-2"
        data-testid="tab-emergency"
        aria-controls="employee-tabpanel-2"
      />
      <Tab 
        icon={<BankIcon />} 
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>Statutory, Banking & Access</span>
            {getTabValidationStatus[3].hasErrors && (
              <Chip 
                label="✗" 
                size="small" 
                sx={{ 
                  height: 20, 
                  minWidth: 20,
                  fontSize: '0.7rem',
                  bgcolor: '#fee2e2',
                  color: '#dc2626',
                  '& .MuiChip-label': { px: 0.5 }
                }} 
              />
            )}
            {!getTabValidationStatus[3].hasErrors && (
              <Chip 
                label="✓" 
                size="small" 
                sx={{ 
                  height: 20, 
                  minWidth: 20,
                  fontSize: '0.7rem',
                  bgcolor: '#d1fae5',
                  color: '#059669',
                  '& .MuiChip-label': { px: 0.5 }
                }} 
              />
            )}
          </Box>
        }
        id="employee-tab-3"
        data-testid="tab-statutory"
        aria-controls="employee-tabpanel-3"
      />
    </Tabs>
  );
};

export default EmployeeFormTabs;
