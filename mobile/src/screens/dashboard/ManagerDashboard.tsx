import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { cardShadow } from '../../utils/shadow';
import { useAuthStore } from '../../store/authStore';
import { dashboardApi, DashboardStats } from '../../api/dashboard';
import { leavesApi, LeaveRequest } from '../../api/leaves';
import { timesheetsApi, TimesheetEntry } from '../../api/timesheets';
import StatCard from '../../components/cards/StatCard';

export default function ManagerDashboard() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<DashboardStats>({});
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [pendingTimesheets, setPendingTimesheets] = useState<TimesheetEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, pl, pt] = await Promise.all([
        dashboardApi.getStats(),
        leavesApi.getPending().catch(() => []),
        timesheetsApi.getPending().catch(() => []),
      ]);
      setStats(s);
      setPendingLeaves(pl);
      setPendingTimesheets(pt);
    } catch {
      // empty state
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

  const handleLeaveAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await leavesApi.approve(id);
      } else {
        await leavesApi.reject(id, 'Rejected via mobile');
      }
      await load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || `Failed to ${action} leave`);
    }
  };

  const handleTimesheetAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await timesheetsApi.approve(id);
      } else {
        await timesheetsApi.reject(id, 'Rejected via mobile');
      }
      await load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || `Failed to ${action} timesheet`);
    }
  };

  const greetingName = user?.firstName || 'Manager';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{greetingName} 👋</Text>
      </View>

      {/* Team Stats */}
      <View style={styles.statsRow}>
        <StatCard label="Team Size" value={stats.totalEmployees ?? '-'} icon="👥" color={colors.primary} />
        <StatCard label="Present Today" value={stats.presentToday ?? '-'} icon="✅" color={colors.success} />
        <StatCard label="On Leave" value={stats.onLeaveToday ?? '-'} icon="🏖️" color={colors.warning} />
      </View>

      {/* Pending Approvals Stats */}
      <View style={styles.statsRow}>
        <StatCard label="Pending Leaves" value={pendingLeaves.length} icon="📝" color={colors.error} />
        <StatCard label="Pending Timesheets" value={pendingTimesheets.length} icon="⏱️" color={colors.info} />
      </View>

      {/* Pending Leave Requests */}
      {pendingLeaves.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>
            Pending Leave Requests ({pendingLeaves.length})
          </Text>
          {pendingLeaves.slice(0, 5).map((leave) => (
            <View key={leave.id} style={styles.approvalCard}>
              <View style={styles.approvalInfo}>
                <Text style={styles.approvalName}>
                  {leave.employee?.firstName} {leave.employee?.lastName}
                </Text>
                <Text style={styles.approvalDetail}>
                  {leave.leaveType?.name || 'Leave'} · {leave.totalDays} day(s)
                </Text>
                <Text style={styles.approvalDates}>
                  {leave.startDate} → {leave.endDate}
                </Text>
                {leave.reason ? <Text style={styles.approvalReason} numberOfLines={2}>{leave.reason}</Text> : null}
              </View>
              <View style={styles.approvalActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => handleLeaveAction(leave.id, 'approve')}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => handleLeaveAction(leave.id, 'reject')}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      {/* Pending Timesheets */}
      {pendingTimesheets.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>
            Pending Timesheets ({pendingTimesheets.length})
          </Text>
          {pendingTimesheets.slice(0, 5).map((ts) => (
            <View key={ts.id} style={styles.approvalCard}>
              <View style={styles.approvalInfo}>
                <Text style={styles.approvalName}>
                  {ts.employee?.firstName} {ts.employee?.lastName}
                </Text>
                <Text style={styles.approvalDetail}>
                  {ts.project?.name || 'Project'} · {ts.totalHoursWorked}h
                </Text>
                <Text style={styles.approvalDates}>Week of {ts.weekStartDate}</Text>
              </View>
              <View style={styles.approvalActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => handleTimesheetAction(ts.id!, 'approve')}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => handleTimesheetAction(ts.id!, 'reject')}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      {pendingLeaves.length === 0 && pendingTimesheets.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
          <Text style={styles.emptyText}>All caught up! No pending approvals.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  greetingSection: { marginBottom: spacing.lg },
  greeting: { ...typography.body, color: colors.textSecondary },
  name: { ...typography.h1, color: colors.text, marginTop: 2 },
  statsRow: { flexDirection: 'row', marginBottom: spacing.md },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  approvalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...cardShadow,
  },
  approvalInfo: { flex: 1 },
  approvalName: { ...typography.label, color: colors.text, marginBottom: 2 },
  approvalDetail: { ...typography.body, color: colors.textSecondary, fontSize: 13 },
  approvalDates: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  approvalReason: { ...typography.small, color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 },
  approvalActions: { flexDirection: 'column', gap: spacing.xs },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtn: { backgroundColor: colors.success },
  rejectBtn: { backgroundColor: colors.error },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
