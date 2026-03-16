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

3. Start the app with the command that matches your target:

```bash
# iOS simulator / local machine
npm run start:local

# iPhone physical device
npm run start:tunnel
```

This project is most reliable on Node 20 or 22 LTS. Node 24 triggered an Expo CLI port-selection failure during local startup in this environment.

## InsForge database

This project stores accounts and transactions in InsForge PostgreSQL using the SDK client in `db/insforge/client.ts`.

The cloud schema lives in `db/insforge/schema.sql` and should be applied before the app starts. It creates:

- `accounts`
- `transactions`
- indexes for transaction account lookup and date sorting

If the schema is missing, `initDatabase()` will fail during app startup.

## Authentication setup

This app now uses InsForge email/password authentication.

- Registration and login are handled by the SDK auth methods in `store/useAuthStore.ts`
- The JWT access token is persisted with `expo-secure-store` on native devices and reused automatically by the SDK for authenticated API requests
- Unauthenticated users are redirected to `/sign-in`
- Accounts and transactions are filtered by `user_id`, so each signed-in user only sees their own rows

Before using the auth-enabled build, apply both SQL files in your InsForge backend:

```sql
-- Fresh schema
\i db/insforge/schema.sql

-- Existing projects upgrading from the shared-data model
\i db/insforge/auth-migration.sql
```

If you already have historical shared rows, backfill `user_id` before expecting them to appear for a signed-in user.

## Local runtime notes

- `npm run start:local` starts Expo in CI mode, binds to `localhost`, and locks Metro to port `8081`
- `npm run start:tunnel` is the safest option for iPhone physical devices when LAN discovery is flaky
- `npm run ios:local` opens the iOS simulator against the local Metro server
- `.env.local` is loaded automatically so the app can connect to InsForge during local development
- Recommended Node version is `22` as recorded in `.nvmrc`

## Dev environment bootstrap

If your shell cannot find `node`, `npm`, or `npx`, bootstrap the project environment once:

```bash
npm run env:bootstrap
```

Then, for each new terminal session, activate the project environment:

```bash
source scripts/activate-dev.sh
```

You can verify the toolchain with:

```bash
npm run env:doctor
```

If `Press a` in Expo CLI fails on Android with a `host.exp.exponent` launch error,
use the stable Android opener:

```bash
npm run android --port=8081
```

Replace `8081` with the Metro port shown by Expo, for example `8083`.

If you still want Expo's original Android behavior, use:

```bash
npm run android:expo
```

## iOS troubleshooting

- If Expo prints `Simulator device failed to open exp://... Operation timed out`, first verify the local Simulator service is healthy with `xcrun simctl list devices`
- If that command fails with `CoreSimulatorService connection became invalid` or `Connection refused`, restart the macOS Simulator stack before debugging the project itself:

```bash
killall Simulator
sudo killall -9 com.apple.CoreSimulator.CoreSimulatorService
open -a Simulator
```

- After the simulator is healthy, prefer `npm run ios:local`
- For an actual iPhone, prefer `npm run start:tunnel` instead of plain `npx expo start`

## Current backend model

- `accounts` keeps the current balance for each wallet/account
- `transactions` stores income and expense records linked by `account_id`
- account balances are updated by the app service layer in `db/insforge/database.ts`

## Notes

- The app now writes `user_id` on accounts and transactions and only queries rows for the signed-in user.
- For true backend-enforced isolation, the next step is enabling InsForge/Postgres row-level security policies that validate the JWT subject against `user_id`.
