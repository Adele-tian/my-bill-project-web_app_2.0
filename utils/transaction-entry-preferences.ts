import { insforgeTokenStorage } from '@/db/insforge/token-storage';

export type TransactionTypePreference = 'expense' | 'income';

type TransactionEntryPreferences = {
  lastAccountId: number | null;
  lastType: TransactionTypePreference;
};

const TRANSACTION_ENTRY_PREFERENCES_KEY = 'transaction-entry-preferences';

const DEFAULT_PREFERENCES: TransactionEntryPreferences = {
  lastAccountId: null,
  lastType: 'expense',
};

export function getTransactionEntryPreferences(): TransactionEntryPreferences {
  const raw = insforgeTokenStorage.getItem(TRANSACTION_ENTRY_PREFERENCES_KEY);
  if (!raw) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<TransactionEntryPreferences>;
    return {
      lastAccountId: typeof parsed.lastAccountId === 'number' ? parsed.lastAccountId : null,
      lastType: parsed.lastType === 'income' ? 'income' : 'expense',
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveTransactionEntryPreferences(preferences: Partial<TransactionEntryPreferences>): void {
  const current = getTransactionEntryPreferences();
  const next: TransactionEntryPreferences = {
    lastAccountId:
      typeof preferences.lastAccountId === 'number' || preferences.lastAccountId === null
        ? preferences.lastAccountId
        : current.lastAccountId,
    lastType: preferences.lastType === 'income' ? 'income' : preferences.lastType === 'expense' ? 'expense' : current.lastType,
  };

  insforgeTokenStorage.setItem(TRANSACTION_ENTRY_PREFERENCES_KEY, JSON.stringify(next));
}
