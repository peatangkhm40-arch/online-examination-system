/**
 * ล้างข้อมูลการใช้งานทั้งหมด ให้เหมือนเริ่มระบบใหม่
 * คงไว้เฉพาะบัญชีเข้าสู่ระบบ (แอดมิน + อาจารย์ + นักเรียน demo)
 */
import { PrismaClient, TitlePrefix } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const DEMO_STUDENT_EMAIL = 'nattapong.khaophad@gmail.com';
const DEMO_STUDENT_PASSWORD = 'Student@2026';
const DEMO_TEACHER_EMAIL = 'kanya.teacher@college.ac.th';
const DEMO_TEACHER_PASSWORD = 'Teacher@2026';
const DEMO_ADMIN_EMAIL = 'admin@college.ac.th';
const DEMO_ADMIN_PASSWORD = 'Admin@2026';

async function main() {
  // ลบข้อมูลการสอบ / ทุจริต / ห้องสอบ (cascade ลูกตาม relation)
  const answers = await prisma.attemptAnswer.deleteMany();
  const attempts = await prisma.examAttempt.deleteMany();
  const cheats = await prisma.cheatLog.deleteMany();
  const options = await prisma.questionOption.deleteMany();
  const questions = await prisma.question.deleteMany();
  const examRooms = await prisma.examRoom.deleteMany();

  // ถอดนักเรียนออกจากห้องเรียน แล้วลบห้องเรียน + วิชาของอาจารย์
  await prisma.student.updateMany({ data: { joinedClassroomId: null } });
  const classrooms = await prisma.teacherClassroom.deleteMany();
  const subjects = await prisma.teacherSubject.deleteMany();

  // ลบนักเรียนทั้งหมด แล้วสร้างบัญชี demo ใหม่ (เหมือนสมัครครั้งแรก)
  const studentsDeleted = await prisma.student.deleteMany();

  const studentPasswordHash = await bcrypt.hash(DEMO_STUDENT_PASSWORD, 12);
  const teacherPasswordHash = await bcrypt.hash(DEMO_TEACHER_PASSWORD, 12);
  const adminPasswordHash = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 12);

  await prisma.admin.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    update: {
      passwordHash: adminPasswordHash,
      fullName: 'ผู้ดูแลระบบ',
      isActive: true,
    },
    create: {
      email: DEMO_ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      fullName: 'ผู้ดูแลระบบ',
    },
  });

  await prisma.teacher.upsert({
    where: { email: DEMO_TEACHER_EMAIL },
    update: {
      passwordHash: teacherPasswordHash,
      fullName: 'ครูกัญญา ผัดไทย',
      isActive: true,
    },
    create: {
      email: DEMO_TEACHER_EMAIL,
      passwordHash: teacherPasswordHash,
      fullName: 'ครูกัญญา ผัดไทย',
    },
  });

  await prisma.student.create({
    data: {
      prefix: TitlePrefix.MR,
      firstName: 'ณัฐพงษ์',
      lastName: 'ข้าวผัด',
      email: DEMO_STUDENT_EMAIL,
      passwordHash: studentPasswordHash,
      gradeLevel: 'ปวส. 2/4',
      studentNumber: 7,
      isCollegeVerified: true,
    },
  });

  console.log('Reset fresh completed:', {
    deleted: {
      answers: answers.count,
      attempts: attempts.count,
      cheats: cheats.count,
      options: options.count,
      questions: questions.count,
      examRooms: examRooms.count,
      classrooms: classrooms.count,
      subjects: subjects.count,
      students: studentsDeleted.count,
    },
    keptAccounts: {
      admin: `${DEMO_ADMIN_EMAIL} / ${DEMO_ADMIN_PASSWORD}`,
      teacher: `${DEMO_TEACHER_EMAIL} / ${DEMO_TEACHER_PASSWORD}`,
      student: `${DEMO_STUDENT_EMAIL} / ${DEMO_STUDENT_PASSWORD}`,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
