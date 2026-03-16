import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTransactionStore } from '@/store/useTransactionStore';
import { getCategoryByName } from '@/utils/categories';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const periods: { label: string; value: 'week' | 'month' | 'year' }[] = [
  { label: '近7天', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '今年', value: 'year' },
];

function getCategoryColor(categoryName: string): string {
  const category = getCategoryByName(categoryName, 'expense');
  return category.color;
}

export default function StatsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [selectedPeriod, setSelectedPeriod] = useState(0);

  const { income, expense, categorySummary, fetchSummary, fetchCategorySummary } = useTransactionStore();

  useEffect(() => {
    const period = periods[selectedPeriod].value;
    fetchSummary(period);
    fetchCategorySummary('expense', period);
  }, [fetchCategorySummary, fetchSummary, selectedPeriod]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>收支分析</Text>
          <Text style={[styles.title, { color: colors.text }]}>统计</Text>
        </View>

        <View style={styles.periodSelector}>
          {periods.map((period, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.periodButton, selectedPeriod === index && { backgroundColor: colors.primary }]}
              onPress={() => setSelectedPeriod(index)}
            >
              <Text style={[styles.periodText, { color: selectedPeriod === index ? '#FFF' : colors.textSecondary }]}>{period.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>本期收入</Text>
              <Text style={[styles.summaryAmount, { color: colors.income }]}>¥{income.toFixed(2)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>本期支出</Text>
              <Text style={[styles.summaryAmount, { color: colors.expense }]}>¥{expense.toFixed(2)}</Text>
            </View>
          </View>

          {categorySummary.length > 0 ? (
            <View style={styles.chartContainer}>
              <View style={styles.pieChart}>
                {categorySummary.map((item, index) => (
                  <View key={index} style={[styles.pieSlice, { backgroundColor: getCategoryColor(item.category), width: `${item.percent ?? 0}%` }]} />
                ))}
              </View>
              <View style={styles.legendContainer}>
                {categorySummary.map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: getCategoryColor(item.category) }]} />
                    <Text style={[styles.legendText, { color: colors.text }]}>{item.category}</Text>
                    <Text style={[styles.legendAmount, { color: colors.textSecondary }]}>¥{item.total.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>当前周期暂无支出数据</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>详细账单</Text>
          <View style={[styles.billList, { backgroundColor: colors.card }]}>
            {categorySummary.length > 0 ? categorySummary.map((item, index) => (
              <View key={index} style={styles.billItem}>
                <View style={[styles.billIcon, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
                  <View style={[styles.billDot, { backgroundColor: getCategoryColor(item.category) }]} />
                </View>
                <View style={styles.billInfo}>
                  <Text style={[styles.billCategory, { color: colors.text }]}>{item.category}</Text>
                  <Text style={[styles.billPercent, { color: colors.textSecondary }]}>{item.percent}%</Text>
                </View>
                <Text style={[styles.billAmount, { color: colors.expense }]}>-¥{item.total.toFixed(2)}</Text>
              </View>
            )) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>暂无记录</Text>
                <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>切换不同时间范围查看历史数据</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10 },
  subtitle: { fontSize: 14 },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  periodSelector: { flexDirection: 'row', marginHorizontal: 20, marginTop: 20, gap: 12 },
  periodButton: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: 'transparent' },
  periodText: { fontSize: 14, fontWeight: '500' },
  summaryCard: { margin: 20, borderRadius: 16, padding: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 12 },
  summaryAmount: { fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  chartContainer: { marginTop: 24 },
  pieChart: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' },
  pieSlice: { height: '100%' },
  legendContainer: { marginTop: 16, gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { flex: 1, marginLeft: 8, fontSize: 14 },
  legendAmount: { fontSize: 14 },
  emptyChart: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  billList: { borderRadius: 16, padding: 16 },
  billItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  billIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  billDot: { width: 12, height: 12, borderRadius: 6 },
  billInfo: { flex: 1, marginLeft: 12 },
  billCategory: { fontSize: 16, fontWeight: '500' },
  billPercent: { fontSize: 12, marginTop: 2 },
  billAmount: { fontSize: 16, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '500' },
  emptyDesc: { fontSize: 14, marginTop: 8 },
});
