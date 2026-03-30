import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { cardShadow, cardShadowLg } from '../../utils/shadow';
import { leavesApi, LeaveRequest, LeaveBalance } from '../../api/leaves';
import { useAuthStore } from '../../store/authStore';
import type { RootStackParamList } from '../../navigation/RootNavigator';

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

  return (
    <View style={styles.container}>
      {/* Tab Bar for Managers */}
      {isManager && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'my' && styles.tabActive]}
            onPress={() => setActiveTab('my')}
          >
            <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>My Leaves</Text>
          </TouchableOpacity>
          <TouchableOpacity
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
                {balances.map((b) => (
                  <View key={b.leaveTypeId} style={styles.balanceCard}>
                    <Text style={styles.balanceValue}>{b.balance}</Text>
                    <Text style={styles.balanceLabel} numberOfLines={1}>{b.leaveTypeName}</Text>
                    <Text style={styles.balanceDetail}>
                      {b.totalTaken} used · {b.totalPending} pending
                    </Text>
                  </View>
                ))}
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
                    {leave.startDate} → {leave.endDate} ({leave.totalDays} day{leave.totalDays > 1 ? 's' : ''})
                  </Text>
                  {leave.reason ? <Text style={styles.leaveReason} numberOfLines={2}>{leave.reason}</Text> : null}
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
                    {leave.leaveType?.name}: {leave.startDate} → {leave.endDate}
                  </Text>
                  {leave.reason ? <Text style={styles.leaveReason} numberOfLines={2}>{leave.reason}</Text> : null}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.success }]}
                      onPress={async () => { await leavesApi.approve(leave.id); load(); }}
                    >
                      <Text style={styles.actionBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.error }]}
                      onPress={async () => { await leavesApi.reject(leave.id, 'Rejected via mobile'); load(); }}
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
          style={styles.fab}
          onPress={() => navigation.navigate('LeaveRequest')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
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
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...cardShadow,
  },
  balanceValue: { ...typography.stat, color: colors.primary, fontSize: 28 },
  balanceLabel: { ...typography.label, color: colors.text, marginTop: 4, textAlign: 'center' },
  balanceDetail: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
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
