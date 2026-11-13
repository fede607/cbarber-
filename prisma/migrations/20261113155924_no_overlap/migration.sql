-- Garantía a nivel de base de datos: dos citas activas nunca pueden solaparse.
-- Aunque dos peticiones lleguen a la vez, PostgreSQL rechaza la segunda (error 23P01).
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_valid_range" CHECK ("endsAt" > "startsAt");

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_no_overlap"
  EXCLUDE USING gist (tstzrange("startsAt", "endsAt", '[)') WITH &&)
  WHERE (status IN ('PENDING', 'COMPLETED'));

ALTER TABLE "TimeBlock"
  ADD CONSTRAINT "TimeBlock_valid_range" CHECK ("endsAt" > "startsAt");

ALTER TABLE "WeeklyHours"
  ADD CONSTRAINT "WeeklyHours_valid" CHECK (
    weekday BETWEEN 0 AND 6
    AND "openMin" >= 0 AND "closeMin" <= 1440 AND "closeMin" > "openMin"
    AND (("breakStartMin" IS NULL AND "breakEndMin" IS NULL)
      OR ("breakStartMin" >= "openMin" AND "breakEndMin" <= "closeMin" AND "breakEndMin" > "breakStartMin"))
  );

ALTER TABLE "Service"
  ADD CONSTRAINT "Service_valid" CHECK ("priceCents" >= 0 AND "durationMin" BETWEEN 5 AND 480);

ALTER TABLE "Setting"
  ADD CONSTRAINT "Setting_singleton" CHECK (id = 1);
