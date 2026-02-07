-- DropForeignKey
ALTER TABLE "ClinicHistory" DROP CONSTRAINT "ClinicHistory_appointmentId_fkey";

-- AlterTable
ALTER TABLE "ClinicHistory" ALTER COLUMN "appointmentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ClinicHistory" ADD CONSTRAINT "ClinicHistory_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
