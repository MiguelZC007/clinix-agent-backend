-- AlterTable
ALTER TABLE "Patient" ADD COLUMN "patientNumber" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Patient_patientNumber_key" ON "Patient"("patientNumber");
