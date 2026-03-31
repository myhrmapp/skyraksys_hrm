import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { cardShadow, cardShadowLg } from '../../utils/shadow';
import { leavesApi, LeaveRequest, LeaveBalance } from '../../api/leaves';
import { useAuthStore } from '../../store/authStore';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { formatDateRange } from '../../utils/formatDate';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function LeaveScreen() {
  const navigation = useNavigation<Nav>();
  const role = useAuthStore((s) => s.user?.role);
  const isManager = role === 'manager' || role === 'admin' || role === 'hr';

  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'my' | 'approvals'>('my');
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ visible: boolean; id: string; name: string }>(
    { visible: false, id: '', name: '' }
  );
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    try {
      const [b, l] = await Promise.all([
        leavesApi.getBalance().catch(() => []),
        leavesApi.getMy().catch(() => []),
      ]);
      setBalances(Array.isArray(b) ? b : []);
      setLeaves(Array.isArray(l) ? l : []);

      if (isManager) {
        const p = await leavesApi.getPending().catch(() => []);
        setPendingLeaves(Array.isArray(p) ? p : []);
      }
    } catch {
      // empty state
    }
  }, [isManager]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const statusColor: Record<string, string> = {
    Pending: colors.warning,
    Approved: colors.success,
    Rejected: colors.error,
    Cancelled: colors.textSecondary,
  };

  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      await leavesApi.approve(id);
      await load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to approve');
    } finally {
      setActionId(null);
    }
  };

  const handleRejectOpen = (leave: LeaveRequest) => {
    const name = `${leave.employee?.firstName || ''} ${leave.employee?.lastName || ''}`.trim();
    setRejectReason('');
    setRejectModal({ visible: true, id: leave.id, name });
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for rejection');
      return;
    }
    const { id } = rejectModal;
    setRejectModal((m) => ({ ...m, visible: false }));
    setActionId(id);
    try {
      await leavesApi.reject(id, rejectReason.trim());
      await load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to reject');
    } finally {
      setActionId(null);
    }
  };

  const handleCancel = (leave: LeaveRequest) => {
    Alert.alert(
      'Cancel Leave',
      `Cancel your ${leave.leaveType?.name || 'leave'} request (${leave.startDate} → ${leave.endDate})?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setActionId(leave.id);
            try {
              await leavesApi.cancel(leave.id);
              await load();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to cancel leave');
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Bar for Managers */}
      {isManager && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            testID="leave-my-tab"
            style={[styles.tab, activeTab === 'my' && styles.tabActive]}
            onPress={() => setActiveTab('my')}
          >
            <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>My Leaves</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="leave-approvals-tab"
            style={[styles.tab, activeTab === 'approvals' && styles.tabActive]}
            onPress={() => setActiveTab('approvals')}
          >
            <Text style={[styles.tabText, activeTab === 'approvals' && styles.tabTextActive]}>
              Approvals ({pendingLeaves.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {activeTab === 'my' ? (
          <>
            {/* Balance Cards */}
            {balances.length > 0 && (
              <View style={styles.balanceRow}>
                {balances.map((b) => {
                  const bal = Number(b.balance) || 0;
                  const taken = Number(b.totalTaken) || 0;
                  const pending = Number(b.totalPending) || 0;
                  const total = Number(b.totalAccrued) || (bal + taken + pending) || 1;
                  const usedPct = Math.min((taken / total) * 100, 100);
                  const pendingPct = Math.min(((taken + pending) / total) * 100, 100);
                  const fmt = (v: number) => v % 1 === 0 ? String(Math.round(v)) : v.toFixed(1);
                  return (
                    <View key={b.leaveTypeId} style={styles.balanceCard}>
                      <Text style={styles.balanceLabel} numberOfLines={1}>{b.leaveTypeName}</Text>
                      <View style={styles.balanceNumbers}>
                        <Text style={styles.balanceValue}>{fmt(bal)}</Text>
                        <Text style={styles.balanceTotal}> / {fmt(total)}</Text>
                      </View>
                      {/* Usage bar */}
                      <View style={styles.balanceBar}>
                        <View style={[styles.balanceBarFill, { width: `${pendingPct}%` as any, backgroundColor: colors.warning + 'A0' }]} />
                        <View style={[styles.balanceBarFill, styles.balanceBarUsed, { width: `${usedPct}%` as any }]} />
                      </View>
                      <Text style={styles.balanceDetail}>
                        {fmt(taken)} used
                        {pending > 0 ? ` · ${fmt(pending)} pending` : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Leave History */}
            <Text style={styles.sectionTitle}>Leave History</Text>
            {leaves.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No leave requests yet</Text>
              </View>
            ) : (
              leaves.map((leave) => (
                <View key={leave.id} style={styles.leaveCard}>
                  <View style={styles.leaveRow}>
                    <Text style={styles.leaveType}>{leave.leaveType?.name || 'Leave'}</Text>
                    <View style={[styles.badge, { backgroundColor: (statusColor[leave.status] || colors.textSecondary) + '20' }]}>
                      <Text style={[styles.badgeText, { color: statusColor[leave.status] || colors.textSecondary }]}>
                        {leave.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.leaveDates}>
                    {formatDateRange(leave.startDate, leave.endDate)}
                    {` (${leave.totalDays} day${leave.totalDays > 1 ? 's' : ''})`}
                  </Text>
                  {leave.reason ? <Text style={styles.leaveReason} numberOfLines={2}>{leave.reason}</Text> : null}
                  {leave.status === 'Pending' && (
                    <TouchableOpacity
                      style={[styles.cancelBtn, actionId === leave.id && styles.btnDisabled]}
                      onPress={() => handleCancel(leave)}
                      disabled={actionId === leave.id}
                    >
                      {actionId === leave.id ? (
                        <ActivityIndicator size="small" color={colors.error} />
                      ) : (
                        <Text style={styles.cancelBtnText}>Cancel Request</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </>
        ) : (
          <>
            {/* Manager Approval Queue */}
            {pendingLeaves.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
                <Text style={styles.emptyText}>No pending approvals</Text>
              </View>
            ) : (
              pendingLeaves.map((leave) => (
                <View key={leave.id} style={styles.leaveCard}>
                  <View style={styles.leaveRow}>
                    <Text style={styles.leaveType}>
                      {leave.employee?.firstName} {leave.employee?.lastName}
                    </Text>
                    <Text style={styles.leaveDays}>{leave.totalDays}d</Text>
                  </View>
                  <Text style={styles.leaveDates}>
                    {leave.leaveType?.name}: {formatDateRange(leave.startDate, leave.endDate)}
                  </Text>
                  {leave.reason ? <Text style={styles.leaveReason} numberOfLines={2}>{leave.reason}</Text> : null}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.success }, actionId === leave.id && styles.btnDisabled]}
                      onPress={() => handleApprove(leave.id)}
                      disabled={actionId !== null}
                    >
                      {actionId === leave.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.actionBtnText}>Approve</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.error }, actionId !== null && styles.btnDisabled]}
                      onPress={() => handleRejectOpen(leave)}
                      disabled={actionId !== null}
                    >
                      <Text style={styles.actionBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* FAB - New Leave Request */}
      {activeTab === 'my' && (
        <TouchableOpacity
          testID="apply-leave-fab"
          style={styles.fab}
          onPress={() => navigation.navigate('LeaveRequest')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Reject Reason Modal */}
      <Modal visible={rejectModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rejection Reason</Text>
            <Text style={styles.modalSubtitle}>
              Rejecting leave for <Text style={{ fontWeight: '700' }}>{rejectModal.name}</Text>
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
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalRejectBtn]}
                onPress={handleRejectConfirm}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 80 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { ...typography.label, color: colors.textSecondary },
  tabTextActive: { color: colors.primary },
  balanceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  balanceCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...cardShadow,
  },
  balanceLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
  balanceNumbers: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  balanceValue: { fontSize: 20, fontWeight: '700', color: colors.primary },
  balanceTotal: { fontSize: 13, fontWeight: '400', color: colors.textSecondary, marginLeft: 2 },
  balanceBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: 6,
    marginBottom: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  balanceBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.success + 'B0',
  },
  balanceBarUsed: {
    backgroundColor: colors.error + '90',
  },
  balanceDetail: { ...typography.small, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  leaveCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...cardShadow,
  },
  leaveRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leaveType: { ...typography.label, color: colors.text },
  leaveDays: { ...typography.label, color: colors.primary },
  leaveDates: { ...typography.body, color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  leaveReason: { ...typography.small, color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  badgeText: { ...typography.small, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  actionBtnText: { ...typography.label, color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
  cancelBtn: {
    marginTop: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.error,
    alignSelf: 'flex-start',
  },
  cancelBtnText: { ...typography.small, color: colors.error, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
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
  modalBtnText: { ...typography.label, color: colors.text },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...cardShadowLg,
  },
});
