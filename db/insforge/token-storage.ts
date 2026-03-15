import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const webMemoryStorage = new Map<string, string>();

function getWebStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const insforgeTokenStorage = {
  getItem(key: string): string | null {
    if (Platform.OS === 'web') {
      const storage = getWebStorage();
      return storage ? storage.getItem(key) : webMemoryStorage.get(key) ?? null;
    }

    return SecureStore.getItem(key);
  },

  setItem(key: string, value: string): void {
    if (Platform.OS === 'web') {
      const storage = getWebStorage();
      if (storage) {
        storage.setItem(key, value);
        return;
      }

      webMemoryStorage.set(key, value);
      return;
    }

    SecureStore.setItem(key, value);
  },

  removeItem(key: string): void {
    if (Platform.OS === 'web') {
      const storage = getWebStorage();
      if (storage) {
        storage.removeItem(key);
        return;
      }

      webMemoryStorage.delete(key);
      return;
    }

    SecureStore.deleteItemAsync(key);
  },
};
