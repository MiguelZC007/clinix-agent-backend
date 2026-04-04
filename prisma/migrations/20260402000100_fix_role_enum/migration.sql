-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PATIENT', 'DOCTOR', 'ADMIN');

-- AlterTable - convert role column from TEXT to Role enum
-- Step 1: Drop default
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

-- Step 2: Convert column type
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING ("role"::"Role");

-- Step 3: Set default again (as Role enum)
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'PATIENT'::"Role";