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
      ]}
      pointerEvents="box-none">
      <View
        style={[
          styles.tabBar,
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
                style={[
                  styles.tabButton,
                  focused ? { backgroundColor: colors.surfaceMuted } : null,
                ]}
                onPress={onPress}
                activeOpacity={0.8}>
                <IconSymbol size={18} name={iconName} color={color} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.addButtonWrap} pointerEvents="box-none">
        <View style={[styles.addButtonHaloOuter, { backgroundColor: colors.fabHaloOuter }]} />
        <View style={[styles.addButtonHaloInner, { backgroundColor: colors.fabHaloInner }]} />
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary, shadowColor: colors.fabShadow }]}
          onPress={() => router.push('/add-transaction' as Href)}
          activeOpacity={0.85}>
          <Text style={styles.addButtonIcon}>+</Text>
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
  tabBar: {
    position: 'absolute',
    left: 0,
    bottom: 8,
    minHeight: 70,
    width: 206,
    borderRadius: 28,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  tabCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  tabButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonWrap: {
    position: 'absolute',
    right: 18,
    bottom: 12,
    zIndex: 20,
    elevation: 20,
    width: 98,
    height: 98,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonHaloOuter: {
    position: 'absolute',
    width: 94,
    height: 94,
    borderRadius: 47,
    opacity: 0.68,
  },
  addButtonHaloInner: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 41,
    opacity: 0.72,
  },
  addButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  addButtonIcon: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 32,
    fontWeight: '700',
    marginTop: -2,
  },
});
