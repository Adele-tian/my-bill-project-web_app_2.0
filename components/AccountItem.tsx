import { Colors } from '@/constants/theme';
import { Account } from '@/db/insforge/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatCurrency } from '@/utils/format';
import { Banknote, ChevronRight, CreditCard, Edit3, Landmark, PiggyBank, Smartphone, Trash2, Wallet } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  'wallet': Wallet,
  'credit-card': CreditCard,
  'banknote': Banknote,
  'landmark': Landmark,
  'smartphone': Smartphone,
  'piggy-bank': PiggyBank,
  'Wallet': Wallet,
  'CreditCard': CreditCard,
  'Banknote': Banknote,
  'Landmark': Landmark,
  'Smartphone': Smartphone,
  'PiggyBank': PiggyBank,
};

interface AccountItemProps {
  account: Account;
  onPress?: () => void;
  onEdit?: (account: Account) => void;
  onDelete?: (id: number) => void;
  showArrow?: boolean;
  showActions?: boolean;
}

export function AccountItem({
  account,
  onPress,
  onEdit,
  onDelete,
  showArrow = true,
  showActions = true
}: AccountItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [showMenu, setShowMenu] = useState(false);
  const IconComponent = ICON_MAP[account.icon] || Wallet;

  const handleLongPress = () => {
    if (showActions) {
      setShowMenu(true);
    }
  };

  const handleEdit = () => {
    setShowMenu(false);
    onEdit?.(account);
  };

  const handleDelete = () => {
    setShowMenu(false);
    Alert.alert(
      '确认删除',
      `确定要删除账户"${account.name}"吗？关联的交易记录也会被删除，此操作不可撤销。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => onDelete?.(account.id)
        },
      ]
    );
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.card }]}
        onPress={onPress}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { backgroundColor: (account.color || '#60A5FA') + '20' }]}>
          <IconComponent size={24} color={account.color || '#60A5FA'} />
        </View>

        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]}>{account.name}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.balanceText, { color: colors.textSecondary }]}>
              {formatCurrency(account.balance)}
            </Text>
            {account.note ? (
              <View style={[styles.noteChip, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={[styles.noteText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {account.note}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {showArrow && <ChevronRight size={20} color={colors.textSecondary} />}
      </TouchableOpacity>

      {showMenu && (
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.actionMenu, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
              <Edit3 size={18} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>编辑</Text>
            </TouchableOpacity>
            <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
              <Trash2 size={18} color={colors.expense} />
              <Text style={[styles.actionText, { color: colors.expense }]}>删除</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  balanceText: {
    fontSize: 14,
  },
  noteChip: {
    maxWidth: '70%',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  noteText: {
    fontSize: 12,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 16,
    zIndex: 100,
  },
  actionMenu: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionDivider: {
    width: 1,
    marginVertical: 4,
  },
});
