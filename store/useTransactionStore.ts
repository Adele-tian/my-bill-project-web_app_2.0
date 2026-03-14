import * as db from '@/db/insforge/database';
import { Transaction } from '@/db/insforge/schema';
import { endOfMonth, endOfWeek, endOfYear, format, startOfMonth, startOfWeek, startOfYear } from 'date-fns';
import { create } from 'zustand';

interface CategorySummary {
  category: string;
  category_icon: string;
  total: number;
  percent?: number;
}

interface TransactionState {
  transactions: Transaction[];
  recentTransactions: Transaction[];
  income: number;
  expense: number;
  categorySummary: CategorySummary[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTransactions: () => Promise<void>;
  fetchRecentTransactions: (limit?: number) => Promise<void>;
  fetchSummary: (period?: 'week' | 'month' | 'year') => Promise<void>;
  fetchCategorySummary: (type: 'income' | 'expense', period?: 'week' | 'month' | 'year') => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'created_at' | 'account_name'>) => Promise<number>;
  updateTransaction: (id: number, updates: Partial<Omit<Transaction, 'id' | 'created_at' | 'account_name'>>) => Promise<void>;
  removeTransaction: (id: number) => Promise<void>;
  getTransactionById: (id: number) => Promise<Transaction | null>;
}

function getDateRange(period?: 'week' | 'month' | 'year'): { start: string; end: string } | undefined {
  if (!period) return undefined;
  const now = new Date();
  let start: Date, end: Date;
  
  switch (period) {
    case 'week':
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'month':
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
    case 'year':
      start = startOfYear(now);
      end = endOfYear(now);
      break;
  }
  
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  };
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  recentTransactions: [],
  income: 0,
  expense: 0,
  categorySummary: [],
  isLoading: false,
  error: null,

  fetchTransactions: async () => {
    set({ isLoading: true, error: null });
    try {
      const transactions = await db.getAllTransactions();
      set({ transactions, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchRecentTransactions: async (limit = 10) => {
    try {
      const recentTransactions = await db.getAllTransactions(limit);
      set({ recentTransactions });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchSummary: async (period) => {
    try {
      const range = getDateRange(period);
      const summary = await db.getIncomeExpenseSummary(range?.start, range?.end);
      set({ income: summary.income, expense: summary.expense });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchCategorySummary: async (type, period) => {
    try {
      const range = getDateRange(period);
      const data = await db.getCategorySummary(type, range?.start, range?.end);
      const total = data.reduce((sum, item) => sum + item.total, 0);
      const categorySummary = data.map(item => ({
        ...item,
        percent: total > 0 ? Math.round((item.total / total) * 100) : 0,
      }));
      set({ categorySummary });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  addTransaction: async (transaction) => {
    try {
      const id = await db.createTransaction(transaction);
      await get().fetchRecentTransactions();
      await get().fetchSummary();
      return id;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateTransaction: async (id, updates) => {
    try {
      await db.updateTransaction(id, updates);
      await get().fetchRecentTransactions();
      await get().fetchTransactions();
      await get().fetchSummary();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  removeTransaction: async (id) => {
    try {
      await db.deleteTransaction(id);
      await get().fetchRecentTransactions();
      await get().fetchTransactions();
      await get().fetchSummary();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  getTransactionById: async (id) => {
    try {
      return await db.getTransactionById(id);
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },
}));
