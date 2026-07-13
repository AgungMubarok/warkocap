# Changelog

All notable changes to this project are documented in this file.

## Unreleased

### Changed

- Migrated business-day cutoff from 04:00 WIB to 00:00 WIB.
- Centralized business-time configuration to `src/lib/business-time.ts` for easy future cutoff changes. Warkocap continues to use `Asia/Jakarta` time zone.

## 2.0.0 - 2026-05-31

### Added

- Stock-status filter on the Admin Daftar Produk page to easily sort products by availability (Tersedia, Stok Rendah, Stok Habis).
- Centralized stock normalization and categorization rules, ensuring products without tracked stock are consistently treated as available.
- Product stock support across the catalog, admin create flow, admin edit flow, and checkout.
- Session-backed catalog caching to reduce repeated Firestore reads.
- Shared data helpers for transaction and expense queries by time range.
- Expense filtering by calendar dates.
- Expanded recap filters for daily, monthly, yearly, specific date, and date range modes.
- Centralized `Asia/Jakarta` timezone enforcement across all features using `date-fns-tz`.
- Implemented a strict 00:00 WIB cutoff for all business day logic (originally 4:00 AM), resolving inconsistent date boundaries on the recap and expense pages.
- Added automatic, background UI refresh when the 00:00 rollover occurs.
- Excel export for recap data.
- Shared currency parsing and formatting helpers for forms and UI output.
- Shared SVG icons for sorting, pagination, and accordion-style toggles.

### Changed

- Upgraded the core stack to Next.js 16.2.6, React 19.2.6, Firebase 12.14.0, Tailwind CSS 4.3.0, and TypeScript 5.9.3.
- Replaced `next lint` with a flat ESLint configuration and `eslint .`.
- Refreshed the cashier, product, expense, login, header, and recap screens with the mobile-first v2 design system.
- Split recap into clearer total and summary views with lighter panel-based navigation.
- Standardized currency presentation across create, edit, table, cart, expense, and recap flows.
- Reworked modal sizing so each dialog controls its own width and spacing instead of relying on one global size.
- Replaced text-based arrows and accordion characters with icon-based controls for a cleaner interface.

### Fixed

- Fixed header hydration mismatch when reading the current user role.
- Fixed protected page rendering so private screens do not mount and trigger data reads before authorization finishes.
- Fixed heavy Firestore access patterns that previously contributed to quota pressure on login and reporting flows.
- Fixed expense page breakage introduced during the larger recap and performance refactor.
- Fixed modal layout issues caused by shared React Modal styling overrides.

### Performance

- Reduced repeated reads on cashier and admin product screens through session cache usage.
- Replaced broad collection fetches on expense and recap pages with range-based loading.
- Limited recap requests to the active filter window instead of loading unnecessary data.
- Kept stock synchronization and cache invalidation targeted to the relevant product changes.

### Documentation

- Rewrote the README and changelog in English to match the current v2 feature set and release scope.