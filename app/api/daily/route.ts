import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

import {
  dayDateSchema,
  taskStatusSchema,
  taskTypeSchema,
  numericTaskValueSchema,
} from "@/lib/validation";

import {
  getOrCreateDailyLog,
  updateDailyTask,
} from "@/lib/daily/service";

import { db } from "@/lib/db";

import {
  isCodingBlockType,
  isWithinCodingWindow,
} from "@/lib/daily/coding-windows";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const date = new URL(request.url).searchParams.get("date");

  const parsedDate = dayDateSchema.safeParse(date);

  if (!parsedDate.success) {
    return NextResponse.json(
      { error: "date must be YYYY-MM-DD" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      await getOrCreateDailyLog(
        session.user.id,
        parsedDate.data,
      ),
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "USER_SETTINGS_NOT_FOUND"
    ) {
      return NextResponse.json(
        { error: "User settings not found" },
        { status: 404 },
      );
    }

    if (
      error instanceof Error &&
      error.message === "DATE_BEFORE_CHALLENGE_START"
    ) {
      return NextResponse.json(
        { error: "Date is before the challenge start date" },
        { status: 400 },
      );
    }

    console.error(error);

    return NextResponse.json(
      { error: "Unable to load daily log" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const body = await request
    .json()
    .catch(() => null) as Record<string, unknown> | null;

  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const date = dayDateSchema.safeParse(body.date);

  const taskType = taskTypeSchema.safeParse(body.taskType);

  const status =
    body.status === undefined
      ? undefined
      : taskStatusSchema.safeParse(body.status);

  const numericValue =
    body.numericValue === undefined
      ? undefined
      : numericTaskValueSchema.safeParse(body.numericValue);

  if (!date.success || !taskType.success) {
    return NextResponse.json(
      { error: "Invalid date or taskType" },
      { status: 400 },
    );
  }

  if (status && !status.success) {
    return NextResponse.json(
      { error: "Invalid status" },
      { status: 400 },
    );
  }

  if (numericValue && !numericValue.success) {
    return NextResponse.json(
      { error: "Invalid numericValue" },
      { status: 400 },
    );
  }

  try {
    /*
     * Coding blocks are server-time-window controlled.
     *
     * The server loads the user's timezone from UserSettings,
     * then checks the current instant against the configured
     * local coding window.
     */
    if (isCodingBlockType(taskType.data)) {
      const settings = await db.userSettings.findUnique({
        where: {
          userId: session.user.id,
        },
        select: {
          timezone: true,
        },
      });

      if (!settings) {
        return NextResponse.json(
          { error: "USER_SETTINGS_NOT_FOUND" },
          { status: 404 },
        );
      }

      const allowed = isWithinCodingWindow({
        type: taskType.data,
        localDate: date.data,
        timezone: settings.timezone,
        now: new Date(),
      });

      if (!allowed) {
        return NextResponse.json(
          {
            error: "CODING_BLOCK_OUTSIDE_TIME_WINDOW",
          },
          { status: 400 },
        );
      }
    }

    const result = await updateDailyTask({
      userId: session.user.id,
      dateString: date.data,
      taskType: taskType.data,
      status: status?.data,
      numericValue: numericValue?.data,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "UNKNOWN";

    const clientErrors = new Set([
      "DAILY_LOG_NOT_FOUND",
      "USER_SETTINGS_NOT_FOUND",
      "DATE_BEFORE_CHALLENGE_START",
      "DAILY_TASK_NOT_FOUND",
      "WORKOUT_NOT_APPLICABLE",
      "NUMERIC_VALUE_REQUIRED",
      "INVALID_NUMERIC_VALUE",
      "NUMERIC_TARGET_NOT_CONFIGURED",
      "STATUS_REQUIRED",
      "INVALID_MANUAL_STATUS",
      "DAILY_LOG_FINALIZED",
      "CODING_BLOCK_OUTSIDE_TIME_WINDOW",
    ]);

    if (clientErrors.has(message)) {
      return NextResponse.json(
        { error: message },
        { status: 400 },
      );
    }

    console.error(error);

    return NextResponse.json(
      { error: "Unable to update daily task" },
      { status: 500 },
    );
  }
}