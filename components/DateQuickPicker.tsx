import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

interface DateQuickPickerProps {
  value: string;
  onChange: (nextDate: string) => void;
}

type DateMode = 'today' | 'custom';

function toLocalDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function parsePickerDate(value: string): Date {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return parse(trimmed, 'yyyy-MM-dd', new Date());
  }

  return new Date(trimmed);
}

function todayIso(): string {
  return toLocalDateString(new Date());
}

function isToday(value: string): boolean {
  return toLocalDateString(parsePickerDate(value)) === toLocalDateString(new Date());
}

function parseCustomDate(value: string): string | null {
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const nextDate = new Date(year, month - 1, day);

  if (
    Number.isNaN(nextDate.getTime()) ||
    nextDate.getFullYear() !== year ||
    nextDate.getMonth() !== month - 1 ||
    nextDate.getDate() !== day
  ) {
    return null;
  }

  return toLocalDateString(nextDate);
}

function getCalendarDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days: Date[] = [];

  let current = start;
  while (current <= end) {
    days.push(current);
    current = addDays(current, 1);
  }

  return days;
}

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

export function DateQuickPicker({ value, onChange }: DateQuickPickerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentDate = useMemo(() => parsePickerDate(value), [value]);
  const currentDateLabel = useMemo(() => format(currentDate, 'yyyy-MM-dd'), [currentDate]);
  const [mode, setMode] = useState<DateMode>(isToday(value) ? 'today' : 'custom');
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [viewMonth, setViewMonth] = useState(startOfMonth(currentDate));

  const calendarDays = useMemo(() => getCalendarDays(viewMonth), [viewMonth]);

  useEffect(() => {
    const nextDate = parsePickerDate(value);
    setMode(isToday(value) ? 'today' : 'custom');
    setViewMonth(startOfMonth(nextDate));
  }, [value]);

  const handleSelectToday = () => {
    setMode('today');
    onChange(todayIso());
  };

  const handleSelectCustom = () => {
    setMode('custom');
    setViewMonth(startOfMonth(currentDate));
    setIsPickerVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity
          style={[
            styles.chip,
            {
              backgroundColor: mode === 'today' ? colors.primaryLight : colors.background,
              borderColor: mode === 'today' ? colors.primary : colors.border,
            },
          ]}
          onPress={handleSelectToday}
        >
          <Text style={[styles.chipText, { color: mode === 'today' ? colors.primary : colors.textSecondary }]}>今天</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.chip,
            {
              backgroundColor: mode === 'custom' ? colors.primaryLight : colors.background,
              borderColor: mode === 'custom' ? colors.primary : colors.border,
            },
          ]}
          onPress={handleSelectCustom}
        >
          <Text style={[styles.chipText, { color: mode === 'custom' ? colors.primary : colors.textSecondary }]}>自定义</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.valueText, { color: colors.textSecondary }]}>
        {mode === 'today' ? `当前日期：${currentDateLabel}` : `已选择：${currentDateLabel}`}
      </Text>

      <Modal
        visible={isPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPickerVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsPickerVisible(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>选择日期</Text>
              <TouchableOpacity
                style={[styles.todayButton, { backgroundColor: colors.primaryLight }]}
                onPress={handleSelectToday}
              >
                <Text style={[styles.todayButtonText, { color: colors.primary }]}>回到今天</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.monthRow}>
              <TouchableOpacity style={[styles.navButton, { borderColor: colors.border }]} onPress={() => setViewMonth((current) => subMonths(current, 1))}>
                <ChevronLeft size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.monthLabel, { color: colors.text }]}>{format(viewMonth, 'yyyy年MM月')}</Text>
              <TouchableOpacity style={[styles.navButton, { borderColor: colors.border }]} onPress={() => setViewMonth((current) => addMonths(current, 1))}>
                <ChevronRight size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAY_LABELS.map((label) => (
                <Text key={label} style={[styles.weekLabel, { color: colors.textSecondary }]}>
                  {label}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((day) => {
                const isCurrentMonth = isSameMonth(day, viewMonth);
                const selected = isSameDay(day, currentDate);
                const isCurrentDay = isSameDay(day, new Date());

                return (
                  <TouchableOpacity
                    key={day.toISOString()}
                    style={[
                      styles.dayCell,
                      selected && { backgroundColor: colors.primary, borderColor: colors.primary },
                      !selected && isCurrentDay && { borderColor: colors.primaryLight, backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => {
                      const parsed = parseCustomDate(format(day, 'yyyy-MM-dd'));
                      if (parsed) {
                        setMode(isToday(parsed) ? 'today' : 'custom');
                        onChange(parsed);
                        setIsPickerVisible(false);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: selected ? '#FFF' : isCurrentMonth ? colors.text : colors.textSecondary },
                      ]}
                    >
                      {format(day, 'd')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  valueText: {
    fontSize: 13,
    lineHeight: 18,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 28, 0.24)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    borderRadius: 24,
    padding: 18,
    gap: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  todayButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
