# Firebase Local Development Guide

This guide explains how to safely develop and test the Warkocap application locally using the Firebase Local Emulator Suite.

## Architecture Overview

To prevent accidental data corruption or reads from the production database, the application environment has been split into three distinct modes:

1. **production**: Connects to the real, live Firebase project (`pos-apps-80dbe`).
2. **development**: Connects to a separate cloud Firebase project used for testing.
3. **emulator**: Runs completely offline and locally on your machine.

The active environment is controlled by the `NEXT_PUBLIC_APP_ENV` variable in your `.env` file.

## Prerequisites

- Node.js `^20`
- [Firebase CLI](https://firebase.google.com/docs/cli) installed globally (`npm install -g firebase-tools`)
- Java Runtime (required for Firebase Firestore Emulator)

## Installation & Setup

1. Copy the example `.env.local` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
2. Verify that `NEXT_PUBLIC_APP_ENV=emulator` is set inside `.env.local`.

## Using the Firebase Emulator

### 1. Start the Emulators
Open a terminal and run:
```bash
npm run emulators
```
This starts the Firestore emulator on port 8080 and the Emulator UI on port 4000. Data will be saved to `./firebase-data` when you exit (Ctrl+C).

### 2. Seed Dummy Data (Optional but Recommended)
To populate the local emulator with realistic test data (products, transactions, expenses), open another terminal and run:
```bash
npm run seed:emulator
```
*Note: This script has strict safety guards and will refuse to run if it detects a production environment or project ID.*

### 3. Start Next.js in Emulator Mode
```bash
npm run dev:emulator
```
When you open `http://localhost:3000`, you should see a purple **EMULATOR MODE** badge in the bottom left corner.

## Managing Data

- **View Data**: Open the [Emulator UI](http://localhost:4000) in your browser.
- **Export Data**: `npm run emulators:export`
- **Reset Data**: `npm run emulators:reset` (Deletes the local `./firebase-data` directory)

## Switching Firebase CLI Aliases

If you need to deploy rules or functions to different environments, use the Firebase aliases configured in `.firebaserc`.

```bash
# Check current project
firebase use

# Switch to development
firebase use dev

# Switch to production
firebase use prod
```

To add a new alias, use `firebase use --add`.

## Troubleshooting

- **"Missing required environment variable"**: The app uses strict environment validation via `src/lib/firebase/env.ts`. Ensure your `.env.local` is correctly configured based on the provided examples.
- **Data not appearing**: Ensure you have run `npm run seed:emulator` while the emulator is running, and that Next.js is started with `npm run dev:emulator`.
- **"Refusing to seed" error**: You must set `NEXT_PUBLIC_APP_ENV=emulator` and the project ID to `demo-warkocap` in `.env.local` for the seed script to run.

## Test Accounts

The application uses standard passcodes defined in your `.env.local`:
- **Admin**: `adminwarkocap` (or what is defined in `NEXT_PUBLIC_ADMIN_PASSCODE`)
- **Cashier**: `kasirwarkocap` (or what is defined in `NEXT_PUBLIC_CASHIER_PASSCODE`)

## Files Changed in this Setup

- `firebase.json`, `firestore.rules`, `.firebaserc` (Emulator configuration)
- `src/lib/firebase/env.ts`, `client.ts`, `emulators.ts` (Safe Firebase initialization)
- `src/components/EnvBadge.tsx` (Visual safety indicator)
- `scripts/seed.ts` (Data seeding)
- `.env.example`, `.env.*.example` (Environment templates)
