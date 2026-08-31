-- =============================================================================
-- Initial Migration — ระบบสอบออนไลน์พร้อม Anti-Cheat
-- Tables: students, teachers, exam_rooms, cheat_logs
-- =============================================================================

-- CreateEnum
CREATE TYPE "TitlePrefix" AS ENUM ('MR', 'MISS', 'MRS');

-- CreateEnum
CREATE TYPE "ExamFormat" AS ENUM ('MANUAL', 'IMPORT_FILE');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CheatEventType" AS ENUM ('TAB_SWITCH', 'APP_SWITCH', 'WINDOW_BLUR', 'PAGE_HIDDEN', 'FULLSCREEN_EXIT', 'OTHER');

-- CreateTable: students
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "prefix" "TitlePrefix" NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "grade_level" TEXT NOT NULL,
    "student_number" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable: teachers
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: exam_rooms
CREATE TABLE "exam_rooms" (
    "id" TEXT NOT NULL,
    "class_code" TEXT NOT NULL,
    "subject_name" TEXT NOT NULL,
    "exam_format" "ExamFormat" NOT NULL,
    "room_status" "RoomStatus" NOT NULL DEFAULT 'CLOSED',
    "exam_source" TEXT,
    "teacher_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable: cheat_logs
CREATE TABLE "cheat_logs" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "exam_room_id" TEXT NOT NULL,
    "event_type" "CheatEventType" NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "is_notified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cheat_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

-- CreateIndex
CREATE UNIQUE INDEX "students_grade_level_student_number_key" ON "students"("grade_level", "student_number");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_email_key" ON "teachers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "exam_rooms_class_code_key" ON "exam_rooms"("class_code");

-- CreateIndex
CREATE INDEX "cheat_logs_exam_room_id_created_at_idx" ON "cheat_logs"("exam_room_id", "created_at");

-- CreateIndex
CREATE INDEX "cheat_logs_student_id_exam_room_id_idx" ON "cheat_logs"("student_id", "exam_room_id");

-- AddForeignKey
ALTER TABLE "exam_rooms" ADD CONSTRAINT "exam_rooms_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheat_logs" ADD CONSTRAINT "cheat_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheat_logs" ADD CONSTRAINT "cheat_logs_exam_room_id_fkey" FOREIGN KEY ("exam_room_id") REFERENCES "exam_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
