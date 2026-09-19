-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'COACH');
CREATE TYPE "TaskType" AS ENUM ('SLEEP', 'DIET', 'WATER', 'WALKING', 'WORKOUT', 'CODING_BLOCK_1', 'CODING_BLOCK_2');
CREATE TYPE "TaskStatus" AS ENUM ('COMPLETED', 'PARTIAL', 'MISSED', 'PLANNED_REST', 'NOT_APPLICABLE');
CREATE TYPE "DayType" AS ENUM ('TRAINING', 'REST', 'FULL_REST');
CREATE TYPE "TokenTransactionType" AS ENUM ('DAILY_REWARD', 'MISSED_DAY_PENALTY', 'MANUAL_ADJUSTMENT', 'REFUND');
CREATE TYPE "EmailEventType" AS ENUM ('DAILY_REMINDER', 'MISSED_DAY', 'THIRTY_DAY_REPORT', 'LEVEL_UP', 'CERTIFICATE_UNLOCK');
CREATE TYPE "EmailEventStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    "challengeStartDate" DATE NOT NULL,
    "walkingTargetSteps" INTEGER NOT NULL DEFAULT 4000,
    "waterTargetMl" INTEGER NOT NULL DEFAULT 2500,
    "sleepTargetHours" DECIMAL(4,2) NOT NULL DEFAULT 8,
    "reminderHour" INTEGER NOT NULL DEFAULT 20,
    "emailDailyReminder" BOOLEAN NOT NULL DEFAULT true,
    "emailMissedDay" BOOLEAN NOT NULL DEFAULT true,
    "emailThirtyDayReport" BOOLEAN NOT NULL DEFAULT true,
    "emailLevelUp" BOOLEAN NOT NULL DEFAULT true,
    "emailCertificateUnlock" BOOLEAN NOT NULL DEFAULT true,
    "workoutSchedule" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dayType" "DayType" NOT NULL,
    "completionPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "applicableTasks" INTEGER NOT NULL DEFAULT 0,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "partialTasks" INTEGER NOT NULL DEFAULT 0,
    "missedTasks" INTEGER NOT NULL DEFAULT 0,
    "finalizedAt" TIMESTAMP(3),
    "tokensAwarded" BOOLEAN NOT NULL DEFAULT false,
    "penaltyApplied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyTask" (
    "id" TEXT NOT NULL,
    "dailyLogId" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'MISSED',
    "numericValue" DECIMAL(10,2),
    "targetValue" DECIMAL(10,2),
    "targetUnit" TEXT,
    "targetSnapshot" JSONB,
    "note" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TokenTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyLogId" TEXT,
    "amount" INTEGER NOT NULL,
    "type" "TokenTransactionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "relatedDate" DATE,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProgressReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "reportType" TEXT NOT NULL,
    "fileKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgressReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "EmailEventType" NOT NULL,
    "status" "EmailEventStatus" NOT NULL DEFAULT 'PENDING',
    "relatedDate" DATE,
    "providerId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
CREATE UNIQUE INDEX "DailyLog_userId_date_key" ON "DailyLog"("userId", "date");
CREATE UNIQUE INDEX "DailyTask_dailyLogId_type_key" ON "DailyTask"("dailyLogId", "type");
CREATE UNIQUE INDEX "TokenTransaction_idempotencyKey_key" ON "TokenTransaction"("idempotencyKey");
CREATE UNIQUE INDEX "ProgressReport_userId_periodStart_periodEnd_reportType_key" ON "ProgressReport"("userId", "periodStart", "periodEnd", "reportType");
CREATE UNIQUE INDEX "Achievement_userId_type_key" ON "Achievement"("userId", "type");

-- Lookup indexes
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "DailyLog_userId_date_idx" ON "DailyLog"("userId", "date");
CREATE INDEX "DailyLog_userId_finalizedAt_idx" ON "DailyLog"("userId", "finalizedAt");
CREATE INDEX "DailyTask_dailyLogId_status_idx" ON "DailyTask"("dailyLogId", "status");
CREATE INDEX "TokenTransaction_userId_createdAt_idx" ON "TokenTransaction"("userId", "createdAt");
CREATE INDEX "TokenTransaction_userId_relatedDate_idx" ON "TokenTransaction"("userId", "relatedDate");
CREATE INDEX "TokenTransaction_userId_type_idx" ON "TokenTransaction"("userId", "type");
CREATE INDEX "ProgressReport_userId_periodStart_periodEnd_idx" ON "ProgressReport"("userId", "periodStart", "periodEnd");
CREATE INDEX "EmailLog_userId_eventType_relatedDate_idx" ON "EmailLog"("userId", "eventType", "relatedDate");
CREATE INDEX "EmailLog_status_createdAt_idx" ON "EmailLog"("status", "createdAt");
CREATE INDEX "Achievement_userId_unlockedAt_idx" ON "Achievement"("userId", "unlockedAt");

-- Database-level invariants. Application validation remains the primary UX layer;
-- these constraints protect the persisted data if another writer bypasses the app.
ALTER TABLE "UserSettings"
  ADD CONSTRAINT "UserSettings_walkingTargetSteps_nonnegative_chk" CHECK ("walkingTargetSteps" >= 0),
  ADD CONSTRAINT "UserSettings_waterTargetMl_nonnegative_chk" CHECK ("waterTargetMl" >= 0),
  ADD CONSTRAINT "UserSettings_sleepTargetHours_range_chk" CHECK ("sleepTargetHours" >= 0 AND "sleepTargetHours" <= 24),
  ADD CONSTRAINT "UserSettings_reminderHour_range_chk" CHECK ("reminderHour" >= 0 AND "reminderHour" <= 23);

ALTER TABLE "DailyLog"
  ADD CONSTRAINT "DailyLog_completionPercent_range_chk" CHECK ("completionPercent" >= 0 AND "completionPercent" <= 100),
  ADD CONSTRAINT "DailyLog_applicableTasks_nonnegative_chk" CHECK ("applicableTasks" >= 0),
  ADD CONSTRAINT "DailyLog_completedTasks_nonnegative_chk" CHECK ("completedTasks" >= 0),
  ADD CONSTRAINT "DailyLog_partialTasks_nonnegative_chk" CHECK ("partialTasks" >= 0),
  ADD CONSTRAINT "DailyLog_missedTasks_nonnegative_chk" CHECK ("missedTasks" >= 0);

ALTER TABLE "DailyTask"
  ADD CONSTRAINT "DailyTask_numericValue_nonnegative_chk" CHECK ("numericValue" IS NULL OR "numericValue" >= 0),
  ADD CONSTRAINT "DailyTask_targetValue_nonnegative_chk" CHECK ("targetValue" IS NULL OR "targetValue" >= 0);

ALTER TABLE "ProgressReport"
  ADD CONSTRAINT "ProgressReport_period_order_chk" CHECK ("periodEnd" >= "periodStart");

-- A daily email event must be recorded at most once for a user/date/event.
-- This partial index applies only when a calendar date is present.
CREATE UNIQUE INDEX "EmailLog_userId_eventType_relatedDate_key"
  ON "EmailLog"("userId", "eventType", "relatedDate");

-- Foreign keys
ALTER TABLE "UserSettings"
  ADD CONSTRAINT "UserSettings_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DailyLog"
  ADD CONSTRAINT "DailyLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DailyTask"
  ADD CONSTRAINT "DailyTask_dailyLogId_fkey"
  FOREIGN KEY ("dailyLogId") REFERENCES "DailyLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TokenTransaction"
  ADD CONSTRAINT "TokenTransaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "TokenTransaction_dailyLogId_fkey"
  FOREIGN KEY ("dailyLogId") REFERENCES "DailyLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProgressReport"
  ADD CONSTRAINT "ProgressReport_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailLog"
  ADD CONSTRAINT "EmailLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Achievement"
  ADD CONSTRAINT "Achievement_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TokenTransaction is an append-only ledger. Rewards, penalties, refunds and
-- manual adjustments are represented by new rows rather than editing history.
CREATE OR REPLACE FUNCTION "reject_token_ledger_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'TokenTransaction rows are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "TokenTransaction_immutable_update"
BEFORE UPDATE ON "TokenTransaction"
FOR EACH ROW EXECUTE FUNCTION "reject_token_ledger_mutation"();

CREATE TRIGGER "TokenTransaction_immutable_delete"
BEFORE DELETE ON "TokenTransaction"
FOR EACH ROW EXECUTE FUNCTION "reject_token_ledger_mutation"();
