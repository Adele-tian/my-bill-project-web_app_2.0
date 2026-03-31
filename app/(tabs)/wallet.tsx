import { AppPageHeader } from '@/components/AppPageHeader';
import { AccountItem } from '@/components/AccountItem';
import { EmptyState } from '@/components/EmptyState';
import { Colors } from '@/constants/theme';
import { Account } from '@/db/insforge/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAccountStore } from '@/store/useAccountStore';
import { formatCurrency } from '@/utils/format';
import { Href, useFocusEffect, useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, Plus, Wallet } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WalletScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [showInactiveAccounts, setShowInactiveAccounts] = useState(false);

  const { accounts, totalBalance, fetchAccounts } = useAccountStore();

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.status === 'active'),
    [accounts]
  );
  const inactiveAccounts = useMemo(
    () => accounts.filter((account) => account.status !== 'active'),
    [accounts]
  );
  const visibleAccountCount = showInactiveAccounts
    ? activeAccounts.length + inactiveAccounts.length
    : activeAccounts.length;

  useFocusEffect(
    useCallback(() => {
      fetchAccounts();
    }, [fetchAccounts])
  );

  const handleAddAccount = () => {
    router.push('/add-account' as Href);
  };

  const handleEditAccount = (account: Account) => {
    router.push(`/add-account?id=${account.id}` as Href);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.pagePadding}>
          <AppPageHeader
            title="钱包"
            rightSlot={
              <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.surfaceMuted }]} onPress={handleAddAccount}>
                <Plus size={16} color={colors.primary} />
                <Text style={[styles.addButtonText, { color: colors.primary }]}>添加账户</Text>
              </TouchableOpacity>
            }
          />
        </View>

        <View style={[styles.balanceCard, { backgroundColor: colors.surfaceElevated }]}>
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
            当前显示 {visibleAccountCount} 个账户，共管理 {accounts.length} 个账户。
          </Text>
        </View>

        {activeAccounts.length > 0 ? (
          <View style={styles.accountList}>
            {activeAccounts.map((account) => (
              <AccountItem
                key={account.id}
                account={account}
                onPress={() => handleEditAccount(account)}
                onEdit={handleEditAccount}
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

        {inactiveAccounts.length > 0 ? (
          <View style={styles.inactiveSection}>
            <TouchableOpacity
              style={[styles.toggleInactiveButton, { backgroundColor: colors.surfaceElevated }]}
              onPress={() => setShowInactiveAccounts((value) => !value)}
            >
              <Text style={[styles.toggleInactiveText, { color: colors.textSecondary }]}>
                {showInactiveAccounts ? '收起隐藏与归档账户' : `显示隐藏与归档账户（${inactiveAccounts.length}）`}
              </Text>
              {showInactiveAccounts ? (
                <ChevronUp size={18} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={18} color={colors.textSecondary} />
              )}
            </TouchableOpacity>

            {showInactiveAccounts ? (
              <View style={styles.accountList}>
                {inactiveAccounts.map((account) => (
                  <AccountItem
                    key={account.id}
                    account={account}
                    onPress={() => handleEditAccount(account)}
                    onEdit={handleEditAccount}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pagePadding: { paddingHorizontal: 20, paddingTop: 10 },
  addButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, gap: 4 },
  addButtonText: { fontSize: 14, fontWeight: '500' },
  balanceCard: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#D96E9B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  balanceHeader: { flexDirection: 'row', alignItems: 'center' },
  walletIconWrap: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  balanceInfo: { marginLeft: 12 },
  balanceLabel: { fontSize: 12 },
  balanceAmount: { fontSize: 28, fontWeight: 'bold', marginTop: 2 },
  accountInfo: { fontSize: 14, marginTop: 16, lineHeight: 20 },
  accountList: { paddingHorizontal: 20, gap: 12 },
  inactiveSection: { marginBottom: 24 },
  emptyWrap: { margin: 20 },
  toggleInactiveButton: {
    marginHorizontal: 20,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#D96E9B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  toggleInactiveText: {
    fontSize: 14,
    fontWeight: '500',
  },
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
