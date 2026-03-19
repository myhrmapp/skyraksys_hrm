import React from 'react';
import EmployeeProfileModern from './EmployeeProfileModern';

/**
 * Self-Service Employee Profile View
 * Reuses the modern profile component in "self" mode.
 */
const MyProfile = () => {
  return <div data-testid="my-profile-page"><EmployeeProfileModern mode="self" /></div>;
};

export default MyProfile;