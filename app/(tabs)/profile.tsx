import { AppPageHeader } from '@/components/AppPageHeader';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAccountStore } from '@/store/useAccountStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Href, useRouter } from 'expo-router';
import { ChevronRight, Download, LogIn, LogOut, Paintbrush, Settings, Shield, User } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const menuItems: { icon: any; label: string; color: string; route?: Href }[] = [
  { icon: User, label: '编辑资料', color: '#F472B6' },
  { icon: Paintbrush, label: '界面设置', color: '#F472B6' },
  { icon: Download, label: '导入账单', color: '#60A5FA', route: '/import-transactions' as Href },
  { icon: Settings, label: '系统设置', color: '#9CA3AF' },
  { icon: Shield, label: '隐私政策', color: '#60A5FA' },
  { icon: LogOut, label: '退出登录', color: '#F472B6' },
];

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { user, signOut, isSubmitting } = useAuthStore();

  const { accounts, fetchAccounts } = useAccountStore();
  const { transactions, fetchTransactions } = useTransactionStore();

  useEffect(() => {
    fetchAccounts();
    fetchTransactions();
  }, [fetchAccounts, fetchTransactions]);

  const accountCount = accounts.length;
  const billCount = transactions.length;

  const handleMenuPress = async (label: string, route?: Href) => {
    if (route) {
      router.push(route);
      return;
    }

    if (label === '退出登录') {
      try {
        await signOut();
        router.replace('/sign-in');
      } catch (error) {
        Alert.alert('提示', (error as Error).message);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.pagePadding}>
          <AppPageHeader
            title="设置"
            rightSlot={
              <View style={[styles.headerBadge, { backgroundColor: colors.surfaceMuted }]}>
                <Text style={[styles.headerBadgeText, { color: colors.primary }]}>账户与偏好</Text>
              </View>
            }
          />
        </View>

        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(user?.name || user?.email || '智').slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>{user?.name || '智能账本用户'}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email || '未登录'}</Text>
          {!user ? (
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: colors.primary }]}
              onPress={() => router.replace('/sign-in')}>
              <LogIn size={18} color="#FFFFFF" />
              <Text style={styles.loginButtonText}>点击登录</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.surfaceElevated }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>账户数量</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{accountCount}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>总账单数</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{billCount}</Text>
          </View>
        </View>

        <View style={[styles.menuCard, { backgroundColor: colors.surfaceElevated }]}>
          {menuItems.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => handleMenuPress(item.label, item.route)}
                disabled={item.label === '退出登录' && isSubmitting}>
                <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                  <IconComponent size={20} color={item.color} />
                </View>
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.version, { color: colors.textSecondary }]}>版本 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pagePadding: { paddingHorizontal: 20, paddingTop: 10 },
  headerBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  profileSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 32, fontWeight: 'bold' },
  userName: { fontSize: 20, fontWeight: '600', marginTop: 16 },
  userEmail: { fontSize: 14, marginTop: 4 },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  loginButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  statsCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    shadowColor: '#D96E9B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  statItem: { flex: 1 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 32, fontWeight: 'bold', marginTop: 4 },
  statDivider: { width: 1, marginHorizontal: 16 },
  menuCard: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#D96E9B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 16, marginLeft: 12 },
  version: { textAlign: 'center', fontSize: 12, paddingBottom: 24 },
});
