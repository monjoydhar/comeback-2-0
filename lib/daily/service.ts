import {
  Prisma,
  type DailyLog,
  type DailyTask,
  type TaskStatus,
  type TaskType,
} from "@prisma/client";
import { db } from "@/lib/db";
import {
  parseDayDate,
  weekdayForDate,
  formatDayDate,
} from "@/lib/daily/date";
import {
  DAILY_TASK_TYPES,
  completionFromStatuses,
  dayTypeFromSchedule,
  isNumericTask,
  statusFromNumericValue,
  targetForTask,
} from "@/lib/daily/engine";

const TASK_NOTES: Partial<Record<TaskType, string>> = {
  WORKOUT: "Workout is not applicable on rest days.",
};

function decimalToNumber(value: Prisma.Decimal | null): number | null {
  return value == null ? null : Number(value);
}

function serializeTask(task: DailyTask) {
  return {
    id: task.id,
    type: task.type,
    status: task.status,
    numericValue: decimalToNumber(task.numericValue),
    targetValue: decimalToNumber(task.targetValue),
    targetUnit: task.targetUnit,
    targetSnapshot: task.targetSnapshot,
    note: task.note,
    completedAt: task.completedAt,
  };
}

function serializeLog(log: DailyLog & { tasks: DailyTask[] }) {
  return {
    id: log.id,
    date: formatDayDate(log.date),
    dayType: log.dayType,
    completionPercent: Number(log.completionPercent),
    applicableTasks: log.applicableTasks,
    completedTasks: log.completedTasks,
    partialTasks: log.partialTasks,
    missedTasks: log.missedTasks,
    finalizedAt: log.finalizedAt,
    tasks: log.tasks.map(serializeTask),
  };
}

async function findDailyLog(
  userId: string,
  date: Date
) {
  return db.dailyLog.findUnique({
    where: {
      userId_date: {
        userId,
        date,
      },
    },
    include: {
      tasks: {
        orderBy: {
          type: "asc",
        },
      },
    },
  });
}

export async function getOrCreateDailyLog(
  userId: string,
  dateString: string
) {
  const date = parseDayDate(dateString);

  const existing = await findDailyLog(userId, date);

  if (existing) {
    return serializeLog(existing);
  }

  const settings = await db.userSettings.findUnique({
    where: {
      userId,
    },
  });

  if (!settings) {
    throw new Error("USER_SETTINGS_NOT_FOUND");
  }

  if (date < settings.challengeStartDate) {
    throw new Error("DATE_BEFORE_CHALLENGE_START");
  }

  const weekday = weekdayForDate(
    dateString,
    settings.timezone
  );

  const dayType = dayTypeFromSchedule(
    settings.workoutSchedule,
    weekday
  );

  const taskRows = DAILY_TASK_TYPES.map((type) => {
    const target = targetForTask(type, settings);

    const sundayWalkingRest =
      weekday.toUpperCase() === "SUNDAY" &&
      settings.sundayWalkingMode === "REST" &&
      type === "WALKING";

    const notApplicable =
      (type === "WORKOUT" &&
        dayType !== "TRAINING") ||
      sundayWalkingRest;

    return {
      type,

      status: notApplicable
        ? sundayWalkingRest
          ? ("PLANNED_REST" as TaskStatus)
          : ("NOT_APPLICABLE" as TaskStatus)
        : ("MISSED" as TaskStatus),

      targetValue: target
        ? new Prisma.Decimal(target.value)
        : null,

      targetUnit: target?.unit ?? null,

      targetSnapshot: target
        ? {
            value: target.value,
            unit: target.unit,
          }
        : Prisma.JsonNull,

      note: sundayWalkingRest
        ? "Sunday walking is set to planned rest."
        : (TASK_NOTES[type] ?? null),
    };
  });

  const counts = completionFromStatuses(
    taskRows.map((task) => task.status)
  );

  try {
    const created = await db.dailyLog.create({
      data: {
        userId,
        date,
        dayType,
        ...counts,
        tasks: {
          create: taskRows,
        },
      },
      include: {
        tasks: {
          orderBy: {
            type: "asc",
          },
        },
      },
    });

    return serializeLog(created);
  } catch (error) {
    // Two simultaneous requests can both reach create().
    // The database unique constraint guarantees only one wins.
    // If another request created the log first, simply return it.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existingAfterRace = await findDailyLog(
        userId,
        date
      );

      if (existingAfterRace) {
        return serializeLog(existingAfterRace);
      }
    }

    throw error;
  }
}

export async function updateDailyTask(input: {
  userId: string;
  dateString: string;
  taskType: TaskType;
  status?: TaskStatus;
  numericValue?: number;
}) {
  const settings = await db.userSettings.findUnique({
    where: {
      userId: input.userId,
    },
  });

  if (!settings) {
    throw new Error("USER_SETTINGS_NOT_FOUND");
  }

  const inputDate = parseDayDate(input.dateString);

  if (inputDate < settings.challengeStartDate) {
    throw new Error("DATE_BEFORE_CHALLENGE_START");
  }

  const log = await db.dailyLog.findUnique({
    where: {
      userId_date: {
        userId: input.userId,
        date: inputDate,
      },
    },
    include: {
      tasks: true,
    },
  });

  if (!log) {
    throw new Error("DAILY_LOG_NOT_FOUND");
  }

  // A finalized day is permanently locked.
  // This check lives in the service layer so the lock
  // cannot be bypassed by calling the service directly.
  if (log.finalizedAt) {
    throw new Error("DAILY_LOG_FINALIZED");
  }

  const task = log.tasks.find(
    (item) => item.type === input.taskType
  );

  if (!task) {
    throw new Error("DAILY_TASK_NOT_FOUND");
  }

  if (
    input.taskType === "WORKOUT" &&
    log.dayType !== "TRAINING"
  ) {
    if (
      input.status &&
      input.status !== "NOT_APPLICABLE"
    ) {
      throw new Error("WORKOUT_NOT_APPLICABLE");
    }
  }

  if (isNumericTask(input.taskType)) {
    if (input.numericValue === undefined) {
      throw new Error("NUMERIC_VALUE_REQUIRED");
    }

    if (
      !Number.isFinite(input.numericValue) ||
      input.numericValue < 0
    ) {
      throw new Error("INVALID_NUMERIC_VALUE");
    }

    if (task.targetValue == null) {
      throw new Error("NUMERIC_TARGET_NOT_CONFIGURED");
    }

    const nextStatus = statusFromNumericValue(
      input.numericValue,
      Number(task.targetValue)
    );

    await db.dailyTask.update({
      where: {
        id: task.id,
      },
      data: {
        numericValue: new Prisma.Decimal(
          input.numericValue
        ),
        status: nextStatus,
        completedAt:
          nextStatus === "COMPLETED"
            ? new Date()
            : null,
      },
    });
  } else {
    if (!input.status) {
      throw new Error("STATUS_REQUIRED");
    }

    const allowed: TaskStatus[] = [
      "COMPLETED",
      "PARTIAL",
      "MISSED",
    ];

    if (
      input.taskType === "WORKOUT" &&
      log.dayType !== "TRAINING" &&
      input.status === "NOT_APPLICABLE"
    ) {
      await db.dailyTask.update({
        where: {
          id: task.id,
        },
        data: {
          status: "NOT_APPLICABLE",
          completedAt: null,
        },
      });
    } else {
      if (!allowed.includes(input.status)) {
        throw new Error("INVALID_MANUAL_STATUS");
      }

      await db.dailyTask.update({
        where: {
          id: task.id,
        },
        data: {
          status: input.status,
          completedAt:
            input.status === "COMPLETED"
              ? new Date()
              : null,
        },
      });
    }
  }

  const updatedTasks = await db.dailyTask.findMany({
    where: {
      dailyLogId: log.id,
    },
  });

  const counts = completionFromStatuses(
    updatedTasks.map((item) => item.status)
  );

  const updatedLog = await db.dailyLog.update({
    where: {
      id: log.id,
    },
    data: counts,
    include: {
      tasks: {
        orderBy: {
          type: "asc",
        },
      },
    },
  });

  return serializeLog(updatedLog);
}