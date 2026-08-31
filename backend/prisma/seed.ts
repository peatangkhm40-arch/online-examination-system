import { PrismaClient, TitlePrefix } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// บัญชีทดสอบแบบอีเมลและรหัสผ่านจริง (ตรงกับ frontend/src/constants/auth.ts)
const DEMO_STUDENT_EMAIL = 'nattapong.khaophad@gmail.com';
const DEMO_STUDENT_PASSWORD = 'Student@2026';
const DEMO_TEACHER_EMAIL = 'kanya.teacher@college.ac.th';
const DEMO_TEACHER_PASSWORD = 'Teacher@2026';
const DEMO_ADMIN_EMAIL = 'admin@college.ac.th';
const DEMO_ADMIN_PASSWORD = 'Admin@2026';

async function main() {
  const studentPasswordHash = await bcrypt.hash(DEMO_STUDENT_PASSWORD, 12);
  const teacherPasswordHash = await bcrypt.hash(DEMO_TEACHER_PASSWORD, 12);
  const adminPasswordHash = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 12);

  const admin = await prisma.admin.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    update: { passwordHash: adminPasswordHash, fullName: 'ผู้ดูแลระบบ' },
    create: {
      email: DEMO_ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      fullName: 'ผู้ดูแลระบบ',
    },
  });

  const teacher = await prisma.teacher.upsert({
    where: { email: DEMO_TEACHER_EMAIL },
    update: { passwordHash: teacherPasswordHash, fullName: 'ครูกัญญา ผัดไทย' },
    create: {
      email: DEMO_TEACHER_EMAIL,
      passwordHash: teacherPasswordHash,
      fullName: 'ครูกัญญา ผัดไทย',
    },
  });

  // ลบนักเรียนที่ชนเลขที่ในระดับชั้นเดียวกัน (ถ้ามี) แล้วค่อย upsert บัญชี demo
  await prisma.student.deleteMany({
    where: {
      gradeLevel: 'ปวส. 2/4',
      studentNumber: 7,
      NOT: { email: DEMO_STUDENT_EMAIL },
    },
  });

  const student = await prisma.student.upsert({
    where: { email: DEMO_STUDENT_EMAIL },
    update: {
      passwordHash: studentPasswordHash,
      joinedClassroomId: null,
      gradeLevel: 'ปวส. 2/4',
      studentNumber: 7,
      firstName: 'ณัฐพงษ์',
      lastName: 'ข้าวผัด',
      prefix: TitlePrefix.MR,
      isCollegeVerified: true,
      isActive: true,
    },
    create: {
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

  console.log('Seed completed (accounts only, no demo exam data):', {
    admin: `${admin.email} / ${DEMO_ADMIN_PASSWORD}`,
    teacher: `${teacher.email} / ${DEMO_TEACHER_PASSWORD}`,
    student: `${student.email} / ${DEMO_STUDENT_PASSWORD}`,
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
