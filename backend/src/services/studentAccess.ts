import { prisma } from '../db/prisma';

/** ระดับชั้น/ชื่อห้องที่นักเรียนเข้าถึงห้องสอบได้ */
export async function getStudentExamAccessKeys(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      gradeLevel: true,
      isCollegeVerified: true,
      isActive: true,
      joinedClassroom: { select: { id: true, name: true, joinCode: true } },
    },
  });

  if (!student) {
    return {
      gradeLevel: null as string | null,
      classroomName: null as string | null,
      classroom: null,
      keys: [] as string[],
      isCollegeVerified: false,
      isActive: false,
    };
  }

  // เข้าถึงห้องสอบได้เฉพาะหลังเข้าห้องเรียนด้วยรหัสจากอาจารย์
  // (ไม่ใช้ระดับชั้นตอนสมัคร — กันคนเพิ่งลงทะเบียนเห็นข้อสอบทันที)
  const keys = student.joinedClassroom?.name
    ? [student.joinedClassroom.name]
    : [];

  return {
    gradeLevel: student.gradeLevel,
    classroomName: student.joinedClassroom?.name ?? null,
    classroom: student.joinedClassroom,
    keys,
    isCollegeVerified: student.isCollegeVerified,
    isActive: student.isActive,
  };
}

function normalizeAccessKey(value: string) {
  return value.replace(/\s+/g, '').toLowerCase();
}

/**
 * ตรวจสิทธิ์เข้าห้องสอบ
 * - ยังไม่เข้าห้องเรียนด้วยรหัส → ไม่มีสิทธิ์
 * - ห้องสอบไม่จำกัดห้อง (gradeLevel ว่าง) → เข้าได้ถ้าเข้าห้องเรียนแล้ว
 * - ห้องสอบเจาะจงห้อง → ต้องชื่อห้องตรงกัน
 */
export function studentCanAccessExamGrade(
  examGradeLevel: string | null | undefined,
  accessKeys: string[]
) {
  if (accessKeys.length === 0) return false;
  if (!examGradeLevel) return true;
  const target = normalizeAccessKey(examGradeLevel);
  return accessKeys.some((key) => normalizeAccessKey(key) === target);
}

/** พร้อมเห็น/เข้าสอบหรือยัง */
export function studentCanListExams(access: {
  isActive: boolean;
  isCollegeVerified: boolean;
  keys: string[];
}) {
  return access.isActive && access.isCollegeVerified && access.keys.length > 0;
}
