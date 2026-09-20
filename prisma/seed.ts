import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const workoutSchedule = {
  MONDAY: "Strength A",
  TUESDAY: "Rest",
  WEDNESDAY: "Strength B",
  THURSDAY: "Rest",
  FRIDAY: "Strength C",
  SATURDAY: "Rest",
  SUNDAY: "Full Rest",
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for database seeding.`);
  }
  return value;
}

function parseSeedDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("SEED_CHALLENGE_START_DATE must use YYYY-MM-DD format.");
  }

  return new Date(`${value}T00:00:00.000Z`);
}

async function main() {
  const name = requiredEnv("SEED_USER_NAME");
  const email = requiredEnv("SEED_USER_EMAIL").toLowerCase();
  const password = requiredEnv("SEED_USER_PASSWORD");
  const challengeStartDate = parseSeedDate(
    process.env.SEED_CHALLENGE_START_DATE ?? "2026-09-20",
  );

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
   update: { name, passwordHash },
    create: {
      name,
      email,
      passwordHash,
      role: UserRole.USER,
      settings: {
        create: {
          timezone: "Asia/Dhaka",
          challengeStartDate,
          walkingTargetSteps: 4000,
          waterTargetMl: 2500,
          sleepTargetHours: 8,
          reminderHour: 21,
          workoutSchedule,
          sundayWalkingMode: "WALK",
        },
      },
    },
    include: { settings: true },
  });

  if (!user.settings) {
    await prisma.userSettings.create({
      data: {
        userId: user.id,
        timezone: "Asia/Dhaka",
        challengeStartDate,
        walkingTargetSteps: 4000,
        waterTargetMl: 2500,
        sleepTargetHours: 8,
        reminderHour: 21,
        workoutSchedule,
        sundayWalkingMode: "WALK",
      },
    });
  }

  console.log(`Seeded foundation user: ${user.email}`);
  console.log("Existing user settings are preserved; only missing settings are created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
