import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { cardShadow } from '../../utils/shadow';
import { useAuthStore } from '../../store/authStore';
import { employeesApi, Employee } from '../../api/employees';

export default function ProfileScreen() {
  const { user, logout, biometricEnabled, setBiometric, viewMode, setViewMode } = useAuthStore();
  const isManagerRole = user?.role === 'manager' || user?.role === 'admin' || user?.role === 'hr';
  const [profile, setProfile] = useState<Employee | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await employeesApi.getMe();
      setProfile(data);
    } catch {
      // show basic user info from auth store
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled) {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        Alert.alert('Not Available', 'Biometric authentication is not available on this device');
        return;
      }
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert('Not Set Up', 'Please set up biometric authentication in your device settings');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable biometric login',
      });
      if (!result.success) return;
    }
    await setBiometric(enabled);
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (globalThis.confirm('Are you sure you want to logout?')) {
        logout();
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]);
    }
  };

  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : user
    ? `${user.firstName} ${user.lastName}`
    : '';

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Avatar + Name */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
        </View>
      </View>

      {/* Info Card */}
      {profile && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Information</Text>
          {[
            { label: 'Employee ID', value: profile.employeeId },
            { label: 'Department', value: profile.department?.name },
            { label: 'Position', value: profile.position?.title },
            { label: 'Phone', value: profile.phone },
            { label: 'Join Date', value: profile.hireDate },
          ].filter((f) => f.value).map((field) => (
            <View key={field.label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{field.label}</Text>
              <Text style={styles.infoValue}>{field.value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Settings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Settings</Text>

        {isManagerRole && (
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="people-outline" size={22} color={colors.primary} />
              <View>
                <Text style={styles.settingLabel}>Manager View</Text>
                <Text style={styles.settingSubLabel}>
                  {viewMode === 'manager' ? 'Showing manager dashboard' : 'Showing my dashboard'}
                </Text>
              </View>
            </View>
            <Switch
              testID="view-mode-switch"
              value={viewMode === 'manager'}
              onValueChange={(val) => setViewMode(val ? 'manager' : 'employee')}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={viewMode === 'manager' ? colors.primary : '#f4f3f4'}
            />
          </View>
        )}

        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="finger-print-outline" size={22} color={colors.primary} />
            <Text style={styles.settingLabel}>Biometric Login</Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleBiometricToggle}
            trackColor={{ false: colors.border, true: colors.primary + '80' }}
            thumbColor={biometricEnabled ? colors.primary : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity testID="logout-btn" style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color={colors.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>SkyrakSys HRM v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { ...typography.h1, color: '#fff', fontSize: 28 },
  displayName: { ...typography.h2, color: colors.text },
  email: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  roleBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  roleText: { ...typography.small, color: colors.primary, fontWeight: '700', letterSpacing: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...cardShadow,
  },
  cardTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  infoLabel: { ...typography.body, color: colors.textSecondary },
  infoValue: { ...typography.body, color: colors.text },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  settingLabel: { ...typography.body, color: colors.text },
  settingSubLabel: { ...typography.small, color: colors.textSecondary, marginTop: 1 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.error + '40',
    marginTop: spacing.md,
  },
  logoutText: { ...typography.captionBold, color: colors.error },
  version: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
});
