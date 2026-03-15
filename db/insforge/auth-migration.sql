alter table public.accounts
  add column if not exists user_id text;

alter table public.accounts
  add column if not exists note text not null default '';

alter table public.accounts
  add column if not exists status text not null default 'active';

alter table public.accounts
  add column if not exists include_in_totals boolean not null default true;

alter table public.accounts
  add column if not exists archived_at timestamptz;

alter table public.transactions
  add column if not exists user_id text;

create index if not exists idx_accounts_user_id on public.accounts (user_id);
create index if not exists idx_transactions_user_id on public.transactions (user_id);
create index if not exists idx_transactions_user_id_date on public.transactions (user_id, date desc);

-- Existing legacy rows without user_id will no longer be returned by the app.
-- If you need to keep historical data, backfill user_id before enabling auth-only access.
