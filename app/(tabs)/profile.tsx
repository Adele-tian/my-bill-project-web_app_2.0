import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAccountStore } from '@/store/useAccountStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { useRouter } from 'expo-router';
import { ChevronRight, Gamepad2, LogOut, Paintbrush, Settings, Shield, User } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const menuItems = [
  { icon: User, label: '编辑资料', color: '#F472B6' },
  { icon: Paintbrush, label: '界面设置', color: '#F472B6' },
  { icon: Settings, label: '系统设置', color: '#9CA3AF' },
  { icon: Gamepad2, label: '贪吃蛇', color: '#34D399', route: '/snake' },
  { icon: Shield, label: '隐私政策', color: '#60A5FA' },
  { icon: LogOut, label: '退出登录', color: '#F472B6' },
];

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const { accounts, fetchAccounts } = useAccountStore();
  const { transactions, fetchTransactions } = useTransactionStore();

  useEffect(() => {
    fetchAccounts();
    fetchTransactions();
  }, []);

  const accountCount = accounts.length;
  const billCount = transactions.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>个人中心</Text>
          <Text style={[styles.title, { color: colors.text }]}>我的</Text>
        </View>

        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>智</Text>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>智能账本用户</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>hello@expense.app</Text>
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
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

        <View style={[styles.menuCard, { backgroundColor: colors.card }]}>
          {menuItems.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => {
                  if (item.route) {
                    router.push(item.route);
                  }
                }}>
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
  header: { paddingHorizontal: 20, paddingTop: 10 },
  subtitle: { fontSize: 14 },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  profileSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 32, fontWeight: 'bold' },
  userName: { fontSize: 20, fontWeight: '600', marginTop: 16 },
  userEmail: { fontSize: 14, marginTop: 4 },
  statsCard: { marginHorizontal: 20, borderRadius: 16, padding: 20, flexDirection: 'row' },
  statItem: { flex: 1 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 32, fontWeight: 'bold', marginTop: 4 },
  statDivider: { width: 1, marginHorizontal: 16 },
  menuCard: { margin: 20, borderRadius: 16, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 16, marginLeft: 12 },
  version: { textAlign: 'center', fontSize: 12, paddingBottom: 24 },
});
