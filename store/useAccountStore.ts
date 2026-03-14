import { create } from 'zustand';
import * as db from '@/db/insforge/database';
import { Account } from '@/db/insforge/schema';

interface AccountState {
  accounts: Account[];
  totalBalance: number;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchAccounts: () => Promise<void>;
  addAccount: (account: Omit<Account, 'id' | 'created_at'>) => Promise<number>;
  updateAccount: (id: number, account: Partial<Account>) => Promise<void>;
  removeAccount: (id: number) => Promise<void>;
  refreshTotalBalance: () => Promise<void>;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  totalBalance: 0,
  isLoading: false,
  error: null,

  fetchAccounts: async () => {
    set({ isLoading: true, error: null });
    try {
      const accounts = await db.getAllAccounts();
      const totalBalance = await db.getTotalBalance();
      set({ accounts, totalBalance, isLoading: false });
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

  refreshTotalBalance: async () => {
    try {
      const totalBalance = await db.getTotalBalance();
      set({ totalBalance });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
}));
