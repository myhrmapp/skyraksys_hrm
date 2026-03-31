import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { payslipsApi, Payslip } from '../../api/payslips';
import { showSuccess, showError } from '../../utils/toast';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Route = RouteProp<RootStackParamList, 'PayslipDetail'>;

export default function PayslipDetailScreen() {
  const route = useRoute<Route>();
  const { payslipId } = route.params;
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);

  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    payslipsApi
      .getById(payslipId)
      .then(setPayslip)
      .catch(() => Alert.alert('Error', 'Failed to load payslip'))
      .finally(() => setLoading(false));
  }, [payslipId]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!payslip) {
    return (
      <View style={styles.loader}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>Payslip not found</Text>
      </View>
    );
  }

  const monthName = new Date(payslip.year, payslip.month - 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <Text style={styles.monthTitle}>{monthName}</Text>
        <Text style={styles.netPayLabel}>Net Pay</Text>
        <Text style={styles.netPayAmount}>{formatCurrency(payslip.netPay ?? payslip.netSalary ?? 0)}</Text>
      </View>

      {/* Earnings */}
      <Text style={styles.sectionTitle}>Earnings</Text>
      <View style={styles.sectionCard}>
        {payslip.earnings && typeof payslip.earnings === 'object' ? (
          Object.entries(payslip.earnings).map(([key, value]) => (
            <View key={key} style={styles.lineRow}>
              <Text style={styles.lineLabel}>{key}</Text>
              <Text style={[styles.lineValue, { color: colors.success }]}>
                {formatCurrency(Number(value) || 0)}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.lineRow}>
            <Text style={styles.lineLabel}>Total Earnings</Text>
            <Text style={[styles.lineValue, { color: colors.success }]}>
              {formatCurrency(payslip.grossEarnings ?? payslip.grossSalary ?? 0)}
            </Text>
          </View>
        )}
        <View style={[styles.lineRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total Earnings</Text>
          <Text style={[styles.totalValue, { color: colors.success }]}>
            {formatCurrency(payslip.grossEarnings ?? payslip.grossSalary ?? 0)}
          </Text>
        </View>
      </View>

      {/* Deductions */}
      <Text style={styles.sectionTitle}>Deductions</Text>
      <View style={styles.sectionCard}>
        {payslip.deductions && typeof payslip.deductions === 'object' ? (
          Object.entries(payslip.deductions).map(([key, value]) => (
            <View key={key} style={styles.lineRow}>
              <Text style={styles.lineLabel}>{key}</Text>
              <Text style={[styles.lineValue, { color: colors.error }]}>
                -{formatCurrency(Number(value) || 0)}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.lineRow}>
            <Text style={styles.lineLabel}>Total Deductions</Text>
            <Text style={[styles.lineValue, { color: colors.error }]}>
              -{formatCurrency(payslip.totalDeductions)}
            </Text>
          </View>
        )}
        <View style={[styles.lineRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total Deductions</Text>
          <Text style={[styles.totalValue, { color: colors.error }]}>
            -{formatCurrency(payslip.totalDeductions ?? 0)}
          </Text>
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Gross Pay</Text>
          <Text style={styles.summaryValue}>{formatCurrency(payslip.grossEarnings ?? payslip.grossSalary ?? 0)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Deductions</Text>
          <Text style={[styles.summaryValue, { color: colors.error }]}>
            -{formatCurrency(payslip.totalDeductions ?? 0)}
          </Text>
        </View>
        <View style={[styles.summaryRow, styles.netRow]}>
          <Text style={styles.netLabel}>Net Pay</Text>
          <Text style={styles.netValue}>{formatCurrency(payslip.netPay ?? payslip.netSalary ?? 0)}</Text>
        </View>
      </View>

      {/* Download */}
      <TouchableOpacity
        style={[styles.downloadBtn, downloading && { opacity: 0.6 }]}
        onPress={async () => {
          setDownloading(true);
          try {
            await payslipsApi.downloadPdf(payslipId);
            showSuccess('PDF download started');
          } catch {
            showError('Failed to download PDF');
          } finally {
            setDownloading(false);
          }
        }}
        disabled={downloading}
      >
        {downloading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="download-outline" size={20} color={colors.primary} />
        )}
        <Text style={styles.downloadText}>Download PDF</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  errorText: { ...typography.body, color: colors.error, marginTop: spacing.md },
  headerCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  monthTitle: { ...typography.h2, color: '#fff' },
  netPayLabel: { ...typography.caption, color: 'rgba(255,255,255,0.8)', marginTop: spacing.md },
  netPayAmount: { ...typography.h1, color: '#fff', fontSize: 36 },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lineLabel: { ...typography.body, color: colors.text, textTransform: 'capitalize' },
  lineValue: { ...typography.captionBold },
  totalRow: {
    borderBottomWidth: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  totalLabel: { ...typography.captionBold, color: colors.text },
  totalValue: { ...typography.captionBold, fontSize: 16 },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  summaryLabel: { ...typography.body, color: colors.textSecondary },
  summaryValue: { ...typography.captionBold, color: colors.text },
  netRow: {
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  netLabel: { ...typography.h3, color: colors.text },
  netValue: { ...typography.h2, color: colors.primary },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.xl,
  },
  downloadText: { ...typography.captionBold, color: colors.primary },
});
