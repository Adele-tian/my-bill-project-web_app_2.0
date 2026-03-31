import * as db from '@/db/insforge/database';
import { Transaction } from '@/db/insforge/schema';
import { endOfDay, endOfMonth, endOfYear, format, startOfMonth, startOfYear, startOfDay, subDays } from 'date-fns';
import { create } from 'zustand';

interface CategorySummary {
  category: string;
  category_icon: string;
  total: number;
  percent?: number;
}

interface PeriodSummary {
  income: number;
  expense: number;
  net: number;
}

interface TrendSummaryItem {
  label: string;
  income: number;
  expense: number;
}

interface MonthlySummary {
  month: string;
  income: number;
  expense: number;
  net: number;
  yearExpense: number;
  averageExpense: number;
  transactionCount: number;
}

interface MonthlyTrendSummaryItem {
  day: number;
  label: string;
  income: number;
  expense: number;
  transactionCount: number;
}

type SummaryPeriod = 'week' | 'month' | 'year';

interface TransactionState {
  transactions: Transaction[];
  recentTransactions: Transaction[];
  income: number;
  expense: number;
  categorySummary: CategorySummary[];
  periodSummary: PeriodSummary;
  trendSummary: TrendSummaryItem[];
  monthlySummary: MonthlySummary;
  monthlyTrendSummary: MonthlyTrendSummaryItem[];
  monthlyRecentTransactions: Transaction[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTransactions: () => Promise<void>;
  fetchRecentTransactions: (limit?: number) => Promise<void>;
  fetchSummary: (period?: SummaryPeriod) => Promise<void>;
  fetchCategorySummary: (type: 'income' | 'expense', period?: SummaryPeriod) => Promise<void>;
  fetchPeriodSummary: (period: SummaryPeriod) => Promise<void>;
  fetchTrendSummary: (period: SummaryPeriod) => Promise<void>;
  fetchMonthlySummary: (month: string) => Promise<void>;
  fetchMonthlyTrendSummary: (month: string) => Promise<void>;
  fetchMonthlyCategorySummary: (type: 'income' | 'expense', month: string) => Promise<void>;
  fetchMonthlyRecentTransactions: (month: string, limit?: number) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'created_at' | 'account_name' | 'user_id'>) => Promise<number>;
  updateTransaction: (id: number, updates: Partial<Omit<Transaction, 'id' | 'created_at' | 'account_name' | 'user_id'>>) => Promise<void>;
  removeTransaction: (id: number) => Promise<void>;
  getTransactionById: (id: number) => Promise<Transaction | null>;
  reset: () => void;
}

function getDateRange(period?: SummaryPeriod): { start: string; end: string } | undefined {
  if (!period) return undefined;
  const now = new Date();
  let start: Date, end: Date;
  
  switch (period) {
    case 'week':
      start = startOfDay(subDays(now, 6));
      end = endOfDay(now);
      break;
    case 'month':
      start = startOfMonth(now);
      end = endOfDay(now);
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
  periodSummary: {
    income: 0,
    expense: 0,
    net: 0,
  },
  trendSummary: [],
  monthlySummary: {
    month: '',
    income: 0,
    expense: 0,
    net: 0,
    yearExpense: 0,
    averageExpense: 0,
    transactionCount: 0,
  },
  monthlyTrendSummary: [],
  monthlyRecentTransactions: [],
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

  fetchPeriodSummary: async (period) => {
    try {
      const periodSummary = await db.getPeriodSummary(period);
      set({ periodSummary });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchTrendSummary: async (period) => {
    try {
      const trendSummary = await db.getTrendSummary(period);
      set({ trendSummary });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchMonthlySummary: async (month) => {
    try {
      const monthlySummary = await db.getMonthlySummary(month);
      set({ monthlySummary });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchMonthlyTrendSummary: async (month) => {
    try {
      const monthlyTrendSummary = await db.getMonthlyTrendSummary(month);
      set({ monthlyTrendSummary });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchMonthlyCategorySummary: async (type, month) => {
    try {
      const data = await db.getMonthlyCategorySummary(type, month);
      const total = data.reduce((sum, item) => sum + item.total, 0);
      const categorySummary = data.map((item) => ({
        ...item,
        percent: total > 0 ? Math.round((item.total / total) * 100) : 0,
      }));
      set({ categorySummary });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchMonthlyRecentTransactions: async (month, limit = 8) => {
    try {
      const monthlyRecentTransactions = await db.getMonthlyRecentTransactions(month, limit);
      set({ monthlyRecentTransactions });
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

  reset: () => {
    set({
      transactions: [],
      recentTransactions: [],
      income: 0,
      expense: 0,
      categorySummary: [],
      periodSummary: {
        income: 0,
        expense: 0,
        net: 0,
      },
      trendSummary: [],
      monthlySummary: {
        month: '',
        income: 0,
        expense: 0,
        net: 0,
        yearExpense: 0,
        averageExpense: 0,
        transactionCount: 0,
      },
      monthlyTrendSummary: [],
      monthlyRecentTransactions: [],
      isLoading: false,
      error: null,
    });
  },
}));
