import { AppPageHeader } from '@/components/AppPageHeader';
import { PageSectionCard } from '@/components/PageSectionCard';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTransactionStore } from '@/store/useTransactionStore';
import { getCategoryByName, getCategoryIconComponent } from '@/utils/categories';
import { formatCurrency, parseAppDate } from '@/utils/format';
import type { EmotionKey } from '@/utils/home-clues';
import { getEmotionMeta, getHomeCategoryCopy, parseEmotionFromDescription, stripEmotionFromDescription } from '@/utils/home-clues';
import { useFocusEffect } from 'expo-router';
import {
  addMonths,
  eachDayOfInterval,
  getDay,
  endOfMonth,
  format,
  isSameMonth,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const EMOTION_KEYS: EmotionKey[] = ['super_happy', 'impulsive', 'lesson_learned'];

type CategoryCompareMode = 'share' | 'previous';

type CategoryInsightItem = {
  category: string;
  categoryIcon: string;
  categoryCopy: string;
  total: number;
  sharePercent: number;
  previousTotal: number;
  deltaPercent: number | null;
  isNew: boolean;
};

function formatMonthKey(date: Date): string {
  return format(startOfMonth(date), 'yyyy-MM');
}

function buildCalendarDays(monthDate: Date): (Date | null)[] {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingEmptyDays = (getDay(monthStart) + 6) % 7;
  const trailingEmptyDays = (7 - ((leadingEmptyDays + monthDays.length) % 7)) % 7;

  return [
    ...Array.from({ length: leadingEmptyDays }, () => null),
    ...monthDays,
    ...Array.from({ length: trailingEmptyDays }, () => null),
  ];
}

export default function StatsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { width } = useWindowDimensions();

  const [selectedMonthDate, setSelectedMonthDate] = useState(() => startOfMonth(new Date()));
  const [selectedCategoryType, setSelectedCategoryType] = useState<'expense' | 'income'>('expense');
  const [categoryCompareMode, setCategoryCompareMode] = useState<CategoryCompareMode>('share');

  const selectedMonth = useMemo(() => formatMonthKey(selectedMonthDate), [selectedMonthDate]);
  const previousMonthDate = useMemo(() => subMonths(selectedMonthDate, 1), [selectedMonthDate]);

  const {
    transactions,
    monthlySummary,
    monthlyTrendSummary,
    monthlyRecentTransactions,
    fetchTransactions,
    fetchMonthlySummary,
    fetchMonthlyTrendSummary,
    fetchMonthlyRecentTransactions,
  } = useTransactionStore();

  const loadStats = useCallback(() => {
    return Promise.all([
      fetchTransactions(),
      fetchMonthlySummary(selectedMonth),
      fetchMonthlyTrendSummary(selectedMonth),
      fetchMonthlyRecentTransactions(selectedMonth, 9999),
    ]);
  }, [
    fetchTransactions,
    fetchMonthlyRecentTransactions,
    fetchMonthlySummary,
    fetchMonthlyTrendSummary,
    selectedMonth,
  ]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const maxExpense = useMemo(() => {
    return monthlyTrendSummary.reduce((max, item) => Math.max(max, item.expense), 0);
  }, [monthlyTrendSummary]);

  const calendarDays = useMemo(() => buildCalendarDays(selectedMonthDate), [selectedMonthDate]);
  const expenseMap = useMemo(() => {
    return new Map(monthlyTrendSummary.map((item) => [item.day, item.expense]));
  }, [monthlyTrendSummary]);
  const hasMonthlyTransactions = monthlyRecentTransactions.length > 0;
  const emotionSummary = useMemo(() => {
    const counts = new Map<EmotionKey, number>(EMOTION_KEYS.map((key) => [key, 0]));

    for (const transaction of monthlyRecentTransactions) {
      if (transaction.type !== selectedCategoryType) {
        continue;
      }

      const emotionKey = parseEmotionFromDescription(transaction.description);
      if (!emotionKey) {
        continue;
      }

      counts.set(emotionKey, (counts.get(emotionKey) ?? 0) + 1);
    }

    return EMOTION_KEYS.map((key) => {
      const emotion = getEmotionMeta(key);
      return {
        key,
        emoji: emotion.emoji,
        label: emotion.label,
        count: counts.get(key) ?? 0,
      };
    })
      .sort((a, b) => b.count - a.count);
  }, [monthlyRecentTransactions, selectedCategoryType]);
  const categoryInsights = useMemo<CategoryInsightItem[]>(() => {
    const currentMonthTotals = new Map<string, { total: number; categoryIcon: string }>();
    const previousMonthTotals = new Map<string, number>();

    for (const transaction of transactions) {
      if (transaction.type !== selectedCategoryType) {
        continue;
      }

      const transactionDate = parseAppDate(transaction.date);
      const monthMatchesCurrent = isSameMonth(transactionDate, selectedMonthDate);
      const monthMatchesPrevious = isSameMonth(transactionDate, previousMonthDate);

      if (monthMatchesCurrent) {
        const current = currentMonthTotals.get(transaction.category);
        currentMonthTotals.set(transaction.category, {
          total: (current?.total ?? 0) + transaction.amount,
          categoryIcon: transaction.category_icon || current?.categoryIcon || getCategoryByName(transaction.category, transaction.type).icon,
        });
      }

      if (monthMatchesPrevious) {
        previousMonthTotals.set(transaction.category, (previousMonthTotals.get(transaction.category) ?? 0) + transaction.amount);
      }
    }

    const currentMonthTotal = Array.from(currentMonthTotals.values()).reduce((sum, item) => sum + item.total, 0);

    return Array.from(currentMonthTotals.entries())
      .map(([category, item]) => {
        const previousTotal = previousMonthTotals.get(category) ?? 0;
        const sharePercent = currentMonthTotal > 0 ? Math.round((item.total / currentMonthTotal) * 10000) / 100 : 0;
        const isNew = previousTotal <= 0 && item.total > 0;
        const deltaPercent = previousTotal > 0 ? Math.round((((item.total - previousTotal) / previousTotal) * 100) * 100) / 100 : null;

        return {
          category,
          categoryIcon: item.categoryIcon,
          categoryCopy: getHomeCategoryCopy(category),
          total: item.total,
          sharePercent,
          previousTotal,
          deltaPercent,
          isNew,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [previousMonthDate, selectedCategoryType, selectedMonthDate, transactions]);
  const maxCategoryTotal = useMemo(
    () => categoryInsights.reduce((max, item) => Math.max(max, item.total), 0),
    [categoryInsights]
  );
  const chartWidth = Math.max(width - 84, 260);
  const barGap = monthlyTrendSummary.length > 0 ? 4 : 0;
  const barWidth = monthlyTrendSummary.length > 0
    ? Math.max(6, Math.floor((chartWidth - ((monthlyTrendSummary.length - 1) * barGap)) / monthlyTrendSummary.length))
    : 8;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AppPageHeader
          title="洞察"
          rightSlot={
            <View style={styles.headerActions}>
              <TouchableOpacity style={[styles.headerIconButton, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                <Search size={18} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
                onPress={() => setSelectedCategoryType((current) => (current === 'expense' ? 'income' : 'expense'))}
              >
                <Text style={[styles.filterChipText, { color: colors.text }]}>
                  {selectedCategoryType === 'expense' ? '支出' : '收入'}
                </Text>
                <ChevronDown size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          }
        />

        <PageSectionCard style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.monthSwitch}>
              <TouchableOpacity
                style={[styles.monthNavButton, { backgroundColor: colors.surfaceMuted }]}
                onPress={() => setSelectedMonthDate((current) => subMonths(current, 1))}
              >
                <ChevronLeft size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.heroMonthText, { color: colors.text }]}>{format(selectedMonthDate, 'M月')}</Text>
              <TouchableOpacity
                style={[styles.monthNavButton, { backgroundColor: colors.surfaceMuted }]}
                onPress={() => setSelectedMonthDate((current) => addMonths(current, 1))}
              >
                <ChevronRight size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.heroRightInfo}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>月均支出</Text>
              <Text style={[styles.metricValue, { color: colors.expense }]}>
                {formatCurrency(monthlySummary.averageExpense)}
              </Text>
            </View>
          </View>

          <Text style={[styles.heroAmount, { color: colors.primary }]}>
            {formatCurrency(monthlySummary.expense)}
          </Text>

          <View style={styles.barChartWrap}>
            <View style={[styles.barBaseline, { backgroundColor: colors.border }]} />
            <View style={styles.barRow}>
              {monthlyTrendSummary.map((item, index) => {
                const barHeight = maxExpense > 0 ? Math.max(8, (item.expense / maxExpense) * 118) : 8;
                const isHighlighted = index === new Date().getDate() - 1 && isSameMonth(selectedMonthDate, new Date());
                return (
                  <View key={`${selectedMonth}-${item.day}`} style={[styles.barItem, { width: barWidth }]}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeight,
                          backgroundColor: item.expense > 0 ? (isHighlighted ? colors.primary : `${colors.primary}66`) : colors.border,
                          width: barWidth,
                        },
                      ]}
                    />
                    {index % 5 === 0 || index === monthlyTrendSummary.length - 1 ? (
                      <Text style={[styles.barLabel, { color: isHighlighted ? colors.primary : colors.textSecondary }]}>
                        {item.day}
                      </Text>
                    ) : (
                      <View style={styles.barLabelSpacer} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.heroFooter}>
            <Text style={[styles.heroFooterLabel, { color: colors.textSecondary }]}>今年总支出</Text>
            <Text style={[styles.heroFooterValue, { color: colors.text }]}>
              {formatCurrency(monthlySummary.yearExpense)}
            </Text>
          </View>
        </PageSectionCard>

        <View style={styles.dualRow}>
          <PageSectionCard style={[styles.sharedSmallCard, styles.calendarCard]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>支出日历</Text>
            <View style={styles.weekLabelRow}>
              {WEEKDAY_LABELS.map((label) => (
                <Text key={label} style={[styles.weekLabel, { color: colors.textSecondary }]}>
                  {label}
                </Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <View key={`calendar-empty-${selectedMonth}-${index}`} style={styles.calendarCellPlaceholder} />;
                }

                const dayNumber = Number(format(day, 'd'));
                const expense = expenseMap.get(dayNumber) ?? 0;
                const opacity = maxExpense > 0 ? Math.max(0.32, expense / maxExpense) : 0.32;

                return (
                  <View
                    key={day.toISOString()}
                    style={[
                      styles.calendarCell,
                      {
                        backgroundColor: expense > 0 ? `${colors.primary}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` : colors.border,
                      },
                    ]}
                  />
                );
              })}
            </View>
            <View style={styles.calendarFooter}>
              <Text style={[styles.calendarCount, { color: colors.text }]}>{monthlySummary.transactionCount}</Text>
              <Text style={[styles.calendarUnit, { color: colors.textSecondary }]}>笔</Text>
            </View>
          </PageSectionCard>

          <PageSectionCard style={[styles.sharedSmallCard, styles.moodCard]}>
            <View style={styles.categoryHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>心情账单</Text>
            </View>
            <View style={styles.categoryMiniList}>
              {emotionSummary.map((item) => (
                <View key={item.key} style={styles.emotionRow}>
                  <View style={styles.emotionMain}>
                    <Text style={styles.emotionEmoji}>{item.emoji}</Text>
                    <View style={styles.emotionCopy}>
                      <Text style={[styles.emotionTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.label}
                      </Text>
                      <Text style={[styles.emotionDesc, { color: colors.textSecondary }]}>
                        本月出现 {item.count} 次
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.emotionCount, { color: colors.primary }]}>
                    {item.count}次
                  </Text>
                </View>
              ))}
            </View>
          </PageSectionCard>
        </View>

        <PageSectionCard style={styles.categoryListCard}>
          <View style={styles.categoryListHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>分类占比</Text>
            <View style={[styles.categoryCompareSwitch, { backgroundColor: colors.surfaceMuted }]}>
              <TouchableOpacity
                style={[
                  styles.categoryCompareButton,
                  categoryCompareMode === 'share' && { backgroundColor: colors.card },
                ]}
                onPress={() => setCategoryCompareMode('share')}
              >
                <Text
                  style={[
                    styles.categoryCompareText,
                    { color: categoryCompareMode === 'share' ? colors.text : colors.textSecondary },
                  ]}
                >
                  占当月总{selectedCategoryType === 'expense' ? '支出' : '收入'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.categoryCompareButton,
                  categoryCompareMode === 'previous' && { backgroundColor: colors.card },
                ]}
                onPress={() => setCategoryCompareMode('previous')}
              >
                <Text
                  style={[
                    styles.categoryCompareText,
                    { color: categoryCompareMode === 'previous' ? colors.text : colors.textSecondary },
                  ]}
                >
                  上个月
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {categoryInsights.length > 0 ? (
            <View style={styles.categoryListBody}>
              {categoryInsights.map((item) => {
                const IconComponent = getCategoryIconComponent(item.categoryIcon);
                const compareText = categoryCompareMode === 'share'
                  ? `${item.sharePercent.toFixed(2)}%`
                  : item.isNew
                    ? '新增'
                    : `${item.deltaPercent && item.deltaPercent > 0 ? '+' : ''}${(item.deltaPercent ?? 0).toFixed(2)}%`;
                const compareColor = categoryCompareMode === 'share'
                  ? colors.textSecondary
                  : item.isNew || (item.deltaPercent ?? 0) > 0
                    ? colors.income
                    : (item.deltaPercent ?? 0) < 0
                      ? colors.expense
                      : colors.textSecondary;
                const progressWidth: `${number}%` = maxCategoryTotal > 0
                  ? `${Math.max(8, (item.total / maxCategoryTotal) * 100)}%`
                  : '0%';

                return (
                  <View key={item.category} style={styles.categoryInsightRow}>
                    <View style={styles.categoryInsightTop}>
                      <View style={styles.categoryInsightMain}>
                        <View style={[styles.categoryInsightIconWrap, { backgroundColor: `${getCategoryByName(item.category, selectedCategoryType).color}18` }]}>
                          <IconComponent size={18} color={getCategoryByName(item.category, selectedCategoryType).color} />
                        </View>
                        <View style={styles.categoryInsightCopy}>
                          <Text style={[styles.categoryInsightCopyLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.categoryCopy}
                          </Text>
                          <Text style={[styles.categoryInsightTitle, { color: colors.text }]} numberOfLines={1}>
                            {item.category}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.categoryInsightValues}>
                        <Text style={[styles.categoryInsightAmount, { color: colors.text }]}>
                          {formatCurrency(item.total)}
                        </Text>
                        <Text style={[styles.categoryInsightCompare, { color: compareColor }]}>
                          {compareText}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.categoryProgressTrack, { backgroundColor: colors.softBackground }]}>
                      <View
                        style={[
                          styles.categoryProgressFill,
                          {
                            width: progressWidth,
                            backgroundColor: getCategoryByName(item.category, selectedCategoryType).color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.flowEmptyState}>
              <Text style={[styles.flowEmptyTitle, { color: colors.text }]}>暂无分类数据</Text>
              <Text style={[styles.flowEmptyDesc, { color: colors.textSecondary }]}>
                当前月份还没有分类统计
              </Text>
            </View>
          )}
        </PageSectionCard>

        <PageSectionCard style={styles.flowCard}>
          <View style={styles.flowHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>账单流水</Text>
            <View style={styles.flowHeadLabels}>
              <Text style={[styles.flowHeadText, { color: colors.textSecondary }]}>金额</Text>
              <Text style={[styles.flowHeadText, { color: colors.textSecondary }]}>时间</Text>
            </View>
          </View>

          {hasMonthlyTransactions ? (
            monthlyRecentTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.flowRow}>
                <View style={styles.flowMain}>
                  <Text style={[styles.flowTitle, { color: colors.text }]} numberOfLines={1}>
                    {transaction.category}
                  </Text>
                  <Text style={[styles.flowDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                    {stripEmotionFromDescription(transaction.description) || transaction.account_name || '未填写备注'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.flowAmount,
                    { color: transaction.type === 'expense' ? colors.expense : colors.income },
                  ]}
                >
                  {transaction.type === 'expense' ? '-' : '+'}
                  {formatCurrency(transaction.amount).replace('¥', '¥')}
                </Text>
                <Text style={[styles.flowTime, { color: colors.textSecondary }]}>
                  {format(parseAppDate(transaction.date), 'MM/dd')}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.flowEmptyState}>
              <Text style={[styles.flowEmptyTitle, { color: colors.text }]}>暂无账单</Text>
              <Text style={[styles.flowEmptyDesc, { color: colors.textSecondary }]}>
                当前月份还没有记账记录
              </Text>
            </View>
          )}
        </PageSectionCard>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 132,
    gap: 14,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  heroCard: {
    padding: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  monthSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monthNavButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMonthText: {
    fontSize: 26,
    fontWeight: '700',
  },
  heroRightInfo: {
    alignItems: 'flex-end',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
  },
  heroAmount: {
    marginTop: 10,
    fontSize: 36,
    fontWeight: '800',
  },
  barChartWrap: {
    marginTop: 18,
  },
  barBaseline: {
    height: 1,
    width: '100%',
    position: 'absolute',
    bottom: 24,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 150,
    gap: 4,
  },
  barItem: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 1,
  },
  bar: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    minHeight: 8,
  },
  barLabel: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: '600',
  },
  barLabelSpacer: {
    marginTop: 8,
    height: 14,
  },
  heroFooter: {
    marginTop: 18,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroFooterLabel: {
    fontSize: 13,
  },
  heroFooterValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  dualRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sharedSmallCard: {
    flex: 1,
    padding: 16,
  },
  calendarCard: {
    minHeight: 220,
    justifyContent: 'space-between',
  },
  moodCard: {
    justifyContent: 'flex-start',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  weekLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 10,
  },
  weekLabel: {
    width: 18,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '500',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  calendarCellPlaceholder: {
    width: 18,
    height: 18,
  },
  calendarCell: {
    width: 18,
    height: 18,
    borderRadius: 5,
  },
  calendarFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 12,
    gap: 4,
  },
  calendarCount: {
    fontSize: 28,
    fontWeight: '800',
  },
  calendarUnit: {
    paddingBottom: 5,
    fontSize: 14,
  },
  categoryHeader: {
    gap: 4,
  },
  categoryMiniList: {
    marginTop: 14,
    gap: 10,
  },
  emotionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  emotionMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: 10,
  },
  emotionEmoji: {
    fontSize: 24,
  },
  emotionCopy: {
    flex: 1,
    minWidth: 0,
  },
  emotionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  emotionDesc: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
  },
  emotionCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryListCard: {
    padding: 16,
  },
  categoryListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  categoryCompareSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    padding: 3,
  },
  categoryCompareButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  categoryCompareText: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryListBody: {
    marginTop: 14,
    gap: 12,
  },
  categoryInsightRow: {
    gap: 8,
  },
  categoryInsightTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryInsightMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: 10,
  },
  categoryInsightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInsightCopy: {
    flex: 1,
    minWidth: 0,
  },
  categoryInsightCopyLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryInsightTitle: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '700',
  },
  categoryInsightValues: {
    alignItems: 'flex-end',
    minWidth: 88,
  },
  categoryInsightAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  categoryInsightCompare: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryProgressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  flowCard: {
    padding: 16,
  },
  flowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  flowHeadLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 26,
  },
  flowHeadText: {
    fontSize: 12,
    fontWeight: '500',
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  flowMain: {
    flex: 1,
    minWidth: 0,
  },
  flowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  flowDesc: {
    marginTop: 3,
    fontSize: 12,
  },
  flowAmount: {
    width: 86,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '700',
  },
  flowTime: {
    width: 44,
    textAlign: 'right',
    fontSize: 12,
  },
  flowEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  flowEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  flowEmptyDesc: {
    marginTop: 8,
    fontSize: 13,
  },
});
