import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { cardShadow } from '../../utils/shadow';
import { useAuthStore } from '../../store/authStore';
import { dashboardApi, DashboardStats } from '../../api/dashboard';
import { attendanceApi, TodayAttendance } from '../../api/attendance';
import StatCard from '../../components/cards/StatCard';

export default function EmployeeDashboard() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<DashboardStats>({});
  const [attendance, setAttendance] = useState<TodayAttendance | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([
        dashboardApi.getEmployeeStats(),
        attendanceApi.getToday(),
      ]);
      setStats(s);
      setAttendance(a);
    } catch {
      // silently fail — user sees empty state
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

  const handleCheckInOut = async () => {
    setCheckingIn(true);
    try {
      if (attendance?.checkedIn && !attendance?.checkOut) {
        await attendanceApi.checkOut();
      } else {
        await attendanceApi.checkIn();
      }
      await load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to record attendance');
    } finally {
      setCheckingIn(false);
    }
  };

  const greetingName = user?.firstName || 'Employee';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const isCheckedIn = attendance?.checkedIn && !attendance?.checkOut;
  const isCheckedOut = attendance?.checkedIn && !!attendance?.checkOut;

  // Format days: 12.00 → "12", 1.5 → "1.5"
  const fmtDays = (v: unknown): string => {
    const n = Number(v) || 0;
    return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(1);
  };

  // Compute leave balance aggregate and breakdown
  const leaveBalanceData = (() => {
    const lb = stats.leaveBalance;
    if (!lb || typeof lb === 'number') {
      return { total: typeof lb === 'number' ? lb : 0, breakdown: [] as { name: string; remaining: number; total: number }[] };
    }
    const entries = Object.entries(lb as Record<string, { remaining: number; total: number; used: number }>);
    const breakdown = entries.map(([key, v]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      remaining: Number(v?.remaining) || 0,
      total: Number(v?.total) || 0,
    }));
    const total = breakdown.reduce((sum, v) => sum + v.remaining, 0);
    return { total, breakdown };
  })();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Greeting */}
      <View testID="greeting-section" style={styles.greetingSection}>
        <Text style={styles.greeting}>{greeting},</Text>
        <Text style={styles.name}>{greetingName} 👋</Text>
      </View>

      {/* Check In/Out Card */}
      <View testID="attendance-card" style={styles.attendanceCard}>
        <View style={styles.attendanceInfo}>
          <Text style={styles.attendanceLabel}>Today's Attendance</Text>
          {attendance?.checkIn && (
            <Text style={styles.attendanceTime}>
              In: {new Date(attendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {attendance.checkOut && ` · Out: ${new Date(attendance.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </Text>
          )}
          {!attendance?.checkIn && (
            <Text style={styles.attendanceTime}>Not checked in yet</Text>
          )}
        </View>
        <TouchableOpacity
          testID="check-in-out-btn"
          style={[
            styles.checkBtn,
            isCheckedIn && styles.checkOutBtn,
            isCheckedOut && styles.doneBtn,
          ]}
          onPress={handleCheckInOut}
          disabled={checkingIn || isCheckedOut}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isCheckedIn ? 'log-out-outline' : 'finger-print-outline'}
            size={22}
            color="#fff"
          />
          <Text style={styles.checkBtnText}>
            {isCheckedOut ? 'Done' : isCheckedIn ? 'Check Out' : 'Check In'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Leave Balance Card */}
      <View testID="leave-balance-card" style={styles.leaveBalanceCard}>
        <View style={styles.leaveBalanceHeader}>
          <View style={[styles.lbIconCircle, { backgroundColor: colors.success + '18' }]}>
            <Ionicons name="calendar-outline" size={20} color={colors.success} />
          </View>
          <Text style={styles.lbTitle}>Leave Balance</Text>
          <Text style={[styles.lbTotal, { color: colors.success }]}>{fmtDays(leaveBalanceData.total)} days</Text>
        </View>
        {leaveBalanceData.breakdown.length > 0 ? (
          leaveBalanceData.breakdown.map((b) => {
            const usedPct = b.total > 0 ? Math.min(((b.total - b.remaining) / b.total) * 100, 100) : 0;
            return (
              <View key={b.name} style={styles.lbRow}>
                <View style={styles.lbRowTop}>
                  <Text style={styles.lbTypeName}>{b.name}</Text>
                  <Text style={styles.lbTypeValue}>
                    <Text style={{ fontWeight: '700', color: colors.text }}>{fmtDays(b.remaining)}</Text>
                    <Text style={{ color: colors.textSecondary }}> / {fmtDays(b.total)}</Text>
                  </Text>
                </View>
                <View style={styles.lbBar}>
                  <View style={[styles.lbBarFill, { width: `${usedPct}%` as any }]} />
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.lbEmpty}>No leave balance data available</Text>
        )}
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard
          label="Hours This Week"
          value={stats.currentMonth?.hoursWorked ?? stats.hoursThisWeek ?? '-'}
          iconName="time-outline"
          color={colors.info}
        />
        <StatCard
          label="Open Tasks"
          value={stats.openTasks ?? '-'}
          iconName="checkmark-circle-outline"
          color={colors.warning}
        />
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {[
          { icon: 'calendar-outline', label: 'Apply Leave',  color: colors.success, onPress: () => navigation.navigate('LeaveRequest') },
          { icon: 'time-outline',     label: 'Log Time',     color: colors.info,    onPress: () => navigation.navigate('Timesheet') },
          { icon: 'list-circle-outline', label: 'My Tasks',  color: colors.warning, onPress: () => navigation.navigate('Tasks') },
          { icon: 'document-text-outline', label: 'Payslips', color: colors.primary, onPress: () => navigation.navigate('Payslips') },
          { icon: 'person-outline',   label: 'My Profile',   color: colors.textSecondary, onPress: () => navigation.navigate('Profile') },
        ].map((action) => (
          <TouchableOpacity key={action.label} style={styles.actionCard} activeOpacity={0.7} onPress={action.onPress}>
            <View style={[styles.actionIcon, { backgroundColor: action.color + '18' }]}>
              <Ionicons name={action.icon as any} size={24} color={action.color} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  greetingSection: { marginBottom: spacing.lg },
  greeting: { ...typography.body, color: colors.textSecondary },
  name: { ...typography.h1, color: colors.text, marginTop: 2 },
  attendanceCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  attendanceInfo: { flex: 1 },
  attendanceLabel: { ...typography.caption, color: 'rgba(255,255,255,0.8)' },
  attendanceTime: { ...typography.body, color: '#fff', fontWeight: '600', marginTop: 4 },
  checkBtn: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkOutBtn: { backgroundColor: colors.warning },
  doneBtn: { backgroundColor: colors.textSecondary, opacity: 0.7 },
  checkBtnText: { ...typography.label, color: '#fff' },
  statsRow: { flexDirection: 'row', marginBottom: spacing.lg },
  leaveBalanceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...cardShadow,
  },
  leaveBalanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  lbIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  lbTitle: { ...typography.captionBold, color: colors.text, flex: 1 },
  lbTotal: { ...typography.h3, fontWeight: '700' },
  lbRow: {
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lbRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  lbTypeName: { ...typography.caption, color: colors.textSecondary, textTransform: 'capitalize' },
  lbTypeValue: { ...typography.caption },
  lbBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 2,
  },
  lbBarFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.error + '80',
  },
  lbEmpty: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.sm },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    ...cardShadow,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionLabel: { ...typography.label, color: colors.text },
});
