import { AppPageHeader } from '@/components/AppPageHeader';
import { EmptyState } from '@/components/EmptyState';
import { HomeClueItem } from '@/components/HomeClueItem';
import { PageSectionCard } from '@/components/PageSectionCard';
import { Colors } from '@/constants/theme';
import { Transaction } from '@/db/insforge/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTransactionStore } from '@/store/useTransactionStore';
import { getHomeHeadline } from '@/utils/home-clues';
import { formatCurrency, parseAppDate } from '@/utils/format';
import { useFocusEffect, useRouter } from 'expo-router';
import { format } from 'date-fns';
import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function isSameDate(dateString: string, target: Date): boolean {
  return format(parseAppDate(dateString), 'yyyy-MM-dd') === format(target, 'yyyy-MM-dd');
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const today = useMemo(() => new Date(), []);

  const {
    transactions,
    recentTransactions,
    fetchTransactions,
    fetchRecentTransactions,
    removeTransaction,
  } = useTransactionStore();

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
      fetchRecentTransactions(8);
    }, [fetchRecentTransactions, fetchTransactions])
  );

  const todayTransactions = useMemo(
    () => transactions.filter((transaction) => isSameDate(transaction.date, today)),
    [today, transactions]
  );

  const displayTransactions = todayTransactions.length > 0 ? todayTransactions : recentTransactions;
  const todayExpenseTotal = todayTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const handleEditTransaction = (transaction: Transaction) => router.push(`/add-transaction?id=${transaction.id}`);
  const handleDeleteTransaction = async (id: number) => {
    await removeTransaction(id);
    fetchTransactions();
    fetchRecentTransactions(8);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AppPageHeader
          title="线索"
        />

        <PageSectionCard>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>今日概览</Text>
              <Text style={[styles.heroDate, { color: colors.text }]}>{format(today, 'M月d日')}</Text>
            </View>
            <View style={styles.heroAmountWrap}>
              <Text style={[styles.heroAmountLabel, { color: colors.textSecondary }]}>今日支出</Text>
              <Text style={[styles.heroAmount, { color: colors.primary }]}>{formatCurrency(todayExpenseTotal)}</Text>
            </View>
          </View>
          <View style={[styles.heroQuoteCard, { backgroundColor: colors.softBackground }]}>
            <Text style={[styles.heroQuote, { color: colors.text }]}>{getHomeHeadline()}</Text>
            <Text style={[styles.heroMeta, { color: colors.textSecondary }]}>
              {todayTransactions.length > 0 ? `今天已记录 ${todayTransactions.length} 笔` : '今天还没有新增记录'}
            </Text>
          </View>
        </PageSectionCard>

        <PageSectionCard style={styles.listCard}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {todayTransactions.length > 0 ? '今天的记录' : '最近记录'}
            </Text>
            <Text style={[styles.sectionMeta, { color: colors.textSecondary }]}>{displayTransactions.length} 条</Text>
          </View>
          {displayTransactions.length > 0 ? (
            displayTransactions.map((transaction, index) => (
              <View
                key={transaction.id}
                style={[
                  styles.listRow,
                  index !== 0 && { marginTop: 4 },
                ]}
              >
                <HomeClueItem
                  transaction={transaction}
                  transactionHistory={displayTransactions}
                  onEdit={handleEditTransaction}
                  onDelete={handleDeleteTransaction}
                />
              </View>
            ))
          ) : (
            <EmptyState
              title="暂无线索"
              description="点击右下角按钮即可创建第一笔账单记录"
              emoji="📝"
            />
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
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroDate: {
    marginTop: 6,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
  },
  heroAmountWrap: {
    alignItems: 'flex-end',
  },
  heroAmountLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroAmount: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '800',
  },
  heroQuoteCard: {
    marginTop: 18,
    borderRadius: 18,
    padding: 16,
  },
  heroQuote: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
  },
  heroMeta: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '500',
  },
  listCard: {
    paddingVertical: 14,
    minHeight: 240,
  },
  sectionHeader: {
    paddingHorizontal: 4,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  listRow: {
    minHeight: 116,
  },
});
