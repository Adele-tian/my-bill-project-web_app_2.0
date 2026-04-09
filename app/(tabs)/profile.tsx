import { AppPageHeader } from '@/components/AppPageHeader';
import { PageSectionCard } from '@/components/PageSectionCard';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAccountStore } from '@/store/useAccountStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { parseAppDate } from '@/utils/format';
import { isSameMonth } from 'date-fns';
import { Href, useRouter } from 'expo-router';
import { ChevronRight, Download, LogIn, Shield, UserRound, Wallet } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '../../store/useAuthStore';

type ToolItem = {
  icon: typeof Download;
  key: 'import' | 'wallet' | 'privacy';
  label: string;
  description: string;
  color: string;
  route?: Href;
};

const toolGroups: { title: string; items: ToolItem[] }[] = [
  {
    title: '账本工具',
    items: [
      { key: 'import', icon: Download, label: '导入账单', description: '快速带入微信、支付宝历史账单', color: '#FF4F93', route: '/import-transactions' as Href },
      { key: 'wallet', icon: Wallet, label: '账户管理', description: '查看余额、添加和维护账户', color: '#E56EA5', route: '/wallet' as Href },
    ],
  },
  {
    title: '隐私与支持',
    items: [
      { key: 'privacy', icon: Shield, label: '隐私政策', description: '查看数据与隐私使用说明', color: '#F2A8C7' },
    ],
  },
];

function maskPhone(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length < 7) {
    return value;
  }

  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

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
  const monthlyBillCount = useMemo(() => {
    const now = new Date();
    return transactions.filter((transaction) => isSameMonth(parseAppDate(transaction.date), now)).length;
  }, [transactions]);
  const maskedPhone = maskPhone((user as { phone?: string | null } | null)?.phone ?? null);
  const primaryContact = maskedPhone || user?.email || '未登录';
  const secondaryContact = maskedPhone && user?.email ? user.email : null;

  const handleToolPress = (item: ToolItem) => {
    if (item.key === 'privacy') {
      Alert.alert('隐私政策', '隐私政策页面即将补充，当前版本会持续优先保护你的本地账本数据。');
      return;
    }

    if (item.route) {
      router.push(item.route);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/sign-in');
    } catch (error) {
      Alert.alert('提示', (error as Error).message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.pagePadding}>
          <AppPageHeader title="我的" />
        </View>

        <View style={styles.headerProfileCardWrap}>
          <View style={[styles.headerProfileCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <View style={[styles.headerTexture, { backgroundColor: colors.surfaceMuted }]} />
            <View style={styles.profileTopRow}>
              <View style={[styles.avatarShell, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
                <View style={[styles.avatarInner, { backgroundColor: colors.surfaceElevated }]}>
                  <UserRound size={26} color={colors.primary} strokeWidth={1.8} />
                </View>
              </View>
              <View style={styles.profileIdentity}>
                <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                  {user?.name || '智能账本用户'}
                </Text>
                <Text style={[styles.primaryContact, { color: colors.textSecondary }]}>{primaryContact}</Text>
                {secondaryContact ? (
                  <Text style={[styles.secondaryContact, { color: colors.textSecondary }]} numberOfLines={1}>
                    {secondaryContact}
                  </Text>
                ) : null}
              </View>
            </View>

            {!user ? (
              <TouchableOpacity
                style={[styles.loginButton, { backgroundColor: colors.primary }]}
                onPress={() => router.replace('/sign-in')}>
                <LogIn size={18} color="#FFFFFF" />
                <Text style={styles.loginButtonText}>点击登录</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <PageSectionCard style={styles.overviewDashboardCard}>
          <View style={styles.metricsRow}>
            <View style={styles.metricBlock}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>账户数量</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{accountCount}</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>总账单数</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{billCount}</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>本月记录</Text>
              <Text style={[styles.metricValue, { color: colors.primary }]}>{monthlyBillCount}</Text>
            </View>
          </View>
        </PageSectionCard>

        {toolGroups.map((group) => (
          <PageSectionCard key={group.title} style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{group.title}</Text>
            <View style={styles.toolItemsWrap}>
              {group.items.map((item) => {
                const IconComponent = item.icon;
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.toolItem, { backgroundColor: colors.surfaceMuted }]}
                    onPress={() => handleToolPress(item)}
                    activeOpacity={0.84}>
                    <View style={[styles.toolIconWrap, { backgroundColor: `${item.color}18` }]}>
                      <IconComponent size={20} color={item.color} strokeWidth={1.9} />
                    </View>
                    <View style={styles.toolCopy}>
                      <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                      <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>{item.description}</Text>
                    </View>
                    <View style={[styles.arrowChip, { backgroundColor: colors.surfaceMuted }]}>
                      <ChevronRight size={18} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </PageSectionCard>
        ))}

        {user ? (
          <TouchableOpacity
            style={[styles.footerAction, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
            onPress={handleSignOut}
            disabled={isSubmitting}
            activeOpacity={0.82}>
            <Text style={[styles.footerActionText, { color: colors.textSecondary }]}>
              {isSubmitting ? '退出中...' : '退出登录'}
            </Text>
          </TouchableOpacity>
        ) : null}

        <Text style={[styles.version, { color: colors.textSecondary }]}>版本 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 36 },
  pagePadding: { paddingHorizontal: 16, paddingTop: 12 },
  headerProfileCardWrap: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  headerProfileCard: {
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#D6A8BC',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  headerTexture: {
    position: 'absolute',
    top: -16,
    right: -12,
    width: 76,
    height: 76,
    borderRadius: 38,
    opacity: 0.1,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarShell: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIdentity: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    fontFamily: Platform.OS === 'web' ? Fonts.sans : undefined,
  },
  primaryContact: {
    marginTop: 7,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'web' ? Fonts.sans : undefined,
  },
  secondaryContact: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 15,
    opacity: 0.7,
    fontFamily: Platform.OS === 'web' ? Fonts.sans : undefined,
  },
  loginButton: {
    marginTop: 18,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? Fonts.sans : undefined,
  },
  overviewDashboardCard: {
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 18,
  },
  metricBlock: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Platform.OS === 'web' ? Fonts.sans : undefined,
  },
  metricValue: {
    marginTop: 6,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.8,
    fontFamily: Platform.OS === 'web' ? Fonts.sans : undefined,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  sectionTitle: {
    paddingHorizontal: 2,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: Platform.OS === 'web' ? Fonts.sans : undefined,
  },
  toolItemsWrap: {
    gap: 10,
  },
  toolItem: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#E2A1BF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  toolIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolCopy: {
    flex: 1,
    marginLeft: 12,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? Fonts.sans : undefined,
  },
  menuDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Platform.OS === 'web' ? Fonts.sans : undefined,
  },
  arrowChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E3A5C2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  footerAction: {
    marginTop: 24,
    alignSelf: 'center',
    minWidth: 112,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerActionText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? Fonts.sans : undefined,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    paddingTop: 12,
    fontFamily: Platform.OS === 'web' ? Fonts.sans : undefined,
  },
});
