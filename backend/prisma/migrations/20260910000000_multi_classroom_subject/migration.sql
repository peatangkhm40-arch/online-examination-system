-- Subject-scoped classrooms + multi-classroom student membership + LINE token

ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "line_notify_token" TEXT;

ALTER TABLE "teacher_classrooms" ADD COLUMN IF NOT EXISTS "subject_id" TEXT;
ALTER TABLE "teacher_classrooms" ADD COLUMN IF NOT EXISTS "grade_level" TEXT;

UPDATE "teacher_classrooms"
SET "grade_level" = "name"
WHERE "grade_level" IS NULL OR "grade_level" = '';

ALTER TABLE "teacher_classrooms" ALTER COLUMN "grade_level" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "teacher_classrooms"
    ADD CONSTRAINT "teacher_classrooms_subject_id_fkey"
    FOREIGN KEY ("subject_id") REFERENCES "teacher_subjects"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "student_classrooms" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "classroom_id" TEXT NOT NULL,
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_classrooms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "student_classrooms_student_id_classroom_id_key"
  ON "student_classrooms"("student_id", "classroom_id");

CREATE INDEX IF NOT EXISTS "student_classrooms_classroom_id_idx"
  ON "student_classrooms"("classroom_id");

DO $$ BEGIN
  ALTER TABLE "student_classrooms"
    ADD CONSTRAINT "student_classrooms_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "students"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "student_classrooms"
    ADD CONSTRAINT "student_classrooms_classroom_id_fkey"
    FOREIGN KEY ("classroom_id") REFERENCES "teacher_classrooms"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Migrate existing primary classroom memberships
INSERT INTO "student_classrooms" ("id", "student_id", "classroom_id", "joined_at")
SELECT
  gen_random_uuid()::text,
  s."id",
  s."joined_classroom_id",
  CURRENT_TIMESTAMP
FROM "students" s
WHERE s."joined_classroom_id" IS NOT NULL
ON CONFLICT ("student_id", "classroom_id") DO NOTHING;

CREATE INDEX IF NOT EXISTS "teacher_classrooms_teacher_id_grade_level_idx"
  ON "teacher_classrooms"("teacher_id", "grade_level");
