-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "registeredByDoctorId" TEXT;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_registeredByDoctorId_fkey" FOREIGN KEY ("registeredByDoctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
