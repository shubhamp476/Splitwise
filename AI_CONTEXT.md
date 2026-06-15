# AI Context: Spreetail Shared Expenses App

This file serves as the source of truth for the entire development context, implementation decisions, database design, and architecture for the Spreetail Expense App (a Splitwise-inspired application).

---

## 1. Product Understanding & Scope

### Core Value Proposition
A simplified personal finance application to manage shared bills, record direct cash payments (settlements) between group members, simplify outstanding balances using a debt-minimization algorithm, discuss expenses in real-time, and import expenses from CSV transaction logs with automated anomaly auditing.

### Product Scope (MVP)
1. **Credentials Authentication**: Register, Login, and secure session management.
2. **Group Management**:
   - Create group, add members by email, and remove members (strictly validating that their net group balance is zero).
   - Display a list of active group members and their net balance.
   - Settle up payments: Record direct cash payments between members to clear debts.
   - Simplified debts matching: Calculate the minimal transactions needed to clear all balances.
3. **Expense Management**:
   - Add/record expenses with custom descriptions, amounts, date, paid_by, and currency (INR/USD).
   - Dynamic splits calculations: Support Equal splits, Exact splits (amount), Percentage splits, and Share splits (proportionate unit weights).
   - Discuss individual expenses via an expense-specific chat panel.
4. **CSV Import**:
   - Parse and analyze standard `expenses_export.csv` transaction logs.
   - Run audit rules to flag duplicate expenses, USD formats, precision rounding, name inconsistencies, negative amounts, or business rule anomalies (e.g., Meera charged after March, Sam charged before mid-April).
   - Select group and bulk-save parsed entries as database expenses, logging detected anomalies to `ImportLog`.

---

## 2. Tech Stack

- **Framework**: Next.js v16.2.9 (App Router, Turbopack)
- **Runtime**: Node.js v22.22.0
- **Database**: PostgreSQL (hosted on Neon)
- **ORM**: Prisma v7.8.0
- **Query Driver**: `@prisma/adapter-pg` + `pg` connection pool (required by Prisma v7's Rust-free WASM engine)
- **Styling**: Tailwind CSS v4 (using `@import "tailwindcss"` imports)
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Authentication**: NextAuth.js v4.24.14
- **CSV Parser**: PapaParse v5.5.3
- **Password Hashing**: BcryptJS v3.0.3

---

## 3. Database Schema

Defined in `prisma/schema.prisma` using PostgreSQL models:

```prisma
datasource db {
  provider = "postgresql"
}

generator client {
  provider   = "prisma-client-js"
  engineType = "library"
}

enum MembershipStatus {
  ACTIVE
  LEFT
}

enum SplitType {
  EQUAL
  EXACT
  PERCENTAGE
  SHARE
}

enum Currency {
  INR
  USD
}

model User {
  id           String         @id @default(cuid())
  name         String
  email        String         @unique
  password     String
  memberships  Membership[]
  paidExpenses Expense[]      @relation("ExpensePaidBy")
  expenseSplits ExpenseSplit[]
  messages     Message[]
  accounts     Account[]
  sessions     Session[]
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}

model Group {
  id          String       @id @default(cuid())
  name        String
  memberships Membership[]
  expenses    Expense[]
  createdAt   DateTime     @default(now())
}

model Membership {
  id       String           @id @default(cuid())
  userId   String
  groupId  String
  joinedAt DateTime
  leftAt   DateTime?
  status   MembershipStatus
  user     User             @relation(fields: [userId], references: [id])
  group    Group            @relation(fields: [groupId], references: [id])

  @@unique([userId, groupId])
}

model Expense {
  id           String         @id @default(cuid())
  description  String
  amount       Float
  currency     Currency       @default(INR)
  splitType    SplitType
  expenseDate  DateTime
  groupId      String
  paidById     String
  isSettlement Boolean        @default(false)
  group        Group          @relation(fields: [groupId], references: [id])
  paidBy       User           @relation("ExpensePaidBy", fields: [paidById], references: [id])
  splits       ExpenseSplit[]
  messages     Message[]
  createdAt    DateTime       @default(now())
}

model ExpenseSplit {
  id        String  @id @default(cuid())
  expenseId String
  userId    String
  amount    Float
  expense   Expense @relation(fields: [expenseId], references: [id])
  user      User    @relation(fields: [userId], references: [id])
}

model Message {
  id        String   @id @default(cuid())
  expenseId String
  userId    String
  content   String
  createdAt DateTime @default(now())
  expense   Expense  @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model ImportLog {
  id        String   @id @default(cuid())
  rowNumber Int
  issue     String
  action    String
  createdAt DateTime @default(now())
}
```

---

## 4. API Design

All endpoints reside in Next.js App Router API route format (`app/api/*`):

### Authentication & Profiles
- `POST /api/register`: Create a new user account (hashes passwords).
- NextAuth handles standard login/sessions at `/api/auth/[...nextauth]`.

### Groups
- `GET /api/groups`: Fetch all active groups for the current logged-in user.
- `POST /api/groups`: Create a new group. Body: `{ name, emails: string[] }`. Creates stub accounts (default password `password123`) for invited emails who are not yet registered.
- `GET /api/groups/[id]`: Returns group metadata, sorted expenses history, net member balances, and simplified debt transactions.
- `POST /api/groups/[id]/members`: Invites a member to the group by email.
- `DELETE /api/groups/[id]/members`: Set membership status to `LEFT` (Zero-balance checked!).
- `POST /api/groups/[id]/settle`: Record a payment from `fromId` to `toId`. Creates an exact split settlement entry.

### Expenses & Chat
- `GET /api/expenses`: Retrieve all expenses in groups of the user.
- `POST /api/expenses`: Record a new expense. Expects pre-calculated split values in `{ splits: { userId, value }[] }`.
- `GET /api/expenses/[id]/chat`: Fetch discussion messages.
- `POST /api/expenses/[id]/chat`: Send a comment.

### Bulk Import
- `POST /api/import`: Processes CSV raw data rows. Validates, rounds, maps names, saves expenses, and creates database records in `ImportLog` for audits.

---

## 5. Key Algorithms & Implementation Decisions

### Debt Minimization (Simplify Debts)
We implement the classic Splitwise balance optimization algorithm:
1. For each group member, calculate: `Net Balance = Total Paid - Total Owed`.
2. Group users into **Debtors** (`Net < -0.01`) and **Creditors** (`Net > 0.01`).
3. Sort Debtors ascending (most negative first) and Creditors descending (most positive first).
4. Match the largest debtor with the largest creditor:
   - Settle `min(abs(Debtor.Net), Creditor.Net)`.
   - Record the transaction.
   - Adjust both nets, update pointers, and repeat until all nets are zero.

This reduces the total number of transactions needed to clear all balances.

### Real-Time Chat Polling
To avoid serverless function timeout issues with persistent WebSockets or SSE connections on serverless platforms, we implemented client-side **short polling** (interval of 3 seconds) that queries `/api/expenses/[id]/chat`. This provides robust, stateless, real-time message streams.

---

## 6. Trade-Offs & Decisions

1. **Client-Side Calculations for Advanced Splits**: The split calculations (e.g. converting percentage shares or weighted unit shares to exact currency splits) are evaluated dynamically on the front-end forms to show instant feedback previews before saving.
2. **Stub Account Invitations**: Inviting members by email automatically provisions stub user records in the DB with default password `password123`. This allows adding users who are not yet registered, making the app immediately interactive.
3. **Database-backed Import logs**: Anomaly logs are written directly to Neon Postgres (`ImportLog`) rather than just bailing or dropping rows. This meets strict auditing and validation requirements.
4. **Currency Conversions**: USD amounts in CSV uploads are converted using a hardcoded exchange rate of `1 USD = 83 INR`.

---

## 7. Known Limitations

- Real-time updates depend on client-side polling.
- Passwords for stub/invited users are set to a default value (`password123`). In production, this would trigger an email invite linking to an onboarding/password reset flow.
