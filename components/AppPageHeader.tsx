import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type AppPageHeaderProps = {
  title: string;
  rightSlot?: ReactNode;
};

export function AppPageHeader({ title, rightSlot }: AppPageHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <View style={styles.rightSlot}>{rightSlot}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 44,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  rightSlot: {
    minWidth: 76,
    minHeight: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
