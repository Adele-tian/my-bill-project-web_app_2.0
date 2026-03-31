import { AppPageHeader } from '@/components/AppPageHeader';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTransactionStore } from '@/store/useTransactionStore';
import { formatCurrency } from '@/utils/format';
import type { EmotionKey } from '@/utils/home-clues';
import { getEmotionMeta, parseEmotionFromDescription, stripEmotionFromDescription } from '@/utils/home-clues';
import { useFocusEffect } from 'expo-router';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const EMOTION_KEYS: EmotionKey[] = ['super_happy', 'impulsive', 'lesson_learned'];

function formatMonthKey(date: Date): string {
  return format(startOfMonth(date), 'yyyy-MM');
}

function buildCalendarDays(monthDate: Date): Date[] {
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export default function StatsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { width } = useWindowDimensions();

  const [selectedMonthDate, setSelectedMonthDate] = useState(() => startOfMonth(new Date()));
  const [selectedCategoryType, setSelectedCategoryType] = useState<'expense' | 'income'>('expense');

  const selectedMonth = useMemo(() => formatMonthKey(selectedMonthDate), [selectedMonthDate]);

  const {
    monthlySummary,
    monthlyTrendSummary,
    monthlyRecentTransactions,
    fetchMonthlySummary,
    fetchMonthlyTrendSummary,
    fetchMonthlyRecentTransactions,
  } = useTransactionStore();

  const loadStats = useCallback(() => {
    return Promise.all([
      fetchMonthlySummary(selectedMonth),
      fetchMonthlyTrendSummary(selectedMonth),
      fetchMonthlyRecentTransactions(selectedMonth, 9999),
    ]);
  }, [
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
              <TouchableOpacity style={[styles.headerIconButton, { backgroundColor: colors.surfaceMuted }]}>
                <Search size={18} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, { backgroundColor: colors.surfaceMuted }]}
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

        <View style={[styles.heroCard, { backgroundColor: colors.surfaceElevated }]}>
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
        </View>

        <View style={styles.dualRow}>
          <View style={[styles.smallCard, styles.calendarCard, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>支出日历</Text>
            <View style={styles.weekLabelRow}>
              {WEEKDAY_LABELS.map((label) => (
                <Text key={label} style={[styles.weekLabel, { color: colors.textSecondary }]}>
                  {label}
                </Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {calendarDays.map((day) => {
                const dayNumber = Number(format(day, 'd'));
                const expense = isSameMonth(day, selectedMonthDate) ? expenseMap.get(dayNumber) ?? 0 : 0;
                const opacity = maxExpense > 0 ? Math.max(0.12, expense / maxExpense) : 0.12;
                const isCurrentMonth = isSameMonth(day, selectedMonthDate);

                return (
                  <View
                    key={day.toISOString()}
                    style={[
                      styles.calendarCell,
                      {
                        backgroundColor: isCurrentMonth && expense > 0 ? `${colors.primary}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` : colors.softBackground,
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
          </View>

          <View style={[styles.smallCard, styles.categoryCard, { backgroundColor: colors.surfaceElevated }]}>
            <View style={styles.categoryHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>心情账单</Text>
              <Text style={[styles.categoryScope, { color: colors.textSecondary }]}>
                本月已记录的心情
              </Text>
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
          </View>
        </View>

        <View style={[styles.flowCard, { backgroundColor: colors.surfaceElevated }]}>
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
                  {format(new Date(transaction.date), 'MM/dd')}
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
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  heroCard: {
    borderRadius: 28,
    padding: 18,
    shadowColor: '#D96E9B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
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
  smallCard: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    minHeight: 220,
    shadowColor: '#D96E9B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  calendarCard: {
    justifyContent: 'space-between',
  },
  categoryCard: {
    justifyContent: 'space-between',
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
  categoryScope: {
    fontSize: 12,
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
  smallEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallEmptyText: {
    fontSize: 13,
  },
  flowCard: {
    borderRadius: 24,
    padding: 16,
    shadowColor: '#D96E9B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
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
