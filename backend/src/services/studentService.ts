import { RoomStatus } from '@prisma/client';
import { prisma } from '../db/prisma';
import { getMe } from './authService';
import { Role } from '../types/roles';
import { getStudentExamAccessKeys, studentCanAccessExamGrade } from './studentAccess';

/**
 * นักเรียนกรอกรหัสเข้าห้องเรียน (joinCode) → ผูกห้องเรียน โดยไม่ทับระดับชั้นตอนสมัคร
 * หรือกรอกรหัสห้องสอบ (classCode) → คืน examId เพื่อเปิดหน้าข้อสอบ
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
      teacher: { select: { fullName: true } },
    },
  });

  if (classroom) {
    // ผูกห้องเรียนอย่างเดียว — ไม่แก้ gradeLevel ที่ลงทะเบียนไว้
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
        teacherName: classroom.teacher.fullName,
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
    if (!studentCanAccessExamGrade(examRoom.gradeLevel, access.keys)) {
      throw new Error('EXAM_WRONG_CLASS');
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
