import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryIconComponent } from '@/utils/categories';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CategoryPickerProps {
  type: 'income' | 'expense';
  selectedCategory: string;
  onSelect: (category: { name: string; icon: string; color: string }) => void;
  compact?: boolean;
}

export function CategoryPicker({ type, selectedCategory, onSelect, compact = false }: CategoryPickerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const quickCategories = compact ? categories.slice(0, Math.min(categories.length, 6)) : categories;
  const selectedExistsInQuickList = quickCategories.some((category) => category.name === selectedCategory);
  const visibleCategories = compact && selectedExistsInQuickList ? quickCategories : compact ? [categories.find((category) => category.name === selectedCategory) ?? categories[0], ...quickCategories.filter((category) => category.name !== selectedCategory)] : categories;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>选择类别</Text>
      <View style={styles.grid}>
        {visibleCategories.map((category) => {
          const IconComponent = getCategoryIconComponent(category.icon);
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
