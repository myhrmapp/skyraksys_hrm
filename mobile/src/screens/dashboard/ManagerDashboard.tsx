import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { cardShadow } from '../../utils/shadow';
import { useAuthStore } from '../../store/authStore';
import { dashboardApi, DashboardStats } from '../../api/dashboard';
import { leavesApi, LeaveRequest } from '../../api/leaves';
import { timesheetsApi, TimesheetEntry } from '../../api/timesheets';
import StatCard from '../../components/cards/StatCard';
import { formatDateRange, formatDateMed } from '../../utils/formatDate';
import { showSuccess, showError } from '../../utils/toast';

export default function ManagerDashboard() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<DashboardStats>({});
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [pendingTimesheets, setPendingTimesheets] = useState<TimesheetEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    visible: boolean;
    id: string;
    type: 'leave' | 'timesheet';
    name: string;
  }>({ visible: false, id: '', type: 'leave', name: '' });
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, pl, pt] = await Promise.all([
        dashboardApi.getStats(),
        leavesApi.getPending().catch(() => []),
        timesheetsApi.getPending().catch(() => []),
      ]);
      // Backend getManagerStats returns { stats: { employees: { total, onLeave, ... } } }
      // Flatten nested structure for easy access
      const nested = (s as any)?.stats;
      if (nested?.employees) {
        s.totalEmployees = nested.employees.total;
        s.presentToday = (nested.employees.active ?? nested.employees.total ?? 0) - (nested.employees.onLeave ?? 0);
        s.onLeaveToday = nested.employees.onLeave;
        s.pendingLeaves = nested.leaves?.pending;
        s.pendingTimesheets = nested.timesheets?.pending;
      }
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

  const handleLeaveAction = async (id: string, action: 'approve' | 'reject', leave: LeaveRequest) => {
    if (action === 'reject') {
      const name = `${leave.employee?.firstName || ''} ${leave.employee?.lastName || ''}`.trim();
      setRejectReason('');
      setRejectModal({ visible: true, id, type: 'leave', name });
      return;
    }
    setActionId(id);
    try {
      await leavesApi.approve(id);
      showSuccess('Leave request approved');
      await load();
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Failed to approve leave');
    } finally {
      setActionId(null);
    }
  };

  const handleTimesheetAction = async (id: string, action: 'approve' | 'reject', ts: TimesheetEntry) => {
    if (action === 'reject') {
      const name = `${ts.employee?.firstName || ''} ${ts.employee?.lastName || ''}`.trim();
      setRejectReason('');
      setRejectModal({ visible: true, id, type: 'timesheet', name });
      return;
    }
    setActionId(id);
    try {
      await timesheetsApi.approve(id);
      await load();
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Failed to approve timesheet');
    } finally {
      setActionId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      showError('Please provide a reason for rejection');
      return;
    }
    const { id, type } = rejectModal;
    setRejectModal((m) => ({ ...m, visible: false }));
    setActionId(id);
    try {
      if (type === 'leave') {
        await leavesApi.reject(id, rejectReason.trim());
        showSuccess('Leave request rejected');
      } else {
        await timesheetsApi.reject(id, rejectReason.trim());
        showSuccess('Timesheet rejected');
      }
      await load();
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Failed to reject');
    } finally {
      setActionId(null);
    }
  };

  const greetingName = user?.firstName || 'Manager';

  return (
    <>
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
        <StatCard label="Team Size"      value={stats.totalEmployees ?? '-'} iconName="people-outline"         color={colors.primary} />
        <StatCard label="Present Today"  value={stats.presentToday ?? '-'}   iconName="checkmark-circle-outline" color={colors.success} />
        <StatCard label="On Leave"       value={stats.onLeaveToday ?? '-'}   iconName="airplane-outline"        color={colors.warning} />
      </View>

      {/* Pending Approvals Stats */}
      <View style={styles.statsRow}>
        <StatCard label="Pending Leaves"     value={pendingLeaves.length}     iconName="calendar-outline"   color={colors.error} />
        <StatCard label="Pending Timesheets" value={pendingTimesheets.length} iconName="time-outline"        color={colors.info} />
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
                  {formatDateRange(leave.startDate, leave.endDate)}
                </Text>
                {leave.reason ? <Text style={styles.approvalReason} numberOfLines={2}>{leave.reason}</Text> : null}
              </View>
              <View style={styles.approvalActions}>
                <TouchableOpacity
                  testID={`leave-approve-${leave.id}`}
                  style={[styles.actionBtn, styles.approveBtn, actionId === leave.id && styles.btnDisabled]}
                  onPress={() => handleLeaveAction(leave.id, 'approve', leave)}
                  disabled={actionId !== null}
                >
                  {actionId === leave.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  testID={`leave-reject-${leave.id}`}
                  style={[styles.actionBtn, styles.rejectBtn, actionId !== null && styles.btnDisabled]}
                  onPress={() => handleLeaveAction(leave.id, 'reject', leave)}
                  disabled={actionId !== null}
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
                <Text style={styles.approvalDates}>Week of {formatDateMed(ts.weekStartDate || '')}</Text>
              </View>
              <View style={styles.approvalActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn, actionId === ts.id && styles.btnDisabled]}
                  onPress={() => handleTimesheetAction(ts.id!, 'approve', ts)}
                  disabled={actionId !== null}
                >
                  {actionId === ts.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn, actionId !== null && styles.btnDisabled]}
                  onPress={() => handleTimesheetAction(ts.id!, 'reject', ts)}
                  disabled={actionId !== null}
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

    {/* Reject Reason Modal */}
    <Modal visible={rejectModal.visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Rejection Reason</Text>
          <Text style={styles.modalSubtitle}>
            Rejecting {rejectModal.type === 'leave' ? 'leave request' : 'timesheet'} for{' '}
            <Text style={{ fontWeight: '700' }}>{rejectModal.name}</Text>
          </Text>
          <TextInput
            style={styles.modalInput}
            value={rejectReason}
            onChangeText={setRejectReason}
            placeholder="Enter reason for rejection..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            autoFocus
          />
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalCancelBtn]}
              onPress={() => setRejectModal((m) => ({ ...m, visible: false }))}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalRejectBtn]}
              onPress={handleRejectConfirm}
            >
              <Text style={styles.modalRejectText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
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
  approvalName: { ...typography.captionBold, color: colors.text, marginBottom: 2 },
  approvalDetail: { ...typography.body, color: colors.textSecondary, fontSize: 13 },
  approvalDates: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  approvalReason: { ...typography.small, color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 },
  approvalActions: { flexDirection: 'column', gap: spacing.xs },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtn: { backgroundColor: colors.success },
  rejectBtn: { backgroundColor: colors.error },
  btnDisabled: { opacity: 0.5 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
  },
  modalTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.xs },
  modalSubtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  modalActions: { flexDirection: 'row', gap: spacing.md },
  modalBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalCancelBtn: { backgroundColor: colors.border },
  modalRejectBtn: { backgroundColor: colors.error },
  modalCancelText: { ...typography.captionBold, color: colors.text },
  modalRejectText: { ...typography.captionBold, color: '#fff' },
});
