import React from 'react';
import { Tabs, Tab, Box, useTheme } from '@mui/material';
import {
  Person as PersonIcon,
  Work as WorkIcon,
  ContactMail as ContactIcon,
  AccountBalance as BankIcon,
  CheckCircle as OkIcon,
  Error as ErrorIcon,
  Warning as WarnIcon,
} from '@mui/icons-material';

const EmployeeFormTabs = ({ activeTab, handleTabChange, getTabValidationStatus, hideSensitiveTabs = false }) => {
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
          '&:hover': {
            bgcolor: 'rgba(99, 102, 241, 0.04)',
            color: theme.palette.primary.main,
          },
          '&.Mui-selected': {
            color: theme.palette.primary.main,
            '& .MuiSvgIcon-root': {
              color: theme.palette.primary.main
            }
          },
          '&.Mui-focusVisible': {
            outline: `3px solid ${theme.palette.primary.main}`,
            outlineOffset: '-3px',
            borderRadius: 1
          }
        },
        '& .MuiTabs-indicator': {
          height: 3,
          borderRadius: '3px 3px 0 0',
          backgroundColor: theme.palette.primary.main
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
              <ErrorIcon sx={{ fontSize: 16, color: '#dc2626' }} />
            )}
            {!getTabValidationStatus[0].hasErrors && getTabValidationStatus[0].isComplete && (
              <OkIcon sx={{ fontSize: 16, color: '#059669' }} />
            )}
            {!getTabValidationStatus[0].hasErrors && !getTabValidationStatus[0].isComplete && (
              <WarnIcon sx={{ fontSize: 16, color: '#d97706'
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
              <ErrorIcon sx={{ fontSize: 16, color: '#dc2626' }} />
            )}
            {!getTabValidationStatus[1].hasErrors && getTabValidationStatus[1].isComplete && (
              <OkIcon sx={{ fontSize: 16, color: '#059669' }} />
            )}
            {!getTabValidationStatus[1].hasErrors && !getTabValidationStatus[1].isComplete && (
              <WarnIcon sx={{ fontSize: 16, color: '#d97706' }} />
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
              <ErrorIcon sx={{ fontSize: 16, color: '#dc2626' }} />
            )}
            {!getTabValidationStatus[2].hasErrors && (
              <OkIcon sx={{ fontSize: 16, color: '#059669' }} />
            )}
          </Box>
        }
        id="employee-tab-2"
        data-testid="tab-emergency"
        aria-controls="employee-tabpanel-2"
      />
      {!hideSensitiveTabs && (
      <Tab 
        icon={<BankIcon />} 
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>Statutory, Banking & Access</span>
            {getTabValidationStatus[3].hasErrors && (
              <ErrorIcon sx={{ fontSize: 16, color: '#dc2626' }} />
            )}
            {!getTabValidationStatus[3].hasErrors && (
              <OkIcon sx={{ fontSize: 16, color: '#059669' }} />
            )}
          </Box>
        }
        id="employee-tab-3"
        data-testid="tab-statutory"
        aria-controls="employee-tabpanel-3"
      />
      )}
    </Tabs>
  );
};

export default EmployeeFormTabs;
