-- Añadir dirección al paciente
ALTER TABLE "Patient"
ADD COLUMN "address" TEXT;

-- Añadir motivo a la cita
ALTER TABLE "Appointment"
ADD COLUMN "reason" TEXT;
