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
import { Calendar, DateData } from 'react-native-calendars';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { cardShadow } from '../../utils/shadow';
import { attendanceApi, TodayAttendance, AttendanceRecord } from '../../api/attendance';

export default function AttendanceScreen() {
  const [today, setToday] = useState<TodayAttendance | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

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
      if (today?.checkedIn && !today?.checkOut) {
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

  return (
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
  );
}

const styles = StyleSheet.create({
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
