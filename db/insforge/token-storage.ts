import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const webMemoryStorage = new Map<string, string>();
const nativeMemoryStorage = new Map<string, string>();
const nativeSecureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

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

    try {
      const value = SecureStore.getItem(key, nativeSecureStoreOptions);
      if (value !== null) {
        nativeMemoryStorage.set(key, value);
      }
      return value ?? nativeMemoryStorage.get(key) ?? null;
    } catch {
      return nativeMemoryStorage.get(key) ?? null;
    }
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

    nativeMemoryStorage.set(key, value);

    try {
      SecureStore.setItem(key, value, nativeSecureStoreOptions);
    } catch {
      // Keep the in-memory session alive when iOS keychain access fails in Expo Go/simulator.
    }
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

    nativeMemoryStorage.delete(key);
    SecureStore.deleteItemAsync(key, nativeSecureStoreOptions).catch(() => {
      // Ignore cleanup failures so logout can still proceed.
    });
  },
};
