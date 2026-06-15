# Build Plan: Spreetail Shared Expenses App

This document outlines the product research, architecture, collaboration process, and engineering tradeoffs implemented during the development of the Spreetail Shared Expenses App (a Splitwise-inspired application).

---

## 1. Product Research

### Studying Splitwise
Splitwise manages shared bills and tracks who owes what. The core workflows are:
1. **Groups**: Users organize shared bills by group (e.g. flatmates, trips).
2. **Dynamic Splitting**: Bills are not always split equally. Users require multiple methods: equal splitting, exact amount allocations, percentage divisions, and relative share units.
3. **Debt Simplification**: Instead of everyone paying everyone back individually, Splitwise minimizes transactions by matching net debtors with net creditors.
4. **Settle Up / Payments**: Users record cash payments to clear outstanding debts.
5. **Real-time Discussion**: Users discuss details, receipts, or timing issues on individual bills.

### Product Assumptions
- **Closed Loop**: All participants in a group are users of the system.
- **Single Currency Balances**: All balances are displayed and calculated in a single base currency (INR) for simplicity. USD expenses are converted to INR immediately on import.
- **EQUAL Split defaults**: CSV imports represent shared group activities, split equally among all members active at the time of entry.

---

## 2. Architecture

### Tech Stack
- **Framework**: Next.js v16.2.9 (App Router)
- **Database**: PostgreSQL (hosted on Neon)
- **ORM**: Prisma v7.8.0
- **Database Query Driver**: `@prisma/adapter-pg` + `pg` connection pool
- **Styling**: Tailwind CSS v4
- **Authentication**: NextAuth.js v4.24.14
- **Components & Icons**: Lucide React + React Hot Toast
- **ESM Compiler**: tsx (for scripting/seeding)

### Database Schema Design
We designed a database model supporting:
- **User**: Authentication, sessions, and profile metadata.
- **Group**: Containers for expense history.
- **Membership**: Links users to groups with status (`ACTIVE`/`LEFT`) to allow member removal while maintaining historical split reference.
- **Expense**: Stores descriptions, amounts, paidById, group, and `isSettlement` flag.
- **ExpenseSplit**: Link expense to user share amounts.
- **Message**: Discussion logs associated with expenses.
- **ImportLog**: Audit log for CSV import validation warnings.

### API Design
- `POST /api/register` and `/api/auth/[...nextauth]` for credentials session management.
- `GET /api/groups` and `POST /api/groups` for group management.
- `GET /api/groups/[id]` for group details, expenses list, and simplified balances.
- `POST /api/groups/[id]/members` and `DELETE /api/groups/[id]/members` (Zero balance check!).
- `POST /api/groups/[id]/settle` to record payment transactions.
- `GET /api/expenses` and `POST /api/expenses` for listing and recording bills.
- `GET /api/expenses/[id]/chat` and `POST /api/expenses/[id]/chat` for comments.
- `POST /api/import` for CSV anomaly logs and database syncing.

---

## 3. AI Collaboration Process

### Instructions & Plan Evolution
1. **Analysis**: We reviewed the mock-up state and identified that the original app stored data in local memory (`useState`), had no authentication flow, no database sync, and no chat model.
2. **Driver Adapter Solution**: In Prisma v7, we encountered client-initialization errors because the default query engine binaries are removed. We installed `@prisma/adapter-pg` + `pg` and configured the cached pool singleton, resolving connection issues with Neon Postgres.
3. **Seeding & Validation**: We built `prisma/seed.ts` to register standard users (Aisha, Rohan, Priya, Meera, Sam) and verify database reads.
4. **Step-by-Step Implementation**: We incrementally built the APIs, pages, and calculators, tracking progress in `task.md` and verifying builds via `npm run build`.

---

## 4. Trade-Offs

### What We Simplified
- **Base Currency**: The engine converts all USD entries to INR at `1 USD = 83 INR`. All dashboards calculate totals in INR.
- **Equal splits on CSV import**: Bulk CSV imports splits rows equally among members of the selected group.
- **Stateless Chat Polling**: Instead of maintaining stateful WebSocket tunnels (which timeout on serverless platforms), we use a 3-second short polling interval for expense chats.

### What We Hardcoded
- Default passwords for newly invited users (`password123`).
- USD to INR exchange rate.

### What We Avoided
- Complex currency conversion matrixes.
- Third-party chat brokers (e.g. Pusher, Firebase) to avoid external runtime service dependencies.

### Future Improvements
- Email invite flows with token verification for password resets.
- OCR scanning of invoices to auto-fill expense descriptions and amounts.
- Multi-currency support with real-time exchange rate API integrations.
