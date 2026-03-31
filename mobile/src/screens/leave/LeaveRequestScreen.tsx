import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { leavesApi, LeaveType, CreateLeavePayload } from '../../api/leaves';
import { showSuccess, showError } from '../../utils/toast';

// Platform-aware date input — native HTML <input type="date"> on web,
// text button that opens DateTimePicker on iOS/Android
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

/** Renders a date field suitable for each platform */
function DateField({
  value,
  onChange,
  minDate,
  label,
}: {
  value: Date;
  onChange: (d: Date) => void;
  minDate?: Date;
  label: string;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  if (Platform.OS === 'web') {
    return (
      <View style={styles.dateBtnWeb}>
        {/* @ts-ignore — React Native Web passes through standard HTML input props */}
        <input
          type="date"
          value={formatDate(value)}
          min={minDate ? formatDate(minDate) : undefined}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const d = new Date(e.target.value + 'T00:00:00');
            if (!isNaN(d.getTime())) onChange(d);
          }}
          style={{
            width: '100%',
            padding: 14,
            fontSize: 16,
            border: `1px solid ${colors.border}`,
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            color: colors.text,
            boxSizing: 'border-box',
            fontFamily: 'inherit',
          } as any}
        />
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker(true)}>
        <Text style={styles.dateText}>{formatDate(value)}</Text>
      </TouchableOpacity>
      {showPicker && DateTimePicker && (
        <DateTimePicker
          value={value}
          mode="date"
          minimumDate={minDate}
          onChange={(_: any, date?: Date) => {
            setShowPicker(Platform.OS === 'ios');
            if (date) onChange(date);
          }}
        />
      )}
    </>
  );
}

export default function LeaveRequestScreen() {
  const navigation = useNavigation();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [reason, setReason] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayType, setHalfDayType] = useState<'First Half' | 'Second Half'>('First Half');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    leavesApi.getTypes().then((types) => {
      setLeaveTypes(Array.isArray(types) ? types : []);
      if (types.length > 0) setSelectedType(types[0].id);
    });
  }, []);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const handleSubmit = async () => {
    if (!selectedType) {
      showError('Please select a leave type');
      return;
    }
    if (!reason.trim() || reason.trim().length < 10) {
      showError('Reason must be at least 10 characters');
      return;
    }
    if (endDate < startDate) {
      showError('End date cannot be before start date');
      return;
    }

    setLoading(true);
    try {
      const payload: CreateLeavePayload = {
        leaveTypeId: selectedType,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        reason: reason.trim(),
        isHalfDay,
        ...(isHalfDay && { halfDayType }),
      };
      await leavesApi.create(payload);
      showSuccess('Leave request submitted successfully');
      navigation.goBack();
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Leave Type Picker */}
      <Text style={styles.label}>Leave Type</Text>
      <View style={styles.typeRow}>
        {leaveTypes.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.typeChip, selectedType === t.id && styles.typeChipActive]}
            onPress={() => setSelectedType(t.id)}
          >
            <Text style={[styles.typeChipText, selectedType === t.id && styles.typeChipTextActive]}>
              {t.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Start Date */}
      <Text style={styles.label}>Start Date</Text>
      <DateField
        value={startDate}
        minDate={twoWeeksAgo}
        label="Start Date"
        onChange={(d) => {
          setStartDate(d);
          if (d > endDate) setEndDate(d);
        }}
      />

      {/* End Date */}
      <Text style={styles.label}>End Date</Text>
      <DateField
        value={endDate}
        minDate={startDate}
        label="End Date"
        onChange={setEndDate}
      />

      {/* Half Day Toggle */}
      <View style={styles.switchRow}>
        <Text style={styles.label}>Half Day</Text>
        <Switch
          value={isHalfDay}
          onValueChange={setIsHalfDay}
          trackColor={{ false: colors.border, true: colors.primary + '80' }}
          thumbColor={isHalfDay ? colors.primary : '#f4f3f4'}
        />
      </View>

      {/* Half Day Type — shown only when Half Day is on */}
      {isHalfDay && (
        <View style={styles.halfDayRow}>
          {(['First Half', 'Second Half'] as const).map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.halfDayChip, halfDayType === opt && styles.halfDayChipActive]}
              onPress={() => setHalfDayType(opt)}
            >
              <Text style={[styles.halfDayChipText, halfDayType === opt && styles.halfDayChipTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Reason */}
      <Text style={styles.label}>Reason</Text>
      <TextInput
        testID="leave-reason"
        style={styles.textArea}
        value={reason}
        onChangeText={setReason}
        placeholder="Describe your reason for leave (min 10 characters)..."
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {/* Submit */}
      <TouchableOpacity
        testID="leave-submit-btn"
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Submit Request</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  label: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: { ...typography.body, color: colors.text },
  typeChipTextActive: { color: '#fff', fontWeight: '600' },
  halfDayRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  halfDayChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  halfDayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  halfDayChipText: { ...typography.captionBold, color: colors.text },
  halfDayChipTextActive: { color: '#fff' },
  dateBtn: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateBtnWeb: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  dateText: { ...typography.body, color: colors.text },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
    ...typography.body,
    color: colors.text,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { ...typography.label, color: '#fff', fontSize: 16 },
});
