/**
 * Timesheet Hub – Tabbed hub that combines
 * My Timesheet, Approvals (manager+), and History into one page.
 */
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import TabbedPage from '../../common/TabbedPage';
import ModernWeeklyTimesheet from './ModernWeeklyTimesheet';
import TimesheetApproval from './TimesheetApproval';
import TimesheetHistory from './TimesheetHistory';
import { useAuth } from '../../../contexts/AuthContext';
import {
  Schedule as TimesheetIcon,
  CheckCircleOutline as ApprovalIcon,
  History as HistoryIcon,
} from '@mui/icons-material';

const TimesheetHub = () => {
  const { isAdmin, isHR, isManager } = useAuth();
  const [searchParams] = useSearchParams();
  const canApprove = isAdmin || isHR || isManager;

  const tabs = [
    { label: 'My Timesheet', icon: <TimesheetIcon fontSize="small" />, render: () => <ModernWeeklyTimesheet embedded /> },
    ...(canApprove
      ? [{ label: 'Approvals', icon: <ApprovalIcon fontSize="small" />, render: () => <TimesheetApproval embedded /> }]
      : []),
    { label: 'History', icon: <HistoryIcon fontSize="small" />, render: () => <TimesheetHistory embedded /> },
  ];

  // Default to Approvals tab when navigated from Work menu
  const defaultTab = (searchParams.get('view') === 'approvals' && canApprove) ? 1 : 0;

  return (
    <TabbedPage
      title="Timesheets"
      subtitle="Track time, approve team timesheets, and view history"
      icon={<TimesheetIcon />}
      tabs={tabs}
      defaultTab={defaultTab}
      testId="timesheet-hub"
    />
  );
};

export default TimesheetHub;
