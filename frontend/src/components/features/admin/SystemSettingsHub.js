/**
 * System Settings Hub – Tabbed hub that combines
 * Email Configuration, System Settings (Payslip template), and System Config into one page.
 */
import React from 'react';
import TabbedPage from '../../common/TabbedPage';
import EmailConfiguration from './EmailConfiguration';
import SystemSettings from './SystemSettings';
import SystemConfigPage from '../../admin/SystemConfigPage';
import AdminBroadcast from '../../admin/AdminBroadcast';
import IDCardCustomizer from './IDCardCustomizer';
import {
  Settings as SettingsIcon,
  Email as EmailIcon,
  AdminPanelSettings as AdminIcon,
  Campaign as CampaignIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';

const SystemSettingsHub = () => (
  <TabbedPage
    title="System Settings"
    subtitle="Email, display preferences, and advanced configuration"
    icon={<SettingsIcon />}
    tabs={[
      { label: 'Email',          icon: <EmailIcon fontSize="small" />,    render: () => <EmailConfiguration embedded /> },
      { label: 'Broadcasts',     icon: <CampaignIcon fontSize="small" />, render: () => <AdminBroadcast embedded /> },
      { label: 'ID Card',        icon: <BadgeIcon fontSize="small" />,    render: () => <IDCardCustomizer /> },
      { label: 'Preferences',    icon: <SettingsIcon fontSize="small" />, render: () => <SystemSettings embedded /> },
      { label: 'Advanced',       icon: <AdminIcon fontSize="small" />,    render: () => <SystemConfigPage embedded /> },
    ]}
    testId="settings-hub"
  />
);

export default SystemSettingsHub;
