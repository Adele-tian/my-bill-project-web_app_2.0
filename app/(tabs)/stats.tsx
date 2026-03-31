import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTransactionStore } from '@/store/useTransactionStore';
import { getCategoryByName } from '@/utils/categories';
import { formatCurrency } from '@/utils/format';
import { useFocusEffect } from 'expo-router';
import { ArrowDownRight, ArrowUpRight, ChartColumnBig, WalletCards } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { LineChart, PieChart, type lineDataItem, type pieDataItem } from 'react-native-gifted-charts';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const periods: { label: string; value: 'week' | 'month' | 'year' }[] = [
  { label: '近7天', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '今年', value: 'year' },
];

const categoryTypes: { label: string; value: 'expense' | 'income' }[] = [
  { label: '支出', value: 'expense' },
  { label: '收入', value: 'income' },
];

function getCategoryColor(categoryName: string, type: 'expense' | 'income'): string {
  return getCategoryByName(categoryName, type).color;
}

export default function StatsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { width } = useWindowDimensions();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [selectedCategoryType, setSelectedCategoryType] = useState<'expense' | 'income'>('expense');

  const {
    periodSummary,
    trendSummary,
    categorySummary,
    fetchCategorySummary,
    fetchPeriodSummary,
    fetchTrendSummary,
  } = useTransactionStore();

  const loadStats = useCallback(() => {
    return Promise.all([
      fetchPeriodSummary(selectedPeriod),
      fetchTrendSummary(selectedPeriod),
      fetchCategorySummary(selectedCategoryType, selectedPeriod),
    ]);
  }, [fetchCategorySummary, fetchPeriodSummary, fetchTrendSummary, selectedCategoryType, selectedPeriod]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const trendChartWidth = Math.max(width - 84, 260);
  const trendMaxValue = useMemo(() => {
    const max = trendSummary.reduce((currentMax, item) => {
      return Math.max(currentMax, item.income, item.expense);
    }, 0);

    return max > 0 ? Math.ceil(max * 1.2) : 100;
  }, [trendSummary]);

  const expenseLineData = useMemo<lineDataItem[]>(() => {
    return trendSummary.map((item) => ({
      value: item.expense,
      label: item.label,
      dataPointColor: colors.expense,
    }));
  }, [colors.expense, trendSummary]);

  const incomeLineData = useMemo<lineDataItem[]>(() => {
    return trendSummary.map((item) => ({
      value: item.income,
      label: item.label,
      dataPointColor: colors.income,
    }));
  }, [colors.income, trendSummary]);

  const pieData = useMemo<pieDataItem[]>(() => {
    return categorySummary.map((item) => ({
      value: item.total,
      color: getCategoryColor(item.category, selectedCategoryType),
    }));
  }, [categorySummary, selectedCategoryType]);

  const hasTrendData = trendSummary.some((item) => item.income > 0 || item.expense > 0);
  const hasCategoryData = categorySummary.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>趋势与分类分析</Text>
          <Text style={[styles.title, { color: colors.text }]}>统计</Text>
        </View>

        <View style={styles.periodSelector}>
          {periods.map((period) => {
            const isActive = selectedPeriod === period.value;
            return (
              <TouchableOpacity
                key={period.value}
                style={[
                  styles.periodButton,
                  {
                    backgroundColor: isActive ? colors.primary : colors.card,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedPeriod(period.value)}
              >
                <Text style={[styles.periodText, { color: isActive ? '#FFF' : colors.textSecondary }]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.summaryIconWrap, { backgroundColor: `${colors.income}14` }]}>
              <ArrowUpRight size={18} color={colors.income} />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>本期收入</Text>
            <Text style={[styles.summaryAmount, { color: colors.text }]}>{formatCurrency(periodSummary.income)}</Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.summaryIconWrap, { backgroundColor: `${colors.expense}14` }]}>
              <ArrowDownRight size={18} color={colors.expense} />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>本期支出</Text>
            <Text style={[styles.summaryAmount, { color: colors.text }]}>{formatCurrency(periodSummary.expense)}</Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.summaryIconWrap, { backgroundColor: `${colors.primary}14` }]}>
              <WalletCards size={18} color={colors.primary} />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>净结余</Text>
            <Text
              style={[
                styles.summaryAmount,
                { color: periodSummary.net >= 0 ? colors.income : colors.expense },
              ]}
            >
              {formatCurrency(periodSummary.net, true)}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>收支趋势</Text>
              <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
                {selectedPeriod === 'year' ? '按月查看收入与支出的变化' : '按日查看当前周期的收支变化'}
              </Text>
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendPill}>
                <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
                <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>收入</Text>
              </View>
              <View style={styles.legendPill}>
                <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
                <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>支出</Text>
              </View>
            </View>
          </View>

          {hasTrendData ? (
            <LineChart
              areaChart
              curved
              data={expenseLineData}
              data2={incomeLineData}
              color={colors.expense}
              color2={colors.income}
              startFillColor={colorScheme === 'dark' ? 'rgba(255,112,67,0.28)' : 'rgba(238,107,115,0.18)'}
              endFillColor={colorScheme === 'dark' ? 'rgba(255,112,67,0.02)' : 'rgba(238,107,115,0.02)'}
              startFillColor2={colorScheme === 'dark' ? 'rgba(102,187,106,0.24)' : 'rgba(46,166,125,0.16)'}
              endFillColor2={colorScheme === 'dark' ? 'rgba(102,187,106,0.02)' : 'rgba(46,166,125,0.02)'}
              initialSpacing={12}
              endSpacing={12}
              spacing={Math.max(Math.floor((trendChartWidth - 24) / Math.max(trendSummary.length, 1)), 28)}
              hideDataPoints
              thickness={3}
              thickness2={3}
              noOfSections={4}
              maxValue={trendMaxValue}
              width={trendChartWidth}
              height={220}
              yAxisColor={colors.border}
              xAxisColor={colors.border}
              rulesColor={colors.border}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 12 }}
              xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 12 }}
            />
          ) : (
            <View style={styles.emptyModule}>
              <ChartColumnBig size={28} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>当前周期暂无趋势数据</Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                新增几笔账单后，这里会显示收入和支出的变化趋势。
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>分类分析</Text>
              <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>查看分类占比和金额分布</Text>
            </View>
            <View style={styles.typeSelector}>
              {categoryTypes.map((item) => {
                const isActive = selectedCategoryType === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor: isActive ? colors.primaryLight : colors.background,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedCategoryType(item.value)}
                  >
                    <Text style={[styles.typeButtonText, { color: isActive ? colors.primary : colors.textSecondary }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {hasCategoryData ? (
            <>
              <View style={styles.categoryChartWrap}>
                <PieChart
                  data={pieData}
                  donut
                  radius={96}
                  innerRadius={62}
                  strokeWidth={0}
                  innerCircleColor={colors.card}
                  centerLabelComponent={() => (
                    <View style={styles.pieCenter}>
                      <Text style={[styles.pieCenterLabel, { color: colors.textSecondary }]}>
                        {selectedCategoryType === 'expense' ? '支出' : '收入'}
                      </Text>
                      <Text style={[styles.pieCenterAmount, { color: colors.text }]}>
                        {formatCurrency(
                          categorySummary.reduce((sum, item) => sum + item.total, 0)
                        )}
                      </Text>
                    </View>
                  )}
                />
              </View>

              <View style={styles.categoryList}>
                {categorySummary.map((item) => {
                  const categoryColor = getCategoryColor(item.category, selectedCategoryType);
                  return (
                    <View key={`${selectedCategoryType}-${item.category}`} style={styles.categoryRow}>
                      <View style={styles.categoryInfo}>
                        <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
                        <View style={styles.categoryTextWrap}>
                          <Text style={[styles.categoryName, { color: colors.text }]}>{item.category}</Text>
                          <Text style={[styles.categoryPercent, { color: colors.textSecondary }]}>
                            占比 {item.percent ?? 0}%
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.categoryAmount,
                          { color: selectedCategoryType === 'expense' ? colors.expense : colors.income },
                        ]}
                      >
                        {selectedCategoryType === 'expense' ? '-' : '+'}
                        {formatCurrency(item.total).replace('¥', '¥')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <View style={styles.emptyModule}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                当前周期暂无{selectedCategoryType === 'expense' ? '支出' : '收入'}分类数据
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                切换周期或新增对应类型账单后，这里会自动更新。
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  subtitle: {
    fontSize: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    gap: 10,
  },
  periodButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryGrid: {
    marginTop: 18,
    paddingHorizontal: 20,
    gap: 12,
  },
  summaryItem: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryAmount: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '700',
  },
  card: {
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionDesc: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  legendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyModule: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyDesc: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 260,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChartWrap: {
    alignItems: 'center',
    marginTop: 18,
  },
  pieCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  pieCenterAmount: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '700',
  },
  categoryList: {
    marginTop: 18,
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryTextWrap: {
    marginLeft: 10,
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
  },
  categoryPercent: {
    marginTop: 2,
    fontSize: 12,
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
});
