import React from 'react';
import EmployeeProfileModern from './EmployeeProfileModern';

/**
 * Self-Service Employee Profile View
 * Reuses the modern profile component in "self" mode.
 */
const MyProfile = () => {
  return <EmployeeProfileModern mode="self" />;
};

export default MyProfile;