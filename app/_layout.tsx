import { initDatabase } from '@/db/insforge/database';
import { useAuthStore } from '../store/useAuthStore';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { user, isHydrating, initialize } = useAuthStore();

  useEffect(() => {
    initialize().catch((error) => {
      console.error('Failed to initialize auth session', error);
    });
  }, [initialize]);

  useEffect(() => {
    if (!user) {
      return;
    }

    initDatabase().catch((error) => {
      console.error('Failed to initialize InsForge database', error);
    });
  }, [user]);

  if (isHydrating) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: (colorScheme === 'dark' ? DarkTheme : DefaultTheme).colors.background,
          },
        }}>
        {!user ? (
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="add-transaction" options={{ presentation: 'modal', title: '记一笔', headerShown: false }} />
            <Stack.Screen name="add-account" options={{ presentation: 'modal', title: '添加账户', headerShown: false }} />
          </>
        )}
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
