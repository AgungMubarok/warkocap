# Warkocap Kasir v2

Warkocap Kasir v2 is a mobile-first point-of-sale application built with Next.js for coffee stalls and small retail shops. This version focuses on lighter Firestore usage, better stock handling, cleaner recap screens, consistent currency formatting, and a more polished experience on both mobile and desktop.

## Highlights

- Passcode-based login with separate admin and cashier roles.
- Session-cached product catalog to avoid unnecessary repeated Firestore reads.
- Firebase (Firestore & Hosting)
- PWA Support (next-pwa)
- Firebase Local Emulator Suite support for safe development

> **Note**: For instructions on setting up a safe local development environment with Firebase, please read the [Firebase Local Development Guide](docs/FIREBASE_LOCAL_DEVELOPMENT.md).
- Stock-aware checkout that updates inventory through Firestore transactions.
- Admin product management for creating, editing, deleting, and reviewing stock.
- Expense tracking with calendar-based date filters.
- Recap dashboard with total and summary views, Excel export, and lighter range-based data loading.
- Consistent currency formatting across tables, forms, cart totals, expenses, and recap values.
- Refined v2 UI with improved modal sizing, icon-based controls, and mobile-first layouts.

## Tech Stack

- Next.js 16.2.6
- React 19.2.6
- Firebase 12.14.0
- TanStack Table 8.21.3
- Tailwind CSS 4.3.0
- TypeScript 5.9.3
- React Modal, SweetAlert2, File Saver, and SheetJS

## Environment Setup

Copy the passcode values from [example.env](example.env) into a local `.env` file.

Current environment variables:

- `NEXT_PUBLIC_ADMIN_PASSCODE`
- `NEXT_PUBLIC_CASHIER_PASSCODE`

Important notes:

- The current Firebase web configuration is defined in [src/lib/firebase.js](src/lib/firebase.js).
- The passcodes are public client-side values. Replace them before using this project in a real production environment.

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Run the production build locally:

```bash
npm run start
```

Run linting:

```bash
npm run lint
```

## How to Use

1. Open `/login` and enter either the admin or cashier passcode.
2. As a cashier, use the home page to search products, add them to the cart, and complete checkout.
3. Choose a payment method during checkout. Successful transactions will also decrease stock when stock is tracked for the item.
4. As an admin, use the product pages to add new items, edit prices, update stock, or remove products.
5. Use `/pengeluaran` to record operational expenses and review entries with date-based filters.
6. Use `/recap` to review totals, summaries, latest transactions, top products, and exported reports for the selected period.

## Firestore Read Optimization

- The product catalog is stored in session storage so repeated navigation does not keep re-reading the same Firestore collection.
- Protected screens do not mount their data-heavy views before role validation completes.
- Expense and recap pages use range-based reads instead of full collection listeners.
- The recap page only requests transactions and expenses for the active time filter.
- Checkout uses Firestore transactions so stock updates and sales records stay consistent.

## Recap Filters

The recap page supports these modes:

- Daily
- Monthly
- Yearly
- Specific date
- Date range

Date handling follows Asia/Jakarta business time, including a daily reset at 4:00 AM for day-based recap calculations.

## Main Routes

- `/login` for passcode authentication
- `/` for cashier operations and checkout
- `/pengeluaran` for expense records
- `/admin/daftar` for product listing and editing
- `/admin/tambah` for adding new products
- `/recap` for admin recap and export

## Automatic Release Tags

This repository now includes [`.github/workflows/auto-release.yml`](.github/workflows/auto-release.yml) to create Git tags and GitHub Releases automatically.

- Every push to `main` creates a new release tag.
- The first run bootstraps from the latest version found in [CHANGELOG.md](CHANGELOG.md). If no changelog version exists, it falls back to `package.json`.
- By default, version bumps work like this:
	- `BREAKING CHANGE`, `major:`, `[major]`, or `#major` => major bump
	- `feat:`, `minor:`, `[minor]`, or `#minor` => minor bump
	- any other change => patch bump
- You can also run the workflow manually from GitHub Actions and choose `patch`, `minor`, `major`, or `auto`.

Example commit messages:

- `fix: adjust floating cart visibility` => patch release
- `feat: add recap export filters` => minor release
- `major: replace auth flow with a new session model` => major release

## Recommended Validation Before Release

```bash
npm run lint
npm run build
```

If you want to verify the production server locally:

```bash
npm run start
```

Then open `http://localhost:3000` in your browser.
