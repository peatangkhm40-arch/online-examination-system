import { prisma } from '../db/prisma';
import { gradesMatch, normalizeGradeKey } from '../utils/gradeMatch';

/** ระดับชั้น/ชื่อห้องที่นักเรียนเข้าถึงห้องสอบได้ */
export async function getStudentExamAccessKeys(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      gradeLevel: true,
      isCollegeVerified: true,
      isActive: true,
      joinedClassroom: { select: { id: true, name: true, joinCode: true, gradeLevel: true } },
      memberships: {
        select: {
          classroom: { select: { id: true, name: true, joinCode: true, gradeLevel: true } },
        },
      },
    },
  });

  if (!student) {
    return {
      gradeLevel: null as string | null,
      classroomName: null as string | null,
      classroom: null,
      classrooms: [] as { id: string; name: string; joinCode: string; gradeLevel: string }[],
      keys: [] as string[],
      isCollegeVerified: false,
      isActive: false,
    };
  }

  const classrooms = student.memberships.map((m) => m.classroom);
  // backward-compat: ถ้ายังไม่มี membership แต่มี primary classroom
  if (classrooms.length === 0 && student.joinedClassroom) {
    classrooms.push({
      id: student.joinedClassroom.id,
      name: student.joinedClassroom.name,
      joinCode: student.joinedClassroom.joinCode,
      gradeLevel: student.joinedClassroom.gradeLevel,
    });
  }

  // สิทธิ์เข้าสอบใช้ระดับชั้นของห้องที่เข้าได้ (และชื่อห้องเดิม)
  const keys = Array.from(
    new Set(
      classrooms.flatMap((c) => [c.gradeLevel, c.name].filter(Boolean) as string[])
    )
  );

  const primary = classrooms[0] ?? student.joinedClassroom ?? null;

  return {
    gradeLevel: student.gradeLevel,
    classroomName: primary?.name ?? null,
    classroom: primary,
    classrooms,
    keys,
    isCollegeVerified: student.isCollegeVerified,
    isActive: student.isActive,
  };
}

/**
 * ตรวจสิทธิ์เข้าห้องสอบ
 * - ยังไม่เข้าห้องเรียนด้วยรหัส → ไม่มีสิทธิ์
 * - ห้องสอบไม่จำกัดห้อง (gradeLevel ว่าง) → เข้าได้ถ้าเข้าห้องเรียนแล้ว
 * - ห้องสอบเจาะจงชั้น → นักเรียนต้องมีห้องที่ชั้นตรงกัน
 */
export function studentCanAccessExamGrade(
  examGradeLevel: string | null | undefined,
  accessKeys: string[]
) {
  if (accessKeys.length === 0) return false;
  if (!examGradeLevel) return true;
  const target = normalizeGradeKey(examGradeLevel);
  return accessKeys.some((key) => normalizeGradeKey(key) === target);
}

/** พร้อมเห็น/เข้าสอบหรือยัง */
export function studentCanListExams(access: {
  isActive: boolean;
  isCollegeVerified: boolean;
  keys: string[];
}) {
  return access.isActive && access.isCollegeVerified && access.keys.length > 0;
}

export { gradesMatch, normalizeGradeKey };
