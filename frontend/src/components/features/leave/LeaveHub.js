import React from 'react';
import { useSearchParams } from 'react-router-dom';
import EmployeeLeaveRequests from './EmployeeLeaveRequests';
import LeaveManagement from './LeaveManagement';

const LeaveHub = () => {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view');

  if (view === 'management') {
    return <LeaveManagement />;
  }

  return <EmployeeLeaveRequests />;
};

export default LeaveHub;
