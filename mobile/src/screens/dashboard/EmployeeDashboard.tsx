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
import { colors, spacing, borderRadius, typography } from '../../theme';
import { cardShadow } from '../../utils/shadow';
import { useAuthStore } from '../../store/authStore';
import { dashboardApi, DashboardStats } from '../../api/dashboard';
import { attendanceApi, TodayAttendance } from '../../api/attendance';
import StatCard from '../../components/cards/StatCard';

export default function EmployeeDashboard() {
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>{greeting},</Text>
        <Text style={styles.name}>{greetingName} 👋</Text>
      </View>

      {/* Check In/Out Card */}
      <View style={styles.attendanceCard}>
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

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard
          label="Leave Balance"
          value={(() => {
            const lb = stats.leaveBalance;
            if (!lb) return '-';
            if (typeof lb === 'number') return lb;
            // lb is a LeaveBalanceMap — sum all remaining days
            const total = Object.values(lb as Record<string, { remaining: number }>)
              .reduce((sum, v) => sum + (v?.remaining || 0), 0);
            return total;
          })()}
          icon="🏖️"
          color={colors.success}
        />
        <StatCard
          label="Hours This Week"
          value={stats.currentMonth?.hoursWorked ?? stats.hoursThisWeek ?? '-'}
          icon="⏱️"
          color={colors.info}
        />
        <StatCard
          label="Pending Tasks"
          value={stats.pendingRequests?.timesheets ?? stats.openTasks ?? '-'}
          icon="📋"
          color={colors.warning}
        />
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {[
          { icon: 'calendar-outline', label: 'Apply Leave', color: colors.success },
          { icon: 'time-outline', label: 'Log Time', color: colors.info },
          { icon: 'document-text-outline', label: 'Payslips', color: colors.primary },
          { icon: 'person-outline', label: 'My Profile', color: colors.warning },
        ].map((action) => (
          <TouchableOpacity key={action.label} style={styles.actionCard} activeOpacity={0.7}>
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
