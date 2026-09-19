# Comeback 2.0 — Database Stage

This stage makes the existing backend database layer deployable without redesigning the approved frontend or rewriting the existing backend business logic.

## Database scope

- PostgreSQL / Neon-compatible Prisma schema.
- User and role data for multi-user authorization.
- Per-user settings with challenge start date and configurable targets.
- Daily logs and immutable daily task rows.
- Historical target snapshots on daily tasks.
- Append-only token transaction ledger with idempotency protection.
- Progress report records with duplicate-period protection.
- Email event log with per-user/event/date duplicate protection.
- Achievement records with one achievement of each type per user.
- Foreign keys, cascade behavior, indexes, uniqueness constraints, and database-level range checks.
- Database trigger protection against updating or deleting token-ledger rows.
- Seed script that takes the seed identity from environment variables and never requires a real password in source control.

## Fresh database

1. Copy `.env.example` to `.env.local` (or `.env` for local CLI use).
2. Set `DATABASE_URL` to your PostgreSQL/Neon connection string.
3. Set `SEED_USER_NAME`, `SEED_USER_EMAIL`, and `SEED_USER_PASSWORD`.
4. Optionally set `SEED_CHALLENGE_START_DATE` (defaults to `2026-09-20`).
5. Run:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

For a deployment/CI environment where migrations already exist:

```bash
npm run db:generate
npm run db:migrate:deploy
```

## Important behavior

- Past daily records keep their stored target snapshots; changing current settings does not rewrite those snapshots.
- Token history is append-only. A correction should be represented by a new `REFUND` or `MANUAL_ADJUSTMENT` transaction rather than changing an existing transaction.
- `DailyLog` is uniquely identified by `(userId, date)`.
- A daily log has at most one row for each `TaskType`.
- A report is unique per user, period, and report type.
- A user can have only one achievement of a given type.
- Daily email events use `(userId, eventType, relatedDate)` for duplicate protection when a related calendar date is present.

## Existing backend compatibility

The database stage intentionally preserves the existing Prisma model names, enum names, field names, relations, and query shapes already used by the backend. No frontend redesign or business-rule rewrite is part of this stage.
