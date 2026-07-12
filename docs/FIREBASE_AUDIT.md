# Warkocap Firebase Codebase Audit

## 1. Environment and Versions

- **Next.js Version**: `^16.2.6` (App Router is utilized).
- **Firebase Web SDK**: `^12.14.0`
- **Firebase Admin SDK**: Not found in dependencies or code.
- **Node.js**: `^20.19.41` (types)

## 2. Firebase Products Detected

- **Firestore**: Extensively used for CRUD operations.
- **Firebase Auth**: **NOT USED**. The app implements a custom cookie-based authentication system validating against static environment variables.
- **Firebase Storage**: **NOT USED**.
- **Firebase Realtime Database**: **NOT USED**.

## 3. Client-Side Firebase Initialization

Firebase is initialized in `src/lib/firebase.js`.
It imports `initializeApp` from `firebase/app` and `initializeFirestore` from `firebase/firestore`.

**Vulnerability**: The Firebase configuration is completely hardcoded into the source code, targeting the production project `pos-apps-80dbe`.

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCv6ea6xoD581w1P3dKtc_a-DtP_v1HmJ4", // Hardcoded
  authDomain: "pos-apps-80dbe.firebaseapp.com",
  projectId: "pos-apps-80dbe",
  // ...
};
```

## 4. Server-Side Firebase Admin Flow

No server-side Firebase Admin SDK initialization flow was found. All database queries appear to run on the client via `firebase-data.ts` or directly within client components.

## 5. CRUD Entry Points & Collection Structure

Firestore collections are accessed via `src/lib/firebase-data.ts` and individual page components.

### Collections Used:
- `products`: Product catalog data, pricing, and stock.
- `transactions`: POS transactions, including nested `items`, totals, and timestamps.
- `expenses`: Store expenses.

### Key Entry Points:
- `src/lib/firebase-data.ts`: Centralizes fetching products, transactions, and expenses with session caching.
- `src/app/admin/tambah/page.tsx`: Uses `addDoc` to add products.
- `src/app/admin/daftar/page.tsx`: Modifies product collections.
- `src/app/pengeluaran/page.tsx`: Handles expense addition.
- `src/components/Cart.tsx`: Modifies collections for checkout flows.
- `src/components/ProductList.tsx`: Uses `onSnapshot` for real-time catalog syncing.

## 6. Authentication and Authorization Flow

The application relies on Next.js `middleware.ts` to implement route protection.
- It looks for a `userRole` cookie (`"admin"` or `"cashier"`).
- Passwords for authentication are stored in environment variables (`NEXT_PUBLIC_CASHIER_PASSCODE`, `NEXT_PUBLIC_ADMIN_PASSCODE`).
- **No Firebase Authentication is used.**

## 7. Current Environment Variable Usage

Environment variables are only used for passcodes:
- `NEXT_PUBLIC_CASHIER_PASSCODE`
- `NEXT_PUBLIC_ADMIN_PASSCODE`

**Finding**: No Firebase-related environment variables are currently in use.

## 8. Security Risks & Hardcoded Configurations

**CRITICAL RISK**: Because the Firebase configuration is hardcoded to the production project (`pos-apps-80dbe`), **any developer running the application locally will directly connect to, read from, and write to the production database.**
There is currently no way to run the application in a safe, isolated development environment.

## 9. Recommended Migration Plan

1. **Environment Variables**: Extract the hardcoded Firebase configuration in `src/lib/firebase.js` to `NEXT_PUBLIC_FIREBASE_*` variables.
2. **Environment Separation**: Introduce `NEXT_PUBLIC_APP_ENV` (production, development, emulator) to explicitly determine the app's running context.
3. **Emulator Integration**: Add logic to connect the Firebase client to `connectFirestoreEmulator` when `NEXT_PUBLIC_APP_ENV=emulator`.
4. **Data Seeding**: Create a `scripts/seed.ts` utility to populate the emulator with test data for `products`, `transactions`, and `expenses`.
5. **Safety Guards**: Implement a strict denylist and UI visual indicators to ensure developers do not accidentally interact with production.

## 10. Files to be Modified

- `package.json` (add CLI scripts)
- `.env` & `example.env` (add Firebase variables)
- `src/lib/firebase.js` (refactor to `client.ts` and `env.ts`)
- `src/lib/firebase-data.ts` (update imports)
- Various `.tsx` pages (update imports)
- `src/app/layout.tsx` (add EnvBadge)
