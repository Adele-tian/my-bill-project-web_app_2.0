# Bill Main

# my-bill-project-web_app_2.0

An Expo bookkeeping app backed by InsForge.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` into your local env file and fill in the InsForge values:

```bash
EXPO_PUBLIC_INSFORGE_BASE_URL=https://zdfr6rz9.us-east.insforge.app
EXPO_PUBLIC_INSFORGE_API_KEY=your-insforge-anon-key
```

3. Start the app with the stable local command:

```bash
npm run start:local
```

This project is most reliable on Node 20 or 22 LTS. Node 24 triggered an Expo CLI port-selection failure during local startup in this environment.

## InsForge database

This project stores accounts and transactions in InsForge PostgreSQL using the SDK client in `db/insforge/client.ts`.

The cloud schema lives in `db/insforge/schema.sql` and should be applied before the app starts. It creates:

- `accounts`
- `transactions`
- indexes for transaction account lookup and date sorting

If the schema is missing, `initDatabase()` will fail during app startup.

## Local runtime notes

- `npm run start:local` starts Expo in CI mode, binds to `localhost`, and locks Metro to port `8081`
- `.env.local` is loaded automatically so the app can connect to InsForge during local development
- Recommended Node version is `22` as recorded in `.nvmrc`

## Current backend model

- `accounts` keeps the current balance for each wallet/account
- `transactions` stores income and expense records linked by `account_id`
- account balances are updated by the app service layer in `db/insforge/database.ts`

## Notes

- The app currently uses InsForge as a shared backend without user-level row isolation.
- If you later add authentication, the next step is enabling RLS and attaching records to a user id.
