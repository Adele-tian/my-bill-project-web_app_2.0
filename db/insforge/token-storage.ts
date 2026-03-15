import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const INSFORGE_TOKEN_KEY = 'insforge-auth-token';
export const INSFORGE_USER_KEY = 'insforge-auth-user';

const webMemoryStorage = new Map<string, string>();
const nativeMemoryStorage = new Map<string, string>();
const nativeSecureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

function decodeBase64Url(value: string): string | null {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');

  try {
    if (typeof globalThis.atob === 'function') {
      return globalThis.atob(base64);
    }

    if (typeof Buffer !== 'undefined') {
      return Buffer.from(base64, 'base64').toString('utf-8');
    }
  } catch {
    return null;
  }

  return null;
}

export function getStoredInsforgeToken(): string | null {
  return insforgeTokenStorage.getItem(INSFORGE_TOKEN_KEY);
}

export function clearStoredInsforgeSession(): void {
  insforgeTokenStorage.removeItem(INSFORGE_TOKEN_KEY);
  insforgeTokenStorage.removeItem(INSFORGE_USER_KEY);
}

export function isJwtExpired(token: string, clockSkewSeconds = 30): boolean {
  const payloadSegment = token.split('.')[1];
  if (!payloadSegment) {
    return false;
  }

  const decodedPayload = decodeBase64Url(payloadSegment);
  if (!decodedPayload) {
    return false;
  }

  try {
    const payload = JSON.parse(decodedPayload) as { exp?: number };
    if (typeof payload.exp !== 'number') {
      return false;
    }

    return payload.exp * 1000 <= Date.now() + clockSkewSeconds * 1000;
  } catch {
    return false;
  }
}

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
