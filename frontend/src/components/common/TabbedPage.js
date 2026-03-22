/**
 * TabbedPage – Reusable shell for tabbed hub pages.
 * Provides a consistent page header, subtitle, and MUI Tabs row.
 *
 * Tabs accept either a pre-rendered `component` or a lazy `render` function.
 * When `render` is provided, the tab content is only mounted when active,
 * preventing unnecessary API calls and side effects on hidden tabs.
 *
 * Usage:
 *   <TabbedPage
 *     title="Organization"
 *     subtitle="Manage departments, positions, and holidays"
 *     icon={<BusinessIcon />}
 *     tabs={[
 *       { label: 'Departments', render: () => <DepartmentManagement embedded /> },
 *       { label: 'Positions',   render: () => <PositionManagement embedded /> },
 *     ]}
 *   />
 */
import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Paper, useTheme, alpha } from '@mui/material';
import PropTypes from 'prop-types';

function TabPanel({ children, value, index, hasBeenActive, contentSx }) {
  const isActive = value === index;
  const shouldRender = hasBeenActive != null ? hasBeenActive : isActive;
  return (
    <Box
      role="tabpanel"
      hidden={!isActive}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
    >
      {shouldRender && <Box sx={contentSx}>{children}</Box>}
    </Box>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

const TabbedPage = ({ title, subtitle, icon, tabs = [], defaultTab = 0, testId }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([defaultTab]));
  const theme = useTheme();

  const handleTabChange = (_, newValue) => {
    setActiveTab(newValue);
    setVisitedTabs(prev => {
      if (prev.has(newValue)) return prev;
      return new Set([...prev, newValue]);
    });
  };

  return (
    <Box data-testid={testId ? `${testId}-page` : undefined} sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Page Header */}
      <Paper
        elevation={0}
        sx={{
          px: 3,
          pt: 3,
          pb: 0,
          borderRadius: 0,
          bgcolor: 'background.paper',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          {icon && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 1.5,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
              }}
            >
              {icon}
            </Box>
          )}
          <Box>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Tabs Row */}
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              minHeight: 48,
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          {tabs.map((tab, i) => (
            <Tab
              key={tab.label}
              label={tab.label}
              id={`tab-${i}`}
              aria-controls={`tabpanel-${i}`}
              icon={tab.icon || undefined}
              iconPosition="start"
              data-testid={testId ? `${testId}-tab-${tab.label.toLowerCase().replace(/\s+/g, '-')}` : undefined}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Content — lazy: mount on first visit, keep mounted */}
      {tabs.map((tab, i) => (
        <TabPanel key={tab.label} value={activeTab} index={i} hasBeenActive={visitedTabs.has(i)}>
          {tab.render ? tab.render() : tab.component}
        </TabPanel>
      ))}
    </Box>
  );
};

TabbedPage.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  icon: PropTypes.node,
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      icon: PropTypes.node,
      component: PropTypes.node,
      render: PropTypes.func,
    })
  ).isRequired,
  defaultTab: PropTypes.number,
  testId: PropTypes.string,
};

export { TabPanel };
export default TabbedPage;
