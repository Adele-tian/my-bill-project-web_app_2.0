import { EmptyState } from '@/components/EmptyState';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { HomeClueItem } from '@/components/HomeClueItem';
import { Colors } from '@/constants/theme';
import { Transaction } from '@/db/insforge/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTransactionStore } from '@/store/useTransactionStore';
import { getHomeHeadline } from '@/utils/home-clues';
import { formatCurrency } from '@/utils/format';
import { useFocusEffect, useRouter } from 'expo-router';
import { format } from 'date-fns';
import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function isSameDate(dateString: string, target: Date): boolean {
  return format(new Date(dateString), 'yyyy-MM-dd') === format(target, 'yyyy-MM-dd');
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

  const handleAddTransaction = () => router.push('/add-transaction');
  const handleTextAiInput = () => router.push('/add-transaction?input=text');
  const handleEditTransaction = (transaction: Transaction) => router.push(`/add-transaction?id=${transaction.id}`);
  const handleDeleteTransaction = async (id: number) => {
    await removeTransaction(id);
    fetchTransactions();
    fetchRecentTransactions(8);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>线索</Text>
        </View>

        <View style={[styles.headlineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.headlineAccent} />
          <View style={styles.headlineBody}>
            <Text style={[styles.headlineText, { color: colors.text }]}>{getHomeHeadline()}</Text>
            <Text style={[styles.headlineCaption, { color: colors.textSecondary }]}>断断续续也没关系</Text>
          </View>
        </View>

        <View style={[styles.dayCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View>
            <Text style={[styles.monthText, { color: colors.textSecondary }]}>{format(today, 'MMM.')}</Text>
            <Text style={[styles.dayText, { color: colors.text }]}>{format(today, 'dd')}</Text>
          </View>
          <View style={styles.totalWrap}>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>{formatCurrency(todayExpenseTotal)}</Text>
          </View>
        </View>

        <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {displayTransactions.length > 0 ? (
            displayTransactions.map((transaction, index) => (
              <View
                key={transaction.id}
                style={[
                  styles.listRow,
                  index !== 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}
              >
                <HomeClueItem
                  transaction={transaction}
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
        </View>
      </ScrollView>

      <FloatingActionButton onAddTransaction={handleAddTransaction} onQuickInput={handleTextAiInput} />
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
    paddingBottom: 120,
    gap: 14,
  },
  header: {
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  headlineCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  headlineAccent: {
    width: 3,
    height: 54,
    borderRadius: 999,
    backgroundColor: '#7ED957',
    marginRight: 12,
  },
  headlineBody: {
    flex: 1,
  },
  headlineText: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    maxWidth: 250,
  },
  headlineCaption: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '500',
  },
  dayCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  monthText: {
    fontSize: 15,
    fontWeight: '700',
  },
  dayText: {
    marginTop: 4,
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '800',
  },
  totalWrap: {
    alignItems: 'flex-end',
    paddingTop: 10,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '800',
  },
  listCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 2,
    minHeight: 240,
  },
  listRow: {
    minHeight: 116,
  },
});
