CREATE TYPE "SundayWalkingMode" AS ENUM ('WALK', 'REST');

ALTER TABLE "UserSettings"
ADD COLUMN "sundayWalkingMode" "SundayWalkingMode" NOT NULL DEFAULT 'WALK';
