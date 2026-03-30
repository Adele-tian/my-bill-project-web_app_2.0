import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { format } from 'date-fns';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DateQuickPickerProps {
  value: string;
  onChange: (nextDate: string) => void;
}

function toIsoDate(offsetDays = 0): string {
  const next = new Date();
  next.setDate(next.getDate() + offsetDays);
  return next.toISOString();
}

function isSameCalendarDay(left: string, right: string): boolean {
  return format(new Date(left), 'yyyy-MM-dd') === format(new Date(right), 'yyyy-MM-dd');
}

export function DateQuickPicker({ value, onChange }: DateQuickPickerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const today = toIsoDate(0);
  const yesterday = toIsoDate(-1);
  const options = [
    { label: '今天', value: today },
    { label: '昨天', value: yesterday },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {options.map((option) => {
          const isSelected = isSameCalendarDay(value, option.value);

          return (
            <TouchableOpacity
              key={option.label}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? colors.primaryLight : colors.background,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onChange(option.value)}
            >
              <Text style={[styles.chipText, { color: isSelected ? colors.primary : colors.textSecondary }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.valueText, { color: colors.text }]}>{format(new Date(value), 'yyyy-MM-dd')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  valueText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
