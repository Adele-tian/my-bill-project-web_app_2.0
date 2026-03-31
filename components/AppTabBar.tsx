import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Href, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_ICON_MAP = {
  index: 'house.fill',
  stats: 'chart.bar.fill',
  wallet: 'wallet.pass.fill',
  profile: 'person.fill',
} as const;

export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.surfaceElevated,
            shadowColor: colors.fabShadow,
          },
        ]}>
        <View style={styles.tabCluster}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const options = descriptors[route.key]?.options;
            const color = focused ? colors.tabIconSelected : colors.tabIconDefault;
            const label = options?.title ?? route.name;
            const iconName = TAB_ICON_MAP[route.name as keyof typeof TAB_ICON_MAP];

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={styles.tabButton}
                onPress={onPress}
                activeOpacity={0.8}>
                <IconSymbol size={18} name={iconName} color={color} />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary, shadowColor: colors.fabShadow }]}
          onPress={() => router.push('/add-transaction' as Href)}
          activeOpacity={0.85}>
          <Text style={styles.addButtonIcon}>+</Text>
          <Text style={styles.addButtonText}>记支出</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
  },
  bar: {
    minHeight: 82,
    borderRadius: 28,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  tabCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
    flexShrink: 1,
  },
  tabButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 10,
  },
  addButtonIcon: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 32,
    fontWeight: '700',
    marginTop: -2,
  },
  addButtonText: {
    marginTop: 2,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
