import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/utils/categories';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CategoryPickerProps {
  type: 'income' | 'expense';
  selectedCategory: string;
  onSelect: (category: { name: string; icon: string; color: string }) => void;
}

export function CategoryPicker({ type, selectedCategory, onSelect }: CategoryPickerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // 将 icon 名称转换为组件名
  const getIconComponent = (iconName: string) => {
    const componentName = iconName
      .split('-')
      .map((s, i) => i === 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s.charAt(0).toUpperCase() + s.slice(1))
      .join('');
    return (LucideIcons as any)[componentName] || LucideIcons.Circle;
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>选择类别</Text>
      <View style={styles.grid}>
        {categories.map((category) => {
          const IconComponent = getIconComponent(category.icon);
          const isSelected = selectedCategory === category.name;
          
          return (
            <TouchableOpacity
              key={category.name}
              style={[
                styles.item,
                { backgroundColor: colors.card },
                isSelected && { borderColor: category.color, borderWidth: 2 }
              ]}
              onPress={() => onSelect({ name: category.name, icon: category.icon, color: category.color })}
            >
              <View style={[styles.iconWrap, { backgroundColor: category.color + '20' }]}>
                <IconComponent size={24} color={category.color} />
              </View>
              <Text style={[styles.label, { color: colors.text }]}>{category.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  item: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    textAlign: 'center',
  },
});
