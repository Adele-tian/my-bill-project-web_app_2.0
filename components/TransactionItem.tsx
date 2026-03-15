import { Colors } from '@/constants/theme';
import { Transaction } from '@/db/insforge/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getCategoryByName } from '@/utils/categories';
import { formatRelativeDate, formatTransactionAmount } from '@/utils/format';
import * as LucideIcons from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: number) => void;
  showActions?: boolean;
  showMetaChips?: boolean;
}

export function TransactionItem({
  transaction,
  onPress,
  onEdit,
  onDelete,
  showActions = true,
  showMetaChips = false,
}: TransactionItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [showMenu, setShowMenu] = useState(false);
  const category = getCategoryByName(transaction.category, transaction.type);

  // 动态获取图标组件
  const IconComponent = (LucideIcons as any)[
    transaction.category_icon
      .split('-')
      .map((s: string, i: number) => i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1))
      .join('')
  ] || LucideIcons.Circle;

  const handleLongPress = () => {
    if (showActions) {
      setShowMenu(true);
    }
  };

  const handleEdit = () => {
    setShowMenu(false);
    onEdit?.(transaction);
  };

  const handleDelete = () => {
    setShowMenu(false);
    Alert.alert(
      '确认删除',
      '确定要删除这笔交易记录吗？此操作不可撤销。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => onDelete?.(transaction.id)
        },
      ]
    );
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { backgroundColor: category.color + '20' }]}>
          <IconComponent size={20} color={category.color} />
        </View>

        <View style={styles.info}>
          <Text style={[styles.category, { color: colors.text }]}>{transaction.category}</Text>
          {showMetaChips ? (
            <View style={styles.metaRow}>
              <View style={[styles.metaChip, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>
                  {formatRelativeDate(transaction.date)}
                </Text>
              </View>
              {transaction.account_name ? (
                <View style={[styles.metaChip, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>
                    {transaction.account_name}
                  </Text>
                </View>
              ) : null}
              {transaction.description ? (
                <Text
                  style={[styles.descriptionText, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {transaction.description}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {formatRelativeDate(transaction.date)}
              {transaction.account_name && ` · ${transaction.account_name}`}
            </Text>
          )}
        </View>

        <Text style={[
          styles.amount,
          { color: transaction.type === 'income' ? colors.income : colors.expense }
        ]}>
          {formatTransactionAmount(transaction.amount, transaction.type)}
        </Text>
      </TouchableOpacity>

      {showMenu && (
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.actionMenu, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
              <LucideIcons.Edit3 size={18} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>编辑</Text>
            </TouchableOpacity>
            <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
              <LucideIcons.Trash2 size={18} color={colors.expense} />
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
    paddingVertical: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  category: {
    fontSize: 16,
    fontWeight: '500',
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  metaChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 12,
    flexShrink: 1,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 8,
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
