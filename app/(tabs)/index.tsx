import { BalanceCard } from '@/components/BalanceCard';
import { EmptyState } from '@/components/EmptyState';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { TransactionItem } from '@/components/TransactionItem';
import { Colors } from '@/constants/theme';
import { Transaction } from '@/db/insforge/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAccountStore } from '@/store/useAccountStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, Search } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const { totalBalance, fetchAccounts } = useAccountStore();
  const { recentTransactions, income, expense, fetchRecentTransactions, fetchSummary, removeTransaction } = useTransactionStore();

  useFocusEffect(
    useCallback(() => {
      fetchAccounts();
      fetchRecentTransactions(5);
      fetchSummary();
    }, [])
  );

  const handleAddTransaction = () => router.push('/add-transaction');
  const handleTextAiInput = () => router.push('/add-transaction?input=text');
  const handleVoiceAiInput = () => router.push('/add-transaction?input=voice');
  const handleCameraAiInput = () => router.push('/add-transaction?input=camera');

  const handleEditTransaction = (transaction: Transaction) => {
    router.push(`/add-transaction?id=${transaction.id}`);
  };

  const handleDeleteTransaction = async (id: number) => {
    await removeTransaction(id);
    fetchAccounts(); // 刷新账户余额
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>欢迎回来</Text>
            <Text style={[styles.titleText, { color: colors.text }]}>智能记账助手</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}><Search size={24} color={colors.text} /></TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}><Bell size={24} color={colors.text} /></TouchableOpacity>
          </View>
        </View>

        <BalanceCard totalBalance={totalBalance} income={income} expense={expense} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>最近账单</Text>
            <TouchableOpacity><Text style={[styles.sectionLink, { color: colors.primary }]}>查看全部</Text></TouchableOpacity>
          </View>
          <View style={[styles.billCard, { backgroundColor: colors.card }]}>
            {recentTransactions.length > 0 ? (
              recentTransactions.map((t) => (
                <TransactionItem
                  key={t.id}
                  transaction={t}
                  onEdit={handleEditTransaction}
                  onDelete={handleDeleteTransaction}
                  showMetaChips
                />
              ))
            ) : (
              <EmptyState title="暂无账单" description="点击右下角按钮即可创建第一笔账单记录" emoji="📝" />
            )}
          </View>
        </View>
      </ScrollView>
      <FloatingActionButton
        onAddTransaction={handleAddTransaction}
        onQuickInput={handleTextAiInput}
        onVoiceInput={handleVoiceAiInput}
        onCameraInput={handleCameraAiInput}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  welcomeText: { fontSize: 14 },
  titleText: { fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  headerIcons: { flexDirection: 'row', gap: 12 },
  iconButton: { padding: 8 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  sectionLink: { fontSize: 14 },
  billCard: { borderRadius: 16, padding: 16 },
});
