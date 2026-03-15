import { Colors } from '@/constants/theme';
import { getAccountTransactionCount } from '@/db/insforge/database';
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
type DeleteMode = 'archive-transfer' | 'hide' | 'delete';

export default function AddAccountScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditMode = !!id;

  const { accounts, addAccount, updateAccount, removeAccount, hideAccount, archiveAccountWithTransfer } = useAccountStore();
  const { signOut } = useAuthStore();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [note, setNote] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<AccountIconOption>(ACCOUNT_ICONS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>('archive-transfer');
  const [transferTargetId, setTransferTargetId] = useState<number | null>(null);
  const [transactionCount, setTransactionCount] = useState(0);
  const [isLoadingTransactionCount, setIsLoadingTransactionCount] = useState(false);

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
        setIsConfirmingDelete(false);
        setDeleteMode('archive-transfer');
      }
    }
  }, [id, accounts]);

  useEffect(() => {
    if (!isEditMode || !id) {
      return;
    }

    const currentAccountId = parseInt(id);
    const fallbackTarget = accounts.find(
      (account) => account.id !== currentAccountId && account.status === 'active'
    );
    setTransferTargetId(fallbackTarget?.id ?? null);
  }, [accounts, id, isEditMode]);

  useEffect(() => {
    if (!isEditMode || !id) {
      setTransactionCount(0);
      return;
    }

    let isMounted = true;
    setIsLoadingTransactionCount(true);

    getAccountTransactionCount(parseInt(id))
      .then((count) => {
        if (isMounted) {
          setTransactionCount(count);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTransactionCount(0);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingTransactionCount(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, isEditMode]);

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

  const handleDelete = async () => {
    if (!isEditMode || !id) {
      return;
    }

    setIsLoading(true);
    try {
      const accountId = parseInt(id);

      if (deleteMode === 'hide') {
        await hideAccount(accountId);
      } else if (deleteMode === 'archive-transfer') {
        if (!transferTargetId) {
          throw new Error('请选择一个接收余额的账户后再归档。');
        }
        await archiveAccountWithTransfer(accountId, transferTargetId);
      } else {
        await removeAccount(accountId);
      }

      router.replace('/(tabs)/wallet');
    } catch (error) {
      const message = (error as Error).message || '删除失败';
      if (message.includes('JWT expired')) {
        await signOut();
        Alert.alert('登录已过期', '请重新登录后再删除账户。', [
          { text: '确定', onPress: () => router.replace('/sign-in') }
        ]);
        return;
      }
      Alert.alert('错误', message);
    } finally {
      setIsLoading(false);
      setIsConfirmingDelete(false);
    }
  };

  const XIcon = LucideIcons.X;
  const currentAccountId = isEditMode && id ? parseInt(id) : null;
  const transferTargets = accounts.filter(
    (account) => account.id !== currentAccountId && account.status === 'active'
  );
  const canPermanentlyDelete = transactionCount === 0 && !isLoadingTransactionCount;

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
        {isEditMode ? (
          <View style={styles.deleteSection}>
            {isConfirmingDelete ? (
              <>
                <Text style={[styles.deleteHint, { color: colors.textSecondary }]}>
                  推荐使用逻辑归档。账户是历史账目的锚点，只有从未产生账目的账户才建议彻底删除。
                </Text>
                <View style={styles.optionList}>
                  <TouchableOpacity
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: deleteMode === 'archive-transfer' ? colors.primaryLight : colors.card,
                        borderColor: deleteMode === 'archive-transfer' ? colors.primary : colors.border,
                      }
                    ]}
                    onPress={() => setDeleteMode('archive-transfer')}
                    disabled={isLoading}
                  >
                    <Text style={[styles.optionTitle, { color: colors.text }]}>A. 结转余额后归档</Text>
                    <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                      自动生成结转账目，把余额转入另一个正常账户，然后将当前账户归档并停止记新账。
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: deleteMode === 'hide' ? colors.primaryLight : colors.card,
                        borderColor: deleteMode === 'hide' ? colors.primary : colors.border,
                      }
                    ]}
                    onPress={() => setDeleteMode('hide')}
                    disabled={isLoading}
                  >
                    <Text style={[styles.optionTitle, { color: colors.text }]}>B. 仅前端隐藏</Text>
                    <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                      保留数据和余额，默认不在钱包主列表显示，也不再出现在记账账户选择中，但仍参与总资产计算。
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: deleteMode === 'delete' ? '#FEE2E2' : !canPermanentlyDelete ? '#F3F4F6' : colors.card,
                        borderColor: deleteMode === 'delete' ? '#DC2626' : !canPermanentlyDelete ? '#D1D5DB' : colors.border,
                        opacity: canPermanentlyDelete ? 1 : 0.7,
                      }
                    ]}
                    onPress={() => {
                      if (canPermanentlyDelete) {
                        setDeleteMode('delete');
                      }
                    }}
                    disabled={isLoading || !canPermanentlyDelete}
                  >
                    <Text style={[styles.optionTitle, { color: deleteMode === 'delete' ? '#B91C1C' : !canPermanentlyDelete ? '#6B7280' : colors.text }]}>C. 彻底删除</Text>
                    <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                      {isLoadingTransactionCount
                        ? '正在检查该账户是否已有历史账目...'
                        : canPermanentlyDelete
                          ? '该账户尚未产生任何关联账目，可以安全执行物理删除。'
                          : `该账户已有 ${transactionCount} 笔关联账目，不能彻底删除，只能隐藏或归档。`}
                    </Text>
                  </TouchableOpacity>
                </View>
                {deleteMode === 'archive-transfer' ? (
                  <View style={[styles.transferSection, { backgroundColor: colors.card }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>余额转入账户</Text>
                    <View style={styles.transferTargets}>
                      {transferTargets.length > 0 ? (
                        transferTargets.map((account) => (
                          <TouchableOpacity
                            key={account.id}
                            style={[
                              styles.transferTarget,
                              {
                                borderColor: transferTargetId === account.id ? colors.primary : colors.border,
                                backgroundColor: transferTargetId === account.id ? colors.primaryLight : colors.background,
                              }
                            ]}
                            onPress={() => setTransferTargetId(account.id)}
                            disabled={isLoading}
                          >
                            <Text style={[styles.transferTargetName, { color: colors.text }]}>{account.name}</Text>
                            <Text style={[styles.transferTargetMeta, { color: colors.textSecondary }]}>
                              当前余额 {account.balance.toFixed(2)}
                            </Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                          没有可接收余额的正常账户，请先创建一个正常状态账户。
                        </Text>
                      )}
                    </View>
                  </View>
                ) : null}
                <View style={styles.deleteActions}>
                  <TouchableOpacity
                    style={[styles.cancelDeleteButton, { borderColor: colors.border, backgroundColor: colors.card }]}
                    onPress={() => setIsConfirmingDelete(false)}
                    disabled={isLoading}
                  >
                    <Text style={[styles.cancelDeleteText, { color: colors.textSecondary }]}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmDeleteButton, { backgroundColor: deleteMode === 'delete' ? '#DC2626' : colors.primary }]}
                    onPress={handleDelete}
                    disabled={isLoading}
                  >
                    <Text style={styles.confirmDeleteText}>
                      {isLoading ? '处理中...' : deleteMode === 'hide' ? '确认隐藏' : deleteMode === 'archive-transfer' ? '确认结转并归档' : '确认删除'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: '#FEE2E2' }]}
                onPress={() => setIsConfirmingDelete(true)}
                disabled={isLoading}
              >
                <Text style={styles.deleteButtonText}>删除账户</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
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
  deleteSection: {
    marginHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  deleteButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteHint: {
    fontSize: 13,
    lineHeight: 20,
  },
  optionList: {
    gap: 12,
  },
  optionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  transferSection: {
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  transferTargets: {
    gap: 10,
  },
  transferTarget: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  transferTargetName: {
    fontSize: 15,
    fontWeight: '600',
  },
  transferTargetMeta: {
    fontSize: 13,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelDeleteButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelDeleteText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
