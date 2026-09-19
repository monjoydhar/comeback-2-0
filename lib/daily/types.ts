import type { DayType, TaskStatus, TaskType } from "@prisma/client";

export type DailyTaskView = {
  id: string;
  type: TaskType;
  status: TaskStatus;
  numericValue: number | null;
  targetValue: number | null;
  targetUnit: string | null;
  targetSnapshot: unknown;
  note: string | null;
  completedAt: Date | null;
};

export type DailyLogView = {
  id: string;
  date: Date;
  dayType: DayType;
  completionPercent: number;
  applicableTasks: number;
  completedTasks: number;
  partialTasks: number;
  missedTasks: number;
  finalizedAt: Date | null;
  tasks: DailyTaskView[];
};
