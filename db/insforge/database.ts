import { assertInsForgeConfigured, insforge } from '@/db/insforge/client';

import { Account, Transaction } from './schema';

type TransactionInput = Omit<Transaction, 'id' | 'created_at' | 'account_name'>;
type TransactionUpdate = Partial<TransactionInput>;

function ensureData<T>(data: T | null, error: { message?: string } | null, fallbackMessage: string): T {
  if (error) {
    throw new Error(error.message || fallbackMessage);
  }

  if (data === null) {
    throw new Error(fallbackMessage);
  }

  return data;
}

function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function applyDateRange<T extends { date: string }>(items: T[], startDate?: string, endDate?: string): T[] {
  if (!startDate || !endDate) {
    return items;
  }

  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  return items.filter((item) => {
    const value = new Date(item.date).getTime();
    return value >= start && value <= end;
  });
}

async function fetchAccountsMap(): Promise<Map<number, Account>> {
  const { data, error } = await insforge.database.from('accounts').select('*');
  const accounts = ensureData<Account[]>(data, error, 'Failed to load accounts');
  return new Map(accounts.map((account) => [account.id, account]));
}

async function fetchAllTransactionsWithAccountNames(): Promise<Transaction[]> {
  const [{ data: transactionsData, error: transactionsError }, accountsMap] = await Promise.all([
    insforge.database.from('transactions').select('*'),
    fetchAccountsMap(),
  ]);

  const transactions = ensureData<Transaction[]>(
    transactionsData,
    transactionsError,
    'Failed to load transactions'
  );

  return sortTransactions(
    transactions.map((transaction) => ({
      ...transaction,
      account_name: accountsMap.get(transaction.account_id)?.name,
    }))
  );
}

async function getAccountOrThrow(id: number): Promise<Account> {
  const { data, error } = await insforge.database.from('accounts').select('*').eq('id', id).single();
  return ensureData<Account>(data, error, `Account ${id} does not exist`);
}

async function getTransactionOrThrow(id: number): Promise<Transaction> {
  const { data, error } = await insforge.database.from('transactions').select('*').eq('id', id).single();
  return ensureData<Transaction>(data, error, `Transaction ${id} does not exist`);
}

async function setAccountBalance(id: number, balance: number): Promise<void> {
  const { error } = await insforge.database.from('accounts').update({ balance }).eq('id', id);
  if (error) {
    throw new Error(error.message || `Failed to update account ${id}`);
  }
}

async function adjustAccountBalance(id: number, delta: number): Promise<void> {
  const account = await getAccountOrThrow(id);
  await setAccountBalance(id, account.balance + delta);
}

export async function initDatabase(): Promise<void> {
  assertInsForgeConfigured();

  const { error } = await insforge.database.from('accounts').select('id').limit(1);
  if (error) {
    throw new Error(
      `${error.message}. Make sure your InsForge project has "accounts" and "transactions" tables.`
    );
  }
}

export async function getAllAccounts(): Promise<Account[]> {
  assertInsForgeConfigured();

  const { data, error } = await insforge.database
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false });

  return ensureData<Account[]>(data, error, 'Failed to load accounts');
}

export async function getAccountById(id: number): Promise<Account | null> {
  assertInsForgeConfigured();

  const { data, error } = await insforge.database.from('accounts').select('*').eq('id', id).maybeSingle();
  if (error) {
    throw new Error(error.message || `Failed to load account ${id}`);
  }

  return data as Account | null;
}

export async function createAccount(account: Omit<Account, 'id' | 'created_at'>): Promise<number> {
  assertInsForgeConfigured();

  const { data, error } = await insforge.database
    .from('accounts')
    .insert([account])
    .select('id')
    .single();

  const row = ensureData<{ id: number }>(data, error, 'Failed to create account');
  return row.id;
}

export async function updateAccount(id: number, account: Partial<Account>): Promise<void> {
  assertInsForgeConfigured();

  const { id: _ignoredId, created_at: _ignoredCreatedAt, ...updates } = account;
  if (Object.keys(updates).length === 0) {
    return;
  }

  const { error } = await insforge.database.from('accounts').update(updates).eq('id', id);
  if (error) {
    throw new Error(error.message || `Failed to update account ${id}`);
  }
}

export async function deleteAccount(id: number): Promise<void> {
  assertInsForgeConfigured();

  const { error: transactionsError } = await insforge.database.from('transactions').delete().eq('account_id', id);
  if (transactionsError) {
    throw new Error(transactionsError.message || `Failed to delete transactions for account ${id}`);
  }

  const { error } = await insforge.database.from('accounts').delete().eq('id', id);
  if (error) {
    throw new Error(error.message || `Failed to delete account ${id}`);
  }
}

export async function getTotalBalance(): Promise<number> {
  const accounts = await getAllAccounts();
  return accounts.reduce((sum, account) => sum + account.balance, 0);
}

export async function getAllTransactions(limit?: number): Promise<Transaction[]> {
  assertInsForgeConfigured();

  const transactions = await fetchAllTransactionsWithAccountNames();
  return typeof limit === 'number' ? transactions.slice(0, limit) : transactions;
}

export async function getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
  const transactions = await getAllTransactions();
  return applyDateRange(transactions, startDate, endDate);
}

export async function createTransaction(transaction: TransactionInput): Promise<number> {
  assertInsForgeConfigured();

  const { data, error } = await insforge.database
    .from('transactions')
    .insert([transaction])
    .select('id')
    .single();

  const row = ensureData<{ id: number }>(data, error, 'Failed to create transaction');
  const balanceChange = transaction.type === 'income' ? transaction.amount : -transaction.amount;
  await adjustAccountBalance(transaction.account_id, balanceChange);
  return row.id;
}

export async function getTransactionById(id: number): Promise<Transaction | null> {
  assertInsForgeConfigured();

  const [transaction, accountsMap] = await Promise.all([
    insforge.database.from('transactions').select('*').eq('id', id).maybeSingle(),
    fetchAccountsMap(),
  ]);

  if (transaction.error) {
    throw new Error(transaction.error.message || `Failed to load transaction ${id}`);
  }

  if (!transaction.data) {
    return null;
  }

  return {
    ...(transaction.data as Transaction),
    account_name: accountsMap.get((transaction.data as Transaction).account_id)?.name,
  };
}

export async function updateTransaction(id: number, updates: TransactionUpdate): Promise<void> {
  assertInsForgeConfigured();

  if (Object.keys(updates).length === 0) {
    return;
  }

  const oldTransaction = await getTransactionOrThrow(id);
  const newType = updates.type ?? oldTransaction.type;
  const newAmount = updates.amount ?? oldTransaction.amount;
  const newAccountId = updates.account_id ?? oldTransaction.account_id;

  const oldBalanceChange = oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount;
  await adjustAccountBalance(oldTransaction.account_id, oldBalanceChange);

  const newBalanceChange = newType === 'income' ? newAmount : -newAmount;
  await adjustAccountBalance(newAccountId, newBalanceChange);

  const { error } = await insforge.database.from('transactions').update(updates).eq('id', id);
  if (error) {
    throw new Error(error.message || `Failed to update transaction ${id}`);
  }
}

export async function deleteTransaction(id: number): Promise<void> {
  assertInsForgeConfigured();

  const transaction = await getTransactionById(id);
  if (!transaction) {
    return;
  }

  const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
  await adjustAccountBalance(transaction.account_id, balanceChange);

  const { error } = await insforge.database.from('transactions').delete().eq('id', id);
  if (error) {
    throw new Error(error.message || `Failed to delete transaction ${id}`);
  }
}

export async function getIncomeExpenseSummary(
  startDate?: string,
  endDate?: string
): Promise<{ income: number; expense: number }> {
  const transactions = applyDateRange(await getAllTransactions(), startDate, endDate);

  return transactions.reduce(
    (summary, transaction) => {
      if (transaction.type === 'income') {
        summary.income += transaction.amount;
      } else {
        summary.expense += transaction.amount;
      }

      return summary;
    },
    { income: 0, expense: 0 }
  );
}

export async function getCategorySummary(type: 'income' | 'expense', startDate?: string, endDate?: string) {
  const transactions = applyDateRange(await getAllTransactions(), startDate, endDate).filter(
    (transaction) => transaction.type === type
  );

  const categoryMap = new Map<string, { category: string; category_icon: string; total: number }>();

  for (const transaction of transactions) {
    const current = categoryMap.get(transaction.category);
    if (current) {
      current.total += transaction.amount;
      continue;
    }

    categoryMap.set(transaction.category, {
      category: transaction.category,
      category_icon: transaction.category_icon,
      total: transaction.amount,
    });
  }

  return Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
}
