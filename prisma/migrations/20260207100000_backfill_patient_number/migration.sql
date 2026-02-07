WITH max_existing AS (
  SELECT COALESCE(MAX("patientNumber"), 0) AS m FROM "Patient"
),
numbered AS (
  SELECT p.id, mx.m + ROW_NUMBER() OVER (ORDER BY p."createdAt", p.id) AS rn
  FROM "Patient" p
  CROSS JOIN max_existing mx
  WHERE p."patientNumber" IS NULL
)
UPDATE "Patient" p
SET "patientNumber" = numbered.rn
FROM numbered
WHERE p.id = numbered.id;
