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
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { cardShadow } from '../../utils/shadow';
import { timesheetsApi, TimesheetEntry } from '../../api/timesheets';
import { tasksApi, Task } from '../../api/tasks';
import { useAuthStore } from '../../store/authStore';
import { formatDateMed } from '../../utils/formatDate';
import { showSuccess, showError } from '../../utils/toast';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAY_FIELDS = [
  'mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours',
  'fridayHours', 'saturdayHours', 'sundayHours',
] as const;

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  Draft:     { bg: colors.warning + '20', fg: colors.warning },
  Submitted: { bg: colors.info + '20',    fg: colors.info },
  Approved:  { bg: colors.success + '20', fg: colors.success },
  Rejected:  { bg: colors.error + '20',   fg: colors.error },
};

function isEditable(status: string) {
  return status === 'Draft' || status === 'Rejected';
}

function dayInputValue(editable: boolean, raw: unknown): string {
  if (!editable) return String(typeof raw === 'number' ? raw : 0);
  return typeof raw === 'number' && raw > 0 ? String(raw) : '';
}

function getWeekStart(offset = 0): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  d.setDate(diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function confirm(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      resolve(globalThis.confirm(`${title}\n\n${message}`));
    } else {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Confirm', onPress: () => resolve(true) },
      ]);
    }
  });
}


export default function TimesheetScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const employeeId = useAuthStore((s) => s.user?.employeeId);
  const isManager = role === 'manager' || role === 'admin' || role === 'hr';


  const [weekOffset, setWeekOffset] = useState(0);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [pendingEntries, setPendingEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null); // id of entry being approved/rejected
  const [activeTab, setActiveTab] = useState<'my' | 'approvals'>('my');

  // Add entry state
  const [addModal, setAddModal] = useState(false);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [addingEntry, setAddingEntry] = useState(false);

  // Reject modal state
  const [rejectModal, setRejectModal] = useState<{ visible: boolean; id: string; name: string }>({ visible: false, id: '', name: '' });
  const [rejectReason, setRejectReason] = useState('');

  const weekStart = getWeekStart(weekOffset);

  const load = useCallback(async () => {
    try {
      const data = await timesheetsApi.getWeek(weekStart, employeeId || undefined);
      setEntries(Array.isArray(data) ? data : []);
      if (isManager) {
        const p = await timesheetsApi.getPending().catch(() => []);
        setPendingEntries(Array.isArray(p) ? p : []);
      }
    } catch (err: any) {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [weekStart, isManager, employeeId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // ── My Timesheet logic ──

  const updateHours = (entryIdx: number, dayIdx: number, value: string) => {
    const num = Number.parseFloat(value) || 0;
    if (num < 0 || num > 24) return;
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
    const editableEntries = entries.filter((e) => isEditable(e.status));
    if (editableEntries.length === 0) return;
    setSaving(true);
    try {
      await timesheetsApi.bulkSave(editableEntries);
      showSuccess('Timesheet saved as draft');
      await load();
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const ok = await confirm('Submit Timesheet', 'This will submit your timesheet for manager approval. You won\'t be able to edit until it\'s reviewed. Continue?');
    if (!ok) { return; }
    setSaving(true);
    try {
      // Save editable entries first, then submit the week
      const editableEntries = entries.filter((e) => isEditable(e.status));
      if (editableEntries.length > 0) {
        await timesheetsApi.bulkSave(editableEntries);
      }
      await timesheetsApi.submitWeek(weekStart);
      showSuccess('Timesheet submitted for approval');
      await load();
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Failed to submit');
    } finally {
      setSaving(false);
    }
  };

  // ── Manager approval logic ──

  const handleApprove = async (ts: TimesheetEntry) => {
    const name = `${ts.employee?.firstName || ''} ${ts.employee?.lastName || ''}`.trim();
    const ok = await confirm('Approve Timesheet', `Approve ${name}'s timesheet for ${ts.project?.name || 'project'}?\n\n${ts.totalHoursWorked}h total · Week of ${ts.weekStartDate}`);
    if (!ok) return;
    setActionId(ts.id!);
    try {
      await timesheetsApi.approve(ts.id!);
      showSuccess(`${name}'s timesheet has been approved`);
      await load();
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Failed to approve');
    } finally {
      setActionId(null);
    }
  };

  const openRejectModal = (ts: TimesheetEntry) => {
    const name = `${ts.employee?.firstName || ''} ${ts.employee?.lastName || ''}`.trim();
    setRejectReason('');
    setRejectModal({ visible: true, id: ts.id!, name });
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      showError('Please provide a reason for rejection');
      return;
    }
    setRejectModal((m) => ({ ...m, visible: false }));
    setActionId(rejectModal.id);
    try {
      await timesheetsApi.reject(rejectModal.id, rejectReason.trim());
      showSuccess('Timesheet has been rejected');
      await load();
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Failed to reject');
    } finally {
      setActionId(null);
    }
  };

  const handleBulkApprove = async () => {
    if (pendingEntries.length === 0) return;
    const ok = await confirm('Approve All', `Approve all ${pendingEntries.length} pending timesheets?`);
    if (!ok) return;
    setActionId('bulk');
    try {
      const ids = pendingEntries.map((e) => e.id!);
      await timesheetsApi.bulkApprove(ids);
      showSuccess(`${ids.length} timesheets approved`);
      await load();
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Failed to bulk approve');
    } finally {
      setActionId(null);
    }
  };

  const openAddEntry = async () => {
    setLoadingTasks(true);
    let fetched: Task[] = [];
    try {
      const result = await tasksApi.getMyTasks();
      fetched = Array.isArray(result) ? result : [];
      setMyTasks(fetched);
    } catch (err: any) {
      showError('Failed to load tasks');
      setLoadingTasks(false);
      return;
    }
    setLoadingTasks(false);
    // Auto-skip project step when only 1 project has available tasks
    const usedIds = new Set(entries.map((e) => e.taskId));
    const avail = fetched.filter((t) => !usedIds.has(t.id));
    if (avail.length === 0 && fetched.length > 0) {
      showError('All assigned tasks already added for this week');
      return;
    }
    const groups: Record<string, Task[]> = {};
    avail.forEach((t) => {
      if (!groups[t.projectId]) groups[t.projectId] = [];
      groups[t.projectId].push(t);
    });
    const projectIds = Object.keys(groups);
    if (projectIds.length === 1) {
      const autoProjectId = projectIds[0];
      const autoTask = groups[autoProjectId].length === 1 ? groups[autoProjectId][0] : null;
      setSelectedProjectId(autoProjectId);
      setSelectedTaskId(autoTask ? autoTask.id : null);
    } else {
      setSelectedProjectId(null);
      setSelectedTaskId(null);
    }
    setAddModal(true);
  };

  const handleConfirmAddEntry = async () => {
    if (!selectedTaskId) return;
    const task = myTasks.find((t) => t.id === selectedTaskId);
    if (!task) return;
    const [yr, mo, dy] = weekStart.split('-').map(Number);
    const endDate = new Date(yr, mo - 1, dy + 6);
    const weekEndDate = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    const payload = {
      projectId: task.projectId,
      taskId: task.id,
      weekStartDate: weekStart,
      weekEndDate,
    };
    setAddingEntry(true);
    try {
      const created = await timesheetsApi.create(payload);
      setAddModal(false);
      showSuccess('Entry added — fill in your hours below');
      // Optimistic: insert the returned entry immediately, then refresh in background
      if (created?.id) {
        setEntries((prev) => [...prev, created]);
      }
      load().catch(() => {});
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Failed to add entry');
    } finally {
      setAddingEntry(false);
    }
  };

  // ── Derived state ──

  const weekTotal = entries.reduce((sum, e) => sum + (e.totalHoursWorked || 0), 0);
  const hasDraftOrRejected = entries.some((e) => isEditable(e.status));
  const allSubmittedOrApproved = entries.length > 0 && entries.every((e) => e.status === 'Submitted' || e.status === 'Approved');

  // Add entry modal — precomputed values
  const addUsedTaskIds = new Set(entries.map((e) => e.taskId));
  const addAvailable = myTasks.filter((t) => !addUsedTaskIds.has(t.id));
  const addGroups: Record<string, { id: string; name: string; tasks: Task[] }> = {};
  addAvailable.forEach((t) => {
    if (!addGroups[t.projectId]) addGroups[t.projectId] = { id: t.projectId, name: t.project?.name || 'Project', tasks: [] };
    addGroups[t.projectId].tasks.push(t);
  });
  const addProjects = Object.values(addGroups);
  const addStepTasks = selectedProjectId ? (addGroups[selectedProjectId]?.tasks ?? []) : [];

  const renderAddEntryBody = () => {
    if (myTasks.length === 0) {
      return (
        <View style={styles.noTasksContainer}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.textSecondary} />
          <Text style={styles.noTasksText}>No tasks assigned to you yet</Text>
          <Text style={styles.noTasksSubtext}>Ask your manager to assign tasks to your account</Text>
        </View>
      );
    }
    if (!selectedProjectId) {
      return (
        <>
          <Text style={styles.stepLabel}>STEP 1 OF 2 — SELECT PROJECT</Text>
          {addProjects.length === 0 ? (
            <Text style={styles.noTasksText}>All assigned tasks are already added for this week.</Text>
          ) : (
            <ScrollView style={styles.addModalScroll} showsVerticalScrollIndicator={false}>
              {addProjects.map((project) => (
                <TouchableOpacity
                  key={project.id}
                  style={styles.projectRow}
                  onPress={() => setSelectedProjectId(project.id)}
                >
                  <Ionicons name="folder-outline" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
                  <Text style={styles.projectRowText}>{project.name}</Text>
                  <Text style={styles.projectRowCount}>
                    {project.tasks.length} {project.tasks.length === 1 ? 'task' : 'tasks'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </>
      );
    }
    return (
      <>
        {addProjects.length > 1 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => { setSelectedProjectId(null); setSelectedTaskId(null); }}
          >
            <Ionicons name="arrow-back" size={16} color={colors.primary} />
            <Text style={styles.backBtnText}>{addGroups[selectedProjectId]?.name ?? 'Project'}</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.stepLabel}>
          {addProjects.length > 1 ? 'STEP 2 OF 2 — SELECT TASK' : 'SELECT TASK'}
        </Text>
        <ScrollView style={styles.addModalScroll} showsVerticalScrollIndicator={false}>
          {addStepTasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={[styles.taskRow, selectedTaskId === task.id && styles.taskRowSelected]}
              onPress={() => setSelectedTaskId(task.id)}
            >
              <Text style={[styles.taskRowText, selectedTaskId === task.id && styles.taskRowTextSelected]}>
                {task.name}
              </Text>
              {selectedTaskId === task.id && (
                <Ionicons name="checkmark" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab bar for managers */}
      {isManager && (
        <View style={styles.tabBar}>
          <TouchableOpacity testID="timesheet-my-tab" style={[styles.tab, activeTab === 'my' && styles.tabActive]} onPress={() => setActiveTab('my')}>
            <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>My Timesheets</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="timesheet-approvals-tab" style={[styles.tab, activeTab === 'approvals' && styles.tabActive]} onPress={() => setActiveTab('approvals')}>
            <Text style={[styles.tabText, activeTab === 'approvals' && styles.tabTextActive]}>
              Approvals ({pendingEntries.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
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
                  <Text style={styles.weekText}>Week of {formatDateMed(weekStart)}</Text>
                  <Text style={styles.totalText}>{weekTotal.toFixed(1)}h total</Text>
                </View>
                <TouchableOpacity onPress={() => setWeekOffset((o) => o + 1)} disabled={weekOffset >= 1}>
                  <Ionicons name="chevron-forward" size={24} color={weekOffset >= 1 ? colors.border : colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Week status banner */}
              {allSubmittedOrApproved && (
                <View style={styles.weekStatusBanner}>
                  <Ionicons
                    name={entries[0]?.status === 'Approved' ? 'checkmark-circle' : 'time'}
                    size={18}
                    color={entries[0]?.status === 'Approved' ? colors.success : colors.info}
                  />
                  <Text style={[styles.weekStatusText, { color: entries[0]?.status === 'Approved' ? colors.success : colors.info }]}>
                    {entries[0]?.status === 'Approved' ? 'Week Approved' : 'Week Submitted — Awaiting Approval'}
                  </Text>
                </View>
              )}

              {/* Entries */}
              {entries.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="time-outline" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>No entries for this week</Text>
                  <Text style={styles.emptySubtext}>Log your hours by adding a task entry</Text>
                  {!allSubmittedOrApproved && (
                    <TouchableOpacity style={styles.addEntryBtnPrimary} onPress={openAddEntry} disabled={loadingTasks}>
                      {loadingTasks ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="add-circle-outline" size={18} color="#fff" style={{ marginRight: spacing.xs }} />
                          <Text style={styles.addEntryBtnPrimaryText}>Add Entry</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                entries.map((entry, idx) => {
                  const entryEditable = isEditable(entry.status);
                  const sc = STATUS_COLORS[entry.status] || STATUS_COLORS.Draft;
                  return (
                    <View key={entry.id || idx} style={styles.entryCard}>
                      <View style={styles.entryHeader}>
                        <View style={styles.entryHeaderTop}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.projectName}>{entry.project?.name || 'Project'}</Text>
                            <Text style={styles.taskName}>{entry.task?.name || 'Task'}</Text>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                            <Text style={[styles.statusText, { color: sc.fg }]}>
                              {entry.status}
                            </Text>
                          </View>
                        </View>

                        {/* Rejection reason */}
                        {entry.status === 'Rejected' && entry.approverComments && (
                          <View style={styles.rejectionBanner}>
                            <Ionicons name="alert-circle" size={14} color={colors.error} />
                            <Text style={styles.rejectionText}>{entry.approverComments}</Text>
                          </View>
                        )}
                      </View>

                      {/* Day Hours Grid */}
                      <View style={styles.daysRow}>
                        {DAYS.map((day, dayIdx) => (
                          <View key={day} style={styles.dayCol}>
                            <Text style={styles.dayLabel}>{day}</Text>
                            <TextInput
                              style={[styles.dayInput, !entryEditable && styles.dayInputDisabled]}
                              value={dayInputValue(entryEditable, (entry as any)[DAY_FIELDS[dayIdx]])}
                              onChangeText={(v) => updateHours(idx, dayIdx, v)}
                              keyboardType="decimal-pad"
                              placeholder="0"
                              placeholderTextColor={colors.border}
                              editable={entryEditable}
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
                  );
                })
              )}

              {/* Add entry — shown below existing entries while week is still editable */}
              {entries.length > 0 && !allSubmittedOrApproved && (
                <TouchableOpacity
                  style={styles.addEntryBtn}
                  onPress={openAddEntry}
                  disabled={loadingTasks}
                >
                  {loadingTasks ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                      <Text style={styles.addEntryBtnText}>Add Entry</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Actions — show when there are draft/rejected entries */}
              {hasDraftOrRejected && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.saveBtnText}>Save Draft</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.submitBtn]} onPress={handleSubmit} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Submit Week</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <>
              {/* Manager Approval Queue */}
              {pendingEntries.length > 1 && (
                <TouchableOpacity
                  style={[styles.bulkApproveBtn, actionId === 'bulk' && { opacity: 0.6 }]}
                  onPress={handleBulkApprove}
                  disabled={!!actionId}
                >
                  {actionId === 'bulk' ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done" size={18} color="#fff" />
                      <Text style={styles.bulkApproveBtnText}>Approve All ({pendingEntries.length})</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {pendingEntries.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
                  <Text style={styles.emptyText}>No pending timesheets</Text>
                </View>
              ) : (
                pendingEntries.map((ts) => {
                  const isActioning = actionId === ts.id;
                  return (
                    <View key={ts.id} style={styles.entryCard}>
                      <View style={styles.entryHeader}>
                        <Text style={styles.projectName}>
                          {ts.employee?.firstName} {ts.employee?.lastName}
                        </Text>
                        <Text style={styles.taskName}>
                          {ts.project?.name} · Week of {formatDateMed(ts.weekStartDate || '')}
                        </Text>
                      </View>

                      {/* Day-by-day breakdown for manager review */}
                      <View style={styles.daysRow}>
                        {DAYS.map((day, dayIdx) => {
                          const hrs = (ts as any)[DAY_FIELDS[dayIdx]] || 0;
                          return (
                            <View key={day} style={styles.dayCol}>
                              <Text style={styles.dayLabel}>{day}</Text>
                              <Text style={[styles.dayReadOnly, hrs > 0 && styles.dayNonZero]}>
                                {hrs > 0 ? hrs.toFixed(1) : '-'}
                              </Text>
                            </View>
                          );
                        })}
                        <View style={styles.dayCol}>
                          <Text style={[styles.dayLabel, { fontWeight: '700' }]}>Total</Text>
                          <Text style={styles.dayTotal}>{ts.totalHoursWorked?.toFixed(1)}</Text>
                        </View>
                      </View>

                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={[styles.btn, styles.approveBtn, isActioning && { opacity: 0.6 }]}
                          onPress={() => handleApprove(ts)}
                          disabled={!!actionId}
                        >
                          {isActioning ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <Ionicons name="checkmark" size={16} color="#fff" style={{ marginRight: 4 }} />
                              <Text style={styles.submitBtnText}>Approve</Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.btn, styles.rejectBtn, isActioning && { opacity: 0.6 }]}
                          onPress={() => openRejectModal(ts)}
                          disabled={!!actionId}
                        >
                          <Ionicons name="close" size={16} color="#fff" style={{ marginRight: 4 }} />
                          <Text style={styles.submitBtnText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Reject Reason Modal */}
      <Modal visible={rejectModal.visible} transparent animationType="fade" onRequestClose={() => setRejectModal((m) => ({ ...m, visible: false }))}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Timesheet</Text>
            <Text style={styles.modalSubtitle}>{rejectModal.name}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Reason for rejection (required)"
              placeholderTextColor={colors.textSecondary}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={() => setRejectModal((m) => ({ ...m, visible: false }))}>
                <Text style={styles.saveBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={handleRejectConfirm}>
                <Text style={styles.submitBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Entry Modal */}
      <Modal visible={addModal} transparent animationType="fade" onRequestClose={() => setAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Entry</Text>
            <Text style={styles.modalSubtitle}>Week of {formatDateMed(weekStart)}</Text>
            {renderAddEntryBody()}
            <View style={[styles.modalActions, { marginTop: spacing.lg }]}>
              <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={() => setAddModal(false)}>
                <Text style={styles.saveBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.submitBtn, (!selectedTaskId || !selectedProjectId || addingEntry) && { opacity: 0.5 }]}
                onPress={handleConfirmAddEntry}
                disabled={!selectedTaskId || !selectedProjectId || addingEntry}
              >
                {addingEntry ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Add Task</Text>
                )}
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
  content: { padding: spacing.lg, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    marginBottom: spacing.md,
  },
  weekLabel: { alignItems: 'center' },
  weekText: { fontSize: 15, fontWeight: '600', color: colors.text },
  totalText: { ...typography.small, color: colors.primary, marginTop: 2 },
  weekStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  weekStatusText: { ...typography.small, fontWeight: '600' },
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...cardShadow,
  },
  entryHeader: { marginBottom: spacing.md },
  entryHeaderTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  projectName: { ...typography.captionBold, color: colors.text },
  taskName: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  statusText: { ...typography.small, fontWeight: '700' },
  rejectionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  rejectionText: { ...typography.small, color: colors.error, flex: 1 },
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
  dayReadOnly: {
    ...typography.body,
    textAlign: 'center',
    color: colors.textSecondary,
    paddingVertical: spacing.sm,
  },
  dayNonZero: { color: colors.text, fontWeight: '600' },
  dayTotal: { ...typography.label, color: colors.primary, paddingVertical: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  btn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  saveBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  saveBtnText: { ...typography.label, color: colors.primary },
  submitBtn: { backgroundColor: colors.primary },
  submitBtnText: { ...typography.label, color: '#fff' },
  approveBtn: { backgroundColor: colors.success },
  rejectBtn: { backgroundColor: colors.error },
  bulkApproveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  bulkApproveBtnText: { ...typography.label, color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyText: { ...typography.bodyBold, color: colors.textSecondary, marginTop: spacing.md },
  emptySubtext: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  // Reject modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...cardShadow,
  },
  modalTitle: { ...typography.h3, color: colors.text, marginBottom: 4 },
  modalSubtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  noTasksContainer: { alignItems: 'center', paddingVertical: spacing.xl },
  noTasksText: { ...typography.captionBold, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  noTasksSubtext: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.md },
  addEntryBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  addEntryBtnPrimaryText: { ...typography.label, color: '#fff' },
  addEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary + '08',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  addEntryBtnText: { ...typography.label, color: colors.primary },
  addModalScroll: { maxHeight: 300 },
  stepLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  backBtnText: { ...typography.captionBold, color: colors.primary },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginBottom: spacing.xs,
  },
  projectRowText: { ...typography.captionBold, color: colors.text, flex: 1 },
  projectRowCount: { ...typography.small, color: colors.textSecondary, marginRight: spacing.xs },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginBottom: spacing.xs,
  },
  taskRowSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  taskRowText: { ...typography.body, color: colors.text, flex: 1 },
  taskRowTextSelected: { color: colors.primary, fontWeight: '600' },
});
