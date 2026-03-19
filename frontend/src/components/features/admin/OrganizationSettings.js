/**
 * Organization Settings – Tabbed hub that combines
 * Departments, Positions, and Holiday Calendar into a single page.
 */
import React from 'react';
import TabbedPage from '../../common/TabbedPage';
import DepartmentManagement from './DepartmentManagement';
import PositionManagement from './PositionManagement';
import HolidayCalendarPage from '../../admin/HolidayCalendarPage';
import {
  Business as BusinessIcon,
  Work as WorkIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';

const OrganizationSettings = () => (
  <div data-testid="organization-settings-page">
  <TabbedPage
    title="Organization"
    subtitle="Manage departments, positions, and holidays"
    icon={<BusinessIcon />}
    tabs={[
      { label: 'Departments', icon: <BusinessIcon fontSize="small" />, render: () => <DepartmentManagement embedded /> },
      { label: 'Positions',   icon: <WorkIcon fontSize="small" />,     render: () => <PositionManagement embedded /> },
      { label: 'Holidays',    icon: <CalendarIcon fontSize="small" />, render: () => <HolidayCalendarPage embedded /> },
    ]}
  />
  </div>
);

export default OrganizationSettings;
