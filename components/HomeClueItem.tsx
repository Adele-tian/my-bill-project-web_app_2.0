import { Colors } from '@/constants/theme';
import { Transaction } from '@/db/insforge/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getCategoryByName } from '@/utils/categories';
import { getHomeCategoryCopy, getHomeEmotion } from '@/utils/home-clues';
import { formatCurrency } from '@/utils/format';
import * as LucideIcons from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HomeClueItemProps {
  transaction: Transaction;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: number) => void;
}

export function HomeClueItem({ transaction, onEdit, onDelete }: HomeClueItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [showMenu, setShowMenu] = useState(false);
  const category = getCategoryByName(transaction.category, transaction.type);
  const emotion = getHomeEmotion(transaction.category, transaction.description);
  const categoryCopy = getHomeCategoryCopy(transaction.category);

  const IconComponent = (LucideIcons as any)[
    transaction.category_icon
      .split('-')
      .map((s: string, i: number) => (i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)))
      .join('')
  ] || LucideIcons.Circle;

  const handleDelete = () => {
    setShowMenu(false);
    Alert.alert('确认删除', '确定要删除这笔交易记录吗？此操作不可撤销。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => onDelete?.(transaction.id),
      },
    ]);
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.container}
        activeOpacity={0.85}
        onPress={() => onEdit?.(transaction)}
        onLongPress={() => setShowMenu(true)}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${category.color}18` }]}>
          <IconComponent size={20} color={category.color} />
        </View>

        <View style={styles.main}>
          <Text style={[styles.copy, { color: colors.textSecondary }]}>{categoryCopy}</Text>
          <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>
            {transaction.category}
          </Text>
          <Text
            style={[
              styles.amount,
              { color: transaction.type === 'expense' ? colors.primary : colors.income },
            ]}
          >
            {transaction.type === 'expense' ? '-' : '+'}
            {formatCurrency(transaction.amount)}
          </Text>
        </View>

        <View style={styles.emotionWrap}>
          <Text style={styles.emotionEmoji}>{emotion.emoji}</Text>
          <Text style={[styles.emotionText, { color: colors.primary }]}>{emotion.label}</Text>
        </View>
      </TouchableOpacity>

      {showMenu ? (
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={[styles.actionMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.actionButton} onPress={() => { setShowMenu(false); onEdit?.(transaction); }}>
              <Text style={[styles.actionText, { color: colors.text }]}>编辑</Text>
            </TouchableOpacity>
            <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
              <Text style={[styles.actionText, { color: colors.expense }]}>删除</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  copy: {
    fontSize: 11,
    fontWeight: '500',
  },
  categoryName: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '700',
  },
  amount: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '700',
  },
  emotionWrap: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  emotionEmoji: {
    fontSize: 16,
  },
  emotionText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  actionMenu: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionDivider: {
    width: 1,
    marginVertical: 4,
  },
});
