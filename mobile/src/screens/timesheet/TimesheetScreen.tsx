import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { cardShadow } from '../../utils/shadow';
import { timesheetsApi, TimesheetEntry } from '../../api/timesheets';
import { useAuthStore } from '../../store/authStore';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAY_FIELDS = [
  'mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours',
  'fridayHours', 'saturdayHours', 'sundayHours',
] as const;

function getWeekStart(offset = 0): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export default function TimesheetScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const employeeId = useAuthStore((s) => s.user?.employeeId);
  const isManager = role === 'manager' || role === 'admin' || role === 'hr';

  const [weekOffset, setWeekOffset] = useState(0);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [pendingEntries, setPendingEntries] = useState<TimesheetEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'approvals'>('my');

  const weekStart = getWeekStart(weekOffset);

  const load = useCallback(async () => {
    try {
      // Manager/admin/hr must pass their employeeId as a query param; employees don't need it
      const data = await timesheetsApi.getWeek(weekStart, isManager ? employeeId : undefined);
      setEntries(Array.isArray(data) ? data : []);
      if (isManager) {
        const p = await timesheetsApi.getPending().catch(() => []);
        setPendingEntries(Array.isArray(p) ? p : []);
      }
    } catch {
      setEntries([]);
    }
  }, [weekStart, isManager, employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const updateHours = (entryIdx: number, dayIdx: number, value: string) => {
    const num = parseFloat(value) || 0;
    setEntries((prev) => {
      const updated = [...prev];
      const entry = { ...updated[entryIdx] };
      (entry as any)[DAY_FIELDS[dayIdx]] = num;
      entry.totalHoursWorked = DAY_FIELDS.reduce((sum, f) => sum + ((entry as any)[f] || 0), 0);
      updated[entryIdx] = entry;
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await timesheetsApi.bulkSave(entries);
      Alert.alert('Saved', 'Timesheet saved as draft');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await timesheetsApi.bulkSave(entries);
      await timesheetsApi.submitWeek(weekStart);
      Alert.alert('Submitted', 'Timesheet submitted for approval');
      await load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit');
    } finally {
      setSaving(false);
    }
  };

  const weekTotal = entries.reduce((sum, e) => sum + (e.totalHoursWorked || 0), 0);
  const isSubmitted = entries.some((e) => e.status === 'submitted' || e.status === 'approved');

  return (
    <View style={styles.container}>
      {/* Tab bar for managers */}
      {isManager && (
        <View style={styles.tabBar}>
          <TouchableOpacity style={[styles.tab, activeTab === 'my' && styles.tabActive]} onPress={() => setActiveTab('my')}>
            <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>My Timesheets</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'approvals' && styles.tabActive]} onPress={() => setActiveTab('approvals')}>
            <Text style={[styles.tabText, activeTab === 'approvals' && styles.tabTextActive]}>
              Approvals ({pendingEntries.length})
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
            {/* Week Navigator */}
            <View style={styles.weekNav}>
              <TouchableOpacity onPress={() => setWeekOffset((o) => o - 1)}>
                <Ionicons name="chevron-back" size={24} color={colors.primary} />
              </TouchableOpacity>
              <View style={styles.weekLabel}>
                <Text style={styles.weekText}>Week of {weekStart}</Text>
                <Text style={styles.totalText}>{weekTotal.toFixed(1)}h total</Text>
              </View>
              <TouchableOpacity onPress={() => setWeekOffset((o) => o + 1)} disabled={weekOffset >= 0}>
                <Ionicons name="chevron-forward" size={24} color={weekOffset >= 0 ? colors.border : colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Entries */}
            {entries.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No timesheet entries for this week</Text>
              </View>
            ) : (
              entries.map((entry, idx) => (
                <View key={entry.id || idx} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.projectName}>{entry.project?.name || 'Project'}</Text>
                    <Text style={styles.taskName}>{entry.task?.name || 'Task'}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: entry.status === 'approved' ? colors.success + '20' : entry.status === 'submitted' ? colors.info + '20' : colors.warning + '20' }]}>
                      <Text style={[styles.statusText, { color: entry.status === 'approved' ? colors.success : entry.status === 'submitted' ? colors.info : colors.warning }]}>
                        {entry.status}
                      </Text>
                    </View>
                  </View>

                  {/* Day Hours Grid */}
                  <View style={styles.daysRow}>
                    {DAYS.map((day, dayIdx) => (
                      <View key={day} style={styles.dayCol}>
                        <Text style={styles.dayLabel}>{day}</Text>
                        <TextInput
                          style={[styles.dayInput, isSubmitted && styles.dayInputDisabled]}
                          value={String((entry as any)[DAY_FIELDS[dayIdx]] || 0)}
                          onChangeText={(v) => updateHours(idx, dayIdx, v)}
                          keyboardType="decimal-pad"
                          editable={!isSubmitted}
                          selectTextOnFocus
                        />
                      </View>
                    ))}
                    <View style={styles.dayCol}>
                      <Text style={[styles.dayLabel, { fontWeight: '700' }]}>Total</Text>
                      <Text style={styles.dayTotal}>{entry.totalHoursWorked?.toFixed(1)}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}

            {/* Actions */}
            {entries.length > 0 && !isSubmitted && (
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.saveBtnText}>Save Draft</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.submitBtn]} onPress={handleSubmit} disabled={saving}>
                  <Text style={styles.submitBtnText}>Submit Week</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Manager Approval Queue */}
            {pendingEntries.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
                <Text style={styles.emptyText}>No pending timesheets</Text>
              </View>
            ) : (
              pendingEntries.map((ts) => (
                <View key={ts.id} style={styles.entryCard}>
                  <Text style={styles.projectName}>
                    {ts.employee?.firstName} {ts.employee?.lastName}
                  </Text>
                  <Text style={styles.taskName}>
                    {ts.project?.name} · {ts.totalHoursWorked}h · Week of {ts.weekStartDate}
                  </Text>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: colors.success }]}
                      onPress={async () => { await timesheetsApi.approve(ts.id!); load(); }}
                    >
                      <Text style={styles.submitBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: colors.error }]}
                      onPress={async () => { await timesheetsApi.reject(ts.id!, 'Rejected via mobile'); load(); }}
                    >
                      <Text style={styles.submitBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { ...typography.label, color: colors.textSecondary },
  tabTextActive: { color: colors.primary },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  weekLabel: { alignItems: 'center' },
  weekText: { ...typography.label, color: colors.text },
  totalText: { ...typography.small, color: colors.primary, marginTop: 2 },
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...cardShadow,
  },
  entryHeader: { marginBottom: spacing.md },
  projectName: { ...typography.label, color: colors.text },
  taskName: { ...typography.body, color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm, marginTop: 4 },
  statusText: { ...typography.small, fontWeight: '700' },
  daysRow: { flexDirection: 'row', gap: 4 },
  dayCol: { flex: 1, alignItems: 'center' },
  dayLabel: { ...typography.small, color: colors.textSecondary, marginBottom: 4 },
  dayInput: {
    width: '100%',
    textAlign: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayInputDisabled: { backgroundColor: colors.border + '40', color: colors.textSecondary },
  dayTotal: { ...typography.label, color: colors.primary, paddingVertical: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  btn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  saveBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  saveBtnText: { ...typography.label, color: colors.primary },
  submitBtn: { backgroundColor: colors.primary },
  submitBtnText: { ...typography.label, color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
});
