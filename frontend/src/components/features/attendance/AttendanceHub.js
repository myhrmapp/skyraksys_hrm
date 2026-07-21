import React from 'react';
import { useSearchParams } from 'react-router-dom';
import MyAttendance from './MyAttendance';
import AttendanceManagement from './AttendanceManagement';

const AttendanceHub = () => {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view');

  if (view === 'management') {
    return <AttendanceManagement />;
  }

  return <MyAttendance />;
};

export default AttendanceHub;
