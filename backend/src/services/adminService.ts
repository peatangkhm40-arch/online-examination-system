import bcrypt from 'bcryptjs';
import { TitlePrefix } from '@prisma/client';
import { prisma } from '../db/prisma';
import { PASSWORD_REGEX } from '../constants/auth';
import { normalizeEmail, validateStaffEmail, validateStudentEmail } from '../utils/emailPolicy';
import { normalizeThaiPersonName } from '../utils/thaiText';

export type TeacherAccount = {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
};

export type AdminStudent = {
  id: string;
  email: string;
  fullName: string;
  prefix: TitlePrefix;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  studentNumber: number;
  isActive: boolean;
  isCollegeVerified: boolean;
  classroomName: string | null;
  createdAt: string;
};

export type AdminExam = {
  id: string;
  subjectName: string;
  classCode: string;
  gradeLevel: string | null;
  status: string;
  teacherName: string;
  questionCount: number;
  createdAt: string;
};

export type AdminClassroom = {
  id: string;
  name: string;
  joinCode: string;
  teacherName: string;
  studentCount: number;
  createdAt: string;
};

const PREFIX_LABEL: Record<TitlePrefix, string> = {
  MR: 'นาย',
  MISS: 'นางสาว',
  MRS: 'นาง',
};

function mapTeacher(t: {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  createdAt: Date;
}): TeacherAccount {
  return {
    id: t.id,
    email: t.email,
    fullName: normalizeThaiPersonName(t.fullName),
    isActive: t.isActive,
    createdAt: t.createdAt.toISOString(),
  };
}

async function emailTaken(email: string, exclude?: { teacherId?: string; studentId?: string }) {
  const [student, teacher, admin] = await Promise.all([
    prisma.student.findUnique({ where: { email } }),
    prisma.teacher.findUnique({ where: { email } }),
    prisma.admin.findUnique({ where: { email } }),
  ]);
  if (student && student.id !== exclude?.studentId) return true;
  if (teacher && teacher.id !== exclude?.teacherId) return true;
  if (admin) return true;
  return false;
}

export async function listTeachers() {
  const teachers = await prisma.teacher.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      fullName: true,
      isActive: true,
      createdAt: true,
    },
  });
  return teachers.map(mapTeacher);
}

export async function createTeacherAccount(data: {
  email: string;
  password: string;
  fullName: string;
}) {
  const email = normalizeEmail(data.email);
  const fullName = normalizeThaiPersonName(data.fullName);
  const emailCheck = validateStaffEmail(email);
  if (!emailCheck.ok) throw new Error(`EMAIL_INVALID:${emailCheck.error}`);

  if (!fullName) throw new Error('FULL_NAME_REQUIRED');
  if (await emailTaken(email)) throw new Error('EMAIL_EXISTS');

  const passwordHash = await bcrypt.hash(data.password, 12);
  const teacher = await prisma.teacher.create({
    data: {
      email,
      passwordHash,
      fullName,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      isActive: true,
      createdAt: true,
    },
  });

  return mapTeacher(teacher);
}

export async function updateTeacherAccount(
  teacherId: string,
  data: { fullName?: string; email?: string; password?: string; isActive?: boolean }
) {
  const existing = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!existing) throw new Error('NOT_FOUND');

  const email = data.email ? normalizeEmail(data.email) : undefined;
  if (email && email !== existing.email) {
    const emailCheck = validateStaffEmail(email);
    if (!emailCheck.ok) throw new Error(`EMAIL_INVALID:${emailCheck.error}`);
    if (await emailTaken(email, { teacherId })) throw new Error('EMAIL_EXISTS');
  }

  if (data.password && !PASSWORD_REGEX.test(data.password)) {
    throw new Error('PASSWORD_INVALID');
  }

  const teacher = await prisma.teacher.update({
    where: { id: teacherId },
    data: {
      ...(data.fullName !== undefined ? { fullName: normalizeThaiPersonName(data.fullName) } : {}),
      ...(email ? { email } : {}),
      ...(data.password ? { passwordHash: await bcrypt.hash(data.password, 12) } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      isActive: true,
      createdAt: true,
    },
  });
  return mapTeacher(teacher);
}

export async function setTeacherActive(teacherId: string, isActive: boolean) {
  return updateTeacherAccount(teacherId, { isActive });
}

export async function deleteTeacherAccount(teacherId: string) {
  const existing = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: { _count: { select: { examRooms: true } } },
  });
  if (!existing) throw new Error('NOT_FOUND');
  if (existing._count.examRooms > 0) throw new Error('HAS_EXAMS');

  await prisma.teacherClassroom.deleteMany({ where: { teacherId } });
  await prisma.teacherSubject.deleteMany({ where: { teacherId } });
  await prisma.teacher.delete({ where: { id: teacherId } });
  return { id: teacherId };
}

export async function listStudents() {
  const students = await prisma.student.findMany({
    orderBy: [{ gradeLevel: 'asc' }, { studentNumber: 'asc' }],
    include: {
      joinedClassroom: { select: { name: true } },
    },
  });

  return students.map(
    (s): AdminStudent => ({
      id: s.id,
      email: s.email,
      fullName: `${PREFIX_LABEL[s.prefix]}${s.firstName} ${s.lastName}`,
      prefix: s.prefix,
      firstName: s.firstName,
      lastName: s.lastName,
      gradeLevel: s.gradeLevel,
      studentNumber: s.studentNumber,
      isActive: s.isActive,
      isCollegeVerified: s.isCollegeVerified,
      classroomName: s.joinedClassroom?.name ?? null,
      createdAt: s.createdAt.toISOString(),
    })
  );
}

export async function updateStudentAccount(
  studentId: string,
  data: {
    email?: string;
    prefix?: TitlePrefix;
    firstName?: string;
    lastName?: string;
    gradeLevel?: string;
    studentNumber?: number;
    password?: string;
    isActive?: boolean;
    isCollegeVerified?: boolean;
  }
) {
  const existing = await prisma.student.findUnique({ where: { id: studentId } });
  if (!existing) throw new Error('NOT_FOUND');

  const email = data.email ? normalizeEmail(data.email) : undefined;
  if (email && email !== existing.email) {
    const emailCheck = validateStudentEmail(email);
    if (!emailCheck.ok) throw new Error(`EMAIL_INVALID:${emailCheck.error}`);
    if (await emailTaken(email, { studentId })) throw new Error('EMAIL_EXISTS');
  }

  if (data.password && !PASSWORD_REGEX.test(data.password)) {
    throw new Error('PASSWORD_INVALID');
  }

  const gradeLevel = data.gradeLevel?.trim() ?? existing.gradeLevel;
  const studentNumber = data.studentNumber ?? existing.studentNumber;
  if (gradeLevel !== existing.gradeLevel || studentNumber !== existing.studentNumber) {
    const taken = await prisma.student.findUnique({
      where: { gradeLevel_studentNumber: { gradeLevel, studentNumber } },
    });
    if (taken && taken.id !== studentId) throw new Error('STUDENT_NUMBER_TAKEN');
  }

  const updated = await prisma.student.update({
    where: { id: studentId },
    data: {
      ...(email ? { email } : {}),
      ...(data.prefix ? { prefix: data.prefix } : {}),
      ...(data.firstName !== undefined ? { firstName: data.firstName.trim() } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName.trim() } : {}),
      ...(data.gradeLevel !== undefined ? { gradeLevel: data.gradeLevel.trim() } : {}),
      ...(data.studentNumber !== undefined ? { studentNumber: data.studentNumber } : {}),
      ...(data.password ? { passwordHash: await bcrypt.hash(data.password, 12) } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.isCollegeVerified !== undefined ? { isCollegeVerified: data.isCollegeVerified } : {}),
    },
    include: { joinedClassroom: { select: { name: true } } },
  });

  return {
    id: updated.id,
    email: updated.email,
    fullName: `${PREFIX_LABEL[updated.prefix]}${updated.firstName} ${updated.lastName}`,
    prefix: updated.prefix,
    firstName: updated.firstName,
    lastName: updated.lastName,
    gradeLevel: updated.gradeLevel,
    studentNumber: updated.studentNumber,
    isActive: updated.isActive,
    isCollegeVerified: updated.isCollegeVerified,
    classroomName: updated.joinedClassroom?.name ?? null,
    createdAt: updated.createdAt.toISOString(),
  } satisfies AdminStudent;
}

export async function deleteStudentAccount(studentId: string) {
  const existing = await prisma.student.findUnique({ where: { id: studentId } });
  if (!existing) throw new Error('NOT_FOUND');
  await prisma.student.delete({ where: { id: studentId } });
  return { id: studentId };
}

export async function listAllExams() {
  const rooms = await prisma.examRoom.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      teacher: { select: { fullName: true } },
      _count: { select: { questions: true } },
    },
  });

  return rooms.map(
    (r): AdminExam => ({
      id: r.id,
      subjectName: r.subjectName,
      classCode: r.classCode,
      gradeLevel: r.gradeLevel,
      status: r.roomStatus === 'OPEN' ? 'PUBLISHED' : 'DRAFT',
      teacherName: normalizeThaiPersonName(r.teacher.fullName),
      questionCount: r._count.questions,
      createdAt: r.createdAt.toISOString(),
    })
  );
}

export async function listAllClassrooms() {
  const rooms = await prisma.teacherClassroom.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      teacher: { select: { fullName: true } },
      _count: { select: { students: true } },
    },
  });

  return rooms.map(
    (r): AdminClassroom => ({
      id: r.id,
      name: r.name,
      joinCode: r.joinCode,
      teacherName: normalizeThaiPersonName(r.teacher.fullName),
      studentCount: r._count.students,
      createdAt: r.createdAt.toISOString(),
    })
  );
}

export async function deleteClassroom(classroomId: string) {
  const existing = await prisma.teacherClassroom.findUnique({ where: { id: classroomId } });
  if (!existing) throw new Error('NOT_FOUND');

  await prisma.student.updateMany({
    where: { joinedClassroomId: classroomId },
    data: { joinedClassroomId: null },
  });
  await prisma.teacherClassroom.delete({ where: { id: classroomId } });
  return { id: classroomId };
}
