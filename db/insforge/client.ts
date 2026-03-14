import { createClient } from '@insforge/sdk';

const baseUrl = process.env.EXPO_PUBLIC_INSFORGE_BASE_URL?.trim();
const anonKey = process.env.EXPO_PUBLIC_INSFORGE_API_KEY?.trim();

export const isInsForgeConfigured = Boolean(baseUrl && anonKey);

export const insforge = createClient({
  baseUrl,
  anonKey,
});

export function assertInsForgeConfigured(): void {
  if (isInsForgeConfigured) {
    return;
  }

  throw new Error(
    'InsForge is not configured. Set EXPO_PUBLIC_INSFORGE_BASE_URL and EXPO_PUBLIC_INSFORGE_API_KEY in your Expo env file.'
  );
}
