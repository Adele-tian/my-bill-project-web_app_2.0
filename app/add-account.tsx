import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAccountStore } from '@/store/useAccountStore';
import { useAuthStore } from '@/store/useAuthStore';
import { ACCOUNT_ICONS } from '@/utils/categories';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as LucideIcons from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AccountIconOption = (typeof ACCOUNT_ICONS)[number];

export default function AddAccountScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditMode = !!id;

  const { accounts, addAccount, updateAccount } = useAccountStore();
  const { signOut } = useAuthStore();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [note, setNote] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<AccountIconOption>(ACCOUNT_ICONS[0]);
  const [isLoading, setIsLoading] = useState(false);

  // 编辑模式下加载账户数据
  useEffect(() => {
    if (isEditMode && id) {
      const account = accounts.find(a => a.id === parseInt(id));
      if (account) {
        setName(account.name);
        setBalance(account.balance.toString());
        setNote(account.note || '');
        const icon = ACCOUNT_ICONS.find(i => i.name === account.icon) || ACCOUNT_ICONS[0];
        setSelectedIcon(icon);
      }
    }
  }, [id, accounts]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('提示', '请输入账户名称');
      return;
    }

    setIsLoading(true);
    try {
      const trimmedNote = note.trim();
      const accountPayload = {
        name: name.trim(),
        balance: parseFloat(balance) || 0,
        icon: selectedIcon.name,
        color: selectedIcon.color,
        ...(trimmedNote ? { note: trimmedNote } : {}),
      };

      if (isEditMode && id) {
        await updateAccount(parseInt(id), accountPayload);
      } else {
        await addAccount(accountPayload);
      }
      router.replace('/(tabs)/wallet');
    } catch (error) {
      const message = (error as Error).message || (isEditMode ? '更新失败' : '保存失败');
      if (message.includes('JWT expired')) {
        await signOut();
        Alert.alert('登录已过期', '请重新登录后再保存账户。', [
          { text: '确定', onPress: () => router.replace('/sign-in') }
        ]);
        return;
      }
      if (message.includes("Could not find the 'note' column")) {
        Alert.alert('数据库未升级', '当前数据库还没有账户备注字段。你可以先留空备注再保存，或先执行 note 字段迁移 SQL。');
        return;
      }
      Alert.alert('错误', message);
    } finally {
      setIsLoading(false);
    }
  };

  const XIcon = LucideIcons.X;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><XIcon size={24} color={colors.text} /></TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{isEditMode ? '编辑账户' : '添加账户'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={isLoading}>
          <Text style={[styles.saveBtn, { color: isLoading ? colors.textSecondary : colors.primary }]}>
            {isLoading ? '...' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>账户名称</Text>
          <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]} placeholder="例如：现金、银行卡" placeholderTextColor={colors.textSecondary} value={name} onChangeText={setName} />
        </View>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>初始余额</Text>
          <View style={styles.balanceRow}>
            <Text style={[styles.currency, { color: colors.primary }]}>¥</Text>
            <TextInput style={[styles.balanceInput, { color: colors.text }]} placeholder="0.00" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" value={balance} onChangeText={setBalance} />
          </View>
        </View>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>备注</Text>
          <TextInput
            style={[styles.input, styles.noteInput, { color: colors.text, borderColor: colors.border }]}
            placeholder="例如：日常零用、工资卡、备用金"
            placeholderTextColor={colors.textSecondary}
            value={note}
            onChangeText={setNote}
            multiline
            textAlignVertical="top"
            maxLength={60}
          />
        </View>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>选择图标</Text>
          <View style={styles.iconGrid}>
            {ACCOUNT_ICONS.map((item) => {
              const IconComponent = (LucideIcons as any)[item.name] || LucideIcons.Wallet;
              const isSelected = selectedIcon.name === item.name;
              return (
                <TouchableOpacity key={item.name} style={[styles.iconItem, isSelected && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]} onPress={() => setSelectedIcon(item)}>
                  <IconComponent size={28} color={isSelected ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.iconLabel, { color: isSelected ? colors.primary : colors.textSecondary }]}>{item.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 18, fontWeight: '600' },
  saveBtn: { fontSize: 16, fontWeight: '600' },
  section: { marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 16 },
  label: { fontSize: 14, marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
  noteInput: { minHeight: 96 },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  currency: { fontSize: 24, fontWeight: 'bold', marginRight: 8 },
  balanceInput: { flex: 1, fontSize: 24, fontWeight: 'bold' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  iconItem: { width: '30%', aspectRatio: 1, borderRadius: 16, borderWidth: 2, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  iconLabel: { fontSize: 12, marginTop: 8 },
});
