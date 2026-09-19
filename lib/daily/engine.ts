import type { DayType, Prisma, TaskStatus, TaskType } from "@prisma/client";

export const DAILY_TASK_TYPES: TaskType[] = [
  "SLEEP",
  "DIET",
  "WATER",
  "WALKING",
  "WORKOUT",
  "CODING_BLOCK_1",
  "CODING_BLOCK_2",
];

export const NUMERIC_TASK_TYPES: TaskType[] = ["SLEEP", "WATER", "WALKING"];

export function isNumericTask(type: TaskType): boolean {
  return NUMERIC_TASK_TYPES.includes(type);
}

export function isWorkoutApplicable(dayType: DayType): boolean {
  return dayType === "TRAINING";
}

export function dayTypeFromSchedule(schedule: unknown, weekday: string): DayType {
  if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) {
    return "TRAINING";
  }

  const value = (schedule as Record<string, unknown>)[weekday];
  if (typeof value !== "string") return "TRAINING";

  const normalized = value.trim().toLowerCase();
  if (normalized.includes("full rest")) return "FULL_REST";
  if (normalized === "rest" || normalized.includes("rest")) return "REST";
  return "TRAINING";
}

export function statusFromNumericValue(value: number | null | undefined, target: number): TaskStatus {
  if (value == null || !Number.isFinite(value)) return "MISSED";
  if (target <= 0 || value >= target) return "COMPLETED";
  if (value <= 0) return "MISSED";
  return "PARTIAL";
}

export function completionFromStatuses(statuses: TaskStatus[]) {
  const applicable = statuses.filter((status) => status !== "NOT_APPLICABLE" && status !== "PLANNED_REST");
  const completedTasks = applicable.filter((status) => status === "COMPLETED").length;
  const partialTasks = applicable.filter((status) => status === "PARTIAL").length;
  const missedTasks = applicable.filter((status) => status === "MISSED").length;
  const weighted = completedTasks + partialTasks * 0.5;
  const completionPercent = applicable.length === 0
    ? 0
    : Math.min(100, Number(((weighted / applicable.length) * 100).toFixed(2)));

  return { applicableTasks: applicable.length, completedTasks, partialTasks, missedTasks, completionPercent };
}

export function targetForTask(type: TaskType, settings: {
  sleepTargetHours: Prisma.Decimal | number;
  waterTargetMl: number;
  walkingTargetSteps: number;
}) {
  switch (type) {
    case "SLEEP":
      return { value: Number(settings.sleepTargetHours), unit: "hours" };
    case "WATER":
      return { value: settings.waterTargetMl, unit: "ml" };
    case "WALKING":
      return { value: settings.walkingTargetSteps, unit: "steps" };
    default:
      return null;
  }
}
