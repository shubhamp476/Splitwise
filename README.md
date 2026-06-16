# Spreetail Expense App: Splitwise Clone

This project is a fully functional, database-backed Splitwise clone built as a Next.js web application. It includes user credentials authentication, shared groups, advanced bill splitting (equal, exact, percentage, share), a transaction-minimizing debt settlement algorithm, real-time chat, and CSV transaction logs import with anomaly auditing.

---

## Features

1. **Credentials Authentication**: Log in or sign up to secure your data.
2. **Dashboard Summary**: Monitor total net balance, what you owe, and what you are owed.
3. **Groups**: Create groups, invite users by email, and remove members (zero-balance checked).
4. **Expense Splitting**:
   - **Equal**: Split evenly among all members.
   - **Exact**: Enter exact currency amounts for each member.
   - **Percentage**: Split using percentage values.
   - **Share**: Split using weighted share units.
5. **Debt Simplification**: Calculate minimal payments needed to settle up.
6. **Expense Chat**: Discuss billing issues inside the app in real-time.
7. **CSV Import & Anomalies**: Upload `expenses_export.csv` to find anomalies, clean formats, and import transactions.

---

## Tech Stack

- **Core**: Next.js v16.2.9 (App Router) + React v19.2.4
- **Database**: PostgreSQL (hosted on Neon) + Prisma v7.8.0 ORM
- **Driver Adapter**: `@prisma/adapter-pg` + `pg` connection pool
- **Styling**: Tailwind CSS v4 + Lucide Icons + React Hot Toast
- **Security & Session**: NextAuth.js v4.24.14 + BcryptJS

---

## Getting Started

### Prerequisites

Ensure you have **Node.js v18+** installed.

### Setup Instructions

1. **Clone the project & Navigate to the folder**:
   ```bash
   cd spreetail-expense-app
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Database Migration**:
   Apply migrations to synchronize your Neon PostgreSQL schema:
   ```bash
   npx prisma migrate dev
   ```

4. **Seed Default Users**:
   Populate the database with default users (Aisha, Rohan, Priya, Meera, Sam):
   ```bash
   npx tsx prisma/seed.ts
   ```

5. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) (or the URL shown in the terminal) in your browser.

---

## Demo Accounts

You can test immediately using any of these seeded users:
- **Email**: `aisha@example.com` or `rohan@example.com` or `priya@example.com`
- **Password**: `password123`

---

## AI Collaboration

This application was developed in partnership with **Antigravity (Google DeepMind)**. 

### Documentation Deliverables
- **`AI_CONTEXT.md`**: Full technical architecture, schema details, API designs, and tradeoffs.
- **`BUILD_PLAN.md`**: Studied Splitwise behavior, product assumptions, and engineering decisions.
- **`SCOPE.md`**: Targets, functional requirements, in-scope features, and out-of-scope parameters.
- **`DECISIONS.md`**: Core tech selections, database driver configurations, and architectural trade-offs.
- **`AI_USAGE.md`**: AI pair-programming roles, phase-by-phase contributions, and build troubleshooting steps.

