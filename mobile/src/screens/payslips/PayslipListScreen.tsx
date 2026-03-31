import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { cardShadow } from '../../utils/shadow';
import { payslipsApi, Payslip } from '../../api/payslips';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function PayslipListScreen() {
  const navigation = useNavigation<Nav>();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await payslipsApi.getMy();
      setPayslips(Array.isArray(data) ? data : []);
    } catch {
      setPayslips([]);
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  const renderPayslip = ({ item }: { item: Payslip }) => {
    const monthName = new Date(item.year, item.month - 1).toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });

    return (
      <TouchableOpacity
        testID={`payslip-card-${item.id}`}
        style={styles.card}
        onPress={() => navigation.navigate('PayslipDetail', { payslipId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <View style={styles.monthBadge}>
            <Text style={styles.monthBadgeText}>
              {new Date(item.year, item.month - 1).toLocaleString('default', { month: 'short' }).toUpperCase()}
            </Text>
            <Text style={styles.yearText}>{item.year}</Text>
          </View>
        </View>
        <View style={styles.cardCenter}>
          <Text style={styles.monthName}>{monthName}</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Earnings</Text>
            <Text style={[styles.detailValue, { color: colors.success }]}>
              {formatCurrency(item.grossEarnings ?? item.grossSalary ?? 0)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Deductions</Text>
            <Text style={[styles.detailValue, { color: colors.error }]}>
              -{formatCurrency(item.totalDeductions ?? 0)}
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.netLabel}>Net Pay</Text>
          <Text style={styles.netAmount}>{formatCurrency(item.netPay ?? item.netSalary ?? 0)}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={payslips}
      renderItem={renderPayslip}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No payslips available</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...cardShadow,
  },
  cardLeft: { marginRight: spacing.md },
  monthBadge: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthBadgeText: { ...typography.label, color: colors.primary, fontSize: 13 },
  yearText: { ...typography.small, color: colors.primary, fontSize: 10 },
  cardCenter: { flex: 1 },
  monthName: { ...typography.captionBold, color: colors.text, marginBottom: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  detailLabel: { ...typography.small, color: colors.textSecondary },
  detailValue: { ...typography.small, fontWeight: '600' },
  cardRight: { alignItems: 'flex-end', marginLeft: spacing.sm },
  netLabel: { ...typography.small, color: colors.textSecondary },
  netAmount: { ...typography.captionBold, color: colors.primary, fontSize: 16 },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl * 3 },
  emptyText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
});
