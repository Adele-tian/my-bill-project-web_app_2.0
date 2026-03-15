import { assertInsForgeConfigured, insforge } from '@/db/insforge/client';

import { Account, AccountStatus, Transaction } from './schema';

type AuthenticatedUser = {
  id: string;
  email?: string;
};

type AccountInput = {
  name: string;
  balance: number;
  icon: string;
  color: string;
  note?: string;
  status?: AccountStatus;
  include_in_totals?: boolean;
  archived_at?: string | null;
};
type TransactionInput = Omit<Transaction, 'id' | 'created_at' | 'account_name' | 'user_id'>;
type TransactionUpdate = Partial<TransactionInput>;
type AccountUpdate = Partial<AccountInput>;

export type AccountRetirementMode = 'hide' | 'archive-transfer' | 'delete';

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

function normalizeAccount(account: Partial<Account>): Account {
  return {
    id: Number(account.id),
    user_id: String(account.user_id ?? ''),
    name: String(account.name ?? ''),
    balance: Number(account.balance ?? 0),
    icon: String(account.icon ?? 'wallet'),
    color: String(account.color ?? '#60A5FA'),
    note: typeof account.note === 'string' ? account.note : '',
    status: (account.status as AccountStatus | undefined) ?? 'active',
    include_in_totals: typeof account.include_in_totals === 'boolean' ? account.include_in_totals : true,
    archived_at: account.archived_at ?? null,
    created_at: String(account.created_at ?? new Date().toISOString()),
  };
}

async function getCurrentUserOrThrow(): Promise<AuthenticatedUser> {
  assertInsForgeConfigured();

  const { data, error } = await insforge.auth.getCurrentUser();
  if (error) {
    throw new Error(error.message || 'Authentication required');
  }

  if (!data?.user?.id) {
    throw new Error('Please sign in before viewing or submitting data');
  }

  return {
    id: String(data.user.id),
    email: data.user.email ? String(data.user.email) : undefined,
  };
}

async function fetchAccountsMap(userId: string): Promise<Map<number, Account>> {
  const { data, error } = await insforge.database.from('accounts').select('*').eq('user_id', userId);
  const accounts = ensureData<Partial<Account>[]>(data, error, 'Failed to load accounts').map(normalizeAccount);
  return new Map(accounts.map((account) => [account.id, account]));
}

async function fetchAllTransactionsWithAccountNames(userId: string): Promise<Transaction[]> {
  const [{ data: transactionsData, error: transactionsError }, accountsMap] = await Promise.all([
    insforge.database.from('transactions').select('*').eq('user_id', userId),
    fetchAccountsMap(userId),
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

async function getAccountOrThrow(id: number, userId: string): Promise<Account> {
  const { data, error } = await insforge.database
    .from('accounts')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  return normalizeAccount(ensureData<Partial<Account>>(data, error, `Account ${id} does not exist`));
}

async function getTransactionOrThrow(id: number, userId: string): Promise<Transaction> {
  const { data, error } = await insforge.database
    .from('transactions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  return ensureData<Transaction>(data, error, `Transaction ${id} does not exist`);
}

async function setAccountBalance(id: number, balance: number, userId: string): Promise<void> {
  const { error } = await insforge.database.from('accounts').update({ balance }).eq('id', id).eq('user_id', userId);
  if (error) {
    throw new Error(error.message || `Failed to update account ${id}`);
  }
}

async function adjustAccountBalance(id: number, delta: number, userId: string): Promise<void> {
  const account = await getAccountOrThrow(id, userId);
  await setAccountBalance(id, account.balance + delta, userId);
}

export async function initDatabase(): Promise<void> {
  const user = await getCurrentUserOrThrow();

  const { error: accountsError } = await insforge.database.from('accounts').select('id').eq('user_id', user.id).limit(1);
  if (accountsError) {
    throw new Error(
      `${accountsError.message}. Make sure your InsForge project has the auth-enabled "accounts" table schema applied.`
    );
  }

  const { error: transactionsError } = await insforge.database
    .from('transactions')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);
  if (transactionsError) {
    throw new Error(
      `${transactionsError.message}. Make sure your InsForge project has the auth-enabled "transactions" table schema applied.`
    );
  }
}

export async function getAllAccounts(): Promise<Account[]> {
  const user = await getCurrentUserOrThrow();

  const { data, error } = await insforge.database
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('balance', { ascending: false })
    .order('created_at', { ascending: false });

  return ensureData<Partial<Account>[]>(data, error, 'Failed to load accounts').map(normalizeAccount);
}

export async function getSelectableAccounts(): Promise<Account[]> {
  const accounts = await getAllAccounts();
  return accounts.filter((account) => account.status === 'active');
}

export async function getAccountById(id: number): Promise<Account | null> {
  const user = await getCurrentUserOrThrow();

  const { data, error } = await insforge.database
    .from('accounts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) {
    throw new Error(error.message || `Failed to load account ${id}`);
  }

  return data ? normalizeAccount(data as Partial<Account>) : null;
}

export async function getAccountTransactionCount(id: number): Promise<number> {
  const user = await getCurrentUserOrThrow();

  const { count, error } = await insforge.database
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message || `Failed to count transactions for account ${id}`);
  }

  return count ?? 0;
}

export async function createAccount(account: AccountInput): Promise<number> {
  const user = await getCurrentUserOrThrow();
  const payload = {
    ...account,
    note: account.note ?? '',
    status: account.status ?? 'active',
    include_in_totals: account.include_in_totals ?? true,
    archived_at: account.archived_at ?? null,
    user_id: user.id,
  };

  const { data, error } = await insforge.database
    .from('accounts')
    .insert([payload])
    .select('id')
    .single();

  const row = ensureData<{ id: number }>(data, error, 'Failed to create account');
  return row.id;
}

export async function updateAccount(id: number, account: AccountUpdate): Promise<void> {
  const user = await getCurrentUserOrThrow();

  const {
    id: _ignoredId,
    created_at: _ignoredCreatedAt,
    user_id: _ignoredUserId,
    ...updates
  } = account as Partial<Account>;
  if (Object.keys(updates).length === 0) {
    return;
  }

  const { error } = await insforge.database.from('accounts').update(updates).eq('id', id).eq('user_id', user.id);
  if (error) {
    throw new Error(error.message || `Failed to update account ${id}`);
  }
}

export async function deleteAccount(id: number): Promise<void> {
  const user = await getCurrentUserOrThrow();

  const { count, error: countError } = await insforge.database
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', id)
    .eq('user_id', user.id);
  if (countError) {
    throw new Error(countError.message || `Failed to check transactions for account ${id}`);
  }

  if ((count ?? 0) > 0) {
    throw new Error('该账户下仍有关联账目，不能彻底删除。请先选择隐藏或结转余额后归档。');
  }

  const { error } = await insforge.database.from('accounts').delete().eq('id', id).eq('user_id', user.id);
  if (error) {
    throw new Error(error.message || `Failed to delete account ${id}`);
  }
}

export async function getTotalBalance(): Promise<number> {
  const accounts = await getAllAccounts();
  return accounts
    .filter((account) => account.include_in_totals)
    .reduce((sum, account) => sum + account.balance, 0);
}

export async function getAllTransactions(limit?: number): Promise<Transaction[]> {
  const user = await getCurrentUserOrThrow();

  const transactions = await fetchAllTransactionsWithAccountNames(user.id);
  return typeof limit === 'number' ? transactions.slice(0, limit) : transactions;
}

export async function getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
  const transactions = await getAllTransactions();
  return applyDateRange(transactions, startDate, endDate);
}

export async function createTransaction(transaction: TransactionInput): Promise<number> {
  const user = await getCurrentUserOrThrow();
  const account = await getAccountOrThrow(transaction.account_id, user.id);
  if (account.status === 'archived') {
    throw new Error('该账户已归档，不能继续记新账。');
  }

  const { data, error } = await insforge.database
    .from('transactions')
    .insert([{ ...transaction, user_id: user.id }])
    .select('id')
    .single();

  const row = ensureData<{ id: number }>(data, error, 'Failed to create transaction');
  const balanceChange = transaction.type === 'income' ? transaction.amount : -transaction.amount;
  await adjustAccountBalance(transaction.account_id, balanceChange, user.id);
  return row.id;
}

export async function hideAccount(id: number): Promise<void> {
  const user = await getCurrentUserOrThrow();
  await getAccountOrThrow(id, user.id);
  await updateAccount(id, { status: 'hidden', include_in_totals: true });
}

export async function archiveAccountWithTransfer(id: number, targetAccountId: number): Promise<void> {
  const user = await getCurrentUserOrThrow();
  const sourceAccount = await getAccountOrThrow(id, user.id);

  if (sourceAccount.status === 'archived') {
    throw new Error('该账户已经归档。');
  }

  if (id === targetAccountId) {
    throw new Error('结转账户不能选择自己。');
  }

  const targetAccount = await getAccountOrThrow(targetAccountId, user.id);
  if (targetAccount.status !== 'active') {
    throw new Error('请选择一个正常状态的账户接收余额。');
  }

  if (sourceAccount.balance !== 0) {
    const now = new Date().toISOString();
    await createTransaction({
      type: 'expense',
      amount: sourceAccount.balance,
      category: '账户结转',
      category_icon: 'repeat',
      account_id: sourceAccount.id,
      date: now,
      description: `账户结转至 ${targetAccount.name}`,
    });
    await createTransaction({
      type: 'income',
      amount: sourceAccount.balance,
      category: '账户结转',
      category_icon: 'repeat',
      account_id: targetAccount.id,
      date: now,
      description: `账户结转自 ${sourceAccount.name}`,
    });
  }

  await updateAccount(id, {
    status: 'archived',
    include_in_totals: false,
    archived_at: new Date().toISOString(),
    balance: 0,
  });
}

export async function getTransactionById(id: number): Promise<Transaction | null> {
  const user = await getCurrentUserOrThrow();

  const [transaction, accountsMap] = await Promise.all([
    insforge.database.from('transactions').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
    fetchAccountsMap(user.id),
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
  const user = await getCurrentUserOrThrow();

  if (Object.keys(updates).length === 0) {
    return;
  }

  const oldTransaction = await getTransactionOrThrow(id, user.id);
  const newType = updates.type ?? oldTransaction.type;
  const newAmount = updates.amount ?? oldTransaction.amount;
  const newAccountId = updates.account_id ?? oldTransaction.account_id;

  await getAccountOrThrow(newAccountId, user.id);

  const oldBalanceChange = oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount;
  await adjustAccountBalance(oldTransaction.account_id, oldBalanceChange, user.id);

  const newBalanceChange = newType === 'income' ? newAmount : -newAmount;
  await adjustAccountBalance(newAccountId, newBalanceChange, user.id);

  const { error } = await insforge.database.from('transactions').update(updates).eq('id', id).eq('user_id', user.id);
  if (error) {
    throw new Error(error.message || `Failed to update transaction ${id}`);
  }
}

export async function deleteTransaction(id: number): Promise<void> {
  const user = await getCurrentUserOrThrow();

  const transaction = await getTransactionById(id);
  if (!transaction) {
    return;
  }

  const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
  await adjustAccountBalance(transaction.account_id, balanceChange, user.id);

  const { error } = await insforge.database.from('transactions').delete().eq('id', id).eq('user_id', user.id);
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
