import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import { useAuthStore } from '../store/authStore';

import LoginScreen from '../screens/auth/LoginScreen';
import TabNavigator from './TabNavigator';
import LeaveRequestScreen from '../screens/leave/LeaveRequestScreen';
import PayslipDetailScreen from '../screens/payslips/PayslipDetailScreen';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  LeaveRequest: undefined;
  PayslipDetail: { payslipId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name="LeaveRequest"
              component={LeaveRequestScreen}
              options={{
                headerShown: true,
                title: 'New Leave Request',
                headerStyle: { backgroundColor: colors.primary },
                headerTintColor: '#fff',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="PayslipDetail"
              component={PayslipDetailScreen}
              options={{
                headerShown: true,
                title: 'Payslip',
                headerStyle: { backgroundColor: colors.primary },
                headerTintColor: '#fff',
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
