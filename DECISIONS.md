# Technical Decisions: Spreetail Shared Expenses App

This document outlines the architectural decisions, tech stack choices, and engineering trade-offs made during the development of the Spreetail Expense Application.

---

## 1. Next.js 16 and proxy.ts Routing Proxy
- **Decision**: Adopt the Next.js 16 framework (App Router) and migrate route middleware checks.
- **Rationale**: Next.js 16 officially deprecates the traditional `middleware.ts` structure in favor of a `proxy.ts` configuration. To align with modern conventions and resolve deployment warnings, we decoupled NextAuth session checking into a `proxy.ts` file that manages route verification and redirection seamlessly.

---

## 2. Prisma v7 with @prisma/adapter-pg
- **Decision**: Avoid relying on the default Rust binary query engine of older Prisma versions and use Prisma v7's WASM engine with `@prisma/adapter-pg` and `pg`.
- **Rationale**: Prisma v7's Rust-free WASM query engine does not ship with native query engine binary files, meaning standard `new PrismaClient()` calls fail without setting up a driver adapter when connecting to hosted PostgreSQL databases like Neon. We implemented a centralized Prisma client instance using the `pg` Pool driver adapter:
  ```typescript
  import { Pool } from 'pg';
  import { PrismaPg } from '@prisma/adapter-pg';
  import { PrismaClient } from '@prisma/client';

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  export const prisma = globalThis.prisma || new PrismaClient({ adapter });
  ```
- **Trade-off**: This adds a dependency on native `pg` pools, but guarantees instant connection handling and prevents cold-start exhaustion on serverless environments.

---

## 3. Stateless Chat Polling over WebSockets
- **Decision**: Use 3-second client short-polling (`/api/expenses/[id]/chat`) rather than persistent connections (Socket.io, SSE, or WebSockets).
- **Rationale**: Hosted serverless functions (like Vercel or Neon connection layers) have strict execution timeout limits and fail to maintain long-lived WebSocket connections without a third-party pub-sub provider (such as Pusher or Firebase). Implementing stateless short-polling provides robust, scalable real-time chat with no single point of failure or connection exhaustion, operating inside the boundaries of serverless functions.

---

## 4. Stub User Provisioning for Emails
- **Decision**: Automatically create stub user records with a default password (`password123`) when adding non-existent emails to groups.
- **Rationale**: If users had to sign up before they could be included in a shared bill, group creation would be blocked. Creating stub accounts allows groups to split bills immediately. When a new user registers with that email, they claim the account by setting their own password.
- **Trade-off**: Password strength is deferred until registration. In a commercial environment, this would trigger an email invite linking to an onboarding screen.

---

## 5. Single Base Currency (INR) and Conversion on Input
- **Decision**: Standardize all database calculations and summaries to a single currency (INR) and convert USD inputs immediately using a static exchange rate (`1 USD = 83 INR`).
- **Rationale**: Allowing multiple currencies in outstanding group balances requires complex multi-currency graph-traversal algorithms and live currency exchange API calls. Converting everything to a single base currency on entry simplifies calculations and provides a clear, unified view of overall balances and settlements.

---

## 6. DB-Backed CSV Import and Anomaly Logs
- **Decision**: Store CSV import audit logs in a dedicated database table (`ImportLog`) rather than returning them solely in client responses or console logging.
- **Rationale**: Storing anomalies (e.g. duplicate rows, date discrepancies, custom timing rules violated by Sam or Meera) ensures auditability. Administrators or users can inspect previous logs, and it guarantees transparency for all processed batches.

---

## 7. Package.json Transitive Overrides for uuid
- **Decision**: Declare a package override block in `package.json` to force transitive dependencies to resolve to `uuid@11`.
  ```json
  "overrides": {
    "uuid": "^11.0.0"
  }
  ```
- **Rationale**: Under NextAuth and legacy node packages, warnings about deprecated `uuid@8.3.2` were blocking automated deploy tasks. Declaring this override suppresses compile-time warnings and guarantees compatibility with ESM loaders.
