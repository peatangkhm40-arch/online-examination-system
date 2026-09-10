import { RoomStatus } from '@prisma/client';
import { prisma } from '../db/prisma';
import { getMe } from './authService';
import { Role } from '../types/roles';
import { getStudentExamAccessKeys, studentCanAccessExamGrade } from './studentAccess';
import { gradesMatch } from '../utils/gradeMatch';
import { normalizeThaiPersonName } from '../utils/thaiText';

/**
 * นักเรียนกรอกรหัสเข้าห้องเรียน (joinCode)
 * - ต้องยืนยันวิทยาลัยแล้ว
 * - ระดับชั้นตอนสมัครต้องตรงกับระดับชั้นของห้องเรียน
 * - อยู่ได้หลายห้อง (หลายวิชา)
 * หรือกรอกรหัสห้องสอบ (classCode) → คืน examId
 */
export async function joinByCode(studentId: string, rawCode: string) {
  const code = rawCode.trim().toUpperCase();
  if (code.length < 3) {
    throw new Error('CODE_REQUIRED');
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, gradeLevel: true, isCollegeVerified: true, isActive: true },
  });
  if (!student || !student.isActive) throw new Error('NOT_FOUND');
  if (!student.isCollegeVerified) throw new Error('NOT_COLLEGE_VERIFIED');

  const classroom = await prisma.teacherClassroom.findUnique({
    where: { joinCode: code },
    select: {
      id: true,
      name: true,
      joinCode: true,
      gradeLevel: true,
      subject: { select: { name: true } },
      teacher: { select: { fullName: true } },
    },
  });

  if (classroom) {
    // ข้อ 4: ชั้นตรง = เข้าได้ / ชั้นไม่ตรง = เข้าไม่ได้
    if (!gradesMatch(student.gradeLevel, classroom.gradeLevel)) {
      throw new Error('GRADE_MISMATCH');
    }

    await prisma.studentClassroom.upsert({
      where: {
        studentId_classroomId: { studentId, classroomId: classroom.id },
      },
      create: { studentId, classroomId: classroom.id },
      update: {},
    });

    // อัปเดตห้องล่าสุด (backward-compat กับ UI เดิม)
    await prisma.student.update({
      where: { id: studentId },
      data: { joinedClassroomId: classroom.id },
    });

    const user = await getMe(studentId, Role.STUDENT);
    return {
      type: 'classroom' as const,
      message: `เข้าห้องเรียนสำเร็จ`,
      classroom: {
        id: classroom.id,
        name: classroom.name,
        joinCode: classroom.joinCode,
        gradeLevel: classroom.gradeLevel,
        subjectName: classroom.subject?.name ?? null,
        teacherName: normalizeThaiPersonName(classroom.teacher.fullName),
      },
      user,
    };
  }

  const examRoom = await prisma.examRoom.findUnique({
    where: { classCode: code },
    select: {
      id: true,
      subjectName: true,
      classCode: true,
      gradeLevel: true,
      roomStatus: true,
    },
  });

  if (examRoom) {
    if (examRoom.roomStatus !== RoomStatus.OPEN) {
      throw new Error('EXAM_CLOSED');
    }

    const access = await getStudentExamAccessKeys(studentId);
    if (access.keys.length === 0) {
      throw new Error('JOIN_CLASSROOM_FIRST');
    }
    if (!studentCanAccessExamGrade(examRoom.gradeLevel, access.keys)) {
      throw new Error('EXAM_WRONG_CLASS');
    }
    // ชั้นสมัครต้องตรงกับเป้าหมายห้องสอบ (ถ้ามี)
    if (examRoom.gradeLevel && !gradesMatch(student.gradeLevel, examRoom.gradeLevel)) {
      throw new Error('GRADE_MISMATCH');
    }

    const user = await getMe(studentId, Role.STUDENT);
    return {
      type: 'exam' as const,
      message: `พบห้องสอบ ${examRoom.subjectName}`,
      examId: examRoom.id,
      exam: {
        id: examRoom.id,
        subjectName: examRoom.subjectName,
        classCode: examRoom.classCode,
      },
      user,
    };
  }

  throw new Error('CODE_NOT_FOUND');
}
