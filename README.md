# Comeback 2.0 — Complete Integration Build

Private personal consistency dashboard built with Next.js App Router, TypeScript, Tailwind CSS, Auth.js credentials, Prisma/PostgreSQL, Recharts, and optional Resend email automation.

## What is included

- Premium dark-first dashboard, progress, certificate, settings, and login UI.
- Real Auth.js credentials authentication backed by the `User` table.
- User-scoped Prisma queries and protected app routes.
- Daily task engine with historical target snapshots.
- Sleep, water, walking, diet, workout, and coding-block tracking.
- Monday/Wednesday/Friday training schedule, Tuesday/Thursday/Saturday rest, Sunday full-rest workout handling.
- Sunday walking choice: Walk or planned Rest. Planned rest is excluded from the completion denominator.
- Completion scoring and 0/3/6/8/10 daily reward rules.
- Immutable token ledger with missed-day penalties and idempotent finalization.
- Levels, streaks, and 600-token certificate unlock.
- Progress charts backed by real database records.
- 30-day PDF report generation.
- Certificate PDF generation after unlock.
- Optional Resend email automation for reminders, missed days, level-ups, certificate unlocks, and 30-day reports.
- Hourly Vercel cron endpoint for timezone-aware finalization and email automation.
- JSON data export and password-confirmed account deletion.
- Prisma migrations, seed, and automated business-logic tests.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to your Neon/PostgreSQL connection string.
3. Set a long random `AUTH_SECRET`.
4. Set the seed user variables.
5. Run:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

The existing database should already contain the initial migration. The second migration adds the Sunday walking preference:

```bash
npx prisma migrate deploy
```

## Email setup

Email is intentionally safe to run without an API key. If `RESEND_API_KEY` or `RESEND_FROM_EMAIL` is blank, email delivery is skipped and daily finalization continues.

When ready:

```env
RESEND_API_KEY="your_resend_api_key"
RESEND_FROM_EMAIL="Comeback 2.0 <your-verified-address@example.com>"
APP_URL="https://your-domain.example"
```

The Resend sending domain/address must be verified in Resend before production sending.

## Cron setup

`vercel.json` schedules `/api/cron` every hour. In production set:

```env
CRON_SECRET="a-long-random-secret"
```

Vercel Cron should call the endpoint with `Authorization: Bearer <CRON_SECRET>`.

The cron uses each user's saved timezone and handles:

- previous-day finalization
- token rewards / missed-day penalties
- level-up emails
- certificate unlock emails
- daily reminders at the user's configured local hour
- 30-day report emails on each 30th challenge day

Email failures never undo a finalized day.

## PDF reports

Authenticated users can download the current 30-day report from Progress. The report is generated from persisted data. It is not medical, academic, or professional certification.

Certificate PDF download is available only after the 600 net-token achievement is unlocked.

## Database

The schema contains the user, settings, daily log/task, token ledger, report, email log, and achievement models. The token ledger uses an idempotency key and the email log uses a user/event/date uniqueness rule for duplicate protection.

Do not run `prisma migrate reset` against a real database unless you intentionally want to destroy its data.

## Testing

Business-logic tests are under `lib/**/*.test.ts` and can be run with:

```bash
npx vitest run
```

The finalization integration test uses a temporary database user and cleans it up afterward:

```bash
npm run test:daily
```

## Environment variables that may remain blank

`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `CRON_SECRET` may remain blank during local development. The application will still run; automated email and protected production cron delivery simply remain disabled until configured.
