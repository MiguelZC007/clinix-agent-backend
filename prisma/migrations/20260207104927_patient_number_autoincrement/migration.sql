/*
  Warnings:

  - Made the column `patientNumber` on table `Patient` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
CREATE SEQUENCE patient_patientnumber_seq;
ALTER TABLE "Patient" ALTER COLUMN "patientNumber" SET NOT NULL,
ALTER COLUMN "patientNumber" SET DEFAULT nextval('patient_patientnumber_seq');
ALTER SEQUENCE patient_patientnumber_seq OWNED BY "Patient"."patientNumber";

DO $$
BEGIN
  IF (SELECT MAX("patientNumber") FROM "Patient") IS NOT NULL THEN
    PERFORM setval('patient_patientnumber_seq', (SELECT MAX("patientNumber") FROM "Patient"));
  END IF;
END $$;
