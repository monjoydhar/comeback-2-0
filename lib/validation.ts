import { z } from "zod";

export const emailSchema = z.string().trim().email().max(254);
export const passwordSchema = z.string().min(8).max(128);

export const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const userSettingsSchema = z.object({
  timezone: z.string().min(1).max(100),
  walkingTargetSteps: z.number().int().min(0).max(100_000),
  waterTargetMl: z.number().int().min(0).max(20_000),
  sleepTargetHours: z.number().min(0).max(24),
  reminderHour: z.number().int().min(0).max(23),
  emailDailyReminder: z.boolean(),
  emailMissedDay: z.boolean(),
  emailThirtyDayReport: z.boolean(),
  emailLevelUp: z.boolean(),
  emailCertificateUnlock: z.boolean(),
  sundayWalkingMode: z.enum(["WALK", "REST"]),
});

export const numericTaskValueSchema = z.number().finite().min(0).max(100_000);

export const taskTypeSchema = z.enum([
  "SLEEP",
  "DIET",
  "WATER",
  "WALKING",
  "WORKOUT",
  "CODING_BLOCK_1",
  "CODING_BLOCK_2",
]);

export const taskStatusSchema = z.enum([
  "COMPLETED",
  "PARTIAL",
  "MISSED",
  "PLANNED_REST",
  "NOT_APPLICABLE",
]);

export const dayDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const dailyTaskUpdateSchema = z.object({
  date: dayDateSchema,
  taskType: taskTypeSchema,
  status: taskStatusSchema.optional(),
  numericValue: numericTaskValueSchema.optional(),
}).refine(
  (data) => data.status !== undefined || data.numericValue !== undefined,
  { message: "Either status or numericValue is required" },
);
