import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Prisma, TitlePrefix } from '@prisma/client';
import { config } from '../config';
import { prisma } from '../db/prisma';
import { Role } from '../types/roles';
import { normalizeEmail, validateStaffEmail, validateStudentEmail } from '../utils/emailPolicy';

function signToken(userId: string, role: Role) {
  const signOptions: SignOptions = { expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign({ userId, role }, config.jwtSecret, signOptions);
}

function toStudentUser(student: {
  id: string;
  email: string;
  prefix: TitlePrefix;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  studentNumber: number;
  isCollegeVerified?: boolean;
  joinedClassroom?: { id: string; name: string; joinCode: string } | null;
}) {
  return {
    id: student.id,
    email: student.email,
    prefix: student.prefix,
    firstName: student.firstName,
    lastName: student.lastName,
    fullName: `${student.firstName} ${student.lastName}`,
    role: Role.STUDENT as const,
    gradeLevel: student.gradeLevel,
    studentNumber: student.studentNumber,
    isCollegeVerified: student.isCollegeVerified ?? false,
    classroomName: student.joinedClassroom?.name ?? null,
    classroomJoinCode: student.joinedClassroom?.joinCode ?? null,
  };
}

function toTeacherUser(teacher: { id: string; email: string; fullName: string }) {
  return {
    id: teacher.id,
    email: teacher.email,
    fullName: teacher.fullName,
    role: Role.TEACHER as const,
  };
}

function toAdminUser(admin: { id: string; email: string; fullName: string }) {
  return {
    id: admin.id,
    email: admin.email,
    fullName: admin.fullName,
    role: Role.ADMIN as const,
  };
}

async function emailTakenByOther(
  email: string,
  exclude: { studentId?: string; teacherId?: string; adminId?: string }
) {
  const [student, teacher, admin] = await Promise.all([
    prisma.student.findUnique({ where: { email } }),
    prisma.teacher.findUnique({ where: { email } }),
    prisma.admin.findUnique({ where: { email } }),
  ]);
  if (student && student.id !== exclude.studentId) return true;
  if (teacher && teacher.id !== exclude.teacherId) return true;
  if (admin && admin.id !== exclude.adminId) return true;
  return false;
}

export async function registerStudent(data: {
  prefix: TitlePrefix;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  gradeLevel: string;
  studentNumber: number;
}) {
  const email = normalizeEmail(data.email);
  const emailCheck = validateStudentEmail(email);
  if (!emailCheck.ok) throw new Error(`EMAIL_INVALID:${emailCheck.error}`);

  const existingEmail = await prisma.student.findUnique({ where: { email } });
  if (existingEmail) {
    throw new Error('EMAIL_EXISTS');
  }

  // อีเมลโดเมนวิทยาลัยถือว่ายืนยันอัตโนมัติ — อีเมลส่วนตัวรอแอดมินตรวจ
  const isCollegeVerified = validateStaffEmail(email).ok;

  const existingNumber = await prisma.student.findUnique({
    where: {
      gradeLevel_studentNumber: {
        gradeLevel: data.gradeLevel,
        studentNumber: data.studentNumber,
      },
    },
  });
  if (existingNumber) {
    throw new Error('STUDENT_NUMBER_TAKEN');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  try {
    const student = await prisma.student.create({
      data: {
        prefix: data.prefix,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email,
        passwordHash,
        gradeLevel: data.gradeLevel,
        studentNumber: data.studentNumber,
        isCollegeVerified,
      },
      select: {
        id: true,
        email: true,
        prefix: true,
        firstName: true,
        lastName: true,
        gradeLevel: true,
        studentNumber: true,
        isCollegeVerified: true,
      },
    });

    return {
      user: toStudentUser(student),
      token: signToken(student.id, Role.STUDENT),
      message: isCollegeVerified
        ? 'ลงทะเบียนสำเร็จ (อีเมลวิทยาลัย — พร้อมใช้งาน)'
        : 'ลงทะเบียนสำเร็จ รอแอดมินยืนยันว่าเป็นนักเรียนวิทยาลัยก่อนเข้าสอบ',
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('STUDENT_NUMBER_TAKEN');
    }
    throw error;
  }
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const student = await prisma.student.findUnique({ where: { email: normalizedEmail } });
  if (student?.isActive) {
    const valid = await bcrypt.compare(password, student.passwordHash);
    if (valid) {
      return {
        user: toStudentUser(student),
        token: signToken(student.id, Role.STUDENT),
      };
    }
  }

  const teacher = await prisma.teacher.findUnique({ where: { email: normalizedEmail } });
  if (teacher?.isActive) {
    const valid = await bcrypt.compare(password, teacher.passwordHash);
    if (valid) {
      return {
        user: toTeacherUser(teacher),
        token: signToken(teacher.id, Role.TEACHER),
      };
    }
  }

  const admin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });
  if (admin?.isActive) {
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (valid) {
      return {
        user: toAdminUser(admin),
        token: signToken(admin.id, Role.ADMIN),
      };
    }
  }

  throw new Error('INVALID_CREDENTIALS');
}

export async function getMe(userId: string, role: Role) {
  if (role === Role.STUDENT) {
    const student = await prisma.student.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        prefix: true,
        firstName: true,
        lastName: true,
        gradeLevel: true,
        studentNumber: true,
        isCollegeVerified: true,
        joinedClassroom: { select: { id: true, name: true, joinCode: true } },
      },
    });
    if (!student) return null;
    return toStudentUser(student);
  }

  if (role === Role.ADMIN) {
    const admin = await prisma.admin.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true },
    });
    if (!admin) return null;
    return toAdminUser(admin);
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true },
  });
  if (!teacher) return null;
  return toTeacherUser(teacher);
}

export async function updateProfile(
  userId: string,
  role: Role,
  data: {
    email?: string;
    fullName?: string;
    prefix?: TitlePrefix;
    firstName?: string;
    lastName?: string;
    gradeLevel?: string;
    studentNumber?: number;
    currentPassword?: string;
    newPassword?: string;
  }
) {
  if (role === Role.STUDENT) {
    const student = await prisma.student.findUnique({ where: { id: userId } });
    if (!student || !student.isActive) throw new Error('NOT_FOUND');

    if (data.newPassword) {
      if (!data.currentPassword) throw new Error('CURRENT_PASSWORD_REQUIRED');
      const ok = await bcrypt.compare(data.currentPassword, student.passwordHash);
      if (!ok) throw new Error('CURRENT_PASSWORD_INVALID');
    }

    const email = data.email?.trim().toLowerCase();
    if (email && email !== student.email) {
      const emailCheck = validateStudentEmail(email);
      if (!emailCheck.ok) throw new Error(`EMAIL_INVALID:${emailCheck.error}`);
      if (await emailTakenByOther(email, { studentId: userId })) throw new Error('EMAIL_EXISTS');
    }

    const gradeLevel = data.gradeLevel?.trim() ?? student.gradeLevel;
    const studentNumber = data.studentNumber ?? student.studentNumber;
    if (gradeLevel !== student.gradeLevel || studentNumber !== student.studentNumber) {
      const taken = await prisma.student.findUnique({
        where: { gradeLevel_studentNumber: { gradeLevel, studentNumber } },
      });
      if (taken && taken.id !== userId) throw new Error('STUDENT_NUMBER_TAKEN');
    }

    // เปลี่ยนอีเมลเป็นโดเมนวิทยาลัย → ยืนยันอัตโนมัติ / เปลี่ยนเป็นเมลส่วนตัว → ต้องรอแอดมินใหม่
    let isCollegeVerified = student.isCollegeVerified;
    if (email && email !== student.email) {
      isCollegeVerified = validateStaffEmail(email).ok;
    }

    const updated = await prisma.student.update({
      where: { id: userId },
      data: {
        ...(email ? { email, isCollegeVerified } : {}),
        ...(data.prefix ? { prefix: data.prefix } : {}),
        ...(data.firstName !== undefined ? { firstName: data.firstName.trim() } : {}),
        ...(data.lastName !== undefined ? { lastName: data.lastName.trim() } : {}),
        ...(data.gradeLevel !== undefined ? { gradeLevel: data.gradeLevel.trim() } : {}),
        ...(data.studentNumber !== undefined ? { studentNumber: data.studentNumber } : {}),
        ...(data.newPassword ? { passwordHash: await bcrypt.hash(data.newPassword, 12) } : {}),
      },
      select: {
        id: true,
        email: true,
        prefix: true,
        firstName: true,
        lastName: true,
        gradeLevel: true,
        studentNumber: true,
        isCollegeVerified: true,
        joinedClassroom: { select: { id: true, name: true, joinCode: true } },
      },
    });

    return toStudentUser(updated);
  }

  if (role === Role.ADMIN) {
    const admin = await prisma.admin.findUnique({ where: { id: userId } });
    if (!admin || !admin.isActive) throw new Error('NOT_FOUND');

    if (data.newPassword) {
      if (!data.currentPassword) throw new Error('CURRENT_PASSWORD_REQUIRED');
      const ok = await bcrypt.compare(data.currentPassword, admin.passwordHash);
      if (!ok) throw new Error('CURRENT_PASSWORD_INVALID');
    }

    const email = data.email?.trim().toLowerCase();
    if (email && email !== admin.email) {
      if (await emailTakenByOther(email, { adminId: userId })) throw new Error('EMAIL_EXISTS');
    }

    const updated = await prisma.admin.update({
      where: { id: userId },
      data: {
        ...(email ? { email } : {}),
        ...(data.fullName !== undefined ? { fullName: data.fullName.trim() } : {}),
        ...(data.newPassword ? { passwordHash: await bcrypt.hash(data.newPassword, 12) } : {}),
      },
      select: { id: true, email: true, fullName: true },
    });
    return toAdminUser(updated);
  }

  const teacher = await prisma.teacher.findUnique({ where: { id: userId } });
  if (!teacher || !teacher.isActive) throw new Error('NOT_FOUND');

  if (data.newPassword) {
    if (!data.currentPassword) throw new Error('CURRENT_PASSWORD_REQUIRED');
    const ok = await bcrypt.compare(data.currentPassword, teacher.passwordHash);
    if (!ok) throw new Error('CURRENT_PASSWORD_INVALID');
  }

  const email = data.email?.trim().toLowerCase();
  if (email && email !== teacher.email) {
    if (await emailTakenByOther(email, { teacherId: userId })) throw new Error('EMAIL_EXISTS');
  }

  const updated = await prisma.teacher.update({
    where: { id: userId },
    data: {
      ...(email ? { email } : {}),
      ...(data.fullName !== undefined ? { fullName: data.fullName.trim() } : {}),
      ...(data.newPassword ? { passwordHash: await bcrypt.hash(data.newPassword, 12) } : {}),
    },
    select: { id: true, email: true, fullName: true },
  });

  return toTeacherUser(updated);
}
