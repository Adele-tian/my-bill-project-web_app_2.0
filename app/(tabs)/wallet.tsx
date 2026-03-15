import { AccountItem } from '@/components/AccountItem';
import { EmptyState } from '@/components/EmptyState';
import { Colors } from '@/constants/theme';
import { Account } from '@/db/insforge/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAccountStore } from '@/store/useAccountStore';
import { formatCurrency } from '@/utils/format';
import { Href, useFocusEffect, useRouter } from 'expo-router';
import { Plus, Wallet } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WalletScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const { accounts, totalBalance, fetchAccounts, removeAccount } = useAccountStore();

  useFocusEffect(
    useCallback(() => {
      fetchAccounts();
    }, [])
  );

  const handleAddAccount = () => {
    router.push('/add-account' as Href);
  };

  const handleEditAccount = (account: Account) => {
    router.push(`/add-account?id=${account.id}` as Href);
  };

  const handleDeleteAccount = async (id: number) => {
    await removeAccount(id);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>资产概览</Text>
            <Text style={[styles.title, { color: colors.text }]}>钱包</Text>
          </View>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primaryLight }]} onPress={handleAddAccount}>
            <Plus size={16} color={colors.primary} />
            <Text style={[styles.addButtonText, { color: colors.primary }]}>添加账户</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.balanceCard, { backgroundColor: colors.card }]}>
          <View style={styles.balanceHeader}>
            <View style={[styles.walletIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Wallet size={24} color={colors.primary} />
            </View>
            <View style={styles.balanceInfo}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>总余额</Text>
              <Text style={[styles.balanceAmount, { color: colors.text }]}>{formatCurrency(totalBalance)}</Text>
            </View>
          </View>
          <Text style={[styles.accountInfo, { color: colors.textSecondary }]}>
            共 {accounts.length} 个账户，支持现金、银行卡、信用卡等多种类型。
          </Text>
        </View>

        {accounts.length > 0 ? (
          <View style={styles.accountList}>
            {accounts.map((account) => (
              <AccountItem
                key={account.id}
                account={account}
                onEdit={handleEditAccount}
                onDelete={handleDeleteAccount}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <EmptyState emoji="👆" title="还没有账户" description="点击上方按钮添加第一个账户" />
            <TouchableOpacity style={[styles.emptyAddButton, { backgroundColor: colors.primary }]} onPress={handleAddAccount}>
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.emptyAddButtonText}>立即添加账户</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 10 },
  subtitle: { fontSize: 14 },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  addButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, gap: 4 },
  addButtonText: { fontSize: 14, fontWeight: '500' },
  balanceCard: { margin: 20, borderRadius: 16, padding: 20 },
  balanceHeader: { flexDirection: 'row', alignItems: 'center' },
  walletIconWrap: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  balanceInfo: { marginLeft: 12 },
  balanceLabel: { fontSize: 12 },
  balanceAmount: { fontSize: 28, fontWeight: 'bold', marginTop: 2 },
  accountInfo: { fontSize: 14, marginTop: 16, lineHeight: 20 },
  accountList: { paddingHorizontal: 20, gap: 12 },
  emptyWrap: { margin: 20 },
  emptyAddButton: {
    marginTop: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  emptyAddButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
