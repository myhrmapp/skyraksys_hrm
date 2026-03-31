import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { cardShadow } from '../../utils/shadow';
import { attendanceApi, TodayAttendance, AttendanceRecord } from '../../api/attendance';
import { useAuthStore } from '../../store/authStore';
import { showError } from '../../utils/toast';

export default function AttendanceScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const isManager = role === 'manager' || role === 'admin' || role === 'hr';

  const [activeTab, setActiveTab] = useState<'my' | 'team'>('my');
  const [today, setToday] = useState<TodayAttendance | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [teamSummary, setTeamSummary] = useState<any>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const todayDate = now.toISOString().split('T')[0];

  const load = useCallback(async () => {
    try {
      const [t, r] = await Promise.all([
        attendanceApi.getToday(),
        attendanceApi.getMy({ month, year }),
      ]);
      setToday(t);
      setRecords(Array.isArray(r) ? r : []);
    } catch {
      // empty state
    }
  }, [month, year]);

  const loadTeam = useCallback(async () => {
    if (!isManager) return;
    setTeamLoading(true);
    try {
      const summary = await attendanceApi.getSummary({ date: todayDate });
      setTeamSummary(summary);
    } catch {
      setTeamSummary(null);
    } finally {
      setTeamLoading(false);
    }
  }, [isManager, todayDate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (activeTab === 'team') loadTeam();
  }, [activeTab, loadTeam]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), activeTab === 'team' ? loadTeam() : Promise.resolve()]);
    setRefreshing(false);
  };

  const handleCheckInOut = async () => {
    setCheckingIn(true);
    try {
      if (today?.checkedIn && !today?.checkOut) {
        await attendanceApi.checkOut();
      } else {
        await attendanceApi.checkIn();
      }
      await load();
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Failed to record attendance');
    } finally {
      setCheckingIn(false);
    }
  };

  // Build marked dates for calendar
  const statusColors: Record<string, string> = {
    present: colors.success,
    late: colors.warning,
    'half-day': colors.info,
    absent: colors.error,
    'on-leave': colors.attendance.leave,
    holiday: colors.attendance.holiday,
    weekend: colors.textSecondary,
  };

  const markedDates: Record<string, any> = {};
  records.forEach((r) => {
    const dateKey = r.date.slice(0, 10);
    markedDates[dateKey] = {
      marked: true,
      dotColor: statusColors[r.status] || colors.textSecondary,
      selected: selectedDate === dateKey,
      selectedColor: colors.primary + '30',
    };
  });

  if (selectedDate && !markedDates[selectedDate]) {
    markedDates[selectedDate] = {
      selected: true,
      selectedColor: colors.primary + '30',
    };
  }

  const selectedRecord = records.find((r) => r.date.slice(0, 10) === selectedDate);

  const isCheckedIn = today?.checkedIn && !today?.checkOut;
  const isCheckedOut = today?.checkedIn && !!today?.checkOut;

  // Team summary derived values
  const teamRecords: any[] = teamSummary?.records || teamSummary?.employees || [];
  const teamPresent = teamSummary?.present ?? teamRecords.filter((r: any) => r.status === 'present' || r.status === 'late').length;
  const teamOnLeave = teamSummary?.onLeave ?? teamSummary?.on_leave ?? teamRecords.filter((r: any) => r.status === 'on-leave').length;
  const teamAbsent = teamSummary?.absent ?? teamRecords.filter((r: any) => r.status === 'absent').length;
  const teamTotal = teamSummary?.totalEmployees ?? teamSummary?.total ?? teamRecords.length;

  return (
    <View style={styles.outerContainer}>
      {/* Manager tab bar */}
      {isManager && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            testID="attendance-my-tab"
            style={[styles.tab, activeTab === 'my' && styles.tabActive]}
            onPress={() => setActiveTab('my')}
          >
            <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>My Attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="attendance-team-tab"
            style={[styles.tab, activeTab === 'team' && styles.tabActive]}
            onPress={() => setActiveTab('team')}
          >
            <Text style={[styles.tabText, activeTab === 'team' && styles.tabTextActive]}>Team Today</Text>
          </TouchableOpacity>
        </View>
      )}

    {activeTab === 'team' ? (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {teamLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Team Summary Cards */}
            <View style={styles.teamSummaryRow}>
              <View style={[styles.teamSummaryCard, { borderLeftColor: colors.success }]}>
                <Text style={[styles.teamSummaryValue, { color: colors.success }]}>{teamPresent}</Text>
                <Text style={styles.teamSummaryLabel}>Present</Text>
              </View>
              <View style={[styles.teamSummaryCard, { borderLeftColor: colors.error }]}>
                <Text style={[styles.teamSummaryValue, { color: colors.error }]}>{teamAbsent}</Text>
                <Text style={styles.teamSummaryLabel}>Absent</Text>
              </View>
              <View style={[styles.teamSummaryCard, { borderLeftColor: colors.warning }]}>
                <Text style={[styles.teamSummaryValue, { color: colors.warning }]}>{teamOnLeave}</Text>
                <Text style={styles.teamSummaryLabel}>On Leave</Text>
              </View>
              <View style={[styles.teamSummaryCard, { borderLeftColor: colors.primary }]}>
                <Text style={[styles.teamSummaryValue, { color: colors.primary }]}>{teamTotal}</Text>
                <Text style={styles.teamSummaryLabel}>Total</Text>
              </View>
            </View>

            {/* Employee list */}
            <Text style={styles.sectionTitle}>Today — {todayDate}</Text>
            {teamRecords.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No attendance data available</Text>
              </View>
            ) : (
              teamRecords.map((rec: any, idx: number) => {
                const empName = rec.employeeName || rec.name ||
                  `${rec.employee?.firstName || ''} ${rec.employee?.lastName || ''}`.trim() || `Employee ${idx + 1}`;
                const st = rec.status || 'unknown';
                const stColor = statusColors[st] || colors.textSecondary;
                return (
                  <View key={rec.id || idx} style={styles.teamRow}>
                    <View style={[styles.teamAvatar, { backgroundColor: stColor + '25' }]}>
                      <Text style={[styles.teamAvatarText, { color: stColor }]}>
                        {empName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.teamRowInfo}>
                      <Text style={styles.teamRowName}>{empName}</Text>
                      {rec.checkIn && (
                        <Text style={styles.teamRowTime}>
                          In: {new Date(rec.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {rec.checkOut
                            ? ` · Out: ${new Date(rec.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : ''}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.teamBadge, { backgroundColor: stColor + '20' }]}>
                      <Text style={[styles.teamBadgeText, { color: stColor }]}>
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    ) : (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Check In/Out */}
      <View style={styles.todayCard}>
        <View style={styles.todayInfo}>
          <Text style={styles.todayLabel}>Today</Text>
          {today?.checkIn ? (
            <Text style={styles.todayTime}>
              {new Date(today.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {today.checkOut && ` — ${new Date(today.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </Text>
          ) : (
            <Text style={styles.todayTime}>Not checked in</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.checkBtn, isCheckedIn && styles.checkOutBtn, isCheckedOut && styles.doneBtn]}
          onPress={handleCheckInOut}
          disabled={checkingIn || isCheckedOut}
        >
          <Ionicons
            name={isCheckedIn ? 'log-out-outline' : 'finger-print-outline'}
            size={28}
            color="#fff"
          />
          <Text style={styles.checkBtnText}>
            {isCheckedOut ? 'Done' : isCheckedIn ? 'Check Out' : 'Check In'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Calendar */}
      <View style={styles.calendarCard}>
        <Calendar
          markedDates={markedDates}
          onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
          onMonthChange={(m: DateData) => {
            setMonth(m.month);
            setYear(m.year);
          }}
          theme={{
            todayTextColor: colors.primary,
            arrowColor: colors.primary,
            selectedDayBackgroundColor: colors.primary,
            dotStyle: { width: 8, height: 8, borderRadius: 4 },
          }}
        />
      </View>

      {/* Selected Day Detail */}
      {selectedDate && selectedRecord && (
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{selectedDate}</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: (statusColors[selectedRecord.status] || colors.textSecondary) + '20' }]}>
              <Text style={[styles.statusText, { color: statusColors[selectedRecord.status] || colors.textSecondary }]}>
                {selectedRecord.status.toUpperCase()}
              </Text>
            </View>
          </View>
          {selectedRecord.checkIn && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Check In</Text>
              <Text style={styles.detailValue}>
                {new Date(selectedRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
          {selectedRecord.checkOut && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Check Out</Text>
              <Text style={styles.detailValue}>
                {new Date(selectedRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
          {selectedRecord.hoursWorked != null && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Hours Worked</Text>
              <Text style={styles.detailValue}>{selectedRecord.hoursWorked}h</Text>
            </View>
          )}
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        {Object.entries(statusColors).slice(0, 5).map(([status, color]) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{status}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: colors.background },
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
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl * 3 },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
  teamSummaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  teamSummaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    padding: spacing.md,
    alignItems: 'center',
    ...cardShadow,
  },
  teamSummaryValue: { ...typography.stat, fontSize: 22 },
  teamSummaryLabel: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    ...cardShadow,
  },
  teamAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamAvatarText: { ...typography.label, fontSize: 16 },
  teamRowInfo: { flex: 1 },
  teamRowName: { ...typography.captionBold, color: colors.text },
  teamRowTime: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  teamBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  teamBadgeText: { ...typography.small, fontWeight: '700', fontSize: 11 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  todayCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  todayInfo: { flex: 1 },
  todayLabel: { ...typography.caption, color: 'rgba(255,255,255,0.8)' },
  todayTime: { ...typography.h3, color: '#fff', marginTop: 4 },
  checkBtn: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: 4,
  },
  checkOutBtn: { backgroundColor: colors.warning },
  doneBtn: { backgroundColor: colors.textSecondary, opacity: 0.7 },
  checkBtnText: { ...typography.small, color: '#fff', fontWeight: '700' },
  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...cardShadow,
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  detailTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: { ...typography.body, color: colors.textSecondary },
  detailValue: { ...typography.label, color: colors.text },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: { ...typography.small, fontWeight: '700' },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { ...typography.small, color: colors.textSecondary, textTransform: 'capitalize' },
});
