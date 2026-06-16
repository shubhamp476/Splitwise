# Product Scope: Spreetail Shared Expenses App

This document details the boundaries, functional requirements, and target goals of the Spreetail Expense Application.

---

## 1. Product Objectives
The Spreetail Shared Expenses App is a Splitwise-inspired clone designed to help groups of users manage, split, and settle shared bills. The target objective is to simplify group finance management by offering a transparent interface for tracking expenditures, reducing transactions through smart debt minimization, and auditing transaction logs via CSV upload.

---

## 2. In-Scope Features

The initial release (MVP) encompasses the following core features:

### A. Authentication & User Profile
- **Security**: Password hashing using `bcryptjs`.
- **Session Management**: Credentials-based registration, login, and secure sessions powered by `NextAuth.js`.
- **Initial Directory (Seeding)**: Auto-provisioning of standard mock accounts (`Aisha`, `Rohan`, `Priya`, `Meera`, and `Sam`) to allow immediate cross-testing.

### B. Group Management
- **Collaboration**: Create group workspaces for tracking shared expenses.
- **Invites**: Invite members by email. If the invited email does not exist in the database, a stub account is created with a default password (`password123`) to allow immediate inclusion in splits.
- **Soft Delete/Leave**: Allow members to leave the group.
  - *Strict Validation*: A user can only leave if their net group balance is exactly `0.00`. This prevents leaving while owing money or being owed money.
- **Real-Time Net Balance View**: Shows the exact amount each member has paid, owes, and their net position within the group.

### C. Advanced Expense Splitting
- **Details**: Expenses can have descriptions, amounts, base currencies (INR/USD), and dates.
- **Split Types**:
  1. **Equal Splits**: Divides the total cost equally among all group members.
  2. **Exact Splits**: Allows assigning exact individual decimal values (e.g., User A owes ₹100, User B owes ₹50). Must sum up to the total expense amount.
  3. **Percentage Splits**: Divides expenses by assigning percentages (e.g., User A owes 60%, User B owes 40%). Must sum to exactly 100%.
  4. **Share Splits**: Divides expenses using relative unit weights (e.g., User A has 2 shares, User B has 1 share; splits in a 2:1 ratio).
- **Form Previews**: Client-side forms dynamically recalculate exact split amounts in real-time as users edit percentages, shares, or exact figures.

### D. Simplified Debt Settlement
- **Algorithm**: A greedy debt-minimization algorithm matches the group's largest debtors with the largest creditors to compute the minimum number of direct peer-to-peer payments required.
- **Settlement Recording**: A "Settle Up" action allows recording direct cash payments from a debtor to a creditor, registering them as a special `isSettlement: true` expense, which clears the respective debt.

### E. Contextual Chat & Discussion
- **Chat Panel**: A dedicated chat pane inside every expense detail page.
- **Updates**: A stateless short-polling mechanism (3-second interval) queries messages on serverless endpoints, avoiding WebSocket socket-limit issues while keeping conversations live.

### F. CSV Transaction Import & Auditing
- **PapaParse CSV Processing**: Clients upload standard CSV transaction logs.
- **Audit Rules & Validations**:
  - Flag duplicates based on matching dates, descriptions, and amounts.
  - Automatically detect and convert USD amounts to INR using a standard `1 USD = 83 INR` conversion.
  - Log audit anomalies to Neon PostgreSQL (`ImportLog`) for inspection.
  - Check timeline business logic constraints (e.g., flagging if Sam is charged before mid-April or Meera after March).
- **Database Synchronization**: Preview transactions and bulk-save audited entries to the target group.

---

## 3. Out-of-Scope Features (Post-MVP)

The following items are explicitly excluded from the current application scope:

- **Third-Party Payment Gateways**: The app does not support actual money transfers (e.g., UPI, Stripe, PayPal, Venmo). All settlements represent physical cash transactions logged manually.
- **Dynamic Exchange Rate Feeds**: Foreign exchange conversions (USD/INR) use a fixed multiplier rather than contacting real-time forex rate APIs.
- **OCR Receipt Scanning**: Users must type expense names and amounts manually. Automatic image/PDF text extraction (OCR) is not supported.
- **Role-Based Access Control**: All group members are peers. There are no admins or moderators; any active member can record expenses, delete/settle balances, or invite others.
- **Multi-Currency Graph Settlements**: Complex group balances involving multiple outstanding currency balances are not supported. All calculations are consolidated into a single base currency (INR).
