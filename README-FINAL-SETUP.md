# Comeback 2.0 — Verified Setup Checklist

This package contains the completed application systems plus the final reliability/UI fixes. The existing visual direction is preserved; the Progress page has been repaired and refined without redesigning the rest of the app.

## 1. Create environment file

Copy:

`.env.example` → `.env`

Fill these first:

```env
DATABASE_URL="YOUR_NEON_CONNECTION_STRING"
AUTH_SECRET="YOUR_LONG_RANDOM_SECRET"
SEED_USER_NAME="Your Name"
SEED_USER_EMAIL="your-email@example.com"
SEED_USER_PASSWORD="your-password"
SEED_CHALLENGE_START_DATE="2026-09-20"
```

Do not send the values of `DATABASE_URL`, `AUTH_SECRET`, or the password to anyone.

## 2. Install

```bash
npm install
```

## 3. Generate Prisma Client

```bash
npx prisma generate
```

## 4. Apply database migrations

This is important because the final package includes the required Sunday walking migration and the reminder-default migration.

```bash
npx prisma migrate deploy
```

This does not reset the database. It applies only the pending schema/default changes, including `sundayWalkingMode` and the 9 PM reminder default for new settings.

## 5. Seed the configured account

```bash
npx prisma db seed
```

Existing settings are preserved. Missing settings are created with the Comeback 2.0 defaults.

## 6. Start locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## 7. Email setup — add these when you are ready

The email engine and all five required event types are already wired into the application. You only need to provide the credentials/configuration in `.env`.

For local development you can leave the Resend values blank. Email delivery will be skipped without blocking the rest of the application.

```env
RESEND_API_KEY="YOUR_RESEND_API_KEY"
RESEND_FROM_EMAIL="Comeback 2.0 <your-verified-sender@example.com>"
APP_URL="http://localhost:3000"
```

For production, change `APP_URL` to the real deployed URL and use a sender address/domain that Resend has verified.

The application already handles:

- Daily reminder only when applicable tasks remain incomplete
- Missed-day notification after automatic finalization
- Level-up notification
- Certificate-unlock notification
- 30-day PDF report email
- One event per user/date with safe retry after a failed delivery
- EmailLog records for delivery status/errors

## 8. Cron setup — required for automatic finalization

Add a random secret:

```env
CRON_SECRET="YOUR_RANDOM_CRON_SECRET"
```

`vercel.json` already schedules `/api/cron` every hour.

The cron endpoint now:

1. Uses each user's timezone.
2. Creates a missing previous-day log when necessary.
3. Finalizes that day exactly once.
4. Applies rewards or missed-day penalties.
5. Detects genuinely new certificate unlocks only once.
6. Sends the configured email events safely.
7. Sends the daily reminder only when an applicable task remains incomplete.

Email failures are recorded and do not block daily finalization.

## 9. Test commands

Business-logic tests:

```bash
npx vitest run
```

Finalization integration test:

```bash
npm run test:daily
```

Database status:

```bash
npx prisma migrate status
```

Database browser:

```bash
npx prisma studio
```

## 10. First-run verification

Run these commands in this order:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma migrate status
npx prisma db seed
npm run dev
```

Then open `http://localhost:3000` and sign in with the `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` values from your `.env`.

If the account was created by an older package and its reminder hour is still 20, open **Settings → Reminder hour** and set it to **21** (9 PM local time). New settings now default to 21.

## 11. Final manual test

- Log in with the seeded account.
- Open Dashboard.
- Confirm the real user name is shown.
- Confirm there are no old demo token values.
- On/after September 20, create today's log by interacting with a task.
- Enter water, sleep, and walking values and refresh the page.
- Confirm values survive refresh.
- Check Progress and confirm the history comes from database records.
- Change Settings and refresh.
- Test Sunday walking as Walk and Rest on an actual Sunday date if needed.
- Download the 30-day PDF.
- When 600 net tokens are reached, download the certificate.
- Test data export.
- Do not test account deletion on an account whose data you still need unless you intend to delete it.

## 12. Production deployment

Deploy the repository to Vercel, configure the environment variables in the Vercel project, and deploy.

Do not put secrets in source code.

After deployment, verify:

```bash
npx prisma migrate status
```

against the production database and confirm the application can log in.
