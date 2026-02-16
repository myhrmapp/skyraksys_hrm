import React from 'react';
import { Box } from '@mui/material';

const TabPanel = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`employee-tabpanel-${index}`}
      aria-labelledby={`employee-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ 
          p: { xs: 3, md: 4 },
          bgcolor: 'white',
          minHeight: '500px'
        }}>
          {children}
        </Box>
      )}
    </div>
  );
};

export default TabPanel;
