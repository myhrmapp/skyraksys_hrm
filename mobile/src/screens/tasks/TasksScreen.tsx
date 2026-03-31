import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { cardShadow } from '../../utils/shadow';
import { tasksApi, Task } from '../../api/tasks';
import { showError } from '../../utils/toast';

const PRIORITY_CONFIG: Record<string, { color: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }> = {
  Critical: { color: '#D32F2F', icon: 'alert-circle' },
  High:     { color: colors.error,   icon: 'arrow-up-circle' },
  Medium:   { color: colors.warning, icon: 'remove-circle' },
  Low:      { color: colors.success, icon: 'arrow-down-circle' },
};

const STATUS_NEXT: Record<string, Task['status']> = {
  'Not Started': 'In Progress',
  'In Progress': 'Completed',
  'Completed':   'Completed',
  'On Hold':     'In Progress',
};

const STATUS_COLOR: Record<string, string> = {
  'Not Started': colors.textSecondary,
  'In Progress': colors.info,
  'Completed':   colors.success,
  'On Hold':     colors.warning,
};

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await tasksApi.getAll();
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
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

  const handleAdvanceStatus = async (task: Task) => {
    if (task.status === 'Completed') return;
    const nextStatus = STATUS_NEXT[task.status];
    setUpdatingId(task.id);
    try {
      await tasksApi.update(task.id, { status: nextStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
      );
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Failed to update task');
    } finally {
      setUpdatingId(null);
    }
  };

  const openOverdue = tasks.filter(
    (t) => t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < new Date()
  ).length;

  const renderTask = ({ item }: { item: Task }) => {
    const priorityCfg = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.Medium;
    const isUpdating = updatingId === item.id;
    const isDone = item.status === 'Completed';
    const isOverdue = !isDone && item.dueDate && new Date(item.dueDate) < new Date();

    return (
      <View style={[styles.card, isDone && styles.cardDone]}>
        {/* Priority stripe */}
        <View style={[styles.priorityStripe, { backgroundColor: priorityCfg.color }]} />

        <View style={styles.cardBody}>
          {/* Title row */}
          <View style={styles.titleRow}>
            <Text style={[styles.taskName, isDone && styles.taskNameDone]} numberOfLines={2}>
              {item.name}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
              <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
                {item.status}
              </Text>
            </View>
          </View>

          {/* Project */}
          {item.project?.name && (
            <Text style={styles.projectName}>
              <Ionicons name="folder-outline" size={12} /> {item.project.name}
            </Text>
          )}

          {/* Meta row */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name={priorityCfg.icon} size={14} color={priorityCfg.color} />
              <Text style={[styles.metaText, { color: priorityCfg.color }]}>{item.priority}</Text>
            </View>
            {item.dueDate && (
              <View style={styles.metaItem}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={isOverdue ? colors.error : colors.textSecondary}
                />
                <Text style={[styles.metaText, isOverdue && styles.overdueText]}>
                  {item.dueDate.split('T')[0]}
                </Text>
              </View>
            )}
            {item.estimatedHours != null && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.metaText}>{item.estimatedHours}h</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
          ) : null}

          {/* Advance status button */}
          {!isDone && (
            <TouchableOpacity
              testID={`task-advance-${item.id}`}
              style={[styles.advanceBtn, isUpdating && styles.advanceBtnDisabled]}
              onPress={() => handleAdvanceStatus(item)}
              disabled={isUpdating}
              activeOpacity={0.75}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="arrow-forward-circle-outline" size={16} color={colors.primary} />
                  <Text style={styles.advanceBtnText}>
                    Mark {STATUS_NEXT[item.status]}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isDone && (
            <View style={styles.doneRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.doneText}>Completed</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const openTasks = tasks.filter((t) => t.status !== 'Completed');
  const doneTasks = tasks.filter((t) => t.status === 'Completed');

  return (
    <View style={styles.container}>
      {/* Summary bar */}
      {tasks.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{openTasks.length}</Text>
            <Text style={styles.summaryLabel}>Open</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, openOverdue > 0 && { color: colors.error }]}>{openOverdue}</Text>
            <Text style={styles.summaryLabel}>Overdue</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.success }]}>{doneTasks.length}</Text>
            <Text style={styles.summaryLabel}>Done</Text>
          </View>
        </View>
      )}

      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={56} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No tasks assigned</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { ...typography.stat, fontSize: 22, color: colors.text },
  summaryLabel: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  summaryDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  list: { padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...cardShadow,
  },
  cardDone: { opacity: 0.65 },
  priorityStripe: { width: 4, borderRadius: 0 },
  cardBody: { flex: 1, padding: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  taskName: { ...typography.captionBold, color: colors.text, flex: 1, lineHeight: 20 },
  taskNameDone: { textDecorationLine: 'line-through', color: colors.textSecondary },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    flexShrink: 0,
  },
  statusText: { ...typography.small, fontWeight: '700', fontSize: 11 },
  projectName: { ...typography.small, color: colors.textSecondary, marginTop: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { ...typography.small, color: colors.textSecondary },
  overdueText: { color: colors.error, fontWeight: '600' },
  description: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  advanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  advanceBtnDisabled: { opacity: 0.5 },
  advanceBtnText: { ...typography.small, color: colors.primary, fontWeight: '600' },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  doneText: { ...typography.small, color: colors.success, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl * 3 },
  emptyText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
});
