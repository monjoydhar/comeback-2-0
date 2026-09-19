import { PrismaClient } from "@prisma/client";
import { updateDailyTask } from "@/lib/daily/service";

const db = new PrismaClient();

async function main() {
  const user = await db.user.findFirst({
    include: {
      settings: true,
    },
  });

  if (!user) {
    throw new Error("TEST_USER_NOT_FOUND");
  }

  const testDate = new Date("2099-01-01T00:00:00.000Z");

  const log = await db.dailyLog.upsert({
    where: {
      userId_date: {
        userId: user.id,
        date: testDate,
      },
    },
    update: {
      finalizedAt: new Date(),
    },
    create: {
      userId: user.id,
      date: testDate,
      dayType: "TRAINING",
      finalizedAt: new Date(),
      tasks: {
        create: [
          {
            type: "SLEEP",
            status: "MISSED",
            targetValue: 8,
            targetUnit: "hours",
            targetSnapshot: {
              value: 8,
              unit: "hours",
            },
          },
          {
            type: "DIET",
            status: "MISSED",
          },
          {
            type: "WATER",
            status: "MISSED",
            targetValue: 2500,
            targetUnit: "ml",
            targetSnapshot: {
              value: 2500,
              unit: "ml",
            },
          },
          {
            type: "WALKING",
            status: "MISSED",
            targetValue: 4000,
            targetUnit: "steps",
            targetSnapshot: {
              value: 4000,
              unit: "steps",
            },
          },
          {
            type: "WORKOUT",
            status: "MISSED",
          },
          {
            type: "CODING_BLOCK_1",
            status: "MISSED",
          },
          {
            type: "CODING_BLOCK_2",
            status: "MISSED",
          },
        ],
      },
    },
  });

  try {
    await updateDailyTask({
      userId: user.id,
      dateString: "2099-01-01",
      taskType: "DIET",
      status: "COMPLETED",
    });

    throw new Error("FINALIZED_DAY_WAS_MODIFIED");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "FINALIZED_DAY_WAS_MODIFIED"
    ) {
      throw error;
    }

    if (
      !(error instanceof Error) ||
      error.message !== "DAILY_LOG_FINALIZED"
    ) {
      throw error;
    }
  }

  await db.dailyLog.delete({
    where: {
      id: log.id,
    },
  });

  console.log("Finalized-day lock test passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });