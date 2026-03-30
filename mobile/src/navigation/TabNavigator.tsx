import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useAuthStore } from '../store/authStore';

import EmployeeDashboard from '../screens/dashboard/EmployeeDashboard';
import ManagerDashboard from '../screens/dashboard/ManagerDashboard';
import AttendanceScreen from '../screens/attendance/AttendanceScreen';
import LeaveScreen from '../screens/leave/LeaveScreen';
import TimesheetScreen from '../screens/timesheet/TimesheetScreen';
import PayslipListScreen from '../screens/payslips/PayslipListScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

export type TabParamList = {
  Home: undefined;
  Attendance: undefined;
  Leave: undefined;
  Timesheet: undefined;
  Payslips: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<string, { focused: keyof typeof Ionicons.glyphMap; outline: keyof typeof Ionicons.glyphMap }> = {
  Home: { focused: 'home', outline: 'home-outline' },
  Attendance: { focused: 'finger-print', outline: 'finger-print-outline' },
  Leave: { focused: 'calendar', outline: 'calendar-outline' },
  Timesheet: { focused: 'time', outline: 'time-outline' },
  Payslips: { focused: 'document-text', outline: 'document-text-outline' },
  Profile: { focused: 'person', outline: 'person-outline' },
};

export default function TabNavigator() {
  const user = useAuthStore((s) => s.user);
  const viewMode = useAuthStore((s) => s.viewMode);
  const isManagerRole = user?.role === 'manager' || user?.role === 'admin' || user?.role === 'hr';
  const DashboardComponent = isManagerRole && viewMode === 'manager' ? ManagerDashboard : EmployeeDashboard;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name] || TAB_ICONS.Home;
          const iconName = focused ? icons.focused : icons.outline;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '700',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={DashboardComponent}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Leave" component={LeaveScreen} />
      <Tab.Screen name="Timesheet" component={TimesheetScreen} />
      <Tab.Screen name="Payslips" component={PayslipListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
