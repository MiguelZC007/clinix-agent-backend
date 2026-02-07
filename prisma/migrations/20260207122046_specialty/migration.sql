/*
  Warnings:

  - A unique constraint covering the columns `[specialtyCode]` on the table `Specialty` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Specialty" ADD COLUMN     "specialtyCode" SERIAL;

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_specialtyCode_key" ON "Specialty"("specialtyCode");
