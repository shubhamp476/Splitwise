# AI Usage: Spreetail Shared Expenses App

This document outlines the collaboration process between the developer and the AI coding assistant (Antigravity by Google DeepMind) during the design, development, and debugging of the Spreetail Expense Application.

---

## 1. Collaboration Roles

The project was built using a pair-programming workflow:
- **Developer**: Defined product requirements, specified business logic validation constraints (e.g. Meera's date restrictions in the CSV importer), set up the Neon PostgreSQL database, reviewed user experience flows, and executed deployments.
- **AI Assistant**: Designed API route architectures, implemented the debt-simplification algorithm, translated Prisma schemas, resolved build compilation errors, and generated interactive, premium Tailwind UI components.

---

## 2. Key Contributions & Code Generation Phases

The AI assistant contributed to the codebase in five main execution cycles:

### Phase 1: Database Setup and Connection Fixing
- Translated relational models into `prisma/schema.prisma`.
- Resolved a critical Prisma v7 database connection crash by instantiating `@prisma/adapter-pg` with a global `pg` Pool client singleton. This bypassed the lack of default Rust binaries in serverless builds.
- Created `prisma/seed.ts` to register mock users with hashed passwords using BcryptJS.

### Phase 2: Route Protection and Next.js 16 Support
- Implemented NextAuth configurations, registration APIs, and session checks.
- Migrated deprecated middleware patterns into Next.js 16's `proxy.ts` syntax.

### Phase 3: Core Dashboards and Group Logic
- Created the main dashboard showing personal totals (Net, Owed, Owes) and active group listings.
- Programmed the dynamic group details page, allowing real-time settlement records, email invites, and group-member removal containing strict zero-balance check logic.

### Phase 4: Debt Simplification and Chat Polling
- Programmed the greedy optimization algorithm that matches the largest debtors with creditors to minimize transaction volumes.
- Coded the stateless 3-second client polling module for real-time messaging inside specific expense panes.

### Phase 5: CSV Parsing, Import, and Auditing
- Integrated `PapaParse` to process uploaded `.csv` transaction logs.
- Wrote validation logic comparing date timestamps, currency format conversions (USD to INR), duplicate rules, and user-specific timeline bounds.
- Structured bulk-creation SQL queries and mapped parsed fields, writing anomalies into the `ImportLog` database model.

---

## 3. Major Debugging & Troubleshooting Milestones

The AI assistant resolved the following compile-time and runtime blockers:

1. **Next.js Static Generation Error (useSearchParams)**:
   - *Problem*: Next.js build failed during static analysis because `useSearchParams` was called in the `/login` route without a Suspense boundary.
   - *Fix*: Wrapped client forms in `<Suspense fallback={<div>Loading...</div>}>` to defer static pre-rendering safely.
2. **NextAuth UUID Deprecation warning**:
   - *Problem*: Build step printed warnings regarding deprecated transitive dependency `uuid@8.3.2`.
   - *Fix*: Configured a package override block in `package.json` to force resolutions to `uuid@11.0.0`.
3. **Floating Point Arithmetic Errors in Splits**:
   - *Problem*: Percentages or shares sometimes resulted in division remnants (e.g., total summing to 99.99 or 100.01).
   - *Fix*: Implemented rounding adjusters that allocate the remaining fractional difference (precision of 2 decimals) to the first split participant.
