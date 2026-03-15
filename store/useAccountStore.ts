import { create } from 'zustand';
import * as db from '@/db/insforge/database';
import { Account } from '@/db/insforge/schema';

type AccountDraft = {
  name: string;
  balance: number;
  icon: string;
  color: string;
  note?: string;
  status?: Account['status'];
  include_in_totals?: boolean;
  archived_at?: string | null;
};

interface AccountState {
  accounts: Account[];
  selectableAccounts: Account[];
  totalBalance: number;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchAccounts: () => Promise<void>;
  addAccount: (account: AccountDraft) => Promise<number>;
  updateAccount: (id: number, account: Partial<Account>) => Promise<void>;
  hideAccount: (id: number) => Promise<void>;
  archiveAccountWithTransfer: (id: number, targetAccountId: number) => Promise<void>;
  removeAccount: (id: number) => Promise<void>;
  refreshTotalBalance: () => Promise<void>;
  reset: () => void;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  selectableAccounts: [],
  totalBalance: 0,
  isLoading: false,
  error: null,

  fetchAccounts: async () => {
    set({ isLoading: true, error: null });
    try {
      const [accounts, selectableAccounts, totalBalance] = await Promise.all([
        db.getAllAccounts(),
        db.getSelectableAccounts(),
        db.getTotalBalance(),
      ]);
      set({ accounts, selectableAccounts, totalBalance, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addAccount: async (account) => {
    try {
      const id = await db.createAccount(account);
      await get().fetchAccounts();
      return id;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateAccount: async (id, account) => {
    try {
      await db.updateAccount(id, account);
      await get().fetchAccounts();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  removeAccount: async (id) => {
    try {
      await db.deleteAccount(id);
      await get().fetchAccounts();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  hideAccount: async (id) => {
    try {
      await db.hideAccount(id);
      await get().fetchAccounts();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  archiveAccountWithTransfer: async (id, targetAccountId) => {
    try {
      await db.archiveAccountWithTransfer(id, targetAccountId);
      await get().fetchAccounts();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  refreshTotalBalance: async () => {
    try {
      const totalBalance = await db.getTotalBalance();
      set({ totalBalance });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  reset: () => {
    set({
      accounts: [],
      selectableAccounts: [],
      totalBalance: 0,
      isLoading: false,
      error: null,
    });
  },
}));
